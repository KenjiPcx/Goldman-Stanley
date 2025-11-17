import { action, internalAction, mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import { listUIMessages, syncStreams, vStreamArgs, storeFile } from "@convex-dev/agent";
import { paginationOptsValidator, PaginationResult } from "convex/server";
import dedent from "dedent";
import { createProposeWideResearchTool } from "../agents/tools/wideResearch.tool";
import { getCurrentUserId } from "../auth/helpers";
import { Agent, stepCountIs } from "@convex-dev/agent";
import { chatModel, chatModelProviderOptions } from "../ai.config";
import { threadIdResponseSchema, messageIdResponseSchema } from "./schema";
import { UserContent } from "ai";
import * as xlsx from "xlsx";

// Excel MIME types that need conversion
const EXCEL_MIME_TYPES = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "application/vnd.ms-excel", // .xls
    "application/vnd.oasis.opendocument.spreadsheet", // .ods
];

// Check if a MIME type is an Excel file
function isExcelFile(mimeType: string): boolean {
    return EXCEL_MIME_TYPES.includes(mimeType);
}

const CHATBOT_SYSTEM_PROMPT = dedent(`
    You are a helpful research assistant. You can help users plan and execute deep research projects.
    
    When a user asks you to research multiple things (companies, countries, products, etc.), use the proposeWideResearch tool to:
    - Define what research task to perform on each target
    - List all the targets to research in parallel
    - Specify how to format the aggregated output
    
    The system will show the user an editable proposal before executing the research.
    
    Be conversational and helpful. When proposing research, explain what will be investigated.
`);

export const userProxyAgent = new Agent(components.agent, {
    name: "Deep Research Agent",
    languageModel: chatModel,
    providerOptions: chatModelProviderOptions,
    stopWhen: [stepCountIs(50)],
});

/**
 * Create a new chatbot thread
 */
export const createChatbotThread = mutation({
    args: {},
    returns: threadIdResponseSchema,
    handler: async (ctx, args) => {
        const userId = await getCurrentUserId(ctx);
        if (!userId) {
            throw new Error("User not authenticated");
        }

        // Create thread using the agent component
        // Note: For now, we're using a placeholder userId. In production,
        // you'd get this from auth context
        const { threadId } = await userProxyAgent.createThread(ctx, {
            title: "New Chat",
            summary: "Chat with research assistant",
            userId,
        });

        // Create chat record
        await ctx.db.insert("chats", {
            threadId,
            userId,
        });

        return { threadId };
    },
});

/**
 * Send a message in the chatbot and get streaming response
 * Uses URL-based file passing approach - simpler than inline saving
 * See: https://docs.convex.dev/agents/files#can-i-just-store-the-file-myself-and-pass-in-a-url
 */
/**
 * Store a file using storeFile and return the URL
 * Converts Excel files to CSV format automatically
 */
"use node";
export const storeFileForMessage = action({
    args: {
        data: v.bytes(),
        mimeType: v.string(),
    },
    returns: v.object({
        url: v.string(),
        fileId: v.string(),
        converted: v.optional(v.boolean()),
    }),
    handler: async (ctx, args) => {
        let data = args.data;
        let mimeType = args.mimeType;
        let converted = false;

        // Convert Excel files to CSV
        if (isExcelFile(args.mimeType)) {
            // Convert ArrayBuffer to Buffer for xlsx library
            const buffer = Buffer.from(data);

            // Parse the Excel file
            const workbook = xlsx.read(buffer, { type: "buffer" });

            // Get the first sheet
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            // Convert to CSV
            const csv = xlsx.utils.sheet_to_csv(worksheet);

            // Convert CSV string to ArrayBuffer
            const encoder = new TextEncoder();
            data = encoder.encode(csv).buffer;
            mimeType = "text/csv";
            converted = true;
        }

        const { file } = await storeFile(
            ctx,
            components.agent,
            new Blob([data], { type: mimeType }),
            {}
        );
        return {
            url: file.url,
            fileId: file.fileId,
            converted,
        };
    },
});

// MIME types that Gemini supports for file uploads (after conversion)
const SUPPORTED_MIME_TYPES = [
    // Images
    "image/",
    // Documents
    "application/pdf",
    "text/",
    // Common text formats
    "application/json",
    "application/xml",
    "text/csv",
    "text/plain",
    "text/markdown",
    // Excel files (will be converted to CSV)
    ...EXCEL_MIME_TYPES,
];

// Check if a MIME type is supported by Gemini
function isSupportedMimeType(mimeType: string): boolean {
    return SUPPORTED_MIME_TYPES.some(supported =>
        mimeType.startsWith(supported) || mimeType === supported
    );
}

