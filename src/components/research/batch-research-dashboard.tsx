"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TaskExecutionsGrid } from "../tasks/task-executions-grid";
import { Loader2 } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export function BatchResearchDashboard() {
    const [selectedBatchId, setSelectedBatchId] = useState<Id<"batchTaskOrchestrations"> | null>(null);

    // Fetch all batches
    const batches = useQuery(api.research.wideResearch.listBatchResearch, { limit: 50 });

    // Fetch selected batch with enriched research details (includes cell metadata)
    const batchWithResearch = useQuery(
        api.research.dataset.getBatchWithEnrichedResearch,
        selectedBatchId ? { batchId: selectedBatchId } : "skip"
    );

    const selectedBatch = batches?.find((b) => b._id === selectedBatchId);

    return (
        <div className="space-y-6">
            {/* Top Section - Batch Selector and Details */}
            <div className="grid grid-cols-12 gap-6">
                {/* Batch Selector */}
                <div className="col-span-6">
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle>Select Dataset</CardTitle>
                            <CardDescription>Choose a dataset to view results</CardDescription>
                        </CardHeader>
                        <CardContent className="px-6">
                            {batches === undefined ? (
                                <div className="flex items-center justify-center py-4">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                </div>
                            ) : batches.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    No datasets available yet
                                </p>
                            ) : (
                                <Select
                                    value={selectedBatchId || undefined}
                                    onValueChange={(value) => setSelectedBatchId(value as Id<"batchTaskOrchestrations">)}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select a dataset..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {batches?.map((batch) => (
                                            <SelectItem key={batch._id} value={batch._id}>
                                                <div className="flex items-center gap-2">
                                                    <span className="truncate max-w-[400px]">{batch.task}</span>
                                                    <Badge variant="outline" className="ml-2">
                                                        {batch.status}
                                                    </Badge>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Batch Summary Stats */}
                <div className="col-span-6">
                    {selectedBatch && (
                        <Card>
                            <CardHeader className="pb-4">
                                <CardTitle>Batch Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="px-6">
                                <div className="grid grid-cols-4 gap-6">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-primary">
                                            {selectedBatch.targets.length}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1">Total</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-secondary">
                                            {selectedBatch.completedCount}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1">Completed</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-red-600">
                                            {selectedBatch.failedCount}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1">Failed</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold">
                                            {Math.round(((selectedBatch.completedCount + selectedBatch.failedCount) / selectedBatch.targets.length) * 100)}%
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1">Progress</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Bottom Section - Details and Results Table */}
            <div className="grid grid-cols-12 gap-6">
                {/* Left side - Batch Details */}
                <div className="col-span-4">
                    {selectedBatchId ? (
                        batchWithResearch ? (
                            <BatchDetailsPanel batch={batchWithResearch.batch as Doc<"batchTaskOrchestrations">} />
                        ) : (
                            <Card className="h-full flex items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin" />
                            </Card>
                        )
                    ) : (
                        <Card className="h-full flex items-center justify-center min-h-[400px]">
                            <CardContent className="text-center">
                                <p className="text-muted-foreground">
                                    Select a batch to view details
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right side - Task Executions Grid */}
                <div className="col-span-8">
                    {selectedBatchId && batchWithResearch ? (
                        <TaskExecutionsGrid
                            enrichedResearch={batchWithResearch.research}
                            schema={batchWithResearch.schema}
                        />
                    ) : (
                        <Card className="h-full flex items-center justify-center min-h-[400px]">
                            <CardContent className="text-center">
                                <p className="text-muted-foreground">
                                    Select a batch to view results
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}


function BatchDetailsPanel({ batch }: { batch: Doc<"batchTaskOrchestrations"> }) {
    const totalTargets = batch.targets.length;
    const progress = totalTargets > 0
        ? Math.round(((batch.completedCount + batch.failedCount) / totalTargets) * 100)
        : 0;

    return (
        <Card className="h-full">
            <CardHeader className="pb-4">
                <CardTitle>Batch Details</CardTitle>
            </CardHeader>
            <CardContent className="px-6">
                <ScrollArea className="h-[calc(100vh-360px)]">
                    <div className="space-y-6 pr-4">
                        {/* Status */}
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Status</label>
                            <div className="mt-2">
                                <Badge variant={
                                    batch.status === "completed" ? "default" :
                                        batch.status === "running" ? "secondary" :
                                            batch.status === "failed" ? "destructive" : "outline"
                                }>
                                    {batch.status}
                                </Badge>
                            </div>
                        </div>

                        <Separator />

                        {/* Research Task */}
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Research Task</label>
                            <p className="mt-2 text-sm leading-relaxed">{batch.task}</p>
                        </div>

                        <Separator />

                        {/* Progress */}
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Progress</label>
                            <div className="mt-3 space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span>Completed:</span>
                                    <span className="font-medium text-secondary">{batch.completedCount}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Failed:</span>
                                    <span className="font-medium text-red-600">{batch.failedCount}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Total:</span>
                                    <span className="font-medium">{totalTargets}</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div
                                        className="bg-primary h-2 rounded-full transition-all"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Configuration */}
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Configuration</label>
                            <div className="mt-3 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Concurrency Limit:</span>
                                    <span className="font-medium">{batch.concurrencyLimit}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Output Format:</span>
                                    <span className="font-medium">{batch.outputFormat}</span>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Output Schema - Now stored in dataset if datasetId exists */}
                        {batch.datasetId && (
                            <>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Dataset</label>
                                    <p className="mt-2 text-sm text-muted-foreground">Linked to dataset: {batch.datasetId}</p>
                                </div>
                                <Separator />
                            </>
                        )}

                        {/* Targets */}
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">
                                Targets ({totalTargets})
                            </label>
                            <div className="mt-3 space-y-2">
                                {batch.targets.map((target: string, index: number) => (
                                    <div key={index} className="text-sm p-3 bg-accent/50 rounded-md border">
                                        {target}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Error */}
                        {batch.error && (
                            <>
                                <Separator />
                                <div>
                                    <label className="text-sm font-medium text-destructive">Error</label>
                                    <p className="mt-1 text-sm text-destructive">{batch.error}</p>
                                </div>
                            </>
                        )}

                        <Separator />

                        {/* Timestamps */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Created:</span>
                                <span>{new Date(batch.createdAt).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Updated:</span>
                                <span>{new Date(batch.updatedAt).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}

