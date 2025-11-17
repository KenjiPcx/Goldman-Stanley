import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import {
    saveFieldValueArgs,
    createDatasetArgs,
    datasetSchema,
} from "./schema";

/**
 * Dataset Research Functions
 * 
 * These functions support incremental research workflows where agents
 * save findings field-by-field into structured datasets.
 * 
 * Architecture:
 * - Dataset: Schema definition (what fields to research)
 * - DatasetRow: One entity being researched (e.g., "Blackstone")
 * - DatasetCell: One data point (e.g., Blackstone's revenue)
 * 
 * Tool Functions (called by agents):
 * - saveFieldValue: Save a researched value with citations
 *   → Auto-validates fieldId and provides helpful errors
 *   → Tracks progress automatically
 * 
 * Workflow Functions (called by workflows):
 * - createDatasetForResearch: Initialize a new dataset
 * - createRowForEntity: Add an entity to research
 * - getDatasetProgress: Check completion status
 * - getCompleteDataset: Get full dataset with all data
 */

// ============================================================================
// TOOL FUNCTIONS - Called by agents during research
// ============================================================================

/**
 * Save a researched field value to a dataset cell
 * Called by agent's saveFieldValue tool
 * If fieldId is invalid, returns helpful error with valid fieldIds
 * Optimized: Uses rowId directly to avoid repeated row lookups
 */
export const saveFieldValue = internalMutation({
    args: saveFieldValueArgs,
    returns: v.object({
        success: v.boolean(),
        message: v.string(),
        validFieldIds: v.optional(v.array(v.string())),
    }),
    handler: async (ctx, args): Promise<{ success: boolean, message: string, validFieldIds?: string[] }> => {
        // Find the cell first (no need to fetch row yet)
        const cell = await ctx.db
            .query("datasetCells")
            .withIndex("by_row_and_field", (q) =>
                q.eq("rowId", args.rowId).eq("fieldId", args.fieldId)
            )
            .unique();

        // If cell not found, fetch row to provide helpful error with valid fieldIds
        if (!cell) {
            const row = await ctx.db.get(args.rowId);
            if (!row) {
                return {
                    success: false,
                    message: `Dataset row not found: ${args.rowId}`,
                };
            }

            const dataset = await ctx.db.get(row.datasetId);
            if (!dataset) {
                return {
                    success: false,
                    message: `Dataset not found for row: ${args.rowId}`,
                };
            }

            const validFieldIds = dataset.schema.map(field => field.fieldId);

            return {
                success: false,
                message: `Invalid fieldId "${args.fieldId}". Valid fieldIds are: ${validFieldIds.join(", ")}`,
                validFieldIds,
            };
        }

        const wasEmpty = cell.status === "empty" || cell.status === "researching";

        // Add accessedAt timestamp to citations
        const citationsWithTimestamp = args.citations.map(citation => ({
            ...citation,
            accessedAt: Date.now(),
        }));

        // Single patch for cell update - that's it!
        await ctx.db.patch(cell._id, {
            value: args.value,
            confidence: args.confidence,
            citations: citationsWithTimestamp,
            reasoning: args.reasoning,
            status: "completed",
            lastUpdated: Date.now(),
        });

        return {
            success: true,
            message: `✓ Saved ${args.fieldId}: ${args.value} (confidence: ${args.confidence})`,
        };
    },
});



/**
 * Get datasetRow by rowId
 */
export const getRow = query({
    args: {
        rowId: v.id("datasetRows"),
    },
    handler: async (ctx, args) => {
        const row = await ctx.db.get(args.rowId);
        return row ?? null;
    },
});

/**
 * Get datasetRow by taskExecutionId
 * Used to check if a task execution is dataset research
 */
export const getRowByTaskExecution = internalQuery({
    args: {
        taskExecutionId: v.id("taskExecutions"),
    },
    handler: async (ctx, args) => {
        const row = await ctx.db
            .query("datasetRows")
            .withIndex("by_task_execution", (q) => q.eq("taskExecutionId", args.taskExecutionId))
            .first();

        return row ?? null;
    },
});

/**
 * Get all cells for a dataset row (for review process)
 */
export const getCellsForRow = internalQuery({
    args: {
        rowId: v.id("datasetRows"),
    },
    handler: async (ctx, args) => {
        const cells = await ctx.db
            .query("datasetCells")
            .withIndex("by_row", (q) => q.eq("rowId", args.rowId))
            .collect();

        return cells;
    },
});

// ============================================================================
// WORKFLOW FUNCTIONS - Called by workflows to set up datasets
// ============================================================================

/**
 * Create a new dataset for a research workflow
 * Called at the start of a dataset research workflow
 */
