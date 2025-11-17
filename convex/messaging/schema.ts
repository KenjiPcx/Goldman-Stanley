/**
 * Messaging Module - Schema Definitions
 * 
 * Chat threads and message management.
 */

import { defineTable } from "convex/server";
import { v, Infer } from "convex/values";

// ============================================================================
// REUSABLE VALIDATORS
// ============================================================================

export const chatVisibilitySchema = v.union(
    v.literal("public"),
    v.literal("private"),
);

export const chatSchema = v.object({
    threadId: v.string(), // The thread ID from the agent framework
    userId: v.string(),
    visibility: v.optional(chatVisibilitySchema),
    updateTitlesScheduledFunctionId: v.optional(v.id("_scheduled_functions")), // Scheduled function for updating thread title
});

/**
 * Chats
 * 
 * Tracks chat threads and scheduled title updates.
 */
export const chats = defineTable({
    ...chatSchema.fields,
})
    .index("by_threadId", ["threadId"]);

export const messagingTables = {
    chats,
}

// ============================================================================
// TYPE EXPORTS - For frontend and TypeScript usage
// ============================================================================

export type ChatVisibility = Infer<typeof chatVisibilitySchema>;
export type Chat = Infer<typeof chatSchema>;

// ============================================================================
// REUSABLE VALIDATORS FOR FUNCTION ARGS/RETURNS
// ============================================================================

// Return validators for common responses
export const threadIdResponseSchema = v.object({
    threadId: v.string(),
});

export const messageIdResponseSchema = v.object({
    messageId: v.string(),
});