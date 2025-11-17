/**
 * Concurrency Status Panel
 * 
 * Shows the user's current concurrency status:
 * - Active workers vs max workers
 * - Queued tasks count
 * - Per-batch progress
 * - Subscription tier and quota
 */

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Users, Clock, CheckCircle2, TrendingUp } from "lucide-react";

interface ConcurrencyStatusPanelProps {
    userId: string;
}

export function ConcurrencyStatusPanel({ userId }: ConcurrencyStatusPanelProps) {
    const status = useQuery(api.concurrency.workQueue.getUserConcurrencyStatus, {
        userId,
    });

    if (!status) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    const tierColors = {
        free: "bg-gray-500",
        starter: "bg-blue-500",
        pro: "bg-purple-500",
        enterprise: "bg-amber-500",
    };

    const tierColor = tierColors[status.tier];

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Work Queue Status</CardTitle>
                    <Badge className={tierColor}>
                        {status.tier.charAt(0).toUpperCase() + status.tier.slice(1)}
                    </Badge>
                </div>
                <CardDescription>
                    Real-time concurrency and task queue information
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Workers */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Active Workers</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                            {status.activeWorkers} / {status.maxWorkers}
                        </span>
                    </div>
                    <Progress
                        value={(status.activeWorkers / status.maxWorkers) * 100}
                        className="h-2"
                    />
                </div>

                {/* Queue Depth */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Queued Tasks</span>
                        </div>
                        <Badge variant="outline">{status.queuedTasks}</Badge>
                    </div>
                    {status.queuedTasks > 0 && (
                        <p className="text-xs text-muted-foreground">
                            Estimated completion:{" "}
                            {Math.ceil(status.queuedTasks / status.maxWorkers)} minutes
                        </p>
                    )}
                </div>

                {/* Quota */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Monthly Quota</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                            {status.quotaRemaining} / {status.quotaLimit}
                        </span>
                    </div>
                    <Progress
                        value={
                            ((status.quotaLimit - status.quotaRemaining) /
                                status.quotaLimit) *
                            100
                        }
                        className="h-2"
                    />
                </div>

                {/* Active Batches */}
                {status.activeBatches.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Active Batches</span>
                        </div>
                        {status.activeBatches.map((batch, index) => (
                            <div
                                key={batch.batchId}
                                className="pl-6 space-y-1 border-l-2 border-muted"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">
                                        Batch {index + 1}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="text-xs">
                                            {batch.activeTasks} active
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">
                                            {batch.completedTasks}/{batch.totalTasks}
                                        </span>
                                    </div>
                                </div>
                                <Progress
                                    value={
                                        (batch.completedTasks / batch.totalTasks) * 100
                                    }
                                    className="h-1.5"
                                />
                                {batch.queuedTasks > 0 && (
                                    <p className="text-xs text-muted-foreground">
                                        {batch.queuedTasks} tasks queued
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {status.queuedTasks === 0 && status.activeWorkers === 0 && (
                    <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground">
                            No active tasks. Start a batch research to see workers in action!
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

