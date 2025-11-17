"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, PlayCircle, AlertCircle, MessageSquare, FileText, RotateCcw } from "lucide-react";
import { AgentChatVisualization } from "@/components/ai-chat/agent-chat-visualization";
import { toast } from "sonner";

const statusIcons = {
    queued: PlayCircle,
    running: PlayCircle,
    awaiting_input: AlertCircle,
    completed: CheckCircle,
    failed: XCircle,
} as const;

const statusColors = {
    queued: "secondary",
    running: "default",
    awaiting_input: "default",
    completed: "default",
    failed: "destructive",
} as const;

interface TaskExecutionViewProps {
    taskExecutionId: Id<"taskExecutions">;
    /**
     * Optional header content to display above the main content
     * Useful for adding back buttons or custom headers in page vs modal contexts
     */
    header?: React.ReactNode;
    /**
     * Whether to show the full page layout (true) or compact modal layout (false)
     * Defaults to false for modal usage
     */
    fullPage?: boolean;
}

/**
 * TaskExecutionView component - renders the full task execution page content
 * Accepts taskExecutionId as a prop (no router dependencies)
 * Can be used in both page routes and modals
 */
export default function TaskExecutionView({
    taskExecutionId,
    header,
    fullPage = false
}: TaskExecutionViewProps) {
    const [activeTab, setActiveTab] = useState<"chat" | "report">("chat");

    const taskExecution = useQuery(api.orchestration.taskExecutions.getTaskExecution, {
        taskExecutionId,
    });

    const scratchpad = useQuery(api.orchestration.taskExecutions.readScratchpad, {
        taskExecutionId,
    });

    const formatDate = (timestamp: number) => new Date(timestamp).toLocaleString();
    const formatDuration = (start: number, end?: number) => {
        const duration = (end || Date.now()) - start;
        const seconds = Math.floor(duration / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    };

    if (!taskExecution) {
        return (
            <div className={`flex items-center justify-center ${fullPage ? 'min-h-screen' : 'h-full'}`}>
                <Card>
                    <CardContent className="flex items-center justify-center py-12">
                        <p className="text-muted-foreground">Loading task execution...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const StatusIcon = statusIcons[taskExecution.status];
    const containerClass = fullPage ? "min-h-screen bg-background" : "h-full";
    const contentPadding = fullPage ? "p-6" : "p-4";
    const cardHeight = fullPage ? "h-[600px]" : "h-[500px]";

    return (
        <div className={`${containerClass} overflow-auto ${contentPadding}`}>
            {/* Custom Header (from props) or Default Header */}
            {header || (
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div>
                            <h2 className={`${fullPage ? 'text-2xl' : 'text-xl'} font-bold flex items-center gap-2`}>
                                <StatusIcon className={`${fullPage ? 'h-6 w-6' : 'h-5 w-5'}`} />
                                Task Execution Details
                            </h2>
                            <p className="text-muted-foreground mt-1 text-sm">{taskExecution.inputPrompt}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left Panel: Agent Logs */}
                <div className="lg:col-span-2">
                    {taskExecution.threadId ? (
                        <AgentChatVisualization
                            threadId={taskExecution.threadId}
                            taskExecutionId={taskExecution._id}
                            showFinalReport={false}
                        />
                    ) : (
                        <Card className={`${cardHeight} flex items-center justify-center`}>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    No agent logs available
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right Panel: Status & Scratchpad */}
                <div className="space-y-4">
                    {/* Status Overview */}
                    <Card>
                        <CardHeader>
                            <CardTitle className={fullPage ? "text-lg" : "text-base"}>Status Overview</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Badge variant={statusColors[taskExecution.status]}>
                                    {taskExecution.status}
                                </Badge>
                                <span className={`text-muted-foreground ${fullPage ? 'text-sm' : 'text-xs'}`}>
                                    Started: {formatDate(taskExecution.startedAt)}
                                </span>
                            </div>

                            {taskExecution.completedAt && (
                                <div className={`text-muted-foreground ${fullPage ? 'text-sm' : 'text-xs'}`}>
                                    Completed: {formatDate(taskExecution.completedAt)}
                                </div>
                            )}

                            <div className={`text-muted-foreground ${fullPage ? 'text-sm' : 'text-xs'}`}>
                                Duration: {formatDuration(taskExecution.startedAt, taskExecution.completedAt)}
                            </div>

                            {taskExecution.error && (
                                <div className="mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded">
                                    <div className="flex items-center gap-2 text-destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        <span className={`font-medium ${fullPage ? 'text-sm' : 'text-xs'}`}>Error</span>
                                    </div>
                                    <p className={`mt-1 ${fullPage ? 'text-sm' : 'text-xs'}`}>{taskExecution.error}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Workflow Progress */}
                    {taskExecution.workflowProgress && (
                        <Card>
                            <CardHeader>
                                <CardTitle className={fullPage ? "text-lg" : "text-base"}>Workflow Progress</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className={`bg-muted p-3 rounded font-mono whitespace-pre-wrap overflow-y-auto ${fullPage ? 'text-sm max-h-64' : 'text-xs max-h-48'}`}>
                                    {taskExecution.workflowProgress}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Scratchpad */}
                    <Card>
                        <CardHeader>
                            <CardTitle className={fullPage ? "text-lg" : "text-base"}>Research Scratchpad</CardTitle>
                            <CardDescription className={fullPage ? "text-sm" : "text-xs"}>
                                Real-time research notes and agent thinking
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {scratchpad ? (
                                <div className={`bg-muted p-4 rounded font-mono whitespace-pre-wrap overflow-y-auto ${fullPage ? 'text-sm max-h-64' : 'text-xs max-h-48'}`}>
                                    {scratchpad}
                                </div>
                            ) : (
                                <div className={`text-muted-foreground ${fullPage ? 'text-sm' : 'text-xs'}`}>
                                    No scratchpad content available
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

        </div>
    );
}
