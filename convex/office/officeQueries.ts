import { v } from "convex/values";
import { query } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Get all active task executions with their latest steps
 * Maps to office employees
 */
export const getActiveTaskExecutions = query({
    args: {},
    returns: v.array(v.object({
        _id: v.id("taskExecutions"),
        workflowName: v.string(),
        status: v.union(
            v.literal("queued"),
            v.literal("running"),
            v.literal("awaiting_input"),
            v.literal("completed"),
            v.literal("failed")
        ),
        inputPrompt: v.string(),
        startedAt: v.number(),
        completedAt: v.optional(v.number()),
        latestStep: v.optional(v.object({
            stepName: v.string(),
            message: v.optional(v.string()),
            progress: v.optional(v.number()),
            createdAt: v.number(),
        })),
        context: v.optional(v.any()),
    })),
    handler: async (ctx) => {
        // Get all task executions from the last 24 hours
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const taskExecutions = await ctx.db
            .query("taskExecutions")
            .filter((q) => q.gte(q.field("startedAt"), oneDayAgo))
            .order("desc")
            .take(50); // Limit to 50 most recent

        // For each task execution, get the latest step
        const result = [];
        for (const task of taskExecutions) {
            const latestStep = await ctx.db
                .query("taskExecutionSteps")
                .withIndex("by_taskExecution", (q) => q.eq("taskExecutionId", task._id))
                .order("desc")
                .first();

            result.push({
                _id: task._id,
                workflowName: task.workflowName,
                status: task.status,
                inputPrompt: task.inputPrompt,
                startedAt: task.startedAt,
                completedAt: task.completedAt,
                latestStep: latestStep ? {
                    stepName: latestStep.stepName,
                    message: latestStep.message,
                    progress: latestStep.progress,
                    createdAt: latestStep.createdAt,
                } : undefined,
                context: task.context,
            });
        }

        return result;
    },
});

/**
 * Get task execution steps for a specific task
 * Used when clicking on a desk to see execution logs
 */
export const getTaskExecutionSteps = query({
    args: {
        taskExecutionId: v.id("taskExecutions"),
    },
    returns: v.array(v.object({
        _id: v.id("taskExecutionSteps"),
        stepName: v.string(),
        message: v.optional(v.string()),
        detail: v.optional(v.string()),
        progress: v.optional(v.number()),
        createdAt: v.number(),
    })),
    handler: async (ctx, args) => {
        const steps = await ctx.db
            .query("taskExecutionSteps")
            .withIndex("by_taskExecution", (q) => q.eq("taskExecutionId", args.taskExecutionId))
            .order("asc")
            .collect();

        return steps.map((step) => ({
            _id: step._id,
            stepName: step.stepName,
            message: step.message,
            detail: step.detail,
            progress: step.progress,
            createdAt: step.createdAt,
        }));
    },
});

/**
 * Get statistics for the office dashboard
 */
export const getOfficeStats = query({
    args: {},
    returns: v.object({
        totalTasks: v.number(),
        activeTasks: v.number(),
        completedTasks: v.number(),
        failedTasks: v.number(),
    }),
    handler: async (ctx) => {
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

        const allTasks = await ctx.db
            .query("taskExecutions")
            .filter((q) => q.gte(q.field("startedAt"), oneDayAgo))
            .collect();

        return {
            totalTasks: allTasks.length,
            activeTasks: allTasks.filter((t) => t.status === "running" || t.status === "queued").length,
            completedTasks: allTasks.filter((t) => t.status === "completed").length,
            failedTasks: allTasks.filter((t) => t.status === "failed").length,
        };
    },
});