export const sendChatbotMessage = mutation({
    args: {
        threadId: v.string(),
        message: v.string(),
        files: v.optional(v.array(v.object({
            url: v.string(),
            mimeType: v.string(),
            fileName: v.string(),
        }))),
    },
    returns: messageIdResponseSchema,
    handler: async (ctx, args) => {
        // Build content parts with file URLs
        const contentParts: UserContent = [];
        const unsupportedFiles: string[] = [];

        if (args.files && args.files.length > 0) {
            for (const file of args.files) {
                // Check if MIME type is supported
                if (!isSupportedMimeType(file.mimeType)) {
                    unsupportedFiles.push(`${file.fileName} (${file.mimeType})`);
                    continue;
                }

                // Determine if it's an image or file based on mime type
                const isImage = file.mimeType.startsWith("image/");

                if (isImage) {
                    // Add as image part
                    contentParts.push({
                        type: "image",
                        image: file.url,
                    });
                } else {
                    // Add as file part
                    contentParts.push({
                        type: "file",
                        data: file.url,
                        filename: file.fileName,
                        mediaType: file.mimeType,
                    });
                }
            }
        }

        // If there are unsupported files, add a warning message
        if (unsupportedFiles.length > 0) {
            const warningText = `Note: The following file(s) could not be processed (unsupported format): ${unsupportedFiles.join(", ")}. Supported formats include: images, PDFs, text files (CSV, TXT, MD), JSON, and XML.`;
            contentParts.push({ type: "text", text: warningText });
        }

        // Add text content if present
        if (args.message) {
            contentParts.push({ type: "text", text: args.message });
        }

        // Save message with file URLs
        const { messageId } = await userProxyAgent.saveMessage(ctx, {
            threadId: args.threadId,
            message: {
                role: "user",
                content: contentParts,
            },
            skipEmbeddings: true,
        });

        // Schedule async streaming response
        await ctx.scheduler.runAfter(0, internal.messaging.chat.streamChatbotResponse, {
            threadId: args.threadId,
            promptMessageId: messageId,
        });

        return { messageId };
    },
});

/**
 * Stream the chatbot response with tools
 */
export const streamChatbotResponse = internalAction({
    args: {
        threadId: v.string(),
        promptMessageId: v.string(),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        // Schedule thread title update
        await ctx.scheduler.runAfter(
            1000,
            internal.messaging.thread_titles.maybeUpdateThreadTitle,
            { threadId: args.threadId }
        );

        // Stream the response
        const result = await userProxyAgent.streamText(
            ctx,
            { threadId: args.threadId },
            {
                system: CHATBOT_SYSTEM_PROMPT,
                promptMessageId: args.promptMessageId,
                tools: {
                    proposeWideResearch: createProposeWideResearchTool(),
                },
            },
            {
                saveStreamDeltas: { chunking: "word", throttleMs: 500 },
            }
        );

        await result.consumeStream();
        return null;
    },
});

/**
 * List all chatbot threads using the agent component
 */
export const listChatbotThreads = query({
    args: {},
    returns: v.array(v.any()),
    handler: async (ctx, args) => {
        const userId = await getCurrentUserId(ctx);
        if (!userId) {
            // Return empty array if user not authenticated yet (e.g., during initial sync)
            return [];
        }

        // Get all threads owned by the user from the agent component
        const threads = await ctx.runQuery(
            components.agent.threads.listThreadsByUserId,
            { userId, paginationOpts: { numItems: 50, cursor: null } },
        );

        return threads.page;
    },
});

/**
 * Query & subscribe to messages & threads
 */

export const listThreadMessages = query({
    args: {
        // These arguments are required:
        threadId: v.string(),
        paginationOpts: paginationOptsValidator, // Used to paginate the messages.
        streamArgs: vStreamArgs, // Used to stream messages.
    },
    handler: async (ctx, args) => {
        const { threadId, streamArgs } = args;
        const streams = await syncStreams(ctx, components.agent, {
            threadId,
            streamArgs,
        });
        // Here you could filter out / modify the stream of deltas / filter out
        // deltas.

        const paginated = await listUIMessages(ctx, components.agent, args);

        // Here you could filter out metadata that you don't want from any optional
        // fields on the messages.
        // You can also join data onto the messages. They need only extend the
        // MessageDoc type.
        // { ...messages, page: messages.page.map(...)}

        return {
            ...paginated,
            streams,

            // ... you can return other metadata here too.
            // note: this function will be called with various permutations of delta
            // and message args, so returning derived data .
        };
    },
});