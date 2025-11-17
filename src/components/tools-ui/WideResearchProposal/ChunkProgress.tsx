/**
 * ChunkProgress - Component for displaying batch processing progress
 * 
 * Visualizes the progress of batch research execution by showing chunks.
 * Research targets are processed in chunks based on the concurrency limit to avoid
 * overwhelming rate limits. This component shows which chunk is currently active.
 * 
 * Features:
 * - Progress bar with individual chunk indicators
 * - Color coding: green (completed), blue (active with pulse), gray (pending)
 * - Badge showing current chunk number and total chunks
 * - Displays concurrency limit in the badge
 * 
 * Props:
 * - currentChunk: Current chunk number (1-indexed)
 * - totalChunks: Total number of chunks
 * - concurrencyLimit: Number of parallel tasks per chunk
 * - currentChunkIndex: Current chunk index (0-indexed)
 */

import { Badge } from "@/components/ui/badge";

interface ChunkProgressProps {
    currentChunk: number;
    totalChunks: number;
    concurrencyLimit: number;
    currentChunkIndex: number;
}

export function ChunkProgress({
    currentChunk,
    totalChunks,
    concurrencyLimit,
    currentChunkIndex
}: ChunkProgressProps) {
    return (
        <div className="bg-background/60 border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground">
                    BATCH PROGRESS
                </p>
                <Badge variant="outline" className="text-xs font-mono">
                    Chunk {currentChunk}/{totalChunks} • {concurrencyLimit} parallel
                </Badge>
            </div>
            <div className="flex gap-1.5">
                {Array.from({ length: totalChunks }).map((_, idx) => {
                    const isActive = idx === currentChunkIndex;
                    const isPast = idx < currentChunkIndex;
                    return (
                        <div
                            key={idx}
                            className={`h-2.5 flex-1 rounded-full transition-all ${isPast ? "bg-green-600 dark:bg-green-500" :
                                isActive ? "bg-blue-600 dark:bg-blue-500 animate-pulse" :
                                    "bg-muted"
                                }`}
                        />
                    );
                })}
            </div>
        </div>
    );
}

