/**
 * Reviews Module - CRUD Operations
 * 
 * Manage review configurations and rubrics.
 */

import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "../_generated/server";
import {
    createReviewConfigArgs,
    updateReviewConfigArgs,
    recordReviewArgs,
    reviewConfigSchema,
    reviewHistorySchema,
} from "./schema";

/**
 * Create a new review configuration
 */
export const createReviewConfig = mutation({
    args: createReviewConfigArgs,
    returns: v.id("reviewConfigs"),
    handler: async (ctx, args) => {
        return await ctx.db.insert("reviewConfigs", {
            ...args,
            isActive: true,
            usageCount: 0,
        });
    },
});

/**
 * Get a review config by ID
 */
export const getReviewConfig = internalQuery({
    args: { reviewConfigId: v.id("reviewConfigs") },
    returns: v.union(reviewConfigSchema.extend({
        _id: v.id("reviewConfigs"),
        _creationTime: v.number(),
    }), v.null()),
    handler: async (ctx, args) => {
        return await ctx.db.get(args.reviewConfigId);
    },
});

/**
 * Get a review config by string ID
 */
export const getReviewConfigByStringId = internalQuery({
    args: { id: v.string() },
    returns: v.union(reviewConfigSchema.extend({
        _id: v.id("reviewConfigs"),
        _creationTime: v.number(),
    }), v.null()),
    handler: async (ctx, args) => {
        return await ctx.db
            .query("reviewConfigs")
            .withIndex("by_review_config_id", (q) => q.eq("id", args.id))
            .first();
    },
});

/**
 * List all review configs
 */
export const listReviewConfigs = query({
    args: {
        activeOnly: v.optional(v.boolean()),
    },
    returns: v.array(reviewConfigSchema.extend({
        _id: v.id("reviewConfigs"),
        _creationTime: v.number(),
    })),
    handler: async (ctx, args) => {
        if (args.activeOnly) {
            return await ctx.db
                .query("reviewConfigs")
                .withIndex("by_active", (q) => q.eq("isActive", true))
                .collect();
        }

        return await ctx.db.query("reviewConfigs").collect();
    },
});

/**
 * Update a review config
 */
export const updateReviewConfig = mutation({
    args: updateReviewConfigArgs,
    returns: v.null(),
    handler: async (ctx, args) => {
        const { reviewConfigId, ...updates } = args;
        await ctx.db.patch(reviewConfigId, updates);
        return null;
    },
});

/**
 * Delete a review config (soft delete)
 */
export const deleteReviewConfig = mutation({
    args: { reviewConfigId: v.id("reviewConfigs") },
    returns: v.null(),
    handler: async (ctx, args) => {
        await ctx.db.patch(args.reviewConfigId, { isActive: false });
        return null;
    },
});

/**
 * Record a review result
 */
export const recordReview = internalMutation({
    args: recordReviewArgs,
    returns: v.id("reviewHistory"),
    handler: async (ctx, args) => {
        // Record the review
        const reviewId = await ctx.db.insert("reviewHistory", {
            ...args,
            reviewedAt: Date.now(),
        });

        // Update review config analytics
        const config = await ctx.db
            .query("reviewConfigs")
            .withIndex("by_review_config_id", (q) => q.eq("id", args.reviewConfigId))
            .first();

        if (config) {
            const currentUsage = config.usageCount || 0;
            const currentAvg = config.averageScore || 0;
            const currentPass = config.passRate || 0;

            const newUsage = currentUsage + 1;
            const newAvg = (currentAvg * currentUsage + args.overallScore) / newUsage;
            const passCount = currentPass * currentUsage + (args.passed ? 1 : 0);
            const newPass = passCount / newUsage;

            await ctx.db.patch(config._id, {
                usageCount: newUsage,
                averageScore: newAvg,
                passRate: newPass,
            });
        }

        return reviewId;
    },
});

/**
 * Get review history for a task execution
 */
export const getReviewHistory = query({
    args: { taskExecutionId: v.id("taskExecutions") },
    returns: v.array(reviewHistorySchema.extend({
        _id: v.id("reviewHistory"),
        _creationTime: v.number(),
    })),
    handler: async (ctx, args) => {
        return await ctx.db
            .query("reviewHistory")
            .withIndex("by_task_execution", (q) => q.eq("taskExecutionId", args.taskExecutionId))
            .order("desc")
            .collect();
    },
});

/**
 * Get review analytics for a config
 */
export const getReviewAnalytics = query({
    args: { reviewConfigId: v.string() },
    returns: v.object({
        totalReviews: v.number(),
        averageScore: v.number(),
        passRate: v.number(),
        recentReviews: v.array(reviewHistorySchema.extend({
            _id: v.id("reviewHistory"),
            _creationTime: v.number(),
        })),
    }),
    handler: async (ctx, args) => {
        const config = await ctx.db
            .query("reviewConfigs")
            .withIndex("by_review_config_id", (q) => q.eq("id", args.reviewConfigId))
            .first();

        const recentReviews = await ctx.db
            .query("reviewHistory")
            .withIndex("by_review_config", (q) => q.eq("reviewConfigId", args.reviewConfigId))
            .order("desc")
            .take(10);

        return {
            totalReviews: config?.usageCount || 0,
            averageScore: config?.averageScore || 0,
            passRate: config?.passRate || 0,
            recentReviews,
        };
    },
});

