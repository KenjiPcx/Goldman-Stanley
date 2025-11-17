/**
 * System Documentation Queries
 *
 * Serves structured Q&A content so both the UI (office modal)
 * and AI agents (e.g., CEO persona) can fetch authoritative
 * explanations about how the office + concurrency systems work.
 */

import { query } from "../_generated/server";
import { v } from "convex/values";

const lastUpdated = new Date("2025-11-17").getTime();

const officeQnaEntries = [
    {
        question: "How are task executions mapped to office employees?",
        answer: "Each task execution is represented by a virtual employee. Instead of spawning an unlimited number of avatars, we render a fixed pool of workers and rotate assignments so the scene stays performant while still reflecting the real task state.",
        category: "Visualization",
    },
    {
        question: "How does concurrency work across multiple batches?",
        answer: "All batches for a user feed into a shared user-level work queue. A worker pool (sized by the user's subscription tier) pulls tasks round-robin style, so Batch 1 and Batch 2 can progress in parallel while respecting API rate limits.",
        category: "Concurrency",
    },
    {
        question: "What pricing model do we use?",
        answer: "Users pay for concurrency slots (i.e., active workers) rather than per-batch fees. Free tier gets 1 worker, Starter gets 3, Pro gets 10 plus BYOK support, and Enterprise scales beyond 50.",
        category: "Pricing",
    },
    {
        question: "What happens when a user hits API rate limits?",
        answer: "The worker pool never exceeds the tier's concurrency ceiling. Additional tasks stay in the queue until a worker frees up, ensuring we do not violate provider rate limits even when users start multiple batches at once.",
        category: "Reliability",
    },
    {
        question: "How can agents (like the CEO) learn about the system?",
        answer: "Agents can call the `docs.systemDocs.getOfficeQna` tool to retrieve these canonical Q&A entries and cite them when reasoning about office behavior, pricing, or concurrency.",
        category: "Agents",
    },
];

export const getOfficeQna = query({
    args: {},
    returns: v.object({
        summary: v.string(),
        entries: v.array(
            v.object({
                question: v.string(),
                answer: v.string(),
                category: v.string(),
                lastUpdated: v.number(),
            }),
        ),
    }),
    handler: async () => {
        return {
            summary:
                "The office view now reflects a user-level concurrency model with a shared work queue, fixed visual workers, and pricing based on active worker slots.",
            entries: officeQnaEntries.map((entry) => ({
                ...entry,
                lastUpdated,
            })),
        };
    },
});

