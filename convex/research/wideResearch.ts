import { v } from "convex/values";
import { internalMutation, internalAction, mutation, query } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { vWorkflowId } from "@convex-dev/workflow";
import { vResultValidator } from "@convex-dev/workpool";
import { nextBatchEvent } from "./batchResearchOrchestratorWorkflow";
import { workflow } from "../ai.config";
import { userProxyAgent } from "../messaging/chat";

/**
 * Get batch by tool call ID (for persistence across reloads)
 */
export const getBatchByToolCallId = query({
    args: {
        toolCallId: v.string(),
    },
    handler: async (ctx, args) => {
        const batch = await ctx.db
            .query("batchTaskOrchestrations")
            .withIndex("by_tool_call", q => q.eq("toolCallId", args.toolCallId))
            .first();

        return batch ?? null;
    },
});

/**
 * Start a batch of parallel research tasks
 * Called from the chat UI after user confirms the proposal
 * Now uses workflow orchestration with batching to respect rate limits
 * 
 * If outputSchema is provided, creates a dataset with rows for each target
 */
export const startBatchResearch = mutation({
    args: {
        datasetName: v.optional(v.string()),
        researchTask: v.string(),
        targets: v.array(v.string()),
        outputFormat: v.string(),
        outputSchema: v.optional(v.array(v.object({
            fieldId: v.string(),
            name: v.string(),
            type: v.union(
                v.literal("text"),
                v.literal("number"),
                v.literal("date"),
                v.literal("url"),
                v.literal("boolean")
            ),
            description: v.string(),
            required: v.boolean(),
        }))),
        toolCallId: v.optional(v.string()),
        threadId: v.optional(v.string()), // Thread ID for sending completion notifications
        concurrencyLimit: v.optional(v.number()), // Default to 1 for testing
        reviewConfigId: v.optional(v.string()), // Review config for quality control
    },
    handler: async (ctx, args) => {
        const concurrencyLimit = args.concurrencyLimit ?? 1; // Set to 1 for testing (change to 3 for production)

        // Create dataset if outputSchema provided
        let datasetId: Id<"datasets"> | undefined = undefined;
        if (args.outputSchema && args.outputSchema.length > 0) {
            const datasetName = args.datasetName || `Batch Research: ${args.researchTask}`;

            datasetId = await ctx.db.insert("datasets", {
                name: datasetName,
                description: `Dataset for batch research of ${args.targets.length} targets`,
                query: args.researchTask,
                schema: args.outputSchema,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });

            console.log(`[startBatchResearch] Created dataset "${datasetName}" (${datasetId}) with ${args.outputSchema.length} fields`);
        }

        // Create batch record with initial state
        const batchId = await ctx.db.insert("batchTaskOrchestrations", {
            toolCallId: args.toolCallId,
            threadId: args.threadId, // Store thread ID for completion notifications
            task: args.researchTask,
            targets: args.targets,
            outputFormat: args.outputFormat,
            datasetId,
            reviewConfigId: args.reviewConfigId, // Store review config
            status: "running",
            workflowId: undefined, // Will be set after workflow starts
            concurrencyLimit,
            // Initialize chunk tracking
            currentChunkIndex: 0,
            currentChunkTargets: [],
            currentChunkSize: 0,
            completedInCurrentChunk: 0,
            completedWorkflowIds: [],
            completedCount: 0,
            failedCount: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        try {
            // Start the orchestrator workflow directly from mutation
            const workflowId: string = await workflow.start(
                ctx,
                internal.research.batchResearchOrchestratorWorkflow.batchResearchOrchestrator,
                {
                    batchId,
                    targets: args.targets,
                    researchTask: args.researchTask,
                    concurrencyLimit,
                },
                {
                    onComplete: internal.research.wideResearch.handleOrchestratorComplete,
                    context: { batchId },
                }
            );

            // Store workflow ID on batch record
            await ctx.db.patch(batchId, {
                workflowId,
            });
        } catch (error: any) {
            console.error("Error starting orchestrator workflow:", error);
            await ctx.db.patch(batchId, {
                status: "failed",
                error: error.message,
            });
        }

        return batchId;
    },
});

/**
 * Initialize a chunk of research (called by orchestrator workflow)
 */
export const initChunk = internalMutation({
    args: {
        batchId: v.id("batchTaskOrchestrations"),
        chunkIndex: v.number(),
        chunkTargets: v.array(v.string()),
        chunkSize: v.number(),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        await ctx.db.patch(args.batchId, {
            currentChunkIndex: args.chunkIndex,
            currentChunkTargets: args.chunkTargets,
            currentChunkSize: args.chunkSize,
            completedInCurrentChunk: 0,
            updatedAt: Date.now(),
        });
        return null;
    },
});

/**
 * Start all research workflows in a chunk with onComplete handlers
 * If batch has a dataset, creates rows and links task executions to them
 */
export const startChunkWorkflows = internalMutation({
    args: {
        batchId: v.id("batchTaskOrchestrations"),
        chunkTargets: v.array(v.string()),
        researchTask: v.string(),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const batch = await ctx.db.get(args.batchId);
        if (!batch) {
            throw new Error("Batch not found");
        }

        // Schedule each research workflow with onComplete handler
        for (const target of args.chunkTargets) {
            const fullPrompt = `${args.researchTask}\n\nTarget: ${target}`;

            // Create task execution first
            const taskExecutionId = await ctx.db.insert("taskExecutions", {
                workflowName: "genericResearch",
                status: "queued",
                inputPrompt: fullPrompt,
                batchId: args.batchId,
                context: {
                    target,
                    outputFormat: batch.outputFormat,
                },
                startedAt: Date.now(),
            });

            console.log(`[startChunkWorkflows] Created taskExecution ${taskExecutionId} for target: ${target}`);

            // If batch has a dataset, create a row for this target and link to taskExecution
            if (batch.datasetId) {
                const dataset = await ctx.db.get(batch.datasetId);
                if (dataset) {
                    const rowId = await ctx.db.insert("datasetRows", {
                        datasetId: batch.datasetId,
                        taskExecutionId,
                        entityName: target,
                        entityType: "target",
                        totalCells: dataset.schema.length,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });

                    console.log(`[startChunkWorkflows] Created dataset row ${rowId} for ${target}`);

                    // Initialize all cells as empty
                    for (const field of dataset.schema) {
                        await ctx.db.insert("datasetCells", {
                            rowId,
                            fieldId: field.fieldId,
                            value: null,
                            status: "empty",
                            lastUpdated: Date.now(),
                        });
                    }

                    console.log(`[startChunkWorkflows] Initialized ${dataset.schema.length} cells for ${target}`);
                }
            }

            // Schedule the workflow to start using the pre-created taskExecutionId
            await ctx.scheduler.runAfter(
                0,
                internal.research.wideResearch.startTaskExecutionWorkflow,
                {
                    taskExecutionId,
                    userPrompt: fullPrompt,
                    batchId: args.batchId,
                    target,
                    outputFormat: batch.outputFormat,
                }
            );
        }

        return null;
    },
});

/**
 * Start a task execution workflow (called after task execution and dataset row are created)
 * This replaces the previous flow where kickoff created everything
 */
export const startTaskExecutionWorkflow = internalAction({
    args: {
        taskExecutionId: v.id("taskExecutions"),
        userPrompt: v.string(),
        batchId: v.id("batchTaskOrchestrations"),
        target: v.string(),
        outputFormat: v.string(),
        queueItemId: v.optional(v.id("userWorkQueue")),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        try {
            // Start the workflow using the existing genericResearchWorkflow
            const workflowId: string = await workflow.start(
                ctx,
                internal.research.genericResearchWorkflow.genericResearchWorkflow,
                {
                    taskExecutionId: args.taskExecutionId,
                    userPrompt: args.userPrompt,
                },
                {
                    onComplete: internal.research.wideResearch.handleResearchComplete,
                    context: {
                        batchId: args.batchId,
                        target: args.target,
                        taskExecutionId: args.taskExecutionId,
                        queueItemId: args.queueItemId,
                    },
                }
            );

            // Update task execution with workflow ID
            await ctx.runMutation(
                internal.orchestration.taskExecutions.updateTaskExecutionWorkflowId,
                {
                    taskExecutionId: args.taskExecutionId,
                    workflowId,
                }
            );

            console.log(`[startTaskExecutionWorkflow] Started workflow ${workflowId} for ${args.target}`);
        } catch (error: any) {
            console.error(`[startTaskExecutionWorkflow] Error starting workflow for ${args.target}:`, error);
            await ctx.runMutation(
                internal.orchestration.taskExecutions.markTaskExecutionAsFailed,
                {
                    taskExecutionId: args.taskExecutionId,
                    error: error.message,
                }
            );
        }

        return null;
    },
});

/**
 * Handle completion of an individual research workflow
 * This is the critical function that increments the counter and fires the event
 */
export const handleResearchComplete = internalMutation({
    args: {
        workflowId: vWorkflowId,
        result: vResultValidator,
        context: v.object({
            batchId: v.id("batchTaskOrchestrations"),
            target: v.string(),
            taskExecutionId: v.id("taskExecutions"),
            queueItemId: v.optional(v.id("userWorkQueue")),
        }),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const batch = await ctx.db.get(args.context.batchId);
        if (!batch) {
            console.error("Batch not found:", args.context.batchId);
            return null;
        }

        console.log(`[handleResearchComplete] Research for "${args.context.target}" completed with status: ${args.result.kind}`);

        // Check idempotency: have we already counted this workflow?
        if (batch.completedWorkflowIds.includes(args.workflowId)) {
            console.log(`[handleResearchComplete] Workflow ${args.workflowId} already counted, skipping`);
            return null;
        }

        // Guard: Don't count if we've already reached total (safety check)
        const currentTotal = batch.completedCount + batch.failedCount;
        if (currentTotal >= batch.targets.length) {
            console.warn(`[handleResearchComplete] Already at max targets (${currentTotal}/${batch.targets.length}), skipping count for ${args.context.target}`);
            return null;
        }

        // Count both success and failure toward completion
        const isSuccess = args.result.kind === "success";
        const isFailed = args.result.kind === "failed" || args.result.kind === "canceled";

        // Increment counters atomically
        const newCompletedInChunk = batch.completedInCurrentChunk + 1;
        const newCompletedCount = batch.completedCount + (isSuccess ? 1 : 0);
        const newFailedCount = batch.failedCount + (isFailed ? 1 : 0);

        await ctx.db.patch(args.context.batchId, {
            completedInCurrentChunk: newCompletedInChunk,
            completedCount: newCompletedCount,
            failedCount: newFailedCount,
            completedWorkflowIds: [...batch.completedWorkflowIds, args.workflowId],
            updatedAt: Date.now(),
        });

        // Release concurrency slot if this task was queued through the user work queue
        if (args.context.queueItemId) {
            await ctx.runMutation(internal.concurrency.workQueue.completeQueuedTask, {
                queueItemId: args.context.queueItemId,
                success: isSuccess,
            });
        }

        console.log(`[handleResearchComplete] Progress: ${newCompletedInChunk}/${batch.currentChunkSize} in current chunk`);
        console.log(`[handleResearchComplete] Global progress: ${newCompletedCount + newFailedCount}/${batch.targets.length} total`);

        // If chunk is complete, fire event to orchestrator (but only if there are more chunks)
        if (newCompletedInChunk === batch.currentChunkSize) {
            const totalCompleted = newCompletedCount + newFailedCount;
            const isLastChunk = totalCompleted >= batch.targets.length;

            if (isLastChunk) {
                console.log(`[handleResearchComplete] Last chunk complete! No event needed, orchestrator will finalize.`);
            } else {
                console.log(`[handleResearchComplete] Chunk complete! Firing nextBatch event for next chunk.`);

                if (batch.workflowId) {
                    await workflow.sendEvent(
                        ctx,
                        batch.workflowId as any, // WorkflowId type
                        nextBatchEvent,
                        {}
                    );
                }
            }
        }

        return null;
    },
});

/**
 * Handle completion of orchestrator workflow
 */
export const handleOrchestratorComplete = internalMutation({
    args: {
        workflowId: vWorkflowId,
        result: vResultValidator,
        context: v.object({
            batchId: v.id("batchTaskOrchestrations"),
        }),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const batch = await ctx.db.get(args.context.batchId);
        if (!batch) {
            console.error("Batch not found:", args.context.batchId);
            return null;
        }

        if (args.result.kind === "success") {
            console.log(`[handleOrchestratorComplete] Orchestrator completed successfully`);
            // Already marked as completed by finalizeBatch
        } else if (args.result.kind === "failed") {
            console.error(`[handleOrchestratorComplete] Orchestrator failed:`, args.result.error);
            await ctx.db.patch(args.context.batchId, {
                status: "failed",
                error: args.result.error,
                updatedAt: Date.now(),
            });
        } else if (args.result.kind === "canceled") {
            console.log(`[handleOrchestratorComplete] Orchestrator canceled`);
            await ctx.db.patch(args.context.batchId, {
                status: "cancelled",
                updatedAt: Date.now(),
            });
        }

        return null;
    },
});

/**
 * Finalize batch after all chunks complete (called by orchestrator)
 */
export const finalizeBatch = internalMutation({
    args: {
        batchId: v.id("batchTaskOrchestrations"),
    },
    handler: async (ctx, args) => {
        const batch = await ctx.db.get(args.batchId);
        if (!batch) {
            throw new Error("Batch not found");
        }

        // Guard: Don't finalize if already finalized
        if (batch.status === "completed" || batch.status === "failed" || batch.status === "cancelled") {
            console.log(`[finalizeBatch] Batch already finalized with status: ${batch.status}, skipping`);
            return null;
        }

        // Determine final status
        const totalTargets = batch.targets.length;
        const completedPlusFailed = batch.completedCount + batch.failedCount;

        // Log warning if counts don't match
        if (completedPlusFailed > totalTargets) {
            console.error(`[finalizeBatch] WARNING: Completed+Failed (${completedPlusFailed}) exceeds total targets (${totalTargets})!`);
        }

        let finalStatus: "completed" | "failed" = "completed";
        if (batch.failedCount === totalTargets) {
            finalStatus = "failed";
        }

        await ctx.db.patch(args.batchId, {
            status: finalStatus,
            updatedAt: Date.now(),
        });

        console.log(`[finalizeBatch] Batch completed: ${batch.completedCount} succeeded, ${batch.failedCount} failed out of ${totalTargets} total`);

        // Send completion notification to thread if threadId is available
        if (batch.threadId) {
            console.log(`[finalizeBatch] Scheduling completion notification to thread ${batch.threadId}`);
            await ctx.scheduler.runAfter(0, internal.research.wideResearch.sendBatchCompletionNotification, {
                batchId: args.batchId,
                threadId: batch.threadId,
            });
        }

        return null;
    },
});

/**
 * Get batch data for notification (internal helper)
 */
export const getBatchDataForNotification = internalMutation({
    args: {
        batchId: v.id("batchTaskOrchestrations"),
    },
    returns: v.union(
        v.object({
            totalTargets: v.number(),
            completedCount: v.number(),
            failedCount: v.number(),
            datasetName: v.string(),
            datasetId: v.optional(v.id("datasets")),
        }),
        v.null()
    ),
    handler: async (ctx, args) => {
        const batch = await ctx.db.get(args.batchId);
        if (!batch) {
            return null;
        }

        // Get dataset name if available
        let datasetName = "batch research";
        let datasetId: Id<"datasets"> | undefined = undefined;
        if (batch.datasetId) {
            const dataset = await ctx.db.get(batch.datasetId);
            if (dataset) {
                datasetName = dataset.name;
                datasetId = dataset._id;
            }
        }

        return {
            totalTargets: batch.targets.length,
            completedCount: batch.completedCount,
            failedCount: batch.failedCount,
            datasetName,
            datasetId,
        };
    },
});

/**
 * Send completion notification to thread after batch completes
 */
export const sendBatchCompletionNotification = internalAction({
    args: {
        batchId: v.id("batchTaskOrchestrations"),
        threadId: v.string(),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        // Fetch batch data using internal mutation to access database
        const batchData = await ctx.runMutation(internal.research.wideResearch.getBatchDataForNotification, {
            batchId: args.batchId,
        });

        if (!batchData) {
            console.error(`[sendBatchCompletionNotification] Batch ${args.batchId} not found`);
            return null;
        }

        const { totalTargets, completedCount, failedCount, datasetName, datasetId } = batchData;

        // Build completion message
        const statusEmoji = failedCount === totalTargets ? "❌" : completedCount === totalTargets ? "✅" : "⚠️";
        let message = `${statusEmoji} **Batch Research Complete**: ${datasetName}\n\n`;

        if (completedCount > 0) {
            message += `✅ **${completedCount}** target${completedCount > 1 ? 's' : ''} completed successfully\n`;
        }
        if (failedCount > 0) {
            message += `❌ **${failedCount}** target${failedCount > 1 ? 's' : ''} failed\n`;
        }
        message += `\n📊 **Total**: ${totalTargets} target${totalTargets > 1 ? 's' : ''} researched`;

        // Add dataset link if available
        if (datasetId) {
            message += `\n\n🔗 [View Results](#/datasets/${datasetId})`;
        }

        // Send message to thread
        try {
            await userProxyAgent.saveMessage(ctx, {
                threadId: args.threadId,
                message: {
                    role: "assistant",
                    content: [{ type: "text", text: message }],
                },
                skipEmbeddings: true,
            });
            console.log(`[sendBatchCompletionNotification] Sent completion notification to thread ${args.threadId}`);
        } catch (error: any) {
            console.error(`[sendBatchCompletionNotification] Error sending notification:`, error);
        }

        return null;
    },
});

/**
 * Get batch with all its research task executions
 */
export const getBatchWithResearch = query({
    args: {
        batchId: v.id("batchTaskOrchestrations"),
    },
    handler: async (ctx, args) => {
        const batch = await ctx.db.get(args.batchId);
        if (!batch) {
            return null;
        }

        // Get all task executions for this batch using the batchId index
        const batchTasks = await ctx.db
            .query("taskExecutions")
            .withIndex("by_batchId", q => q.eq("batchId", args.batchId))
            .collect();

        return {
            ...batch,
            research: batchTasks,
        };
    },
});

/**
 * List all batch research jobs
 */
export const listBatchResearch = query({
    args: {
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit ?? 20;
        return await ctx.db
            .query("batchTaskOrchestrations")
            .order("desc")
            .take(limit);
    },
});

/**
 * Cancel a batch research job
 */
export const cancelBatchResearch = mutation({
    args: {
        batchId: v.id("batchTaskOrchestrations"),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const batch = await ctx.db.get(args.batchId);
        if (!batch) {
            throw new Error("Batch not found");
        }

        if (batch.status === "completed" || batch.status === "failed") {
            throw new Error("Cannot cancel completed or failed batch");
        }

        await ctx.db.patch(args.batchId, {
            status: "cancelled",
            updatedAt: Date.now(),
        });

        // Cancel all associated task executions using the batchId index
        const batchTasks = await ctx.db
            .query("taskExecutions")
            .withIndex("by_batchId", q => q.eq("batchId", args.batchId))
            .collect();

        for (const task of batchTasks) {
            if (task.status !== "completed" && task.status !== "failed") {
                await ctx.db.patch(task._id, {
                    status: "failed",
                    error: "Cancelled by user",
                });
            }
        }

        return null;
    },
});

