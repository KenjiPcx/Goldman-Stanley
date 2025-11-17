"use client";

import { Loader } from "@/components/ai-elements/loader";
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { ChainOfThoughtSearchResults, ChainOfThoughtSearchResult } from "@/components/ai-elements/chain-of-thought";
import { Sparkles } from "lucide-react";
import { DeepResearchUIMessage } from "@/convex/agents/deepResearcher/researcher";
import { ScratchpadTool } from "../../tools-ui/ScratchpadTool";
import { TodosTool } from "../../tools-ui/TodosTool";
import { PythonCodeTool } from "../../tools-ui/PythonCodeTool";
import { SearchWebTool } from "../../tools-ui/SearchWebTool";
import { ExtractPageTool } from "../../tools-ui/ExtractPageTool";
import { DelegatedResearchToolWrapper } from "./delegated-research-tool-wrapper";
import {
    getToolStreamingMessage,
    extractSearchResults,
} from "./helpers";

interface ToolStepRendererProps {
    toolPart: DeepResearchUIMessage["parts"][number] & { type: `tool-${string}` };
    toolName: string;
    status: "complete" | "active" | "pending";
}

export function ToolStepRenderer({ toolPart, toolName, status }: ToolStepRendererProps) {
    // Get state property if it exists
    const toolState = 'state' in toolPart ? toolPart.state : undefined;

    // Check if this is a search/scrape tool with results
    const searchTools = ["tavily_search", "tavily_extract", "firecrawl_map", "firecrawl_scrape"];
    const isSearchTool = searchTools.includes(toolName);
    const output = 'output' in toolPart ? toolPart.output : undefined;
    const searchResults = isSearchTool && output ? extractSearchResults(toolName, output) : [];

    return (
        <>
            {/* Show loader for active tools */}
            {status === "active" && (
                <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
                    {toolName === "delegateToSubResearcherAgent" ? (
                        <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 animate-pulse" />
                    ) : (
                        <Loader size={14} />
                    )}
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                        {getToolStreamingMessage(toolName)}
                    </span>
                </div>
            )}

            {/* Show search results as badges */}
            {searchResults.length > 0 && (
                <ChainOfThoughtSearchResults>
                    {searchResults.map((result, idx) => (
                        <ChainOfThoughtSearchResult key={idx}>
                            {result.length > 50 ? `${result.substring(0, 50)}...` : result}
                        </ChainOfThoughtSearchResult>
                    ))}
                </ChainOfThoughtSearchResults>
            )}

            {/* Render custom UI based on tool type and state */}
            {(() => {
                switch (toolPart.type) {
                    case 'tool-delegateToSubResearcherAgent': {
                        const callId = toolPart.toolCallId;
                        switch (toolState) {
                            case 'input-streaming':
                            case 'input-available':
                                // Show the input being streamed
                                return (
                                    <div key={callId} className="text-sm space-y-1">
                                        <div className="font-medium">{(toolPart.input as { taskTitle?: string })?.taskTitle || "Preparing delegation..."}</div>
                                        {(toolPart.input as { taskPrompt?: string })?.taskPrompt && (
                                            <div className="text-muted-foreground text-xs">{(toolPart.input as { taskPrompt?: string })?.taskPrompt}</div>
                                        )}
                                    </div>
                                );
                            case 'output-available':
                            case 'output-error':
                                return callId ? (
                                    <DelegatedResearchToolWrapper
                                        toolCallId={callId}
                                        taskTitle={(toolPart.input as { taskTitle?: string })?.taskTitle || ""}
                                        taskPrompt={(toolPart.input as { taskPrompt?: string })?.taskPrompt || ""}
                                        defaultOpen={false}
                                        status={status}
                                    />
                                ) : null;
                            default:
                                return null;
                        }
                    }

                    case 'tool-writeScratchpad':
                    case 'tool-replaceScratchpadString':
                        // Always show the tool UI for all states
                        return <ScratchpadTool part={toolPart} defaultOpen={toolState === 'input-streaming'} />;

                    case 'tool-writeTodos':
                        // Always show the tool UI for all states
                        return <TodosTool part={toolPart} defaultOpen={toolState === 'input-streaming'} />;

                    case 'tool-interpreterTools':
                        // Always show the tool UI for all states
                        return <PythonCodeTool part={toolPart} defaultOpen={toolState === 'input-streaming'} />;

                    case 'tool-searchWeb':
                        // Always show the tool UI for all states
                        return <SearchWebTool part={toolPart} defaultOpen={toolState === 'input-streaming'} />;

                    case 'tool-extractPage':
                        // Always show the tool UI for all states
                        return <ExtractPageTool part={toolPart} defaultOpen={toolState === 'input-streaming'} />;

                    default:
                        // Default tool rendering for generic tools (MCP tools, etc.)
                        // We need to cast since these aren't known at compile time
                        const genericToolPart = toolPart as unknown as {
                            type: string;
                            toolCallId?: string;
                            toolName?: string;
                            state?: "input-streaming" | "input-available" | "output-available" | "output-error";
                            input?: unknown;
                            output?: string;
                            errorText?: string;
                        };

                        const state = genericToolPart.state || "output-available";

                        return (
                            <div className="w-full break-words">
                                <Tool defaultOpen={false} className="text-sm w-full">
                                    <ToolHeader
                                        title={toolName || genericToolPart.type}
                                        type={genericToolPart.type as `tool-${string}`}
                                        state={state}
                                    />
                                    <ToolContent className="whitespace-pre-wrap break-words">
                                        {genericToolPart.input ? (
                                            <ToolInput
                                                input={typeof genericToolPart.input === 'string'
                                                    ? genericToolPart.input
                                                    : JSON.stringify(genericToolPart.input, null, 2)
                                                }
                                            />
                                        ) : null}
                                        {(state === "output-available" || state === "output-error") && (genericToolPart.output || genericToolPart.errorText) ? (
                                            <ToolOutput
                                                output={genericToolPart.output}
                                                errorText={genericToolPart.errorText}
                                            />
                                        ) : null}
                                    </ToolContent>
                                </Tool>
                            </div>
                        );
                }
            })()}
        </>
    );
}

