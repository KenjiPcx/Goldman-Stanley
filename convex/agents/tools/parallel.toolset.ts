"use node";

import { createTool } from "@convex-dev/agent";
import FirecrawlApp from "@mendable/firecrawl-js";
import { z } from "zod/v3";

if (!process.env.FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY is not set");

const truncate = (value: string | undefined, maxLength: number) => {
    if (!value) return value;
    if (value.length <= maxLength) return value;
    return `${value.slice(0, maxLength)}...`;
};

export const createParallelToolSet = () => {
    const client = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });
    const searchWeb = createTool({
        description: "Search the web for information using Firecrawl. Use this to find current information, news, announcements, or any web content. Provide an objective describing what you're looking for and specific search queries.",
        args: z.object({
            objective: z.string().describe("Clear objective describing what information you're trying to find"),
            search_queries: z.array(z.string()).describe("Array of specific search queries to execute"),
            max_results: z.number().optional().default(10).describe("Maximum number of documents to keep per query (default: 10)"),
            max_chars_per_result: z.number().optional().default(10000).describe("Maximum characters to keep per document excerpt (default: 10000)"),
        }),
        handler: async (_ctx, args) => {
            try {
                const limit = args.max_results ?? 10;
                const maxChars = args.max_chars_per_result ?? 10000;
                const searches = await Promise.all(
                    args.search_queries.map(async (query) => {
                        const response = await client.search(query, {
                            limit,
                            scrapeOptions: {
                                formats: ["markdown", "links", "summary"],
                            },
                        });

                        if (!response.success) {
                            throw new Error(response.error ?? `Firecrawl search returned no data for query: ${query}`);
                        }

                        return {
                            query,
                            warning: response.warning,
                            results: response.data.map((doc) => ({
                                url: doc.url ?? doc.metadata?.sourceURL,
                                title: doc.title ?? doc.metadata?.title,
                                description: doc.description ?? doc.metadata?.description,
                                markdown: truncate(doc.markdown, maxChars),
                                links: doc.links,
                                metadata: doc.metadata,
                            })),
                        };
                    })
                );

                return JSON.stringify(
                    {
                        objective: args.objective,
                        searches,
                    },
                    null,
                    2
                );
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                throw new Error(`Firecrawl search failed: ${errorMessage}`);
            }
        },
    });

    const extractPage = createTool({
        description: "Extract content from specific URLs using Firecrawl. Use this to get detailed content from web pages, articles, or documents. Provide URLs and an objective describing what information to extract.",
        args: z.object({
            urls: z.array(z.string()).describe("Array of URLs to extract content from"),
            objective: z.string().describe("Clear objective describing what information to extract from the pages"),
            excerpts: z.boolean().optional().default(true).describe("Whether to include concise summaries (default: true)"),
            fullContent: z.boolean().optional().default(false).describe("Whether to include full HTML content (default: false)"),
        }),
        handler: async (_ctx, args) => {
            try {
                const formats: Array<"markdown" | "links" | "summary" | "rawHtml"> = ["markdown", "links"];
                if (args.excerpts ?? true) {
                    formats.push("summary");
                }
                if (args.fullContent) {
                    formats.push("rawHtml");
                }

                const pages = await Promise.all(
                    args.urls.map(async (url) => {
                        const response = await client.scrapeUrl(url, {
                            formats,
                        });

                        if (!response.success) {
                            throw new Error(`Firecrawl scrape failed for ${url}: ${response.error}`);
                        }

                        return {
                            url,
                            markdown: response.markdown,
                            rawHtml: args.fullContent ? response.rawHtml ?? response.html : undefined,
                            summary: (response as { summary?: string }).summary,
                            links: response.links,
                            metadata: response.metadata,
                        };
                    })
                );

                return JSON.stringify(
                    {
                        objective: args.objective,
                        pages,
                    },
                    null,
                    2
                );
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                throw new Error(`Firecrawl extract failed: ${errorMessage}`);
            }
        },
    });

    return {
        searchWeb,
        extractPage,
    };
};

