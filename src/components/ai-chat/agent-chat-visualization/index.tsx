"use client";

import { api } from "@/convex/_generated/api";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUIMessages } from "@convex-dev/agent/react";
import { useQuery } from "convex/react";
import {
    Conversation,
    ConversationContent,
    ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Loader } from "@/components/ai-elements/loader";
import { MessageSquare } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { DeepResearchUIMessage } from "@/convex/agents/deepResearcher/researcher";
import { FinalReport } from "./final-report";
import { EmptyState } from "./empty-state";
import { MessageRenderer } from "./message-renderer";

export interface AgentChatVisualizationProps {
    threadId: string;
    taskExecutionId: Id<"taskExecutions">;
    showFinalReport?: boolean;
}

export function AgentChatVisualization({ threadId, taskExecutionId, showFinalReport = false }: AgentChatVisualizationProps) {
    const {
        results,
        status,
    } = useUIMessages(
        api.messaging.chat.listThreadMessages,
        { threadId },
        { initialNumItems: 50, stream: true },
    );

    const messages = results as (DeepResearchUIMessage & { key: string })[];

    // Fetch output entities for this task execution
    const outputEntities = useQuery(api.orchestration.taskExecutions.getTaskExecutionOutputEntities, {
        taskExecutionId,
    });

    // Find the buyer entity if it exists
    const buyerEntity = outputEntities?.find((entity) => entity.entityType === "buyer");

    // Fetch the buyer data to show the final extracted object
    const buyer = useQuery(
        api.proprietary.buyers.getBuyer,
        buyerEntity
            ? { buyerId: buyerEntity.entityId as Id<"buyers"> }
            : "skip"
    );

    // If showing final report only, render just the report
    if (showFinalReport && buyer?.researchNotes) {
        return (
            <FinalReport
                researchNotes={buyer.researchNotes}
                citations={buyer.citations}
            />
        );
    }

    if (!messages || messages.length === 0) {
        return (
            <EmptyState isLoading={!messages} />
        );
    }

    const isStreaming = status === "LoadingFirstPage" || status === "LoadingMore";

    return (
        <Card className="h-full flex flex-col overflow-hidden">
            <CardHeader className="border-b flex-shrink-0">
                <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Agent Logs
                    <Badge variant="outline" className="ml-auto">
                        {messages.length} message{messages.length > 1 ? "s" : ""}
                    </Badge>
                </CardTitle>
            </CardHeader>
            <Conversation className="flex-1">
                <ConversationContent>
                    {messages.map((message) => {
                        const isLatestMessage = message.key === messages[messages.length - 1]?.key;
                        return (
                            <MessageRenderer
                                key={message.key}
                                message={message}
                                isLatestMessage={isLatestMessage}
                                isStreaming={isStreaming}
                            />
                        );
                    })}
                    {isStreaming && <Loader />}
                </ConversationContent>
                <ConversationScrollButton />
            </Conversation>
        </Card>
    );
}

