import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { deepResearchAgent, resolveTools } from "../agents/deepResearcher/researcher";
import { datasetContextSchema } from "./schema";
import { reviewResultSchema } from "../reviews/schema";
import { buildReviewerPrompt } from "../reviews/reviewerPrompt";

// Review result type (using schema validator)
type ReviewResult = Infer<typeof reviewResultSchema>;
import { stepCountIs } from "@convex-dev/agent";
import { chatModelProviderOptions, smartChatModel, workflow } from "../ai.config";
import { FinishReason, generateObject } from "ai";
import { Id } from "../_generated/dataModel";
import { Infer } from "convex/values";
import { genericResearchCoordinatorPrompt } from "../agents/deepResearcher/prompts/genericResearchCoordinatorPrompt";
import { buildDatasetResearchSuffix } from "../agents/deepResearcher/prompts/datasetResearchCoordinatorPrompt";
import dedent from "dedent";
import { z } from "zod";

const buildCoordinatorPrompt = (userPrompt: string): string => {
    return `Research Task:\n${userPrompt}\n\nFollow the operating principles in the system prompt. Begin by planning the research, then execute. Maintain a scratchpad with progress, findings, citations, delegations, calculations, and open questions. After completing research, produce a comprehensive report with your findings.`;
};

/**
 * Thread creation mutation reused from deepResearchAgent
 */
export const createThread = deepResearchAgent.createThreadMutation();

/**
 * Save message mutation for use from actions
 */
export const saveMessage = internalMutation({
    args: {
        threadId: v.string(),
        prompt: v.string(),
    },
    returns: v.object({ messageId: v.string() }),
    handler: async (ctx, args) => {
        const { messageId } = await deepResearchAgent.saveMessage(ctx, {
            threadId: args.threadId,
            prompt: args.prompt,
        });
        return { messageId };
    },
});

/**
 * Get context for dataset research (row + dataset + fields)
 * Returns null if not dataset research
 */
export const getDatasetResearchContext = internalQuery({
    args: {
        taskExecutionId: v.id("taskExecutions"),
    },
    handler: async (ctx, args): Promise<Infer<typeof datasetContextSchema> | null> => {
        // Directly query datasetRows by taskExecutionId
        const row = await ctx.db
            .query("datasetRows")
            .withIndex("by_task_execution", (q) => q.eq("taskExecutionId", args.taskExecutionId))
            .unique();

        if (!row) return null;

        const dataset = await ctx.db.get(row.datasetId);
        if (!dataset) return null;

        return {
            rowId: row._id,
            datasetId: row.datasetId,
            entityName: row.entityName,
            fields: dataset.schema.map(field => ({
                fieldId: field.fieldId,
                name: field.name,
                type: field.type,
                description: field.description,
                required: field.required,
            })),
        };
    },
});

/**
 * Get review config ID from batch (if this task is part of a batch)
 * Returns null if not part of a batch or if batch has no review config
 */
export const getReviewConfigIdFromBatch = internalQuery({
    args: {
        taskExecutionId: v.id("taskExecutions"),
    },
    returns: v.union(v.string(), v.null()),
    handler: async (ctx, args) => {
        const taskExecution = await ctx.db.get(args.taskExecutionId);
        if (!taskExecution || !taskExecution.batchId) return null;

        const batch = await ctx.db.get(taskExecution.batchId);
        if (!batch) return null;

        return batch.reviewConfigId || null;
    },
});

/**
 * Define workflow for generic deep research tasks
 * Used for both standalone research and as part of wide/batch research
 */
