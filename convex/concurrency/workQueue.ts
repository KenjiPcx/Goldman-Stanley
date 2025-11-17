/**
 * Work Queue Management
 * 
 * Manages the global work queue for each user, ensuring fair scheduling
 * across multiple batches and respecting concurrency limits.
 */

import { v } from "convex/values";
import { internalMutation, internalQuery, internalAction, MutationCtx, query } from "../_generated/server";
import { internal } from "../_generated/api";
import { Doc } from "../_generated/dataModel";
import { getCurrentUserId } from "../auth/helpers";

// ============================================================================
// DEFAULT TIER CONFIGS
// ============================================================================

const TIER_CONFIGS = {
    free: {
        maxConcurrentWorkers: 1,
        monthlyTaskQuota: 50,
        allowCustomApiKeys: false,
    },
    starter: {
        maxConcurrentWorkers: 3,
        monthlyTaskQuota: 500,
        allowCustomApiKeys: false,
    },
    pro: {
        maxConcurrentWorkers: 10,
        monthlyTaskQuota: 5000,
        allowCustomApiKeys: true,
    },
    enterprise: {
        maxConcurrentWorkers: 50,
        monthlyTaskQuota: 50000,
        allowCustomApiKeys: true,
    },
};

// ============================================================================
// USER SUBSCRIPTION MANAGEMENT
// ============================================================================

/**
 * Get or create user subscription (defaults to free tier)
 */
export const getOrCreateUserSubscription = internalMutation({
    args: {
        userId: v.string(),
    },
    returns: v.id("userSubscriptions"),
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("userSubscriptions")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .first();

        if (existing) {
            return existing._id;
        }

        // Create new subscription with free tier
        const now = Date.now();
        const config = TIER_CONFIGS.free;

        const subscriptionId = await ctx.db.insert("userSubscriptions", {
            userId: args.userId,
            tier: "free",
            maxConcurrentWorkers: config.maxConcurrentWorkers,
            monthlyTaskQuota: config.monthlyTaskQuota,
            tasksUsedThisMonth: 0,
            purchasedWorkers: 3, // Start with 3 free workers
            allowCustomApiKeys: config.allowCustomApiKeys,
            currentPeriodStart: now,
            currentPeriodEnd: now + 30 * 24 * 60 * 60 * 1000, // 30 days
            createdAt: now,
            updatedAt: now,
        });

        // Initialize concurrency stats
        await ctx.db.insert("concurrencyStats", {
            userId: args.userId,
            activeWorkers: 0,
            maxWorkers: config.maxConcurrentWorkers,
            queuedTasks: 0,
            completedToday: 0,
            activeBatches: [],
            lastUpdated: now,
        });

        return subscriptionId;
    },
});

/**
 * Purchase workers (internal action wrapper)
 * Uses Autumn checkout to handle payment via Stripe
 * Cost: $3 per worker (configured in Autumn dashboard)
 * 
 * Note: This must be an action because it needs to call Autumn (which uses fetch()).
 * Call this from your client-side code using ctx.action() instead of ctx.mutation().
 */
export const purchaseWorkersAction = internalAction({
    args: {
        userId: v.string(),
        count: v.number(),
    },
    returns: v.object({
        success: v.boolean(),
        purchasedWorkers: v.number(),
        message: v.string(),
        cost: v.number(),
        checkoutUrl: v.optional(v.string()),
    }),
    handler: async (ctx, args) => {
        if (args.count <= 0) {
            return {
                success: false,
                purchasedWorkers: 0,
                message: "Count must be greater than 0",
                cost: 0,
            };
        }

        const WORKER_COST = 3; // $3 per worker
        const totalCost = args.count * WORKER_COST;

        // Check current worker access from Autumn
        const featureCheck: { success: boolean, balance: number | undefined, error: string | undefined } = await ctx.runAction(internal.autumn.autumnActions.checkFeatureAccess, {
            featureId: "workers",
        });

        const currentWorkers = featureCheck?.balance ?? 3;

        // Use Autumn checkout to create a Stripe checkout session
        const checkoutResult: { success: boolean, url: string | undefined, error: string | undefined } = await ctx.runAction(internal.autumn.autumnActions.createCheckoutSession, {
            productId: "workers", // Configure this in Autumn dashboard
            options: [{
                featureId: "workers",
                quantity: args.count,
            }],
        });

        if (!checkoutResult.success) {
            return {
                success: false,
                purchasedWorkers: currentWorkers,
                message: `Failed to create checkout: ${checkoutResult.error}`,
                cost: totalCost,
            };
        }

        // Return checkout URL for user to complete payment
        return {
            success: true,
            purchasedWorkers: currentWorkers + args.count, // Expected after payment
            message: `Redirecting to payment for ${args.count} worker(s)...`,
            cost: totalCost,
            checkoutUrl: checkoutResult.url,
        };
    },
});

