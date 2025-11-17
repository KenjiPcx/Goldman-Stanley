/**
 * Orchestration Module - Schema Definitions
 * 
 * Task execution tracking, workflow coordination, and delegation management.
 */

import { defineTable } from "convex/server";
import { v, Infer } from "convex/values";

// ============================================================================
// REUSABLE VALIDATORS
// ============================================================================

export const taskExecutionStatusSchema = v.union(
    v.literal("queued"),
    v.literal("running"),
    v.literal("awaiting_input"),
    v.literal("completed"),
    v.literal("failed")
);

export const taskExecutionSchema = v.object({
    workflowName: v.string(),
    workflowVersion: v.optional(v.string()),
    workflowId: v.optional(v.string()), // Workflow ID for monitoring and cleanup
    context: v.optional(v.any()), // Workflow-specific context (rowId, target, etc.)
    batchId: v.optional(v.id("batchTaskOrchestrations")),
    status: taskExecutionStatusSchema,
    statusReason: v.optional(v.string()),
    inputPrompt: v.string(),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    error: v.optional(v.string()),
    scratchpad: v.optional(v.string()),
    workflowProgress: v.optional(v.string()),
    threadId: v.optional(v.string()),
});

/**
 * Task Executions
 * 
 * Tracks individual workflow runs. Workflows are pipelines of specialized 
 * agents with context handover. One taskExecution can produce multiple 
 * outputs (artifacts, datasets, entities).
 */
export const taskExecutions = defineTable({
    ...taskExecutionSchema.fields,
})
    .index("by_status", ["status"])
    .index("by_workflow", ["workflowName"])
    .index("by_batchId", ["batchId"]);

/**
 * Task Execution Steps
 * 
 * Ordered log of workflow nodes and events for debugging and UI display.
 */
export const taskExecutionSteps = defineTable({
    taskExecutionId: v.id("taskExecutions"),
    stepName: v.string(),
    message: v.optional(v.string()),
    detail: v.optional(v.string()),
    payload: v.optional(v.any()),
    progress: v.optional(v.number()),
    screenshotUrl: v.optional(v.string()),
    createdAt: v.number(),
})
    .index("by_taskExecution", ["taskExecutionId"]);

/**
 * Delegations
 * 
 * Simple toolCallId to childThreadId mapper for tracking delegated 
 * tasks in the UI.
 */
export const delegations = defineTable({
    toolCallId: v.string(), // The tool call ID from the agent framework
    childThreadId: v.string(), // The child thread created for the delegated task
})
    .index("by_tool_call", ["toolCallId"]);

export const orchestrationTables = {
    taskExecutions,
    taskExecutionSteps,
    delegations,
}

// ============================================================================
// TYPE EXPORTS - For frontend and TypeScript usage
// ============================================================================

export type TaskExecutionStatus = Infer<typeof taskExecutionStatusSchema>;
export type TaskExecution = Infer<typeof taskExecutionSchema>;

// ============================================================================
// REUSABLE VALIDATORS FOR FUNCTION ARGS/RETURNS
// ============================================================================

// For creating a task execution (without startedAt, which is set automatically)
export const createTaskExecutionArgs = taskExecutionSchema.omit("startedAt", "completedAt");

// For updating task execution status
export const updateTaskExecutionStatusArgs = v.object({
    taskExecutionId: v.id("taskExecutions"),
    status: taskExecutionStatusSchema,
});