export const genericResearchWorkflow = workflow.define({
    args: {
        taskExecutionId: v.id("taskExecutions"),
        userPrompt: v.string(),
    },
    handler: async (step, args) => {
        try {
            // Create research thread
            const { threadId } = await step.runMutation(
                internal.research.genericResearchWorkflow.createThread,
                {
                    title: args.userPrompt.slice(0, 200),
                    summary: args.userPrompt,
                }
            );

            await step.runMutation(internal.orchestration.taskExecutions.updateTaskExecutionThreadId, {
                taskExecutionId: args.taskExecutionId,
                threadId,
            });

            // Start research with agent
            let { messageId } = await step.runMutation(internal.research.genericResearchWorkflow.saveMessage, {
                threadId,
                prompt: buildCoordinatorPrompt(args.userPrompt),
            });


            // Check if this is dataset research upfront
            const datasetContext = await step.runQuery(
                internal.research.genericResearchWorkflow.getDatasetResearchContext,
                { taskExecutionId: args.taskExecutionId }
            );

            // Execute research with review loop (do-while pattern for cleaner code)
            let report = "";
            let consecutiveErrors = 0;
            const MAX_CONSECUTIVE_ERRORS = 3;
            const MAX_ITERATIONS = 100;
            let iterations = 0;
            let reviewAttempts = 0;
            const MAX_REVIEW_ATTEMPTS = 2;
            let reviewPassed = false;
            let needsReview = !!datasetContext;

            // Main research-review cycle
            do {
                reviewAttempts++;
                let agentIsDone = false;

                // Agent work phase: Keep running until agent says it's done
                while (iterations < MAX_ITERATIONS && !agentIsDone) {
                    iterations++;

                    try {
                        const { finishReason, text } = await step.runAction(
                            internal.research.genericResearchWorkflow.runAgentStep,
                            {
                                taskExecutionId: args.taskExecutionId,
                                threadId,
                                promptMessageId: messageId, // This will be updated after each review feedback
                            },
                            {
                                retry: true
                            }
                        );

                        // Success - reset error counter and accumulate report
                        consecutiveErrors = 0;
                        report += text;

                        // Check if agent is still working (making tool calls)
                        if (finishReason === "tool-calls") {
                            console.log(`[genericResearchWorkflow] Agent continuing work (iteration ${iterations})`);
                            continue;
                        } else {
                            // Agent thinks it's done
                            console.log(`[genericResearchWorkflow] Agent completed after ${iterations} iterations with reason: ${finishReason}`);
                            agentIsDone = true;
                        }

                    } catch (error: any) {
                        consecutiveErrors++;
                        console.error(`[genericResearchWorkflow] Error in iteration ${iterations} (consecutive: ${consecutiveErrors}):`, error.message);

                        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
                            throw new Error(`Research workflow failed after ${MAX_CONSECUTIVE_ERRORS} consecutive errors: ${error.message}`);
                        }

                        console.log(`[genericResearchWorkflow] Retrying after error`);
                        continue;
                    }
                }

                // Review phase: Check quality if this is dataset research
                if (needsReview && agentIsDone && datasetContext) {
                    console.log(`[genericResearchWorkflow] Running quality review (attempt ${reviewAttempts}/${MAX_REVIEW_ATTEMPTS})`);

                    // Get review config from batch (or use default)
                    const reviewConfigId = await step.runQuery(
                        internal.research.genericResearchWorkflow.getReviewConfigIdFromBatch,
                        { taskExecutionId: args.taskExecutionId }
                    );

                    const reviewResult = await step.runAction(
                        internal.research.genericResearchWorkflow.reviewDatasetCells,
                        {
                            taskExecutionId: args.taskExecutionId,
                            reviewConfigId: reviewConfigId || "datasetQuality", // Fallback to default
                            workflowId: "genericResearch",
                            attemptNumber: reviewAttempts,
                            totalAttempts: MAX_REVIEW_ATTEMPTS,
                            rowId: datasetContext.rowId,
                        }
                    );

                    if (reviewResult.passed) {
                        // Review passed - we're done!
                        console.log(`[genericResearchWorkflow] ✅ Review passed! Score: ${(reviewResult.overallScore * 100).toFixed(0)}%`);
                        report += `\n\n## Quality Review\n✅ Research passed quality review (score: ${(reviewResult.overallScore * 100).toFixed(0)}%)\n${reviewResult.summary}`;
                        reviewPassed = true;
                    } else {
                        // Review failed
                        console.log(`[genericResearchWorkflow] ❌ Review failed. Score: ${(reviewResult.overallScore * 100).toFixed(0)}%`);

                        if (reviewAttempts >= MAX_REVIEW_ATTEMPTS) {
                            // Out of attempts - accept with warning
                            console.log(`[genericResearchWorkflow] Max review attempts reached. Accepting results.`);
                            report += `\n\n## Quality Review (Final)\n❌ Research scored ${(reviewResult.overallScore * 100).toFixed(0)}%\n${reviewResult.summary}\n\n⚠️ Proceeding with available data after ${MAX_REVIEW_ATTEMPTS} review attempts.`;
                            reviewPassed = true; // Accept anyway
                        } else {
                            // Send feedback and loop again
                            console.log(`[genericResearchWorkflow] Sending feedback to agent for retry`);
                            report += `\n\n## Review Feedback (Attempt ${reviewAttempts}/${MAX_REVIEW_ATTEMPTS})\nScore: ${(reviewResult.overallScore * 100).toFixed(0)}%\n${reviewResult.summary}\n`;

                            // Save feedback message and update messageId so agent responds to it
                            const feedbackResult = await step.runMutation(
                                internal.research.genericResearchWorkflow.saveReviewFeedbackMessage,
                                {
                                    threadId,
                                    reviewConfigId: reviewConfigId || "datasetQuality",
                                    reviewResult: {
                                        passed: reviewResult.passed,
                                        overallScore: reviewResult.overallScore,
                                        summary: reviewResult.summary,
                                        actionableRecommendations: reviewResult.actionableRecommendations,
                                    },
                                }
                            );

                            // Update messageId so agent responds to the feedback, not the original prompt
                            if (feedbackResult?.messageId) {
                                messageId = feedbackResult.messageId;
                                console.log(`[genericResearchWorkflow] Updated promptMessageId to feedback message: ${messageId}`);
                            } else {
                                console.warn(`[genericResearchWorkflow] Failed to get feedback messageId, keeping original promptMessageId`);
                            }

                            // Loop will continue - agent will see feedback and work again
                        }
                    }
                } else {
                    // No review needed or agent hit iteration limit
                    reviewPassed = true;
                }

            } while (needsReview && !reviewPassed && reviewAttempts < MAX_REVIEW_ATTEMPTS && iterations < MAX_ITERATIONS);

            if (iterations >= MAX_ITERATIONS) {
                console.error(`[genericResearchWorkflow] Hit max iterations (${MAX_ITERATIONS}), ending research`);
                report += "\n\n[Research ended: Maximum iteration limit reached]";
            }

            // Save results to taskExecution (as artifacts)
            await step.runMutation(internal.research.genericResearch.saveResearchResults, {
                taskExecutionId: args.taskExecutionId,
                report,
                structuredOutput: undefined, // Removed - use dataset cells instead
            });

            await step.runMutation(internal.orchestration.taskExecutions.markTaskExecutionAsCompleted, {
                taskExecutionId: args.taskExecutionId,
            });

            // Batch progress is now handled by onComplete handlers, not here
        } catch (error: any) {
            console.error("Error in genericResearchWorkflow:", error);
            await step.runMutation(internal.orchestration.taskExecutions.markTaskExecutionAsFailed, {
                taskExecutionId: args.taskExecutionId,
                error: error.message,
            });
            throw error;
        }
    },
});

