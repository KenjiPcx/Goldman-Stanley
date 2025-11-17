import { z } from "zod/v3";
import { createTool } from "@convex-dev/agent";
import { internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";

/**
 * Dataset Research Tool
 * 
 * This tool enables agents to incrementally save research findings into structured datasets.
 * Each dataset has a schema (defined fields), rows (entities being researched), and cells (individual data points).
 * 
 * Flow:
 * 1. Agent receives field schema in the prompt (entityName, fields to research)
 * 2. Agent researches each field using existing tools (search, scrape, etc.)
 * 3. Agent calls saveFieldValue to save findings with citations and confidence
 * 4. If agent uses wrong fieldId, tool returns valid options
 * 5. Progress tracked automatically (completedCells / totalCells)
 * 6. Agent uses scratchpad for progress notes
 * 
 * Example:
 * - Dataset: "PE Firm Research"  
 * - Row: "Blackstone"
 * - Fields: [revenue, aum, investmentFocus]
 * - Agent saves: saveFieldValue({ fieldId: "revenue", value: 50000000000, confidence: 0.95, citations: [...], reasoning: "..." })
 */

// Citation schema - represents a source for a data point
export const citationSchema = z.object({
    url: z.string().describe("URL of the source"),
    title: z.optional(z.string()).describe("Title of the source document/page"),
    snippet: z.optional(z.string()).describe("Relevant excerpt from the source"),
});

export type Citation = z.infer<typeof citationSchema>;

/**
 * Save a researched field value to a dataset cell
 * This is the primary tool agents use to record findings
 */
export const saveFieldValueSchema = z.object({
    fieldId: z.string().describe("The ID of the field from the dataset schema (e.g., 'revenue', 'aum', 'founded')"),
    value: z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.null(),
    ]).describe("The actual value found during research. Use null if not found after thorough search."),
    confidence: z.number().min(0).max(1).describe("Confidence score 0-1. Use 0.9+ for official sources, 0.7-0.9 for credible secondary sources, 0.5-0.7 for estimates or outdated data, <0.5 for uncertain data."),
    citations: z.array(citationSchema).describe("Sources where this information was found. Include at least one citation for credibility."),
    reasoning: z.string().describe("Your reasoning for this value. Explain: Where you found it, why you're confident (or uncertain), any caveats, how you derived it if calculated."),
});

export type SaveFieldValueInput = z.infer<typeof saveFieldValueSchema>;

const createSaveFieldValueTool = (rowId: Id<"datasetRows">) => {
    return createTool({
        description: "Save a researched field value to the dataset. Call this immediately after finding a data point. Include citations and explain your reasoning. If you can't find a value after thorough research, save null with low confidence and explain what you tried. If you use an invalid fieldId, the tool will tell you the valid options.",
        args: saveFieldValueSchema,
        handler: async (ctx, args) => {
            const result: {
                success: boolean;
                message: string;
                validFieldIds?: string[];
            } = await ctx.runMutation(internal.research.dataset.saveFieldValue, {
                rowId,
                fieldId: args.fieldId,
                value: args.value,
                confidence: args.confidence,
                citations: args.citations,
                reasoning: args.reasoning,
            });

            return result.message;
        },
    });
};

/**
 * Create the dataset toolset for a research workflow
 * 
 * Returns only the saveFieldValue tool - the agent gets field info in the prompt
 * and uses scratchpad for progress tracking.
 * 
 * Usage in workflow:
 * ```typescript
 * const datasetTools = createDatasetToolset(rowId);
 * const tools = {
 *   ...otherTools,
 *   ...datasetTools,
 * };
 * ```
 */
export const createDatasetToolset = (rowId: Id<"datasetRows">) => {
    return {
        saveFieldValue: createSaveFieldValueTool(rowId),
    };
};
