/**
 * ExecutionHeader - Header component for the execution view
 * 
 * Displays the collapsible header for the research execution card.
 * Shows the target count, chevron icon (rotates based on open state), and a status badge
 * indicating the current batch status (running/completed/failed) with progress information.
 * 
 * Props:
 * - isOpen: Whether the collapsible is currently open
 * - targetCount: Total number of research targets
 * - status: Current batch status ("running" | "completed" | "failed")
 * - completedCount: Number of completed research tasks
 * - failedCount: Number of failed research tasks
 */

import { CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Target, ChevronDown } from "lucide-react";
import { Doc } from "@/convex/_generated/dataModel";

interface ExecutionHeaderProps {
    isOpen: boolean;
    targetCount: number;
    status: Doc<"batchTaskOrchestrations">["status"];
    completedCount: number;
    failedCount: number;
}

export function ExecutionHeader({
    isOpen,
    targetCount,
    status,
    completedCount,
    failedCount
}: ExecutionHeaderProps) {
    return (
        <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity">
                <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="font-semibold">Wide Research: {targetCount} Targets</h3>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
                <Badge
                    variant={
                        status === "completed" ? "default" :
                            status === "failed" ? "destructive" :
                                "secondary"
                    }
                >
                    {status === "running" &&
                        `${completedCount + failedCount}/${targetCount} complete`
                    }
                    {status === "completed" && "✓ Complete"}
                    {status === "failed" && "✗ Failed"}
                </Badge>
            </div>
        </CollapsibleTrigger>
    );
}

