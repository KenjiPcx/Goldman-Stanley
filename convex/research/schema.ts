/**
 * Research Module - Schema Definitions
 * 
 * Deep research workflows including datasets, artifacts, and batch orchestration.
 */

import { defineTable } from "convex/server";
import { v, Infer } from "convex/values";

// ============================================================================
// REUSABLE VALIDATORS
// ============================================================================

export const datasetFieldTypeSchema = v.union(
    v.literal("text"),
    v.literal("number"),
    v.literal("date"),
    v.literal("url"),
    v.literal("boolean")
);

export const datasetFieldSchema = v.object({
    fieldId: v.string(),
    name: v.string(),
    type: datasetFieldTypeSchema,
    description: v.string(),
    required: v.boolean(),
});

export const citationSchema = v.object({
    url: v.string(),
    title: v.optional(v.string()),
    snippet: v.optional(v.string()),
    accessedAt: v.number(),
});

export const datasetCellStatusSchema = v.union(
    v.literal("empty"),
    v.literal("researching"),
    v.literal("completed"),
    v.literal("failed")
);

export const batchTaskOrchestrationStatusSchema = v.union(
    v.literal("running"),
    v.literal("completed"),
    v.literal("failed"),
    v.literal("cancelled")
);

export const outputEntityTypeSchema = v.union(
    v.literal("buyer"),
    v.literal("sellerAnalysisSession"),
    v.literal("dataset")
);

// ============================================================================
// WORKFLOW OUTPUTS - Artifacts produced by taskExecutions
// ============================================================================

/**
 * Generic Artifacts
 * 
 * Documents, spreadsheets, reports, presentations. Unified storage 
 * with weak typing for flexibility.
 */
export const artifacts = defineTable({
    taskExecutionId: v.id("taskExecutions"),
    name: v.string(),
    type: v.union(
        v.literal("document"),
        v.literal("spreadsheet"),
        v.literal("presentation"),
        v.literal("report")
    ),
    description: v.optional(v.string()),
    content: v.any(), // Flexible storage: markdown, JSON, HTML, etc.
    metadata: v.optional(v.any()), // Type-specific metadata (sheet names, slide count, etc.)
    format: v.optional(v.string()), // File format hint: "markdown", "json", "html", "xlsx"
    storageId: v.optional(v.id("_storage")), // For binary files (Excel, PowerPoint)
    createdAt: v.number(),
    updatedAt: v.number(),
})
    .index("by_task", ["taskExecutionId"])
    .index("by_type", ["type"])
    .index("by_created", ["createdAt"]);

/**
 * Dataset Schema Validator
 */
export const datasetSchema = v.object({
    taskExecutionId: v.optional(v.id("taskExecutions")), // Optional: can exist independently
    name: v.string(),
    description: v.optional(v.string()),
    query: v.string(), // The original search/research query
    schema: v.array(datasetFieldSchema),
    createdAt: v.number(),
    updatedAt: v.number(),
});

/**
 * Datasets
 * 
 * Defines a structured research schema. Represents the "table definition" 
 * for deep research tasks.
 */
export const datasets = defineTable({
    ...datasetSchema.fields,
})
    .index("by_task", ["taskExecutionId"])
    .index("by_created", ["createdAt"]);

/**
 * Dataset Rows
 * 
 * One entity/subject being researched. Examples: a company, a person, 
 * a PE firm, etc.
 */
export const datasetRows = defineTable({
    datasetId: v.id("datasets"),
    taskExecutionId: v.id("taskExecutions"), // Links row to the task execution researching it
    entityName: v.string(), // e.g., "Goldman Sachs", "John Smith", "Acme Corp"
    entityType: v.optional(v.string()), // e.g., "company", "person", "organization"
    metadata: v.optional(v.any()), // Additional entity context
    completedCells: v.optional(v.number()), // DEPRECATED: Now computed on-demand from cell statuses
    totalCells: v.number(), // Total expected cells based on schema
    createdAt: v.number(),
    updatedAt: v.number(),
})
    .index("by_dataset", ["datasetId"])
    .index("by_task_execution", ["taskExecutionId"])
    .index("by_created", ["createdAt"]);

/**
 * Dataset Cell Schema Validator
 */
export const datasetCellSchema = v.object({
    rowId: v.id("datasetRows"),
    fieldId: v.string(), // Links to schema definition in datasets.schema
    value: v.any(), // The actual researched value (string, number, date, etc.)
    confidence: v.optional(v.number()), // 0-1 score of confidence in the data
    citations: v.optional(v.array(citationSchema)),
    reasoning: v.optional(v.string()), // Reasoning trace for transparency
    status: datasetCellStatusSchema,
    needsRefresh: v.optional(v.boolean()), // Flag for staleness/re-research
    lastUpdated: v.number(),
});

/**
 * Dataset Cells
 * 
 * Individual researched data point. The intersection of a row (entity) 
 * and a field (schema column).
 */
