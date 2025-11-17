import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUIMessages } from "@convex-dev/agent/react";
import {
    Conversation,
    ConversationContent,
    ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Loader } from "@/components/ai-elements/loader";
import { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { toast } from "sonner";
import { FileUIPart } from "ai";
import { ChatSidebar } from "../../components/ai-chat/research-chat/chat-sidebar";
import { ChatHeader } from "../../components/ai-chat/research-chat/chat-header";
import { ChatInput } from "../../components/ai-chat/research-chat/chat-input";
import { MessageRenderer } from "../../components/ai-chat/research-chat/message-renderer";
import { useFileUpload } from "../../components/ai-chat/research-chat/use-file-upload";

export default function ResearchChatPage() {
    const [threadId, setThreadId] = useState<string | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [submissionStatus, setSubmissionStatus] = useState<"submitted" | "streaming" | "ready">("ready");

    const createThread = useMutation(api.messaging.chat.createChatbotThread);
    const sendMessage = useMutation(api.messaging.chat.sendChatbotMessage);
    const threads = useQuery(api.messaging.chat.listChatbotThreads);
    const { uploadFiles } = useFileUpload();

    // Create thread on mount or load first thread
    useEffect(() => {
        const initThread = async () => {
            if (!threadId && threads && threads.length > 0) {
                // Load the most recent thread
                setThreadId(threads[0]._id);
            } else if (!threadId && threads && threads.length === 0) {
                // Create a new thread if none exist
                const result = await createThread();
                setThreadId(result.threadId);
            }
        };
        initThread();
    }, [threads, threadId, createThread]);

    const handleNewThread = async () => {
        try {
            const result = await createThread();
            setThreadId(result.threadId);
            toast.success("New conversation started");
        } catch (error) {
            console.error("Failed to create thread:", error);
            toast.error("Failed to create new conversation");
        }
    };

    const {
        results: messages,
        status,
    } = useUIMessages(
        api.messaging.chat.listThreadMessages,
        threadId ? { threadId } : "skip",
        { initialNumItems: 50, stream: true }
    );

    const handleSubmit = async (messageParam: PromptInputMessage) => {
        if (!messageParam || !threadId) return;

        const message = messageParam as unknown as { text: string; files?: FileUIPart[] };

        const hasText = Boolean(message.text);
        const hasAttachments = Boolean(message.files?.length);

        if (!(hasText || hasAttachments)) return;

        setSubmissionStatus("submitted");

        try {
            // Upload files if present
            const files = message.files && message.files.length > 0
                ? await uploadFiles(message.files)
                : [];

            await sendMessage({
                threadId,
                message: message.text || "",
                files,
            });

            setSubmissionStatus("streaming");

            // Reset to ready after a short delay
            setTimeout(() => {
                setSubmissionStatus("ready");
            }, 1000);
        } catch (error) {
            console.error("Failed to send message:", error);
            toast.error("Failed to send message");
            setSubmissionStatus("ready");
        }
    };

    const isStreaming = status === "LoadingFirstPage" || status === "LoadingMore";

    return (
        <div className="flex h-screen bg-background">
            <ChatSidebar
                threads={threads}
                threadId={threadId}
                onThreadSelect={setThreadId}
                onNewThread={handleNewThread}
                sidebarOpen={sidebarOpen}
            />

            {/* Main Content */}
            <div className="flex flex-col flex-1 h-screen">
                <ChatHeader
                    sidebarOpen={sidebarOpen}
                    onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                />

                <div className="flex-1 overflow-hidden">
                    <Conversation className="h-full">
                        <ConversationContent className="container max-w-4xl mx-auto px-4">
                            {!messages || messages.length === 0 ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center text-muted-foreground">
                                        <p className="text-lg font-medium mb-2">Start a conversation</p>
                                        <p className="text-sm">Ask me to research anything!</p>
                                    </div>
                                </div>
                            ) : (
                                messages.map((message, index) => (
                                    <MessageRenderer
                                        key={message.key}
                                        message={message}
                                        threadId={threadId || undefined}
                                        isLatestMessage={index === messages.length - 1}
                                        isStreaming={isStreaming}
                                    />
                                ))
                            )}
                            {isStreaming && <Loader />}
                        </ConversationContent>
                        <ConversationScrollButton />
                    </Conversation>
                </div>

                <ChatInput
                    onSubmit={handleSubmit}
                    submissionStatus={submissionStatus}
                />
            </div>
        </div>
    );
}