/**
 * Review dataset cells for quality using reviewer agent
 */
export const reviewDatasetCells = internalAction({
    args: {
        taskExecutionId: v.id("taskExecutions"),
        reviewConfigId: v.string(),
        workflowId: v.string(),
        attemptNumber: v.number(),
        totalAttempts: v.number(),
        rowId: v.id("datasetRows"),
    },
    handler: async (ctx, args): Promise<ReviewResult> => {
        // Fetch dataset context from row
        const row = await ctx.runQuery(api.research.dataset.getRow, { rowId: args.rowId });
        if (!row) {
            throw new Error(`Dataset row '${args.rowId}' not found`);
        }

        const dataset = await ctx.runQuery(api.research.dataset.getDataset, { datasetId: row.datasetId });
        if (!dataset) {
            throw new Error(`Dataset '${row.datasetId}' not found`);
        }

        const datasetContext = {
            rowId: row._id,
            datasetId: row.datasetId,
            entityName: row.entityName,
            fields: dataset.schema,
        };

        // Fetch review config from database
        const reviewConfig = await ctx.runQuery(
            internal.reviews.reviewConfigs.getReviewConfigByStringId,
            { id: args.reviewConfigId }
        );

        if (!reviewConfig) {
            throw new Error(`Review config '${args.reviewConfigId}' not found`);
        }

        // Fetch current cell values
        const cells = await ctx.runQuery(
            internal.research.dataset.getCellsForRow,
            { rowId: datasetContext.rowId }
        );

        // Build reviewer prompt with dynamic rubric
        const rubric = {
            criteria: reviewConfig.criteria,
            overallPassingScore: reviewConfig.overallPassingScore,
        };

        const reviewPrompt = buildReviewerPrompt(
            datasetContext.entityName,
            datasetContext.fields,
            cells,
            rubric
        );

        // Call reviewer agent with structured output
        const { object: reviewData } = await generateObject({
            model: smartChatModel,
            system: reviewConfig.customReviewPrompt
                ? `${reviewPrompt}\n\nAdditional Instructions:\n${reviewConfig.customReviewPrompt}`
                : reviewPrompt,
            prompt: "Please evaluate the research quality against the criteria.",
            schema: z.object({
                summary: z.string(),
                criteriaEvaluations: z.array(z.object({
                    criterionId: z.string(),
                    score: z.number(),
                    feedback: z.string(),
                    specificIssues: z.array(z.string()),
                })),
                actionableRecommendations: z.array(z.string()),
            }),
            ...chatModelProviderOptions,
        });

        // Calculate overall score based on rubric weights
        let totalScore = 0;
        for (const evaluation of reviewData.criteriaEvaluations) {
            const criterion = reviewConfig.criteria.find((c: any) => c.id === evaluation.criterionId);
            if (criterion) {
                totalScore += evaluation.score * criterion.weight;
            }
        }

        const passed = totalScore >= reviewConfig.overallPassingScore;

        // Record review in history
        await ctx.runMutation(
            internal.reviews.reviewConfigs.recordReview,
            {
                taskExecutionId: args.taskExecutionId,
                workflowId: args.workflowId,
                reviewConfigId: args.reviewConfigId,
                passed,
                overallScore: totalScore,
                criteriaScores: reviewData.criteriaEvaluations.map((e) => ({
                    criterionId: e.criterionId,
                    score: e.score,
                    feedback: e.feedback,
                    issues: e.specificIssues, // Map specificIssues to issues for storage
                })),
                summary: reviewData.summary,
                recommendations: reviewData.actionableRecommendations,
                attemptNumber: args.attemptNumber,
                totalAttempts: args.totalAttempts,
                wasRetried: args.attemptNumber > 1,
            }
        );

        return {
            passed,
            overallScore: totalScore,
            summary: reviewData.summary,
            actionableRecommendations: reviewData.actionableRecommendations || [],
            criteriaEvaluations: reviewData.criteriaEvaluations || [],
        };
    },
});