/**
 * Get user's purchased workers count from database
 * 
 * Note: Queries cannot call Autumn directly (uses fetch()).
 * This reads from the cached subscription data in the database.
 * The subscription is updated by Autumn webhooks when users purchase/change plans.
 */
export const getPurchasedWorkers = query({
    args: {},
    returns: v.number(),
    handler: async (ctx) => {
        const userId = await getCurrentUserId(ctx);
        if (!userId) {
            return 3; // Default for unauthenticated (shouldn't happen)
        }

        // Read from database subscription
        // This is updated by Autumn webhooks when plans change
        const subscription = await ctx.db
            .query("userSubscriptions")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .first();

        return subscription?.purchasedWorkers ?? 3;
    },
});

/**
 * Check if user has quota remaining
 */
export const checkUserQuota = internalQuery({
    args: {
        userId: v.string(),
    },
    returns: v.object({
        hasQuota: v.boolean(),
        remaining: v.number(),
        limit: v.number(),
    }),
    handler: async (ctx, args) => {
        const subscription = await ctx.db
            .query("userSubscriptions")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .first();

        if (!subscription) {
            // New user - has free tier quota
            return {
                hasQuota: true,
                remaining: TIER_CONFIGS.free.monthlyTaskQuota,
                limit: TIER_CONFIGS.free.monthlyTaskQuota,
            };
        }

        const remaining = subscription.monthlyTaskQuota - subscription.tasksUsedThisMonth;
        return {
            hasQuota: remaining > 0,
            remaining: Math.max(0, remaining),
            limit: subscription.monthlyTaskQuota,
        };
    },
});

// ============================================================================
// WORK QUEUE OPERATIONS
// ============================================================================

/**
 * Enqueue tasks from a batch into the user's work queue
 * Called when a batch starts
 */
export const enqueueBatchTasks = internalMutation({
    args: {
        userId: v.string(),
        batchId: v.id("batchTaskOrchestrations"),
        taskExecutionIds: v.array(v.id("taskExecutions")),
        priority: v.optional(v.number()), // Higher = runs first
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const priority = args.priority ?? 0;
        const now = Date.now();

        // Add all tasks to the queue
        for (const taskExecutionId of args.taskExecutionIds) {
            await ctx.db.insert("userWorkQueue", {
                userId: args.userId,
                taskExecutionId,
                batchId: args.batchId,
                priority,
                status: "queued",
                enqueuedAt: now,
            });
        }

        // Kick the dispatcher so newly queued tasks start immediately if slots are free
        await dispatchUserQueue(ctx, args.userId);
        return null;
    },
});

/**
 * Mark task as completed
 */
export const completeQueuedTask = internalMutation({
    args: {
        queueItemId: v.id("userWorkQueue"),
        success: v.boolean(),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const queueItem = await ctx.db.get(args.queueItemId);
        if (!queueItem) {
            console.warn(`Queue item ${args.queueItemId} not found`);
            return null;
        }

        await ctx.db.patch(args.queueItemId, {
            status: args.success ? "completed" : "failed",
            completedAt: Date.now(),
        });

        // Increment usage counter
        const subscription = await ctx.db
            .query("userSubscriptions")
            .withIndex("by_userId", (q) => q.eq("userId", queueItem.userId))
            .first();

        if (subscription && args.success) {
            await ctx.db.patch(subscription._id, {
                tasksUsedThisMonth: subscription.tasksUsedThisMonth + 1,
            });

            // Track usage asynchronously via action - don't block on this
            await ctx.scheduler.runAfter(0, internal.autumn.autumnActions.trackFeatureUsage, {
                featureId: "research_tasks",
                value: 1,
                properties: {
                    userId: queueItem.userId,
                    batchId: queueItem.batchId,
                    taskExecutionId: queueItem.taskExecutionId,
                },
            });
        }

        // Update stats
        await updateConcurrencyStats(ctx, queueItem.userId);
        await dispatchUserQueue(ctx, queueItem.userId);
        return null;
    },
});

