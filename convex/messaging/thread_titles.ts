import { v } from "convex/values";
import { internalAction, internalMutation } from "../_generated/server";
import { Agent } from "@convex-dev/agent";
import { components, internal } from "../_generated/api";
import { chatModel } from "../ai.config";

const UPDATE_TITLE_DELAY = 1 * 60 * 1000; // 5 minutes

const titleAgent = new Agent(components.agent, {
    name: "Thread Title Agent",
    languageModel: chatModel,
    instructions:
        "You are a helpful assistant that creates very short (4-5 words max) titles for chat conversations.",
});

export const maybeUpdateThreadTitle = internalMutation({
    args: {
        threadId: v.string(),
    },
    handler: async (ctx, { threadId }) => {
        const chat = await ctx.db
            .query("chats")
            .withIndex("by_threadId", (q) => q.eq("threadId", threadId))
            .first();

        if (!chat) return;

        if (chat.updateTitlesScheduledFunctionId) {
            const scheduledFunction = await ctx.db.system.get(
                chat.updateTitlesScheduledFunctionId
            );
            if (scheduledFunction?.state.kind === "pending") {
                await ctx.scheduler.cancel(chat.updateTitlesScheduledFunctionId);
            }
        }
        const id = await ctx.scheduler.runAfter(
            UPDATE_TITLE_DELAY,
            internal.messaging.thread_titles.updateThreadTitle,
            { threadId }
        );
        await ctx.db.patch(chat._id, {
            updateTitlesScheduledFunctionId: id,
        });
    },
});

export const updateThreadTitle = internalAction({
    args: {
        threadId: v.string(),
    },
    handler: async (ctx, { threadId }) => {
        const messages = await ctx.runQuery(
            components.agent.messages.listMessagesByThreadId,
            {
                threadId,
                paginationOpts: { numItems: 5, cursor: null },
                excludeToolMessages: false,
                order: "desc",
            }
        );

        // Combine the first few messages into a context for the title
        const context = messages.page
            .map((msg) => `${msg.agentName ? "Assistant" : "User"}: ${msg.text}`)
            .join("\n");

        const { thread } = await titleAgent.createThread(ctx);
        const result = await thread.generateText({
            prompt: `Create a very short title (4-5 words max) that summarizes this conversation:\n${context}`,
        });

        // Update the thread metadata with the new title
        await ctx.runMutation(components.agent.threads.updateThread, {
            threadId,
            patch: { title: result.text },
        });

        return result.text;
    },
});