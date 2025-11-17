/**
 * Concurrency Management Module - Schema Definitions
 * 
 * Manages user-level concurrency pools for batch research tasks.
 * Ensures fair scheduling across multiple batches and respects rate limits.
 */

import { defineTable } from "convex/server";
import { v, Infer } from "convex/values";

// ============================================================================
// REUSABLE VALIDATORS
// ============================================================================

export const subscriptionTierSchema = v.union(
    v.literal("free"),
    v.literal("starter"),
    v.literal("pro"),
    v.literal("enterprise")
);

export const apiKeyProviderSchema = v.union(
    v.literal("platform"),      // Use Goldman Stanley's API key
    v.literal("user_openai"),   // User provides their own OpenAI key
    v.literal("user_anthropic") // User provides their own Anthropic key
);

// ============================================================================
// USER SUBSCRIPTIONS TABLE
// ============================================================================

/**
 * User Subscriptions
 * 
 * Tracks user subscription tiers and concurrency limits.
 */
export const userSubscriptions = defineTable({
    userId: v.string(),                    // Clerk user ID
    tier: subscriptionTierSchema,
    maxConcurrentWorkers: v.number(),      // How many tasks can run in parallel
    monthlyTaskQuota: v.number(),          // Max tasks per month
    tasksUsedThisMonth: v.number(),        // Current usage
    purchasedWorkers: v.number(),          // Number of workers purchased (visible in office)

    // BYOK (Bring Your Own Key) support
    allowCustomApiKeys: v.boolean(),       // Can user provide their own keys?
    encryptedOpenAiKey: v.optional(v.string()),     // User's encrypted OpenAI key
    encryptedAnthropicKey: v.optional(v.string()),  // User's encrypted Anthropic key

    // Billing
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),

    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
})
    .index("by_userId", ["userId"])
    .index("by_tier", ["tier"]);

// ============================================================================
// USER WORK QUEUE TABLE
// ============================================================================

/**
 * User Work Queue
 * 
 * Global queue of pending tasks across all batches for a user.
 * Workers pull from this queue in round-robin fashion.
 */
export const userWorkQueue = defineTable({
    userId: v.string(),                                // User who owns this queue
    taskExecutionId: v.id("taskExecutions"),          // Task to execute
    batchId: v.id("batchTaskOrchestrations"),         // Which batch this belongs to
    priority: v.number(),                              // Higher = runs first (default 0)

    // Status tracking
    status: v.union(
        v.literal("queued"),      // Waiting to run
        v.literal("running"),     // Currently executing
        v.literal("completed"),   // Done
        v.literal("failed")       // Error
    ),

    // Worker assignment
    workerId: v.optional(v.number()),                  // Which worker picked this up (0-N)
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),

    // Metadata
    enqueuedAt: v.number(),
    estimatedDurationMs: v.optional(v.number()),      // For progress estimation
})
    .index("by_userId_and_status", ["userId", "status"])
    .index("by_batchId", ["batchId"])
    .index("by_workerId", ["workerId"]);

// ============================================================================
// CONCURRENCY STATS TABLE
// ============================================================================

/**
 * Real-time concurrency statistics per user
 * Updated by workers, queried by UI
 */
export const concurrencyStats = defineTable({
    userId: v.string(),

    // Current state
    activeWorkers: v.number(),                         // Currently running
    maxWorkers: v.number(),                            // User's limit
    queuedTasks: v.number(),                           // Waiting to run
    completedToday: v.number(),                        // Tasks completed today

    // Per-batch breakdown
    activeBatches: v.array(v.object({
        batchId: v.id("batchTaskOrchestrations"),
        totalTasks: v.number(),
        completedTasks: v.number(),
        queuedTasks: v.number(),
        activeTasks: v.number(),
    })),

    // Last update
    lastUpdated: v.number(),
})
    .index("by_userId", ["userId"]);

// ============================================================================
// EXPORTS
// ============================================================================

export const concurrencyTables = {
    userSubscriptions,
    userWorkQueue,
    concurrencyStats,
};

export type SubscriptionTier = Infer<typeof subscriptionTierSchema>;
export type ApiKeyProvider = Infer<typeof apiKeyProviderSchema>;

