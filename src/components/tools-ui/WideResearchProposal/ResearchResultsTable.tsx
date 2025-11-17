/**
 * ResearchResultsTable - Component for displaying research results in a table format
 * 
 * Renders a comprehensive table showing the status and progress of each research target.
 * Provides real-time updates on the status of individual research tasks within the batch.
 * 
 * Features:
 * - Table layout with columns: Target, Status, Chunk, Summary, Actions
 * - Status indicators with icons and colors (completed, running, failed, queued)
 * - Chunk assignment display (shows which chunk each target belongs to)
 * - Active chunk highlighting with special styling
 * - Report summaries (truncated to 150 chars) when available
 * - Status-specific messages (in progress, queued, failed, etc.)
 * - Eye button to open task execution in new popup window
 * 
 * Props:
 * - targets: Array of target strings to display
 * - targetStatusMap: Map of target -> TargetStatus for lookup
 * - concurrencyLimit: Used to calculate chunk numbers
 * - currentChunkTargets: Array of targets currently being processed
 * - batchData: Batch orchestration data with research task executions
 * - onExpandGrid: Callback to expand the results grid
 * - canExpandGrid: Whether grid expansion is available
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, XCircle, Clock, Circle, Maximize2, Eye } from "lucide-react";
import { TargetStatus } from "./types";
import { Doc } from "@/convex/_generated/dataModel";

interface ResearchResultsTableProps {
    targets: string[];
    targetStatusMap: Map<string, TargetStatus>;
    concurrencyLimit: number;
    currentChunkTargets: string[];
    batchData: Doc<"batchTaskOrchestrations"> & { research: Doc<"taskExecutions">[] };
    onExpandGrid: () => void;
    canExpandGrid: boolean;
}

export function ResearchResultsTable({
    targets,
    targetStatusMap,
    concurrencyLimit,
    currentChunkTargets,
    batchData,
    onExpandGrid,
    canExpandGrid
}: ResearchResultsTableProps) {
    const handleViewTask = (taskExecutionId: string) => {
        window.open(`/task-execution/${taskExecutionId}`, '_blank');
    };

    const isInCurrentChunk = (target: string) => {
        return currentChunkTargets.includes(target);
    };

    return (
        <>
            <div className="border rounded-lg bg-background overflow-hidden">
                {/* Table Header with Expand Button */}
                <div className="flex items-center justify-between p-3 bg-muted/50 border-b">
                    <div className="grid grid-cols-11 gap-2 flex-1 text-xs font-semibold text-muted-foreground">
                        <div className="col-span-3">Target</div>
                        <div className="col-span-2">Status</div>
                        <div className="col-span-2">Chunk</div>
                        <div className="col-span-3">Summary</div>
                        <div className="col-span-1">Actions</div>
                    </div>
                    {canExpandGrid && (
                        <Button
                            onClick={onExpandGrid}
                            size="sm"
                            className="ml-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                        >
                            <Maximize2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                {/* Table Rows */}
                <div className="divide-y">
                    {targets.map((target, idx) => {
                        const taskData = targetStatusMap.get(target);
                        const status = taskData?.status || "queued";
                        const isCurrentChunk = isInCurrentChunk(target);

                        // Find the task execution for this target
                        const taskExecution = batchData.research.find(
                            (task) => task.context?.target === target
                        );

                        // Status icon and color
                        const StatusIcon =
                            status === "completed" ? CheckCircle2 :
                                status === "running" ? Loader2 :
                                    status === "failed" ? XCircle :
                                        status === "queued" ? Clock :
                                            Circle;

                        const statusColor =
                            status === "completed" ? "text-green-600 dark:text-green-500" :
                                status === "running" ? "text-blue-600 dark:text-blue-400" :
                                    status === "failed" ? "text-red-600 dark:text-red-400" :
                                        "text-muted-foreground";

                        // Get chunk number for this target
                        const targetChunk = Math.floor(idx / concurrencyLimit) + 1;

                        return (
                            <div
                                key={target}
                                className={`grid grid-cols-11 gap-2 p-3 text-sm hover:bg-muted/40 transition-colors ${isCurrentChunk ? "bg-blue-50 dark:bg-blue-950/30 border-l-2 border-blue-500" : ""
                                    }`}
                            >
                                <div className="col-span-3 font-medium truncate">
                                    {target}
                                </div>
                                <div className={`col-span-2 flex items-center gap-1.5 ${statusColor}`}>
                                    <StatusIcon className={`h-3.5 w-3.5 ${status === "running" ? "animate-spin" : ""}`} />
                                    <span className="capitalize text-xs">{status}</span>
                                </div>
                                <div className="col-span-2 text-xs text-muted-foreground">
                                    {isCurrentChunk ? (
                                        <Badge variant="secondary" className="text-xs bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700">
                                            ⚡ Active
                                        </Badge>
                                    ) : (
                                        `Chunk ${targetChunk}`
                                    )}
                                </div>
                                <div className="col-span-3">
                                    {taskData?.report ? (
                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                            {taskData.report.slice(0, 150)}...
                                        </p>
                                    ) : status === "running" ? (
                                        <p className="text-xs text-muted-foreground italic">
                                            Research in progress...
                                        </p>
                                    ) : status === "queued" ? (
                                        <p className="text-xs text-muted-foreground italic">
                                            Waiting in queue...
                                        </p>
                                    ) : status === "failed" ? (
                                        <p className="text-xs text-red-600">
                                            Research failed
                                        </p>
                                    ) : (
                                        <p className="text-xs text-muted-foreground italic">
                                            Initializing...
                                        </p>
                                    )}
                                </div>
                                <div className="col-span-1 flex justify-end">
                                    {taskExecution && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleViewTask(taskExecution._id)}
                                            className="h-7 w-7 p-0"
                                            title="Open task execution in new window"
                                        >
                                            <Eye className="h-3.5 w-3.5" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </>
    );
}