// ============================================================================
// STATS HELPERS
// ============================================================================

/**
 * Update concurrency statistics for a user
 * Call this whenever queue state changes
 */
async function updateConcurrencyStats(
    ctx: MutationCtx,
    userId: string
): Promise<void> {
    const allQueueItems = await ctx.db
        .query("userWorkQueue")
        .withIndex("by_userId_and_status", (q) => q.eq("userId", userId))
        .collect();

    const queued = allQueueItems.filter((item: any) => item.status === "queued");
    const running = allQueueItems.filter((item: any) => item.status === "running");

    // Group by batch
    const batchMap = new Map<string, any>();
    for (const item of allQueueItems) {
        const batchId = item.batchId;
        if (!batchMap.has(batchId)) {
            batchMap.set(batchId, {
                batchId,
                totalTasks: 0,
                completedTasks: 0,
                queuedTasks: 0,
                activeTasks: 0,
            });
        }

        const batch = batchMap.get(batchId);
        batch.totalTasks++;
        if (item.status === "completed") batch.completedTasks++;
        if (item.status === "queued") batch.queuedTasks++;
        if (item.status === "running") batch.activeTasks++;
    }

    // Get user's max workers
    const subscription = await ctx.db
        .query("userSubscriptions")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .first();

    const maxWorkers = subscription?.maxConcurrentWorkers ?? 1;

    // Update or create stats
    const existingStats = await ctx.db
        .query("concurrencyStats")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .first();

    const statsData = {
        userId,
        activeWorkers: running.length,
        maxWorkers,
        queuedTasks: queued.length,
        completedToday: 0, // TODO: Calculate from today's completed tasks
        activeBatches: Array.from(batchMap.values()),
        lastUpdated: Date.now(),
    };

    if (existingStats) {
        await ctx.db.patch(existingStats._id, statsData);
    } else {
        await ctx.db.insert("concurrencyStats", statsData);
    }
}

// ============================================================================
// DISPATCHER
// ============================================================================

/**
 * Attempt to start as many queued tasks as possible up to the user's capacity.
 * This replaces the long-running worker actions with a slot-based dispatcher.
 */
export async function dispatchUserQueue(ctx: MutationCtx, userId: string): Promise<void> {
    const subscription = await ctx.db
        .query("userSubscriptions")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .first();

    const maxWorkers = subscription?.maxConcurrentWorkers ?? 1;
    if (maxWorkers <= 0) {
        await updateConcurrencyStats(ctx, userId);
        return;
    }

    const runningTasks = await ctx.db
        .query("userWorkQueue")
        .withIndex("by_userId_and_status", (q) => q.eq("userId", userId).eq("status", "running"))
        .take(maxWorkers);

    let availableSlots = Math.max(0, maxWorkers - runningTasks.length);
    if (availableSlots === 0) {
        await updateConcurrencyStats(ctx, userId);
        return;
    }

    // Fetch more candidates than we need to account for invalid entries.
    const queuedCandidates: Array<Doc<"userWorkQueue">> = await ctx.db
        .query("userWorkQueue")
        .withIndex("by_userId_and_status", (q) => q.eq("userId", userId).eq("status", "queued"))
        .take(Math.max(availableSlots * 5, 10));

    if (queuedCandidates.length === 0) {
        await updateConcurrencyStats(ctx, userId);
        return;
    }

    const sortedCandidates = queuedCandidates.sort((a, b) => {
        if (b.priority !== a.priority) {
            return b.priority - a.priority;
        }
        return a.enqueuedAt - b.enqueuedAt;
    });

    let candidateIndex = 0;
    let workerId = 0;
    // Assign worker IDs based on which slots are available
    // Find the next available worker ID
    const usedWorkerIds = new Set(runningTasks.map(t => t.workerId).filter((id): id is number => id !== undefined));
    while (availableSlots > 0 && candidateIndex < sortedCandidates.length) {
        // Find next available worker ID
        while (usedWorkerIds.has(workerId)) {
            workerId++;
        }
        const candidate = sortedCandidates[candidateIndex++];
        const scheduled = await tryStartQueueItem(ctx, candidate, workerId);
        if (scheduled) {
            usedWorkerIds.add(workerId);
            availableSlots--;
            workerId++; // Move to next worker ID for next task
        }
    }

    await updateConcurrencyStats(ctx, userId);
}

