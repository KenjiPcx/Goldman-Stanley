"use client";

import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { useUIMessages } from "@convex-dev/agent/react";
import {
    Message,
    MessageContent,
} from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";
import { Reasoning, ReasoningTrigger, ReasoningContent } from "@/components/ai-elements/reasoning";
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { Loader } from "@/components/ai-elements/loader";
import { ChevronRight, ChevronDown, Users } from "lucide-react";
import { useState } from "react";
import { TodosTool } from "./TodosTool";
import { PythonCodeTool } from "./PythonCodeTool";
import { ScratchpadTool } from "./ScratchpadTool";
import { SearchWebTool } from "./SearchWebTool";
import { ExtractPageTool } from "./ExtractPageTool";
import { SubResearcherAgentUIMessage } from "@/convex/agents/tools/subResearcher.tool";


interface DelegatedResearchToolProps {
    childThreadId: string;
    taskTitle: string;
    taskPrompt: string;
    defaultOpen?: boolean;
    status: "complete" | "active" | "pending";
}

export function DelegatedResearchTool({
    childThreadId,
    taskTitle,
    taskPrompt,
    defaultOpen = false,
    status,
}: DelegatedResearchToolProps) {
    const [isExpanded, setIsExpanded] = useState(defaultOpen);

    const {
        results,
        status: messagesStatus,
    } = useUIMessages(
        api.messaging.chat.listThreadMessages,
        isExpanded ? { threadId: childThreadId } : "skip",
        { initialNumItems: 50, stream: true },
    );

    const childMessages = results as (SubResearcherAgentUIMessage & { key: string })[];
    const isStreaming = messagesStatus === "LoadingFirstPage" || messagesStatus === "LoadingMore";

    return (
        <div className="border rounded-lg overflow-hidden bg-muted/30 w-full">
            {/* Delegation Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
            >
                <div className="flex-shrink-0">
                    {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                    ) : (
                        <ChevronRight className="h-4 w-4" />
                    )}
                </div>

                <Users className="h-4 w-4 text-purple-600 flex-shrink-0" />

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{taskTitle}</span>
                    </div>
                    {!isExpanded && taskPrompt && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                            {taskPrompt.substring(0, 100)}...
                        </p>
                    )}
                </div>

                {status === 'complete' ? (
                    <Badge variant="secondary" className="text-xs bg-green-600 text-white">
                        ✓ Done
                    </Badge>
                ) : isStreaming ? (
                    <Badge variant="outline" className="text-xs bg-blue-500 animate-pulse">
                        ⚡ running
                    </Badge>
                ) : null}
            </button>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="border-t bg-background/50">
                    {/* Task Prompt */}
                    <div className="p-4 border-b bg-muted/20">
                        <div className="text-xs font-semibold text-muted-foreground mb-2">
                            TASK INSTRUCTIONS
                        </div>
                        <div className="text-sm whitespace-pre-wrap font-mono bg-background p-3 rounded border">
                            {taskPrompt}
                        </div>
                    </div>

                    {/* Child Agent Messages */}
                    <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
                        {!childMessages || childMessages.length === 0 ? (
                            <div className="flex items-center justify-center py-8">
                                {!childMessages ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <Loader />
                                        <p className="text-xs text-muted-foreground">Loading sub-agent conversation...</p>
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground">No messages yet</p>
                                )}
                            </div>
                        ) : (
                            <>
                                {childMessages.map((message) => (
                                    <Message from={message.role} key={message.key}>
                                        <MessageContent variant="flat" className="text-sm">
                                            {message.parts.map((part, i) => {
                                                // Skip step-start markers
                                                if (part.type === 'step-start') {
                                                    return null;
                                                }

                                                const isSubAgentLatest = isStreaming &&
                                                    i === message.parts.length - 1 &&
                                                    message.key === childMessages[childMessages.length - 1]?.key;

                                                switch (part.type) {
                                                    case "text":
                                                        return (
                                                            <Response key={`${message.key}-${i}`}>
                                                                {part.text}
                                                            </Response>
                                                        );
                                                    case "reasoning":
                                                        return (
                                                            <Reasoning
                                                                key={`${message.key}-${i}`}
                                                                className="w-full"
                                                                isStreaming={isSubAgentLatest}
                                                            >
                                                                <ReasoningTrigger />
                                                                <ReasoningContent>{part.text}</ReasoningContent>
                                                            </Reasoning>
                                                        );

                                                    // Static tools with specific types
                                                    case "tool-writeTodos":
                                                        return (
                                                            <TodosTool
                                                                key={`${message.key}-${i}`}
                                                                part={part}
                                                                defaultOpen={isSubAgentLatest}
                                                            />
                                                        );

                                                    case "tool-interpreterTools":
                                                        return (
                                                            <PythonCodeTool
                                                                key={`${message.key}-${i}`}
                                                                part={part}
                                                                defaultOpen={isSubAgentLatest}
                                                            />
                                                        );

                                                    case "tool-writeScratchpad":
                                                    case "tool-replaceScratchpadString":
                                                        return (
                                                            <ScratchpadTool
                                                                key={`${message.key}-${i}`}
                                                                part={part}
                                                                defaultOpen={isSubAgentLatest}
                                                            />
                                                        );

                                                    case "tool-searchWeb":
                                                        return (
                                                            <SearchWebTool
                                                                key={`${message.key}-${i}`}
                                                                part={part}
                                                                defaultOpen={isSubAgentLatest}
                                                            />
                                                        );

                                                    case "tool-extractPage":
                                                        return (
                                                            <ExtractPageTool
                                                                key={`${message.key}-${i}`}
                                                                part={part}
                                                                defaultOpen={isSubAgentLatest}
                                                            />
                                                        );

                                                    default:
                                                        // Default tool rendering for other tools (e.g., MCP tools)
                                                        if (part.type.startsWith("tool-")) {
                                                            // Generic tool part interface for dynamic tools
                                                            interface GenericToolPart {
                                                                type: string;
                                                                toolCallId: string;
                                                                toolName?: string;
                                                                state?: "input-streaming" | "input-available" | "output-available" | "output-error";
                                                                input?: Record<string, unknown>;
                                                                output?: string;
                                                                errorText?: string;
                                                            }

                                                            const toolPart = part as GenericToolPart;

                                                            // Handle different states similar to our custom tool components
                                                            switch (toolPart.state) {
                                                                case "input-streaming":
                                                                    return (
                                                                        <Tool
                                                                            key={`${message.key}-${i}`}
                                                                            defaultOpen={isSubAgentLatest}
                                                                            className="text-sm"
                                                                        >
                                                                            <ToolHeader
                                                                                title={toolPart.toolName || part.type}
                                                                                type={part.type as "tool-call" | "tool-result"}
                                                                                state="input-streaming"
                                                                            />
                                                                            <ToolContent>
                                                                                {toolPart.input && <ToolInput input={toolPart.input} />}
                                                                            </ToolContent>
                                                                        </Tool>
                                                                    );

                                                                case "input-available":
                                                                    return (
                                                                        <Tool
                                                                            key={`${message.key}-${i}`}
                                                                            defaultOpen={isSubAgentLatest}
                                                                            className="text-sm"
                                                                        >
                                                                            <ToolHeader
                                                                                title={toolPart.toolName || part.type}
                                                                                type={part.type as "tool-call" | "tool-result"}
                                                                                state="input-available"
                                                                            />
                                                                            <ToolContent>
                                                                                {toolPart.input && <ToolInput input={toolPart.input} />}
                                                                            </ToolContent>
                                                                        </Tool>
                                                                    );

                                                                case "output-available":
                                                                    return (
                                                                        <Tool
                                                                            key={`${message.key}-${i}`}
                                                                            defaultOpen={isSubAgentLatest}
                                                                            className="text-sm"
                                                                        >
                                                                            <ToolHeader
                                                                                title={toolPart.toolName || part.type}
                                                                                type={part.type as "tool-call" | "tool-result"}
                                                                                state="output-available"
                                                                            />
                                                                            <ToolContent>
                                                                                {toolPart.input && <ToolInput input={toolPart.input} />}
                                                                                {(toolPart.output || toolPart.errorText) && (
                                                                                    <ToolOutput output={toolPart.output} errorText={toolPart.errorText} />
                                                                                )}
                                                                            </ToolContent>
                                                                        </Tool>
                                                                    );

                                                                case "output-error":
                                                                    return (
                                                                        <Tool
                                                                            key={`${message.key}-${i}`}
                                                                            defaultOpen={isSubAgentLatest}
                                                                            className="text-sm"
                                                                        >
                                                                            <ToolHeader
                                                                                title={toolPart.toolName || part.type}
                                                                                type={part.type as "tool-call" | "tool-result"}
                                                                                state="output-error"
                                                                            />
                                                                            <ToolContent>
                                                                                {toolPart.input && <ToolInput input={toolPart.input} />}
                                                                                <ToolOutput output={toolPart.output} errorText={toolPart.errorText} />
                                                                            </ToolContent>
                                                                        </Tool>
                                                                    );

                                                                default:
                                                                    // Fallback for tools without state information
                                                                    return (
                                                                        <Tool
                                                                            key={`${message.key}-${i}`}
                                                                            defaultOpen={isSubAgentLatest}
                                                                            className="text-sm"
                                                                        >
                                                                            <ToolHeader
                                                                                title={toolPart.toolName || part.type}
                                                                                type={part.type as "tool-call" | "tool-result"}
                                                                                state="output-available"
                                                                            />
                                                                            <ToolContent>
                                                                                {toolPart.input && <ToolInput input={toolPart.input} />}
                                                                                {(toolPart.output || toolPart.errorText) && (
                                                                                    <ToolOutput output={toolPart.output} errorText={toolPart.errorText} />
                                                                                )}
                                                                            </ToolContent>
                                                                        </Tool>
                                                                    );
                                                            }
                                                        }
                                                        return null;
                                                }
                                            })}
                                        </MessageContent>
                                    </Message>
                                ))}
                                {isStreaming && <Loader />}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

