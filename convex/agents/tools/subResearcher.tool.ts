import { z } from "zod";
import { createTool, createThread, Agent } from "@convex-dev/agent";
import { internal, components } from "../../_generated/api";
import { InferUITools, stepCountIs, Tool, UIMessage } from "ai";
import { chatModel, chatModelProviderOptions } from "../../ai.config";
import { genericResearcherPrompt } from "../deepResearcher/prompts/genericResearcherPrompt";
import { createInterpreterTool } from "./interpreter.tool";
import { createScratchpadToolset } from "./scratchpad.toolset";
import { Id } from "../../_generated/dataModel";
import { createParallelToolSet } from "./parallel.toolset";

export const delegateToSubResearcherAgentSchema = z.object({
    taskTitle: z.string().describe("Short title for this delegation task (e.g., 'Find Fund Size Information', 'Map Website for Key Pages')"),
    taskPrompt: z.string().describe("Detailed instructions for sub-researcher. Include: (1) Specific tasks to perform, (2) Search queries to use, (3) What data to extract, (4) Expected output format, (5) Context about the buyer and your research so far. Be thorough - better instructions = better results."),
});

export type DelegateToSubResearcherAgentInput = z.infer<typeof delegateToSubResearcherAgentSchema>;

export const createDelegateToSubResearcherAgentTool = (
    deepResearchAgent: Agent<object, any>,
    subResearcherTools: Record<string, Tool<any, any>>
) => {
    return createTool({
        description: "PRIMARY RESEARCH TOOL (use 80% of the time): Delegate specific research tasks to a specialized sub-researcher with fresh context. ALWAYS delegate for: website mapping/scraping, multi-source searches, data extraction from multiple pages, deal history, contact finding, fund announcements, portfolio research. Provide detailed instructions with specific search queries, target sources, and expected output format. Include context about the buyer and what you've already found. Sub-researcher has access to search_web, extract_page, writeTodos, and runPythonCode.",
        args: delegateToSubResearcherAgentSchema,
        handler: async (ctx, args, { toolCallId }) => {
            // Create child thread for delegation
            const childThreadId = await createThread(ctx, components.agent, {
                title: args.taskTitle,
                summary: args.taskPrompt,
            });

            // Map toolCallId to childThreadId for UI lookup
            await ctx.runMutation(internal.orchestration.delegations.mapToolCallToThread, {
                toolCallId: toolCallId,
                childThreadId: childThreadId,
            });

            // Execute sub-researcher
            const result = await deepResearchAgent.streamText(ctx, { threadId: childThreadId }, {
                model: chatModel,
                system: genericResearcherPrompt,
                prompt: args.taskPrompt,
                tools: subResearcherTools,
                providerOptions: chatModelProviderOptions,
                stopWhen: [stepCountIs(25)],
            }, {
                saveStreamDeltas: { chunking: "word", throttleMs: 500 }
            });

            let resultText = '';
            for await (const text of result.textStream) {
                resultText += text;
            }

            return `Sub researcher agent result: \n${resultText}`;
        },
    });
};

export const resolveSubResearcherAgentTools = async (taskExecutionId: Id<"taskExecutions">) => {
    // Create Parallel tool set
    const parallelTools = createParallelToolSet();

    // Create tool instances
    const scratchpadTools = createScratchpadToolset(taskExecutionId);
    const interpreterTools = createInterpreterTool();

    return {
        ...parallelTools,
        ...scratchpadTools,
        interpreterTools,
    };
}

const metadataSchema = z.object({
});
type SubResearcherAgentMetadata = z.infer<typeof metadataSchema>;

const dataPartSchema = z.object({
});
type SubResearcherAgentDataPart = z.infer<typeof dataPartSchema>;

export type SubResearcherAgentTools = Awaited<ReturnType<typeof resolveSubResearcherAgentTools>>;
type SubResearcherAgentUITools = InferUITools<SubResearcherAgentTools>;
export type SubResearcherAgentUIMessage = UIMessage<SubResearcherAgentMetadata, SubResearcherAgentDataPart, SubResearcherAgentUITools>;