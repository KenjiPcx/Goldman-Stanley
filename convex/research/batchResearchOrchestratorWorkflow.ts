import { v } from "convex/values";
import { defineEvent } from "@convex-dev/workflow";
import { workflow } from "../ai.config";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";

/**
 * Event fired when a chunk of research completes
 * This signals the workflow to start the next batch
 */
export const nextBatchEvent = defineEvent({
    name: "nextBatch",
    validator: v.object({}),
});

/**
 * Helper function to chunk an array into smaller arrays
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}

/**
 * Main orchestrator workflow for batch research
 * Processes targets in chunks of N (concurrencyLimit) to avoid rate limits
 */
export const batchResearchOrchestrator = workflow.define({
    args: {
        batchId: v.id("batchTaskOrchestrations"),
        targets: v.array(v.string()),
        researchTask: v.string(),
        concurrencyLimit: v.number(),
    },
    handler: async (step, args): Promise<{ success: boolean }> => {
        // Split targets into chunks based on concurrency limit
        const chunks = chunkArray(args.targets, args.concurrencyLimit);

        console.log(`[BatchOrchestrator] Starting batch research for ${args.targets.length} targets in ${chunks.length} chunks`);

        // Process each chunk sequentially
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const isLastChunk = i === chunks.length - 1;

            console.log(`[BatchOrchestrator] Processing chunk ${i + 1}/${chunks.length}: ${chunk.join(", ")}`);

            // Initialize chunk state (atomic update)
            await step.runMutation(internal.research.wideResearch.initChunk, {
                batchId: args.batchId,
                chunkIndex: i,
                chunkTargets: chunk,
                chunkSize: chunk.length,
            });

            // Start all research workflows in this chunk with onComplete handlers
            await step.runMutation(internal.research.wideResearch.startChunkWorkflows, {
                batchId: args.batchId,
                chunkTargets: chunk,
                researchTask: args.researchTask,
            });

            // Wait for chunk to complete (unless it's the last chunk)
            if (!isLastChunk) {
                console.log(`[BatchOrchestrator] Waiting for chunk ${i + 1} to complete...`);
                await step.awaitEvent(nextBatchEvent);
                console.log(`[BatchOrchestrator] Chunk ${i + 1} completed, moving to next chunk`);
            }
        }

        // Mark batch as completed
        await step.runMutation(internal.research.wideResearch.finalizeBatch, {
            batchId: args.batchId,
        });

        console.log(`[BatchOrchestrator] All chunks completed successfully`);
        return { success: true };
    },
});

