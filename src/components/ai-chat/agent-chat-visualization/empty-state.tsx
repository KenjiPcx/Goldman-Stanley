"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";
import { Loader } from "@/components/ai-elements/loader";

interface EmptyStateProps {
    isLoading: boolean;
}

export function EmptyState({ isLoading }: EmptyStateProps) {
    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="border-b">
                <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Agent Logs
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex items-center justify-center">
                {isLoading ? (
                    <div className="flex flex-col items-center gap-2">
                        <Loader />
                        <p className="text-sm text-muted-foreground">Loading conversation...</p>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">No messages yet</p>
                )}
            </CardContent>
        </Card>
    );
}