/**
 * Save review feedback as a system message in the thread
 */
export const saveReviewFeedbackMessage = internalMutation({
    args: {
        threadId: v.string(),
        reviewConfigId: v.string(),
        reviewResult: reviewResultSchema.pick("passed", "overallScore", "summary", "actionableRecommendations"),
    },
    returns: v.object({ messageId: v.string() }),
    handler: async (ctx, args) => {
        // Fetch review config to get passing score
        const reviewConfig = await ctx.db
            .query("reviewConfigs")
            .withIndex("by_review_config_id", (q) => q.eq("id", args.reviewConfigId))
            .first();

        const passingScore = reviewConfig?.overallPassingScore || 0.75;

        const feedbackMessage = dedent`
        ## 🔍 Quality Review Feedback

        **Overall Score**: ${(args.reviewResult.overallScore * 100).toFixed(0)}% (Passing: ${(passingScore * 100).toFixed(0)}%)
        **Status**: ${args.reviewResult.passed ? "✅ PASSED" : "❌ NEEDS IMPROVEMENT"}

        ${args.reviewResult.summary}

        ### Action Items:
        ${args.reviewResult.actionableRecommendations.map((r, i) => `${i + 1}. ${r}`).join("\n")}

        Please address the action items above and update the relevant dataset cells using the \`saveFieldValue\` tool.
        `;

        const { messageId } = await deepResearchAgent.saveMessage(
            ctx,
            {
                threadId: args.threadId,
                prompt: feedbackMessage,
            }
        );

        return { messageId };
    },
});

