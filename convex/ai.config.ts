import { WorkflowManager } from "@convex-dev/workflow";
import { components } from "./_generated/api";
import { google, GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import { createOpenAI } from '@ai-sdk/openai';

if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
}
export const openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export const workflow = new WorkflowManager(components.workflow);

export const chatModel = google.chat("gemini-2.5-flash");
export const smartChatModel = google.chat("gemini-2.5-pro");
export const googleChatModelProviderOptions: GoogleGenerativeAIProviderOptions = {
    thinkingConfig: {
        thinkingBudget: 8192,
        includeThoughts: true,
    },
}
export const chatModelProviderOptions = {
    google: googleChatModelProviderOptions,
}

export const embeddingModel = openai.embedding("text-embedding-3-small");

