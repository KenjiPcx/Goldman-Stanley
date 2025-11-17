/**
 * Worker Pool Manager
 * 
 * Manages a pool of workers that pull tasks from the user's work queue
 * and execute them with proper concurrency control.
 * 
 * This is the orchestrator that replaces the batch-level concurrency
 * with user-level concurrency management.
 */

import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { dispatchUserQueue } from "./workQueue";

// ============================================================================
// WORKER POOL ORCHESTRATOR
// ============================================================================

/**
 * Manually trigger the dispatcher for a user's queue.
 * Helpful for admin tools or scheduled rebalances.
 */
export const rebalanceUserQueue = internalMutation({
    args: {
        userId: v.string(),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        await dispatchUserQueue(ctx, args.userId);
        return null;
    },
});

// ============================================================================
// BATCH INTEGRATION
// ============================================================================

/**
 * Modified batch start that uses the work queue system
 * This replaces the old chunk-based orchestrator
 */
export const startBatchWithWorkQueue = internalMutation({
    args: {
        userId: v.string(),
        batchId: v.id("batchTaskOrchestrations"),
        taskExecutionIds: v.array(v.id("taskExecutions")),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        // Check user quota
        const quotaCheck = await ctx.runQuery(
            internal.concurrency.workQueue.checkUserQuota,
            { userId: args.userId }
        );

        if (!quotaCheck.hasQuota) {
            throw new Error(
                `Insufficient quota: ${quotaCheck.remaining}/${quotaCheck.limit} tasks remaining this month`
            );
        }

        if (args.taskExecutionIds.length > quotaCheck.remaining) {
            throw new Error(
                `Batch size (${args.taskExecutionIds.length}) exceeds remaining quota (${quotaCheck.remaining})`
            );
        }

        // Enqueue all tasks (this also triggers the dispatcher)
        await ctx.runMutation(internal.concurrency.workQueue.enqueueBatchTasks, {
            userId: args.userId,
            batchId: args.batchId,
            taskExecutionIds: args.taskExecutionIds,
        });

        console.log(
            `[Batch ${args.batchId}] Enqueued ${args.taskExecutionIds.length} tasks for user ${args.userId}`
        );

        // Dispatcher already invoked by enqueue, but log for observability.
        console.log(`[Batch ${args.batchId}] Dispatched queue for user ${args.userId}`);
        return null;
    },
});

