import { v } from "convex/values";
import { internalMutation, query } from "../_generated/server";

/**
 * Map a tool call ID to a child thread ID
 */
export const mapToolCallToThread = internalMutation({
    args: {
        toolCallId: v.string(),
        childThreadId: v.string(),
    },
    returns: v.id("delegations"),
    handler: async (ctx, args) => {
        const delegationId = await ctx.db.insert("delegations", {
            toolCallId: args.toolCallId,
            childThreadId: args.childThreadId,
        });
        return delegationId;
    },
});

/**
 * Get child thread ID by tool call ID
 */
export const getChildThreadByToolCall = query({
    args: {
        toolCallId: v.string(),
    },
    returns: v.union(v.string(), v.null()),
    handler: async (ctx, args) => {
        const delegation = await ctx.db
            .query("delegations")
            .withIndex("by_tool_call", (q) => q.eq("toolCallId", args.toolCallId))
            .first();

        return delegation?.childThreadId ?? null;
    },
});

