import { defineTable } from "convex/server";
import { v } from "convex/values";
import { vProviderMetadata } from "@convex-dev/agent";

export const usageTrackingTables = {
    rawUsage: defineTable({
        billingPeriod: v.string(),
        userId: v.string(),
        agentName: v.optional(v.string()),
        model: v.string(),
        provider: v.string(),
        usage: v.object({
            promptTokens: v.number(),
            completionTokens: v.number(),
            totalTokens: v.number(),
            reasoningTokens: v.optional(v.number()),
            cachedInputTokens: v.optional(v.number()),
        }),
        providerMetadata: v.optional(vProviderMetadata),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("billingPeriod_userId", ["billingPeriod", "userId"])
        .index("by_userId", ["userId"]),

    invoices: defineTable({
        userId: v.string(),
        amount: v.number(),
        billingPeriod: v.string(),
        status: v.union(
            v.literal("pending"),
            v.literal("paid"),
            v.literal("failed")
        ),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("billingPeriod_userId", ["billingPeriod", "userId"]),
};

