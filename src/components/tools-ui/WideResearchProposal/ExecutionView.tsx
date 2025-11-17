/**
 * ExecutionView - Main view component for research execution and results
 * 
 * This component renders the execution UI that users see during and after research.
 * It displays real-time progress, status, and results for all research targets.
 * 
 * Features:
 * - Collapsible header with batch status badge
 * - Research task description display
 * - Dataset schema visualization (fetched from datasets table if datasetId exists)
 * - Chunk progress indicator showing batch processing status
 * - Research results table with status for each target
 * - Expandable detailed view showing individual research threads
 * 
 * The component receives batch data and target status map from the parent,
 * and orchestrates the display of various sub-components for a complete execution view.
 */

import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { ExecutionHeader } from "./ExecutionHeader";
import { ChunkProgress } from "./ChunkProgress";
import { ResearchResultsTable } from "./ResearchResultsTable";
import { Doc } from "@/convex/_generated/dataModel";
import { TargetStatus } from "./types";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { TaskExecutionsGrid } from "@/components/tasks/task-executions-grid";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ExecutionViewProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    batchData: Doc<"batchTaskOrchestrations"> & { research: Doc<"taskExecutions">[] };
    targetStatusMap: Map<string, TargetStatus>;
}

export function ExecutionView({
    isOpen,
    onOpenChange,
    batchData,
    targetStatusMap
}: ExecutionViewProps) {
    const [gridFullscreen, setGridFullscreen] = useState(false);
    const [schemaExpanded, setSchemaExpanded] = useState(false);
    
    const totalChunks = Math.ceil(batchData.targets.length / batchData.concurrencyLimit);
    const currentChunk = batchData.currentChunkIndex + 1;

    // Fetch dataset schema if datasetId exists
    const dataset = useQuery(
        api.research.dataset.getDataset,
        batchData.datasetId ? { datasetId: batchData.datasetId } : "skip"
    );

    // Fetch enriched research data for grid
    const enrichedResearch = useQuery(
        api.research.dataset.getBatchWithEnrichedResearch,
        batchData._id ? { batchId: batchData._id } : "skip"
    );

    return (
        <Collapsible open={isOpen} onOpenChange={onOpenChange}>
            <Card className="p-4 border bg-muted/30">
                <div className="space-y-4">
                    <ExecutionHeader
                        isOpen={isOpen}
                        targetCount={batchData.targets.length}
                        status={batchData.status}
                        completedCount={batchData.completedCount}
                        failedCount={batchData.failedCount}
                    />

                    <CollapsibleContent>
                        {/* Task Description */}
                        <div className="text-sm bg-background/80 rounded p-3">
                            <p className="font-medium text-muted-foreground mb-1">Research Task:</p>
                            <p>{batchData.task}</p>
                        </div>

                        {/* Dataset Schema - Collapsible */}
                        {dataset && dataset.schema && dataset.schema.length > 0 && (
                            <div className="bg-background/60 border rounded-lg overflow-hidden">
                                <button 
                                    onClick={() => setSchemaExpanded(!schemaExpanded)}
                                    className="w-full px-3 py-2 flex items-center justify-between hover:bg-muted/50 transition-colors"
                                >
                                    <p className="text-xs font-semibold text-muted-foreground">
                                        OUTPUT SCHEMA ({dataset.schema.length} fields)
                                    </p>
                                    {schemaExpanded ? (
                                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    )}
                                </button>
                                {schemaExpanded && (
                                    <div className="p-3 pt-0">
                                        <div className="grid grid-cols-2 gap-2">
                                            {dataset.schema.map((field, idx) => (
                                                <div key={idx} className="bg-background border rounded p-2">
                                                    <p className="text-xs font-medium">{field.name}</p>
                                                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                                                        {field.description}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Chunk Progress */}
                        <ChunkProgress
                            currentChunk={currentChunk}
                            totalChunks={totalChunks}
                            concurrencyLimit={batchData.concurrencyLimit}
                            currentChunkIndex={batchData.currentChunkIndex}
                        />

                        {/* Research Results Table with Expand Button */}
                        <ResearchResultsTable
                            targets={batchData.targets}
                            targetStatusMap={targetStatusMap}
                            concurrencyLimit={batchData.concurrencyLimit}
                            currentChunkTargets={batchData.currentChunkTargets}
                            batchData={batchData}
                            onExpandGrid={() => setGridFullscreen(true)}
                            canExpandGrid={!!(enrichedResearch && dataset?.schema)}
                        />
                    </CollapsibleContent>
                </div>
            </Card>

            {/* Fullscreen Grid Modal */}
            {gridFullscreen && enrichedResearch && dataset?.schema && (
                <TaskExecutionsGrid
                    enrichedResearch={enrichedResearch.research}
                    schema={dataset.schema}
                    isFullscreen={gridFullscreen}
                    onFullscreenChange={setGridFullscreen}
                />
            )}
        </Collapsible>
    );
}

