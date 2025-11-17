import { useRef } from "react";
import {
    PromptInput,
    PromptInputProvider,
    PromptInputBody,
    PromptInputTextarea,
    PromptInputSubmit,
    PromptInputFooter,
    PromptInputTools,
    PromptInputActionMenu,
    PromptInputActionMenuTrigger,
    PromptInputActionMenuContent,
    PromptInputActionAddAttachments,
    PromptInputAttachments,
    PromptInputAttachment,
    PromptInputSpeechButton,
    PromptInputMessage,
} from "@/components/ai-elements/prompt-input";

interface ChatInputProps {
    onSubmit: (message: PromptInputMessage) => Promise<void>;
    submissionStatus: "submitted" | "streaming" | "ready";
}

export function ChatInput({ onSubmit, submissionStatus }: ChatInputProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    return (
        <div className="border-t bg-background">
            <div className="container max-w-4xl mx-auto px-4 py-4">
                <PromptInputProvider>
                    <PromptInput
                        onSubmit={onSubmit}
                        globalDrop
                        multiple
                        className="w-full"
                    >
                        <PromptInputAttachments>
                            {(attachment) => <PromptInputAttachment data={attachment} />}
                        </PromptInputAttachments>
                        <PromptInputBody>
                            <PromptInputTextarea
                                ref={textareaRef}
                                placeholder="Ask me to research something..."
                            />
                        </PromptInputBody>
                        <PromptInputFooter>
                            <PromptInputTools>
                                <PromptInputActionMenu>
                                    <PromptInputActionMenuTrigger />
                                    <PromptInputActionMenuContent>
                                        <PromptInputActionAddAttachments />
                                    </PromptInputActionMenuContent>
                                </PromptInputActionMenu>
                                <PromptInputSpeechButton textareaRef={textareaRef} />
                            </PromptInputTools>
                            <PromptInputSubmit status={submissionStatus} />
                        </PromptInputFooter>
                    </PromptInput>
                </PromptInputProvider>
            </div>
        </div>
    );
}