export const datasetCells = defineTable({
    ...datasetCellSchema.fields,
})
    .index("by_row", ["rowId"])
    .index("by_row_and_field", ["rowId", "fieldId"])
    .index("by_status", ["status"])
    .index("by_row_and_status", ["rowId", "status"]); // For efficient progress counting

/**
 * Output Entity Schema Validator
 */
export const outputEntitySchema = v.object({
    taskExecutionId: v.id("taskExecutions"),
    entityType: outputEntityTypeSchema,
    entityId: v.string(), // Polymorphic ID (cast to appropriate type when querying)
    createdAt: v.number(),
});

/**
 * Output Entities
 * 
 * Links taskExecutions to created/modified business entities.
 * Replaces the old inline outputEntity field for better queryability.
 */
export const outputEntities = defineTable({
    ...outputEntitySchema.fields,
})
    .index("by_task", ["taskExecutionId"])
    .index("by_entity_type", ["entityType"])
    .index("by_entity", ["entityType", "entityId"]);

/**
 * Batch Task Orchestration Schema Validator
 */
export const batchTaskOrchestrationSchema = v.object({
    // Task definition
    task: v.string(), // What to do (e.g., "Research these PE firms")
    targets: v.array(v.string()), // Entities to process (e.g., ["Blackstone", "KKR"])
    outputFormat: v.string(), // Desired output format (metadata/hint for post-processing)

    // Optional dataset linkage (if this batch creates a dataset)
    datasetId: v.optional(v.id("datasets")),

    // Quality control
    reviewConfigId: v.optional(v.string()), // Review config to use for quality validation

    // Orchestration state
    workflowId: v.optional(v.string()), // Main orchestrator workflow ID
    concurrencyLimit: v.number(), // Max parallel tasks (e.g., 3)

    // Current chunk tracking (for batched execution)
    currentChunkIndex: v.number(), // Which chunk we're executing (0-based)
    currentChunkTargets: v.array(v.string()), // Targets in current chunk
    currentChunkSize: v.number(), // Expected completions in current chunk
    completedInCurrentChunk: v.number(), // Counter: increments as workflows complete
    completedWorkflowIds: v.array(v.string()), // Track completed workflows (idempotency)

    // Progress counters
    completedCount: v.number(), // Total completed tasks
    failedCount: v.number(), // Total failed tasks

    // Status
    status: batchTaskOrchestrationStatusSchema,
    error: v.optional(v.string()),

    // Metadata
    toolCallId: v.optional(v.string()), // Tool call ID for UI persistence
    threadId: v.optional(v.string()), // Thread ID for sending completion notifications
    createdAt: v.number(),
    updatedAt: v.number(),
});

/**
 * Batch Task Orchestrations
 * 
 * Orchestrates multiple parallel task executions. Generic for any batched 
 * workflow (research, excel, powerpoint, etc.)
 */
export const batchTaskOrchestrations = defineTable({
    ...batchTaskOrchestrationSchema.fields,
})
    .index("by_status", ["status"])
    .index("by_tool_call", ["toolCallId"]);

export const researchTables = {
    artifacts,
    datasets,
    datasetRows,
    datasetCells,
    outputEntities,
    batchTaskOrchestrations,
}

// ============================================================================
// TYPE EXPORTS - For frontend and TypeScript usage
// ============================================================================

export type DatasetFieldType = Infer<typeof datasetFieldTypeSchema>;
export type DatasetField = Infer<typeof datasetFieldSchema>;
export type Citation = Infer<typeof citationSchema>;
export type DatasetCellStatus = Infer<typeof datasetCellStatusSchema>;
export type BatchTaskOrchestrationStatus = Infer<typeof batchTaskOrchestrationStatusSchema>;
export type OutputEntityType = Infer<typeof outputEntityTypeSchema>;
export type Dataset = Infer<typeof datasetSchema>;
export type DatasetCell = Infer<typeof datasetCellSchema>;
export type OutputEntity = Infer<typeof outputEntitySchema>;
export type BatchTaskOrchestration = Infer<typeof batchTaskOrchestrationSchema>;

// ============================================================================
// REUSABLE VALIDATORS FOR FUNCTION ARGS/RETURNS
// ============================================================================

// For creating a dataset (all fields required)
export const createDatasetArgs = datasetSchema.omit("createdAt", "updatedAt");

// For creating a dataset cell (without lastUpdated, which is set automatically)
export const createDatasetCellArgs = datasetCellSchema.omit("lastUpdated");

// For saving a field value (subset of cell schema)
export const saveFieldValueArgs = v.object({
    rowId: v.id("datasetRows"),
    fieldId: v.string(),
    value: v.any(),
    confidence: v.number(),
    citations: v.array(citationSchema.omit("accessedAt")),
    reasoning: v.string(),
});

// For dataset context (used in review workflows)
export const datasetContextSchema = v.object({
    rowId: v.id("datasetRows"),
    datasetId: v.id("datasets"),
    entityName: v.string(),
    fields: v.array(datasetFieldSchema),
});

