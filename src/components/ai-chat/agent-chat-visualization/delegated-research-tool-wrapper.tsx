"use client";

import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { DelegatedResearchTool } from "../../tools-ui/DelegatedResearchTool";

interface DelegatedResearchToolWrapperProps {
    toolCallId: string;
    taskTitle: string;
    taskPrompt: string;
    defaultOpen: boolean;
    status: "complete" | "active" | "pending";
}

export function DelegatedResearchToolWrapper({
    toolCallId,
    taskTitle,
    taskPrompt,
    defaultOpen,
    status
}: DelegatedResearchToolWrapperProps) {
    const childThreadId = useQuery(api.orchestration.delegations.getChildThreadByToolCall, {
        toolCallId,
    });

    if (!childThreadId) {
        return (
            <div className="text-xs text-muted-foreground">Loading delegation...</div>
        );
    }

    return (
        <DelegatedResearchTool
            childThreadId={childThreadId}
            taskTitle={taskTitle}
            taskPrompt={taskPrompt}
            defaultOpen={defaultOpen}
            status={status}
        />
    );
}

