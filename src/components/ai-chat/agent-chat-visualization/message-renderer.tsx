"use client";

import { Message, MessageContent } from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";
import { Reasoning, ReasoningTrigger, ReasoningContent } from "@/components/ai-elements/reasoning";
import {
    ChainOfThought,
    ChainOfThoughtContent,
    ChainOfThoughtHeader,
    ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import { ReasoningUIPart, TextUIPart } from "ai";
import { DeepResearchUIMessage } from "@/convex/agents/deepResearcher/researcher";
import { getToolIcon, getToolLabel, getStepStatus } from "./helpers";
import { ToolStepRenderer } from "./tool-step-renderer";

interface MessageRendererProps {
    message: DeepResearchUIMessage & { key: string };
    isLatestMessage: boolean;
    isStreaming: boolean;
}

export function MessageRenderer({ message, isLatestMessage, isStreaming }: MessageRendererProps) {
    // Check if last part is a text part (final answer)
    const lastPart = message.parts[message.parts.length - 1];
    const hasFinalText = lastPart?.type === 'text';

    // Everything except the final text goes in ChainOfThought
    const thinkingParts = hasFinalText ? message.parts.slice(0, -1) : message.parts;
    const finalTextPart = hasFinalText ? lastPart as TextUIPart : null;

    return (
        <Message from={message.role} key={message.key} className={message.role === "assistant" ? "max-w-[85%]" : ""}>
            <MessageContent variant="flat" className="w-full">
                {/* Render all thinking parts (tools + reasoning) in order */}
                {thinkingParts.length > 0 && (
                    <ChainOfThought defaultOpen={isLatestMessage} className="w-full max-w-none my-2">
                        <ChainOfThoughtHeader>
                            {thinkingParts.length} step{thinkingParts.length > 1 ? 's' : ''}
                        </ChainOfThoughtHeader>
                        <ChainOfThoughtContent>
                            {thinkingParts.map((part, idx) => {
                                // Skip step-start markers
                                if (part.type === 'step-start') {
                                    return null;
                                }

                                // Handle reasoning parts
                                if (part.type === 'reasoning') {
                                    const reasoningPart = part as ReasoningUIPart;
                                    const isLatestPart = isLatestMessage && idx === thinkingParts.length - 1;
                                    return (
                                        <Reasoning
                                            key={`${message.key}-reasoning-${idx}`}
                                            className="w-full my-2"
                                            isStreaming={isStreaming && isLatestPart}
                                        >
                                            <ReasoningTrigger />
                                            <ReasoningContent>{reasoningPart.text}</ReasoningContent>
                                        </Reasoning>
                                    );
                                }

                                // Handle tool parts
                                if (!part.type.startsWith('tool-')) {
                                    return null;
                                }

                                const toolPart = part as DeepResearchUIMessage["parts"][number] & { type: `tool-${string}` };
                                const isLatestTool = isLatestMessage && idx === thinkingParts.length - 1;
                                const toolName = toolPart.type.split('-')[1]!;
                                const Icon = getToolIcon(toolName);
                                const label = getToolLabel(toolName);
                                const status = getStepStatus(toolPart, isLatestTool);

                                // Get description from input
                                let description = "";
                                switch (toolPart.type) {
                                    case "tool-delegateToSubResearcherAgent":
                                        description = (toolPart?.input?.taskTitle as string) || "";
                                        break;
                                    case "tool-replaceScratchpadString":
                                        description = (toolPart?.input?.workflowProgress as string) || "Updating scratchpad";
                                        break;
                                    case "tool-writeScratchpad":
                                        description = (toolPart?.input?.workflowProgress as string) || "Creating scratchpad";
                                        break;
                                    case "tool-interpreterTools":
                                        description = `"${((toolPart?.input?.code || "") as string).substring(0, 50)}..."`;
                                        break;
                                    default:
                                        break;
                                }

                                return (
                                    <ChainOfThoughtStep
                                        key={`${message.key}-tool-${idx}`}
                                        icon={Icon}
                                        label={label}
                                        description={description}
                                        status={status}
                                    >
                                        <ToolStepRenderer
                                            toolPart={toolPart}
                                            toolName={toolName}
                                            status={status}
                                        />
                                    </ChainOfThoughtStep>
                                );
                            })}
                        </ChainOfThoughtContent>
                    </ChainOfThought>
                )}

                {/* Render final text answer */}
                {finalTextPart && (
                    <Response>
                        {finalTextPart.text}
                    </Response>
                )}
            </MessageContent>
        </Message>
    );
}

