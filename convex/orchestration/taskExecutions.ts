import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "../_generated/server";
import { internal } from "../_generated/api";
import { paginationOptsValidator } from "convex/server";
import { Doc, Id } from "../_generated/dataModel";
import { taskExecutionStatusSchema, createTaskExecutionArgs, updateTaskExecutionStatusArgs, taskExecutionSchema } from "./schema";

export const createTaskExecution = internalMutation({
    args: createTaskExecutionArgs.pick("workflowName", "status", "inputPrompt", "batchId", "context"),
    returns: v.id("taskExecutions"),
    handler: async (ctx, args) => {
        const taskExecutionId = await ctx.db.insert("taskExecutions", {
            status: args.status,
            inputPrompt: args.inputPrompt,
            startedAt: new Date().getTime(),
            workflowName: args.workflowName,
            batchId: args.batchId,
            context: args.context,
        });
        return taskExecutionId;
    },
});

export const updateTaskExecutionStatus = internalMutation({
    args: updateTaskExecutionStatusArgs,
    returns: v.null(),
    handler: async (ctx, args) => {
        await ctx.db.patch(args.taskExecutionId, {
            status: args.status,
        });
    },
});

export const markTaskExecutionAsFailed = internalMutation({
    args: {
        taskExecutionId: v.id("taskExecutions"),
        error: v.string(),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        await ctx.db.patch(args.taskExecutionId, {
            status: "failed",
            error: args.error,
        });
    },
});

export const updateTaskExecutionThreadId = internalMutation({
    args: {
        taskExecutionId: v.id("taskExecutions"),
        threadId: v.string(),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        await ctx.db.patch(args.taskExecutionId, {
            threadId: args.threadId,
        });
    },
});

export const updateTaskExecutionContext = internalMutation({
    args: {
        taskExecutionId: v.id("taskExecutions"),
        context: v.any(),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        await ctx.db.patch(args.taskExecutionId, {
            context: args.context,
        });
    },
});

/**
 * Link a task execution to a created/modified business entity
 * Creates a record in the outputEntities table
 */
export const linkTaskExecutionResult = internalMutation({
    args: {
        taskExecutionId: v.id("taskExecutions"),
        outputEntity: v.union(
            v.object({
                table: v.literal("buyers"),
                id: v.id("buyers")
            }),
            v.object({
                table: v.literal("sellerAnalysisSessions"),
                id: v.id("sellerAnalysisSessions")
            })
        ),
    },
    returns: v.id("outputEntities"),
    handler: async (ctx, args) => {
        // Map table name to entity type
        const entityType = args.outputEntity.table === "buyers"
            ? "buyer" as const
            : "sellerAnalysisSession" as const;

        // Create record in outputEntities table
        const outputEntityId = await ctx.db.insert("outputEntities", {
            taskExecutionId: args.taskExecutionId,
            entityType,
            entityId: args.outputEntity.id,
            createdAt: Date.now(),
        });

        return outputEntityId;
    },
});


export const writeScratchpad = internalMutation({
    args: {
        taskExecutionId: v.id("taskExecutions"),
        scratchpad: v.string(),
        workflowProgress: v.optional(v.string()),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        await ctx.db.patch(args.taskExecutionId, {
            scratchpad: args.scratchpad,
            workflowProgress: args.workflowProgress,
        });
    },
});

export const replaceScratchpadString = internalMutation({
    args: {
        taskExecutionId: v.id("taskExecutions"),
        oldString: v.string(),
        newString: v.string(),
        workflowProgress: v.optional(v.string()),
    },
    returns: v.string(),
    handler: async (ctx, args) => {
        // Do a string.replace with the diff between the existing scratchpad and the new scratchpad
        const existingScratchpad = await ctx.db.get(args.taskExecutionId);
        if (!existingScratchpad) {
            throw new Error("Task execution not found");
        }
        const newScratchpad = existingScratchpad.scratchpad?.replace(args.oldString, args.newString) ?? args.newString;
        if (!newScratchpad) {
            throw new Error("Failed to replace scratchpad");
        }
        await ctx.db.patch(args.taskExecutionId, {
            scratchpad: newScratchpad,
            workflowProgress: args.workflowProgress,
        });
        return newScratchpad;
    },
});

