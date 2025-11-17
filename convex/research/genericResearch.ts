import { v } from "convex/values";
import { internalMutation, query } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Save research results to a task execution
 * Creates artifacts for the report and optional structured output
 * 
 * Note: For dataset research (where agent uses saveFieldValue tool),
 * this function is still called to save the final report summary.
 * The structured data is already saved incrementally to dataset cells.
 */
export const saveResearchResults = internalMutation({
    args: {
        taskExecutionId: v.id("taskExecutions"),
        report: v.string(),
        structuredOutput: v.optional(v.any()), // Optional: only for non-dataset research
    },
    returns: v.object({
        reportArtifactId: v.id("artifacts"),
        structuredOutputArtifactId: v.optional(v.id("artifacts")),
    }),
    handler: async (ctx, args) => {
        const task = await ctx.db.get(args.taskExecutionId);
        if (!task) {
            throw new Error("Task execution not found");
        }

        // Always create report artifact
        const reportArtifactId = await ctx.db.insert("artifacts", {
            taskExecutionId: args.taskExecutionId,
            name: `${task.workflowName} - Research Report`,
            type: "report",
            description: `Research report for: ${task.inputPrompt}`,
            content: args.report,
            format: "markdown",
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        // Create structured output artifact only if provided (non-dataset research)
        let structuredOutputArtifactId: Id<"artifacts"> | undefined;
        if (args.structuredOutput) {
            structuredOutputArtifactId = await ctx.db.insert("artifacts", {
                taskExecutionId: args.taskExecutionId,
                name: `${task.workflowName} - Structured Data`,
                type: "document",
                description: `Structured output for: ${task.inputPrompt}`,
                content: args.structuredOutput,
                format: "json",
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
        }

        return {
            reportArtifactId,
            structuredOutputArtifactId,
        };
    },
});

