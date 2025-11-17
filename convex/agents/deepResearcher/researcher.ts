import { components, internal } from "../../_generated/api";
import { Agent, ToolCtx } from "@convex-dev/agent";
import { InferUITools, UIMessage } from 'ai';
import { Id } from "../../_generated/dataModel";
import { createDelegateToSubResearcherAgentTool, resolveSubResearcherAgentTools } from "../tools/subResearcher.tool";
import { chatModel, chatModelProviderOptions } from "../../ai.config";
import { stepCountIs } from "ai";
import { z } from "zod";
import { createDatasetToolset } from "../tools/dataset.tool";
import { ActionCtx } from "../../_generated/server";

if (!process.env.PARALLEL_API_KEY) throw new Error("PARALLEL_API_KEY is not set");

export const deepResearchAgent = new Agent(components.agent, {
    name: "Deep Research Agent",
    languageModel: chatModel,
    providerOptions: chatModelProviderOptions,
    stopWhen: [stepCountIs(50)],
});

/**
 * Resolve tools based on whether this is dataset research or regular research
 * 
 * Dataset Research Mode:
 * - Main agent: delegates field groups + saves values
 * - Subagent: deep searches/extracts per field group
 * 
 * Regular Research Mode:
 * - Main agent: delegates research tasks
 * - Subagent: general purpose research with all tools
 */
export const resolveTools = async (ctx: ActionCtx, taskExecutionId: Id<"taskExecutions">) => {
    // Check if this is dataset research by looking for associated datasetRow
    const row = await ctx.runQuery(internal.research.dataset.getRowByTaskExecution, {
        taskExecutionId,
    });

    const subResearcherTools = await resolveSubResearcherAgentTools(taskExecutionId);
    const delegateToSubResearcherAgent = createDelegateToSubResearcherAgentTool(
        deepResearchAgent,
        subResearcherTools
    );

    if (row) {
        // DATASET RESEARCH MODE
        // Main agent orchestrates and saves, subagents do deep research
        const datasetTools = createDatasetToolset(row._id);

        return {
            // Subagent tools (for research work)
            ...subResearcherTools,
            delegateToSubResearcherAgent,

            // Dataset tools (for saving results)
            ...datasetTools,
        };
    } else {
        // REGULAR RESEARCH MODE
        // Full tool access for general purpose research
        return {
            ...subResearcherTools,
            delegateToSubResearcherAgent,
        };
    }
}

const metadataSchema = z.object({
});
type DeepResearchMetadata = z.infer<typeof metadataSchema>;

const dataPartSchema = z.object({
});
type DeepResearchDataPart = z.infer<typeof dataPartSchema>;

export type DeepResearchTools = Awaited<ReturnType<typeof resolveTools>>;
type DeepResearchUITools = InferUITools<DeepResearchTools>;
export type DeepResearchUIMessage = UIMessage<DeepResearchMetadata, DeepResearchDataPart, DeepResearchUITools>;
