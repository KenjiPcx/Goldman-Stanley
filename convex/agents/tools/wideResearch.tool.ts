import { z } from "zod/v3";
import { createTool } from "@convex-dev/agent";

export const proposeWideResearchSchema = z.object({
    datasetName: z.string().describe("A descriptive name for this research dataset (e.g., 'Top 10 PE Firms Analysis', 'European Market Comparison'). Keep it concise but informative."),
    researchTask: z.string().describe("The research task to perform on each target. Be specific about what information to gather and how to analyze it."),
    targets: z.array(z.string()).describe("List of targets to research in parallel (e.g., ['USA', 'UK', 'Japan'] or ['OpenAI', 'Anthropic', 'Google AI']). Minimum 2 targets."),
    outputFormat: z.string().describe("How to format the final aggregated output (e.g., 'comparison table', 'summary report with rankings', 'detailed analysis for each')"),
    outputSchema: z.array(z.object({
        fieldId: z.string().describe("Unique identifier for this field (e.g., 'revenue', 'founded_year', 'ceo_name'). Use snake_case."),
        name: z.string().describe("Human-readable name of the field (e.g., 'Annual Revenue', 'Founded Year', 'CEO Name')"),
        type: z.enum(["text", "number", "date", "url", "boolean"]).describe("Data type of the field"),
        description: z.string().describe("Detailed description of what this field represents and how to research it"),
        required: z.boolean().describe("Whether this field must be found (true) or is optional (false)"),
    })).describe("The schema of the structured dataset to create. Each target will be researched to populate these fields with citations and confidence scores."),
});

export type ProposeWideResearchInput = z.infer<typeof proposeWideResearchSchema>;

export const createProposeWideResearchTool = () => {
    return createTool({
        description: "Propose a wide/batch research plan that will research the same task across multiple targets in parallel. Use this when the user wants to compare multiple entities (companies, countries, products, etc.). The proposal will be shown to the user for confirmation before execution.",
        args: proposeWideResearchSchema,
        handler: async (ctx, args) => {
            if (args.targets.length < 2) {
                return "Error: Wide research requires at least 2 targets. Please provide more targets or use regular research for single items.";
            }

            // Just return the proposal as JSON
            // Frontend will render this with custom UI component
            return JSON.stringify({
                type: "wide_research_proposal",
                datasetName: args.datasetName,
                researchTask: args.researchTask,
                targets: args.targets,
                outputFormat: args.outputFormat,
                outputSchema: args.outputSchema,
            }, null, 2);
        },
    });
};
