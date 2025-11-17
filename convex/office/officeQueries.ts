import { v } from "convex/values";
import { query } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { getCurrentUserId } from "../auth/helpers";

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

/**
 * Get work queue items with worker assignments for the current user
 * Maps workers to their assigned tasks (running + queued)
 */
export const getUserWorkQueueWithWorkers = query({
    args: {},
    returns: v.array(v.object({
        workerId: v.union(v.number(), v.null()),
        queueItemId: v.id("userWorkQueue"),
        taskExecutionId: v.id("taskExecutions"),
        status: v.union(
            v.literal("queued"),
            v.literal("running"),
            v.literal("completed"),
            v.literal("failed")
        ),
        priority: v.number(),
        enqueuedAt: v.number(),
        startedAt: v.optional(v.number()),
        // Task execution details
        taskExecution: v.optional(v.object({
            _id: v.id("taskExecutions"),
            status: v.union(
                v.literal("queued"),
                v.literal("running"),
                v.literal("awaiting_input"),
                v.literal("completed"),
                v.literal("failed")
            ),
            inputPrompt: v.string(),
            latestStep: v.optional(v.object({
                stepName: v.string(),
                message: v.optional(v.string()),
                progress: v.optional(v.number()),
                createdAt: v.number(),
            })),
        })),
    })),
    handler: async (ctx) => {
        const userId = await getCurrentUserId(ctx);
        if (!userId) {
            return [];
        }

        // Get all work queue items for this user (queued + running)
        const queueItems = await ctx.db
            .query("userWorkQueue")
            .withIndex("by_userId_and_status", (q) =>
                q.eq("userId", userId).eq("status", "running")
            )
            .collect();

        const queuedItems = await ctx.db
            .query("userWorkQueue")
            .withIndex("by_userId_and_status", (q) =>
                q.eq("userId", userId).eq("status", "queued")
            )
            .collect();

        const allItems = [...queueItems, ...queuedItems];

        // Fetch task execution details for each item
        const result = [];
        for (const item of allItems) {
            const taskExecution = await ctx.db.get(item.taskExecutionId);
            if (!taskExecution) continue;

            // Get latest step
            const latestStep = await ctx.db
                .query("taskExecutionSteps")
                .withIndex("by_taskExecution", (q) => q.eq("taskExecutionId", item.taskExecutionId))
                .order("desc")
                .first();

            result.push({
                workerId: item.workerId ?? null,
                queueItemId: item._id,
                taskExecutionId: item.taskExecutionId,
                status: item.status,
                priority: item.priority,
                enqueuedAt: item.enqueuedAt,
                startedAt: item.startedAt,
                taskExecution: {
                    _id: taskExecution._id,
                    status: taskExecution.status,
                    inputPrompt: taskExecution.inputPrompt,
                    latestStep: latestStep ? {
                        stepName: latestStep.stepName,
                        message: latestStep.message,
                        progress: latestStep.progress,
                        createdAt: latestStep.createdAt,
                    } : undefined,
                },
            });
        }

        return result;
    },
});

/**
 * Get worker assignments mapped to desks
 * Returns a mapping of workerId -> deskId -> tasks
 */
export const getWorkerDeskMapping = query({
    args: {},
    returns: v.object({
        maxWorkers: v.number(),
        workers: v.array(v.object({
            workerId: v.number(),
            deskId: v.string(),
            currentTask: v.optional(v.id("taskExecutions")),
            queuedTasks: v.array(v.id("taskExecutions")),
            runningTasks: v.array(v.id("taskExecutions")),
        })),
    }),
    handler: async (ctx) => {
        const userId = await getCurrentUserId(ctx);
        if (!userId) {
            return { maxWorkers: 0, workers: [] };
        }

        // Get worker count from database subscription
        // Note: Queries cannot call Autumn directly (uses fetch()).
        // This reads from cached subscription data.
        const subscription = await ctx.db
            .query("userSubscriptions")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .first();

        const maxWorkers = subscription?.purchasedWorkers ?? 3;

        // Get all work queue items
        const queueItems = await ctx.db
            .query("userWorkQueue")
            .withIndex("by_userId_and_status", (q) => q.eq("userId", userId))
            .collect();

        // Group by workerId
        const workerMap = new Map<number, {
            workerId: number;
            queuedTasks: Id<"taskExecutions">[];
            runningTasks: Id<"taskExecutions">[];
        }>();

        for (const item of queueItems) {
            if (item.workerId === undefined) continue;

            if (!workerMap.has(item.workerId)) {
                workerMap.set(item.workerId, {
                    workerId: item.workerId,
                    queuedTasks: [],
                    runningTasks: [],
                });
            }

            const worker = workerMap.get(item.workerId)!;
            if (item.status === "running") {
                worker.runningTasks.push(item.taskExecutionId);
            } else if (item.status === "queued") {
                worker.queuedTasks.push(item.taskExecutionId);
            }
        }

        // Map workers to desks (workerId -> deskId)
        const workers = Array.from(workerMap.values()).map((worker) => {
            // Consistent mapping: workerId maps to desk index
            const deskIndex = worker.workerId % 10; // 10 desks
            const deskId = `desk-${Math.floor(deskIndex / 5)}-${deskIndex % 5}`;

            return {
                workerId: worker.workerId,
                deskId,
                currentTask: worker.runningTasks[0], // First running task
                queuedTasks: worker.queuedTasks,
                runningTasks: worker.runningTasks,
            };
        });

        return {
            maxWorkers,
            workers,
        };
    },
});

