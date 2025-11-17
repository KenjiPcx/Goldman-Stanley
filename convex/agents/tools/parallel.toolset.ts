"use node";

import { createTool } from "@convex-dev/agent";
import { z } from "zod/v3";
import Parallel from "parallel-web";

if (!process.env.PARALLEL_API_KEY) throw new Error("PARALLEL_API_KEY is not set");

export const createParallelToolSet = () => {
    const client = new Parallel({ apiKey: process.env.PARALLEL_API_KEY });
    const searchWeb = createTool({
        description: "Search the web for information using Parallel.ai. Use this to find current information, news, announcements, or any web content. Provide an objective describing what you're looking for and specific search queries.",
        args: z.object({
            objective: z.string().describe("Clear objective describing what information you're trying to find"),
            search_queries: z.array(z.string()).describe("Array of specific search queries to execute"),
            max_results: z.number().optional().default(10).describe("Maximum number of results to return (default: 10)"),
            max_chars_per_result: z.number().optional().default(10000).describe("Maximum characters per result (default: 10000)"),
        }),
        handler: async (ctx, args) => {
            try {
                const search = await client.beta.search({
                    objective: args.objective,
                    search_queries: args.search_queries,
                    max_results: args.max_results || 10,
                    max_chars_per_result: args.max_chars_per_result || 10000,
                });
                return JSON.stringify(search.results, null, 2);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                throw new Error(`Parallel search failed: ${errorMessage}`);
            }
        },
    });

    const extractPage = createTool({
        description: "Extract content from specific URLs using Parallel.ai. Use this to get detailed content from web pages, articles, or documents. Provide URLs and an objective describing what information to extract.",
        args: z.object({
            urls: z.array(z.string()).describe("Array of URLs to extract content from"),
            objective: z.string().describe("Clear objective describing what information to extract from the pages"),
            excerpts: z.boolean().optional().default(true).describe("Whether to include excerpts (default: true)"),
            fullContent: z.boolean().optional().default(false).describe("Whether to extract full content (default: false)"),
        }),
        handler: async (ctx, args) => {
            try {
                const extract = await client.beta.extract({
                    urls: args.urls,
                    objective: args.objective,
                    excerpts: args.excerpts !== undefined ? args.excerpts : true,
                    full_content: args.fullContent !== undefined ? args.fullContent : false,
                });
                return JSON.stringify(extract.results, null, 2);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                throw new Error(`Parallel extract failed: ${errorMessage}`);
            }
        },
    });

    return {
        searchWeb,
        extractPage,
    };
};