async function tryStartQueueItem(ctx: MutationCtx, queueItem: Doc<"userWorkQueue">, workerId: number): Promise<boolean> {
    const latest = await ctx.db.get(queueItem._id);
    if (!latest || (latest as Doc<"userWorkQueue">).status !== "queued") {
        return false;
    }

    const taskExecution = await ctx.db.get(queueItem.taskExecutionId);
    if (!taskExecution) {
        await ctx.db.patch(queueItem._id, {
            status: "failed",
            completedAt: Date.now(),
        });
        return false;
    }

    const taskExecutionDoc = taskExecution as Doc<"taskExecutions">;
    const taskContext = taskExecutionDoc.context ?? {};
    const target =
        typeof taskContext.target === "string"
            ? taskContext.target
            : (taskExecution.context?.companyName as string) ?? "Unknown target";
    let outputFormat =
        typeof taskContext.outputFormat === "string"
            ? taskContext.outputFormat
            : "";
    if (!outputFormat) {
        const batch = await ctx.db.get(queueItem.batchId);
        if (batch && typeof (batch as Doc<"batchTaskOrchestrations">).outputFormat === "string") {
            outputFormat = (batch as Doc<"batchTaskOrchestrations">).outputFormat;
        }
    }
    const userPrompt = taskExecutionDoc.inputPrompt ?? `Research ${target}`;

    await ctx.db.patch(queueItem._id, {
        status: "running",
        workerId: workerId, // Assign worker ID when task starts
        startedAt: Date.now(),
    });

    await ctx.scheduler.runAfter(
        0,
        internal.research.wideResearch.startTaskExecutionWorkflow,
        {
            taskExecutionId: queueItem.taskExecutionId,
            userPrompt,
            batchId: queueItem.batchId,
            target,
            outputFormat,
            queueItemId: queueItem._id,
        }
    );

    return true;
}

// ============================================================================
// QUERY API (for UI)
// ============================================================================

/**
 * Get user's current concurrency status
 * Used by UI to show queue depth, active workers, etc.
 */
export const getUserConcurrencyStatus = query({
    args: {
        userId: v.string(),
    },
    returns: v.union(
        v.object({
            activeWorkers: v.number(),
            maxWorkers: v.number(),
            queuedTasks: v.number(),
            completedToday: v.number(),
            activeBatches: v.array(v.object({
                batchId: v.id("batchTaskOrchestrations"),
                totalTasks: v.number(),
                completedTasks: v.number(),
                queuedTasks: v.number(),
                activeTasks: v.number(),
            })),
            tier: v.union(
                v.literal("free"),
                v.literal("starter"),
                v.literal("pro"),
                v.literal("enterprise")
            ),
            quotaRemaining: v.number(),
            quotaLimit: v.number(),
        }),
        v.null()
    ),
    handler: async (ctx, args) => {
        const stats = await ctx.db
            .query("concurrencyStats")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .first();

        const subscription = await ctx.db
            .query("userSubscriptions")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .first();

        if (!stats || !subscription) {
            return null;
        }

        return {
            activeWorkers: stats.activeWorkers,
            maxWorkers: stats.maxWorkers,
            queuedTasks: stats.queuedTasks,
            completedToday: stats.completedToday,
            activeBatches: stats.activeBatches,
            tier: subscription.tier,
            quotaRemaining: subscription.monthlyTaskQuota - subscription.tasksUsedThisMonth,
            quotaLimit: subscription.monthlyTaskQuota,
        };
    },
});