export const iReadScratchpad = internalQuery({
    args: {
        taskExecutionId: v.id("taskExecutions"),
    },
    returns: v.string(),
    handler: async (ctx, args) => {
        const scratchpad = await ctx.db.get(args.taskExecutionId);
        return scratchpad?.scratchpad ?? "Empty scratchpad";
    },
});

export const iGetTaskExecution = internalQuery({
    args: {
        taskExecutionId: v.id("taskExecutions"),
    },
    returns: v.union(taskExecutionSchema.extend({
        _id: v.id("taskExecutions"),
        _creationTime: v.number(),
    }), v.null()),
    handler: async (ctx, args) => {
        return await ctx.db.get(args.taskExecutionId);
    },
});

export const readScratchpad = query({
    args: {
        taskExecutionId: v.id("taskExecutions"),
    },
    returns: v.string(),
    handler: async (ctx, args): Promise<string> => {
        const identity = ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Unauthorized");
        }
        return await ctx.runQuery(internal.orchestration.taskExecutions.iReadScratchpad, {
            taskExecutionId: args.taskExecutionId,
        });
    },
});

// Public queries for frontend
export const listTaskExecutions = query({
    args: {
        limit: v.optional(v.number()),
    },
    returns: v.array(taskExecutionSchema.extend({
        _id: v.id("taskExecutions"),
        _creationTime: v.number(),
    })),
    handler: async (ctx, args) => {
        const limit = args.limit ?? 50;
        return await ctx.db.query("taskExecutions")
            .order("desc")
            .take(limit);
    },
});

// TypeScript type for compile-time safety on frontend
export type TaskExecutionGroupedPage = {
    batches: Array<{
        batchId: Id<"batchTaskOrchestrations">;
        tasks: Doc<"taskExecutions">[];
        status: "queued" | "running" | "completed" | "failed";
        startedAt: number;
        completedAt?: number;
        task?: string; // Task description from batchTaskOrchestrations
        targets?: string[];
    }>;
    standaloneTasks: Doc<"taskExecutions">[];
};

export type TaskExecutionGroupedResult = {
    page: TaskExecutionGroupedPage;
    isDone: boolean;
    continueCursor: string | null;
};

/**
 * List task executions grouped by batch ID with pagination
 * Returns standalone tasks and batched tasks separately
 */