export const createDatasetForResearch = internalMutation({
    args: createDatasetArgs,
    returns: v.id("datasets"),
    handler: async (ctx, args): Promise<Id<"datasets">> => {
        const datasetId = await ctx.db.insert("datasets", {
            taskExecutionId: args.taskExecutionId,
            name: args.name,
            description: args.description,
            query: args.query,
            schema: args.schema,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        return datasetId;
    },
});

/**
 * Create a row (entity) in a dataset and initialize all cells
 * Called for each entity that needs to be researched
 */
export const createRowForEntity = internalMutation({
    args: {
        datasetId: v.id("datasets"),
        taskExecutionId: v.id("taskExecutions"),
        entityName: v.string(),
        entityType: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        const dataset = await ctx.db.get(args.datasetId);
        if (!dataset) {
            throw new Error(`Dataset not found: ${args.datasetId}`);
        }

        // Create the row
        const rowId = await ctx.db.insert("datasetRows", {
            datasetId: args.datasetId,
            taskExecutionId: args.taskExecutionId,
            entityName: args.entityName,
            entityType: args.entityType || "entity",
            metadata: args.metadata,
            totalCells: dataset.schema.length,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        // Initialize all cells as empty
        for (const field of dataset.schema) {
            await ctx.db.insert("datasetCells", {
                rowId,
                fieldId: field.fieldId,
                value: null,
                status: "empty",
                lastUpdated: Date.now(),
            });
        }

        return rowId;
    },
});

/**
 * Get dataset by ID (lightweight - just the dataset document with schema)
 * Useful for displaying schema in UI without fetching all rows/cells
 */
export const getDataset = query({
    args: {
        datasetId: v.id("datasets"),
    },
    returns: v.union(datasetSchema.extend({
        _id: v.id("datasets"),
        _creationTime: v.number(),
    }), v.null()),
    handler: async (ctx, args) => {
        const dataset = await ctx.db.get(args.datasetId);
        return dataset ?? null;
    },
});

export const getDatasetProgress = query({
    args: {
        datasetId: v.id("datasets"),
    },
    returns: v.object({
        totalRows: v.number(),
        totalCells: v.number(),
        completedCells: v.number(),
        progressPercent: v.number(),
        rows: v.array(v.object({
            rowId: v.id("datasetRows"),
            entityName: v.string(),
            completed: v.number(),
            total: v.number(),
            progressPercent: v.number(),
        })),
    }),
    handler: async (ctx, args) => {
        const rows = await ctx.db
            .query("datasetRows")
            .withIndex("by_dataset", (q) => q.eq("datasetId", args.datasetId))
            .collect();

        const totalRows = rows.length;
        const totalCells = rows.reduce((sum, row) => sum + row.totalCells, 0);

        // Compute progress by counting completed cells using index
        let totalCompletedCells = 0;
        const rowsProgress = await Promise.all(rows.map(async (row) => {
            // Use index to efficiently query only completed cells
            const completedCells = await ctx.db
                .query("datasetCells")
                .withIndex("by_row_and_status", (q) =>
                    q.eq("rowId", row._id).eq("status", "completed")
                )
                .collect();

            const completedCount = completedCells.length;
            totalCompletedCells += completedCount;

            return {
                rowId: row._id,
                entityName: row.entityName,
                completed: completedCount,
                total: row.totalCells,
                progressPercent: row.totalCells > 0 ? (completedCount / row.totalCells) * 100 : 0,
            };
        }));

        const progressPercent = totalCells > 0 ? (totalCompletedCells / totalCells) * 100 : 0;

        return {
            totalRows,
            totalCells,
            completedCells: totalCompletedCells,
            progressPercent,
            rows: rowsProgress,
        };
    },
});

/**
 * Get a complete dataset with all rows and cells
 * Useful for displaying final results
 */
export const getCompleteDataset = query({
    args: {
        datasetId: v.id("datasets"),
    },
    returns: v.any(), // Full dataset structure
    handler: async (ctx, args) => {
        const dataset = await ctx.db.get(args.datasetId);
        if (!dataset) {
            return null;
        }

        const rows = await ctx.db
            .query("datasetRows")
            .withIndex("by_dataset", (q) => q.eq("datasetId", args.datasetId))
            .collect();

        const rowsWithCells = await Promise.all(
            rows.map(async (row) => {
                const cells = await ctx.db
                    .query("datasetCells")
                    .withIndex("by_row", (q) => q.eq("rowId", row._id))
                    .collect();

                return {
                    row,
                    cells,
                };
            })
        );

        return {
            dataset,
            rows: rowsWithCells,
        };
    },
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Link a dataset to a taskExecution
 * Creates an outputEntity record
 */
export const linkDatasetToTaskExecution = internalMutation({
    args: {
        taskExecutionId: v.id("taskExecutions"),
        datasetId: v.id("datasets"),
    },
    returns: v.id("outputEntities"),
    handler: async (ctx, args) => {
        const outputEntityId = await ctx.db.insert("outputEntities", {
            taskExecutionId: args.taskExecutionId,
            entityType: "dataset",
            entityId: args.datasetId,
            createdAt: Date.now(),
        });

        return outputEntityId;
    },
});

/**
 * Helper: Get rowId for a target in a batch
 * Used when creating taskExecutions to link them to dataset rows
 */
export const getRowIdForTarget = internalQuery({
    args: {
        datasetId: v.id("datasets"),
        targetName: v.string(),
    },
    returns: v.union(v.id("datasetRows"), v.null()),
    handler: async (ctx, args) => {
        const row = await ctx.db
            .query("datasetRows")
            .withIndex("by_dataset", (q) => q.eq("datasetId", args.datasetId))
            .filter((q) => q.eq(q.field("entityName"), args.targetName))
            .first();

        return row ? row._id : null;
    },
});

// ============================================================================
// UI QUERIES - For displaying enriched data with cell metadata
// ============================================================================

/**
 * Get row with all cells for a taskExecution
 * Returns enriched data suitable for display with DataCell component
 */
export const getRowWithCellsByTaskExecution = query({
    args: {
        taskExecutionId: v.id("taskExecutions"),
    },
    returns: v.union(
        v.object({
            row: v.object({
                _id: v.id("datasetRows"),
                _creationTime: v.number(),
                datasetId: v.id("datasets"),
                taskExecutionId: v.id("taskExecutions"),
                entityName: v.string(),
                entityType: v.optional(v.string()),
                metadata: v.optional(v.any()),
                completedCells: v.optional(v.number()),
                totalCells: v.number(),
                createdAt: v.number(),
                updatedAt: v.number(),
            }),
            cells: v.array(v.object({
                _id: v.id("datasetCells"),
                _creationTime: v.number(),
                rowId: v.id("datasetRows"),
                fieldId: v.string(),
                value: v.any(),
                confidence: v.optional(v.number()),
                citations: v.optional(v.array(v.object({
                    url: v.string(),
                    title: v.optional(v.string()),
                    snippet: v.optional(v.string()),
                    accessedAt: v.number(),
                }))),
                reasoning: v.optional(v.string()),
                status: v.union(
                    v.literal("empty"),
                    v.literal("researching"),
                    v.literal("completed"),
                    v.literal("failed")
                ),
                needsRefresh: v.optional(v.boolean()),
                lastUpdated: v.number(),
            })),
            schema: v.array(v.object({
                fieldId: v.string(),
                name: v.string(),
                type: v.union(
                    v.literal("text"),
                    v.literal("number"),
                    v.literal("date"),
                    v.literal("url"),
                    v.literal("boolean")
                ),
                description: v.string(),
                required: v.boolean(),
            })),
        }),
        v.null()
    ),
    handler: async (ctx, args) => {
        // Find the row for this task execution
        const row = await ctx.db
            .query("datasetRows")
            .withIndex("by_task_execution", (q) => q.eq("taskExecutionId", args.taskExecutionId))
            .first();

        if (!row) {
            return null;
        }

        // Get all cells for this row
        const cells = await ctx.db
            .query("datasetCells")
            .withIndex("by_row", (q) => q.eq("rowId", row._id))
            .collect();

        // Get the dataset schema
        const dataset = await ctx.db.get(row.datasetId);
        if (!dataset) {
            return null;
        }

        return {
            row,
            cells,
            schema: dataset.schema,
        };
    },
});

/**
 * Get batch with all research results including cell metadata
 * Enhanced version of getBatchWithResearch that includes dataset cells
 */
export const getBatchWithEnrichedResearch = query({
    args: {
        batchId: v.id("batchTaskOrchestrations"),
    },
    handler: async (ctx, args) => {
        const batch = await ctx.db.get(args.batchId);
        if (!batch) {
            return null;
        }

        // Get dataset schema if available
        let schema = undefined;
        if (batch.datasetId) {
            const dataset = await ctx.db.get(batch.datasetId);
            if (dataset) {
                schema = dataset.schema;
            }
        }

        // Get all task executions for this batch
        const taskExecutions = await ctx.db
            .query("taskExecutions")
            .withIndex("by_batchId", (q) => q.eq("batchId", args.batchId))
            .collect();

        // For each task execution, get its row and cells
        const research = await Promise.all(
            taskExecutions.map(async (taskExecution) => {
                // Try to find the dataset row for this task execution
                const row = await ctx.db
                    .query("datasetRows")
                    .withIndex("by_task_execution", (q) => q.eq("taskExecutionId", taskExecution._id))
                    .first();

                if (!row) {
                    return {
                        taskExecution,
                        row: undefined,
                        cellsByFieldId: undefined,
                    };
                }

                // Get all cells for this row
                const cells = await ctx.db
                    .query("datasetCells")
                    .withIndex("by_row", (q) => q.eq("rowId", row._id))
                    .collect();

                // Create a map of fieldId -> cell data for easy lookup
                const cellsByFieldId: Record<string, any> = {};
                for (const cell of cells) {
                    cellsByFieldId[cell.fieldId] = {
                        value: cell.value,
                        confidence: cell.confidence,
                        citations: cell.citations,
                        reasoning: cell.reasoning,
                        status: cell.status,
                        needsRefresh: cell.needsRefresh,
                    };
                }

                return {
                    taskExecution,
                    row,
                    cellsByFieldId,
                };
            })
        );

        return {
            batch,
            schema,
            research,
        };
    },
});