/**
 * Execute a single agent iteration for generic research
 */
export const runAgentStep = internalAction({
    args: {
        taskExecutionId: v.id("taskExecutions"),
        threadId: v.string(),
        promptMessageId: v.string(),
    },
    returns: v.object({
        finishReason: v.union(
            v.literal("stop"),
            v.literal("length"),
            v.literal("content-filter"),
            v.literal("tool-calls"),
            v.literal("error"),
            v.literal("other"),
            v.literal("unknown")
        ),
        text: v.string(),
    }),
    handler: async (ctx, args): Promise<{ finishReason: FinishReason; text: string }> => {
        const tools = await resolveTools(ctx, args.taskExecutionId);

        // Get dataset context if this is dataset research
        const datasetContext = await ctx.runQuery(
            internal.research.genericResearchWorkflow.getDatasetResearchContext,
            { taskExecutionId: args.taskExecutionId }
        );

        // Append dataset suffix if dataset research, otherwise use generic prompt only
        const systemPrompt = datasetContext
            ? genericResearchCoordinatorPrompt + buildDatasetResearchSuffix(datasetContext.entityName, datasetContext.fields)
            : genericResearchCoordinatorPrompt;

        const result = await deepResearchAgent.generateText(
            ctx,
            { threadId: args.threadId },
            {
                model: smartChatModel,
                system: systemPrompt,
                promptMessageId: args.promptMessageId,
                tools,
                stopWhen: [stepCountIs(1)],
                providerOptions: chatModelProviderOptions,
            }
        );

        return {
            finishReason: result.finishReason as FinishReason,
            text: result.text,
        };
    },
});

/**
 * Action to kickoff generic research workflow
 * Can be called standalone or as part of batch research
 * Handles both simple workflows and batch workflows with onComplete handlers
 */
export const kickoff = internalAction({
    args: {
        userPrompt: v.string(),
        batchId: v.optional(v.id("batchTaskOrchestrations")),
        target: v.optional(v.string()),
        outputFormat: v.optional(v.string()),
        // outputSchema removed - if dataset research, schema is in dataset table
        useOnCompleteHandler: v.optional(v.boolean()),
    },
    returns: v.id("taskExecutions"),
    handler: async (ctx, args): Promise<Id<"taskExecutions">> => {
        // Build context with optional fields
        const context: any = {};
        if (args.target) context.target = args.target;
        if (args.outputFormat) context.outputFormat = args.outputFormat;

        const taskExecutionId: Id<"taskExecutions"> = await ctx.runMutation(
            internal.orchestration.taskExecutions.createTaskExecution,
            {
                workflowName: "genericResearch",
                status: "queued",
                inputPrompt: args.userPrompt,
                batchId: args.batchId,
                context: Object.keys(context).length > 0 ? context : undefined,
            }
        );

        // Note: addTaskExecutionToBatch is now a no-op (taskExecutions queried by batchId)

        try {
            // Build workflow start options
            const workflowOptions: any = args.useOnCompleteHandler && args.batchId
                ? {
                    onComplete: internal.research.wideResearch.handleResearchComplete,
                    context: {
                        batchId: args.batchId,
                        target: args.target || "",
                        taskExecutionId,
                    },
                }
                : undefined;

            const workflowId: string = await workflow.start(
                ctx,
                internal.research.genericResearchWorkflow.genericResearchWorkflow,
                {
                    taskExecutionId,
                    userPrompt: args.userPrompt,
                    // outputSchema removed
                },
                workflowOptions
            );

            await ctx.runMutation(
                internal.orchestration.taskExecutions.updateTaskExecutionWorkflowId,
                {
                    taskExecutionId,
                    workflowId,
                }
            );

            return taskExecutionId;
        } catch (error: any) {
            console.error("Error in genericResearch.kickoff:", error);
            await ctx.runMutation(
                internal.orchestration.taskExecutions.markTaskExecutionAsFailed,
                {
                    taskExecutionId,
                    error: error.message,
                }
            );
            throw error;
        }
    },
});

