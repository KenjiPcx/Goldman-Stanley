import { Message, MessageContent } from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { Reasoning, ReasoningTrigger, ReasoningContent } from "@/components/ai-elements/reasoning";
import { WideResearchProposal } from "@/components/tools-ui/WideResearchProposal";
import { FileAttachmentDisplay } from "./file-attachment-display";
import { FileUIPart, UIMessage } from "ai";
import { cn } from "@/lib/utils";

type MessageWithKey = UIMessage & { key: string };

interface MessageRendererProps {
    message: MessageWithKey;
    threadId?: string; // Thread ID for passing to tools
    isLatestMessage: boolean;
    isStreaming: boolean;
}

export function MessageRenderer({ message, threadId, isLatestMessage, isStreaming }: MessageRendererProps) {
    // Extract file parts
    const fileParts = message.parts.filter(
        (part) => "url" in part && "filename" in part
    ) as FileUIPart[];

    return (
        <div key={message.key} className={cn(
            "flex flex-col",
            message.role === "assistant" ? "max-w-[85%] items-start" : "max-w-2xl ml-auto items-end"
        )}>
            {/* Files displayed above message */}
            <FileAttachmentDisplay
                fileParts={fileParts}
                messageKey={message.key}
                role={message.role}
            />

            <Message from={message.role}>
                <MessageContent variant="flat" className="w-full">
                    {/* Render other parts */}
                    {message.parts.map((part, i) => {
                        // Skip file parts (already rendered above)
                        if ("url" in part && "filename" in part) {
                            return null;
                        }

                        if (part.type === "text") {
                            return (
                                <Response key={`${message.key}-text-${i}`}>
                                    {part.text}
                                </Response>
                            );
                        } else if (part.type === "reasoning") {
                            const isLatestPart = isStreaming &&
                                isLatestMessage &&
                                i === message.parts.length - 1;

                            return (
                                <Reasoning
                                    key={`${message.key}-reasoning-${i}`}
                                    className="w-full"
                                    isStreaming={isLatestPart}
                                >
                                    <ReasoningTrigger />
                                    <ReasoningContent>{part.text}</ReasoningContent>
                                </Reasoning>
                            );
                        } else if (part.type.startsWith("tool-")) {
                            const toolName = part.type.replace(/^tool-/, "");

                            // Type guard for tool parts
                            if ('state' in part) {
                                // Special handling for proposeWideResearch tool - show during all states
                                if (toolName === "proposeWideResearch") {
                                    const toolCallId = 'toolCallId' in part ? (part.toolCallId as string) : `${message.key}-${i}`;

                                    // Try to extract proposal data from either input (streaming/available) or output (available)
                                    let proposalData = null;

                                    try {
                                        // First try to get from output (when complete)
                                        if (part.state === "output-available" && 'output' in part) {
                                            proposalData = JSON.parse(part.output as string);
                                        }
                                        // Fall back to input (when streaming or available but not yet complete)
                                        else if ((part.state === "input-streaming" || part.state === "input-available") && 'input' in part) {
                                            proposalData = part.input;
                                        }
                                    } catch (e) {
                                        console.error("Failed to parse proposal data:", e);
                                    }

                                    // Show the component if we have any proposal data
                                    if (proposalData && (proposalData.type === "wide_research_proposal" || proposalData.researchTask)) {
                                        return (
                                            <WideResearchProposal
                                                key={`${message.key}-proposal-${i}`}
                                                toolCallId={toolCallId}
                                                threadId={threadId}
                                                datasetName={proposalData.datasetName}
                                                researchTask={proposalData.researchTask || ""}
                                                targets={proposalData.targets || []}
                                                outputFormat={proposalData.outputFormat || ""}
                                                outputSchema={proposalData.outputSchema}
                                            />
                                        );
                                    }
                                }

                                // Default tool rendering
                                return (
                                    <Tool key={`${message.key}-tool-${i}`} defaultOpen={false}>
                                        <ToolHeader
                                            title={toolName}
                                            type={part.type as `tool-${string}`}
                                            state={part.state || "output-available"}
                                        />
                                        <ToolContent className="whitespace-pre-wrap break-words">
                                            {part.state === "input-streaming" && 'input' in part && (
                                                <ToolInput input={JSON.stringify(part.input, null, 2)} />
                                            )}
                                            {part.state === "output-available" && (
                                                <>
                                                    {'input' in part && part.input && <ToolInput input={part.input} />}
                                                    {'output' in part && (part.output || ('errorText' in part && part.errorText)) && (
                                                        <ToolOutput
                                                            output={'output' in part ? part.output : undefined}
                                                            errorText={'errorText' in part ? part.errorText : undefined}
                                                        />
                                                    )}
                                                </>
                                            )}
                                        </ToolContent>
                                    </Tool>
                                );
                            }
                        }
                        return null;
                    })}
                </MessageContent>
            </Message>
        </div>
    );
}

