/**
 * Reviews Module - Schema Definitions
 * 
 * Quality control configurations and history for reviewing workflow outputs.
 */

import { defineTable } from "convex/server";
import { v, Infer } from "convex/values";

export const reviewCriterionSchema = v.object({
    id: v.string(),
    name: v.string(),
    description: v.string(),
    weight: v.number(),
    passingScore: v.number(),
    examples: v.optional(v.object({
        good: v.optional(v.array(v.string())),
        bad: v.optional(v.array(v.string())),
    })),
});

export const criteriaScoreSchema = v.object({
    criterionId: v.string(),
    score: v.number(),
    feedback: v.string(),
    issues: v.array(v.string()),
});

export const reviewConfigSchema = v.object({
    // Identity
    id: v.string(),
    name: v.string(),
    description: v.optional(v.string()),

    // Rubric definition
    criteria: v.array(reviewCriterionSchema),

    overallPassingScore: v.number(),

    // Reviewer agent
    reviewerAgentId: v.optional(v.id("agents")),

    // Review prompt customization
    customReviewPrompt: v.optional(v.string()),
    focusAreas: v.optional(v.array(v.string())),

    // Metadata
    createdBy: v.optional(v.string()),
    isActive: v.boolean(),

    // Analytics
    usageCount: v.optional(v.number()),
    averageScore: v.optional(v.number()),
    passRate: v.optional(v.number()),
});

/**
 * Review Configurations
 * 
 * Reusable quality rubrics that can be applied to any workflow output.
 */
export const reviewConfigs = defineTable({
    ...reviewConfigSchema.fields,
})
    .index("by_review_config_id", ["id"])
    .index("by_name", ["name"])
    .index("by_active", ["isActive"]);

export const reviewHistorySchema = v.object({
    // Links
    taskExecutionId: v.id("taskExecutions"),
    workflowId: v.string(),
    reviewConfigId: v.string(),
    agentInstanceId: v.optional(v.string()),

    // Review results
    passed: v.boolean(),
    overallScore: v.number(),
    criteriaScores: v.array(criteriaScoreSchema),

    summary: v.string(),
    recommendations: v.array(v.string()),

    // Context
    attemptNumber: v.number(),
    totalAttempts: v.number(),
    wasRetried: v.boolean(),

    // Timing
    reviewedAt: v.number(),
    reviewDurationMs: v.optional(v.number()),
});

/**
 * Review History
 * 
 * Tracks all review attempts for analytics and debugging.
 */
export const reviewHistory = defineTable({
    ...reviewHistorySchema.fields,
})
    .index("by_task_execution", ["taskExecutionId"])
    .index("by_workflow", ["workflowId"])
    .index("by_review_config", ["reviewConfigId"])
    .index("by_passed", ["passed"])
    .index("by_reviewed_at", ["reviewedAt"]);

export const reviewsTables = {
    reviewConfigs,
    reviewHistory,
}

// ============================================================================
// TYPE EXPORTS - For frontend and TypeScript usage
// ============================================================================

export type ReviewCriterion = Infer<typeof reviewCriterionSchema>;
export type CriteriaScore = Infer<typeof criteriaScoreSchema>;
export type ReviewConfig = Infer<typeof reviewConfigSchema>;
export type ReviewHistory = Infer<typeof reviewHistorySchema>;

// ============================================================================
// REUSABLE VALIDATORS FOR FUNCTION ARGS/RETURNS
// ============================================================================

// For creating a review config (without analytics fields)
export const createReviewConfigArgs = reviewConfigSchema.omit("usageCount", "averageScore", "passRate");

// For updating a review config (all fields optional except id)
export const updateReviewConfigArgs = reviewConfigSchema
    .omit("id", "usageCount", "averageScore", "passRate")
    .partial()
    .extend({
        reviewConfigId: v.id("reviewConfigs"),
    });

// For recording a review (without reviewedAt, which is set automatically)
export const recordReviewArgs = reviewHistorySchema.omit("reviewedAt", "reviewDurationMs");

// For review result (subset used in workflows)
// Note: criteriaEvaluations uses specificIssues (from AI), which gets mapped to issues when storing
export const reviewResultSchema = v.object({
    passed: v.boolean(),
    overallScore: v.number(),
    summary: v.string(),
    actionableRecommendations: v.array(v.string()),
    criteriaEvaluations: v.array(v.object({
        criterionId: v.string(),
        score: v.number(),
        feedback: v.string(),
        specificIssues: v.array(v.string()), // From AI, mapped to issues when storing
    })),
});