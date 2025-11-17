/**
 * Office Visualization Queries
 * 
 * Architecture: Work Queue Based System
 * =====================================
 * The office visualization is now fully based on the work queue system:
 * 
 * 1. Workers are assigned to desks (workerId -> desk mapping in frontend)
 * 2. Tasks are queued and assigned to specific workers (userWorkQueue table)
 * 3. UI shows worker capacity, active tasks, and queue depth per worker
 * 
 * Key Queries:
 * - getWorkerDeskMapping: Returns max workers and which workers have tasks
 * - getUserWorkQueueWithWorkers: Returns all queue items with full task details
 * - getTaskExecutionSteps: Returns execution log for a specific task
 * - getOfficeStats: Returns aggregate statistics for the dashboard
 * 
 * Note: Old employee-based queries removed in favor of queue-first approach
 */

import { v } from "convex/values";
import { query } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { getCurrentUserId } from "../auth/helpers";

/**
 * Get task execution steps for a specific task
 * Used when clicking on a desk/employee to see execution logs
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
 * Get worker capacity for current user
 * Returns the max number of workers (for desk/employee rendering)
 * and summary of which workers have active tasks
 */
export const getWorkerDeskMapping = query({
    args: {},
    returns: v.object({
        maxWorkers: v.number(),
        workers: v.array(v.object({
            workerId: v.number(),
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

        // Get worker capacity from subscription
        const subscription = await ctx.db
            .query("userSubscriptions")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .first();

        const maxWorkers = subscription?.purchasedWorkers ?? 3;

        // Get all active work queue items (running + queued)
        const queueItems = await ctx.db
            .query("userWorkQueue")
            .withIndex("by_userId_and_status", (q) => q.eq("userId", userId))
            .collect();

        // Group tasks by workerId
        const workerMap = new Map<number, {
            workerId: number;
            queuedTasks: Id<"taskExecutions">[];
            runningTasks: Id<"taskExecutions">[];
        }>();

        for (const item of queueItems) {
            if (item.workerId === undefined || item.status === "completed" || item.status === "failed") {
                continue;
            }

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

        // Convert to array (desk mapping handled in frontend)
        const workers = Array.from(workerMap.values()).map((worker) => ({
            workerId: worker.workerId,
            currentTask: worker.runningTasks[0], // Current running task
            queuedTasks: worker.queuedTasks,
            runningTasks: worker.runningTasks,
        }));

        return {
            maxWorkers,
            workers,
        };
    },
});

