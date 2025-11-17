/**
 * Research Credits - Manages research task credits via Autumn
 * 
 * This module handles checking and tracking research task usage via Autumn's
 * feature access system. Research tasks are a metered feature that users
 * purchase through their subscription plans.
 */

import { query } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUserId } from "../auth/helpers";

/**
 * Get user's research tasks balance from database
 * 
 * Note: Queries cannot call Autumn directly (uses fetch()).
 * This reads from the cached subscription data in the database.
 * Use the updateResearchTasksBalance action to refresh Autumn data.
 */
export const getResearchTasksBalance = query({
    args: {},
    returns: v.number(),
    handler: async (ctx) => {
        const userId = await getCurrentUserId(ctx);
        if (!userId) {
            return 0; // Default for unauthenticated
        }

        // Read from database subscription
        const subscription = await ctx.db
            .query("userSubscriptions")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .first();

        // Return remaining tasks (quota - used)
        const remaining = subscription
            ? subscription.monthlyTaskQuota - subscription.tasksUsedThisMonth
            : 0;
        return Math.max(0, remaining);
    },
});