export const listTaskExecutionsGrouped = query({
    args: {
        paginationOpts: paginationOptsValidator,
    },
    returns: v.object({
        page: v.object({
            batches: v.array(v.object({
                batchId: v.id("batchTaskOrchestrations"),
                tasks: v.array(taskExecutionSchema.extend({
                    _id: v.id("taskExecutions"),
                    _creationTime: v.number(),
                })),
                status: v.union(v.literal("queued"), v.literal("running"), v.literal("completed"), v.literal("failed")),
                startedAt: v.number(),
                completedAt: v.optional(v.number()),
                task: v.optional(v.string()),
                targets: v.optional(v.array(v.string())),
            })),
            standaloneTasks: v.array(taskExecutionSchema.extend({
                _id: v.id("taskExecutions"),
                _creationTime: v.number(),
            })),
        }),
        isDone: v.boolean(),
        continueCursor: v.union(v.string(), v.null()),
    }),
    handler: async (ctx, args): Promise<TaskExecutionGroupedResult> => {
        const result = await ctx.db.query("taskExecutions")
            .order("desc")
            .paginate(args.paginationOpts);

        // Separate tasks with batchId from standalone tasks
        const tasksWithBatch: Array<Doc<"taskExecutions">> = [];
        const standaloneTasks: Array<Doc<"taskExecutions">> = [];

        for (const task of result.page) {
            if (task.batchId) {
                tasksWithBatch.push(task);
            } else {
                standaloneTasks.push(task);
            }
        }

        // Group tasks by batchId
        const batchMap: Record<Id<"batchTaskOrchestrations">, Array<Doc<"taskExecutions">>> = {};
        for (const task of tasksWithBatch) {
            const batchId = task.batchId!;
            if (!batchMap[batchId]) {
                batchMap[batchId] = [];
            }
            batchMap[batchId].push(task);
        }

        // Fetch all batch metadata once
        const batchIds = Object.keys(batchMap) as Id<"batchTaskOrchestrations">[];
        const batchInfos = await Promise.all(
            batchIds.map(batchId => ctx.db.get(batchId))
        );
        const batchInfoMap = new Map(
            batchIds.map((id, index) => [id, batchInfos[index]])
        );

        // Create batch summaries with batch metadata
        const batches = Object.entries(batchMap).map(([batchId, tasks]) => {
            // Determine overall batch status
            const hasRunning = tasks.some(t => t.status === "running");
            const hasFailed = tasks.some(t => t.status === "failed");
            const hasQueued = tasks.some(t => t.status === "queued");
            const allCompleted = tasks.every(t => t.status === "completed");

            let status: "queued" | "running" | "completed" | "failed";
            if (hasFailed) {
                status = "failed";
            } else if (hasRunning) {
                status = "running";
            } else if (hasQueued) {
                status = "queued";
            } else if (allCompleted) {
                status = "completed";
            } else {
                status = "running"; // default
            }

            // Get earliest startedAt and latest completedAt
            const startedAt = Math.min(...tasks.map(t => t.startedAt));
            const completedAts = tasks.map(t => t.completedAt).filter(Boolean) as number[];
            const completedAt = completedAts.length === tasks.length
                ? Math.max(...completedAts)
                : undefined;

            // Lookup batch metadata from pre-fetched map
            const batchInfo = batchInfoMap.get(batchId as Id<"batchTaskOrchestrations">);
            const task = batchInfo ? batchInfo.task : undefined;
            const targets = batchInfo && "targets" in batchInfo ? batchInfo.targets : undefined;

            return {
                batchId: batchId as Id<"batchTaskOrchestrations">,
                tasks: tasks.sort((a, b) => b.startedAt - a.startedAt),
                status,
                startedAt,
                completedAt,
                task,
                targets,
            };
        });

        // Sort batches by most recent startedAt
        batches.sort((a, b) => b.startedAt - a.startedAt);

        // Return grouped results with pagination info
        return {
            page: {
                batches,
                standaloneTasks,
            },
            isDone: result.isDone,
            continueCursor: result.continueCursor,
        };
    },
});

export const getTaskExecution = query({
    args: {
        taskExecutionId: v.id("taskExecutions"),
    },
    returns: v.union(taskExecutionSchema.extend({
        _id: v.id("taskExecutions"),
        _creationTime: v.number(),
    }), v.null()),
    handler: async (ctx, args) => {
        return await ctx.db.get(args.taskExecutionId);
    },
});

export const getTaskExecutionsByStatus = query({
    args: {
        status: taskExecutionStatusSchema,
        limit: v.optional(v.number()),
    },
    returns: v.array(taskExecutionSchema.extend({
        _id: v.id("taskExecutions"),
        _creationTime: v.number(),
    })),
    handler: async (ctx, args) => {
        const limit = args.limit ?? 50;
        return await ctx.db.query("taskExecutions")
            .withIndex("by_status", (q) => q.eq("status", args.status))
            .order("desc")
            .take(limit);
    },
});

export const getTaskExecutionOutputEntities = query({
    args: {
        taskExecutionId: v.id("taskExecutions"),
    },
    returns: v.array(v.any()),
    handler: async (ctx, args) => {
        return await ctx.db
            .query("outputEntities")
            .withIndex("by_task", (q) => q.eq("taskExecutionId", args.taskExecutionId))
            .collect();
    },
});

// New mutations for workflow integration
export const updateTaskExecutionWorkflowId = internalMutation({
    args: {
        taskExecutionId: v.id("taskExecutions"),
        workflowId: v.string(),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        await ctx.db.patch(args.taskExecutionId, {
            workflowId: args.workflowId,
            status: "running",
        });
    },
});

export const markTaskExecutionAsCompleted = internalMutation({
    args: {
        taskExecutionId: v.id("taskExecutions"),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        await ctx.db.patch(args.taskExecutionId, {
            status: "completed",
            completedAt: Date.now(),
        });
    },
});