/**
 * Concurrency Queries
 * 
 * Public and internal queries for concurrency management
 */

import { v } from "convex/values";
import { internalQuery, query } from "../_generated/server";

/**
 * Get user's subscription details
 */
export const getUserSubscription = internalQuery({
    args: {
        userId: v.string(),
    },
    returns: v.union(
        v.object({
            tier: v.union(
                v.literal("free"),
                v.literal("starter"),
                v.literal("pro"),
                v.literal("enterprise")
            ),
            maxConcurrentWorkers: v.number(),
            monthlyTaskQuota: v.number(),
            tasksUsedThisMonth: v.number(),
            allowCustomApiKeys: v.boolean(),
        }),
        v.null()
    ),
    handler: async (ctx, args) => {
        const subscription = await ctx.db
            .query("userSubscriptions")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .first();

        if (!subscription) {
            return null;
        }

        return {
            tier: subscription.tier,
            maxConcurrentWorkers: subscription.maxConcurrentWorkers,
            monthlyTaskQuota: subscription.monthlyTaskQuota,
            tasksUsedThisMonth: subscription.tasksUsedThisMonth,
            allowCustomApiKeys: subscription.allowCustomApiKeys,
        };
    },
});

/**
 * Get batch info (needed by worker pool)
 */
export const getBatch = internalQuery({
    args: {
        batchId: v.id("batchTaskOrchestrations"),
    },
    returns: v.union(
        v.object({
            task: v.string(),
            outputFormat: v.string(),
            status: v.string(),
        }),
        v.null()
    ),
    handler: async (ctx, args) => {
        const batch = await ctx.db.get(args.batchId);
        if (!batch) {
            return null;
        }

        return {
            task: batch.task,
            outputFormat: batch.outputFormat,
            status: batch.status,
        };
    },
});

