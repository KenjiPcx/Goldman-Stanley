"use node";

import { createTool } from "@convex-dev/agent";
import { FirecrawlAppV1 } from "@mendable/firecrawl-js";
import { z } from "zod/v3";

if (!process.env.FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY is not set");

const truncate = (value: string | undefined, maxLength: number) => {
    if (!value) return value;
    if (value.length <= maxLength) return value;
    return `${value.slice(0, maxLength)}...`;
};

type StructuredSearchDocument = {
    url?: string;
    title?: string;
    summary?: string;
    markdown?: string;
    links?: string[];
    metadata?: Record<string, unknown>;
    publishedTime?: string;
    warning?: string;
};

type StructuredSearch = {
    query: string;
    warning?: string;
    results: StructuredSearchDocument[];
};

type StructuredExtractPage = {
    url: string;
    summary?: string;
    markdown?: string;
    rawHtml?: string;
    links?: string[];
    metadata?: Record<string, unknown>;
    warning?: string;
};

type FirecrawlFormat =
    | "markdown"
    | "links"
    | "rawHtml"
    | "html"
    | "content"
    | "screenshot"
    | "screenshot@fullPage"
    | "extract"
    | "json"
    | "changeTracking";

const summarizeSearches = (objective: string, searches: StructuredSearch[]) => {
    const sections: string[] = [`Firecrawl search objective: ${objective}`];
    for (const search of searches) {
        const lines: string[] = [`Query: "${search.query}"`];
        if (search.warning) {
            lines.push(`Warning: ${search.warning}`);
        }
        if (search.results.length === 0) {
            lines.push("No documents returned.");
        } else {
            search.results.forEach((result, index) => {
                const subLines: string[] = [
                    `${index + 1}. ${result.title ?? result.url ?? "Untitled result"}`,
                ];
                if (result.url) subLines.push(`   URL: ${result.url}`);
                if (result.summary) subLines.push(`   Summary: ${result.summary}`);
                if (result.publishedTime) subLines.push(`   Published: ${result.publishedTime}`);
                lines.push(subLines.join("\n"));
            });
        }
        sections.push(lines.join("\n"));
    }
    return sections.join("\n\n");
};

const summarizeExtractions = (objective: string, pages: StructuredExtractPage[]) => {
    const sections: string[] = [`Firecrawl extract objective: ${objective}`];
    for (const page of pages) {
        const lines: string[] = [`URL: ${page.url}`];
        if (page.warning) {
            lines.push(`Warning: ${page.warning}`);
        }
        if (page.summary) {
            lines.push(`Summary: ${page.summary}`);
        }
        if (page.markdown) {
            lines.push(`Excerpt: ${truncate(page.markdown, 600)}`);
        }
        sections.push(lines.join("\n"));
    }
    return sections.join("\n\n");
};

export const createParallelToolSet = () => {
    const client = new FirecrawlAppV1({ apiKey: process.env.FIRECRAWL_API_KEY });
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
                const searchFormats = ["markdown", "links", "summary"];
                const searches = await Promise.all(
                    args.search_queries.map(async (query) => {
                        const response = await client.search(query, {
                            limit,
                            scrapeOptions: {
                                formats: searchFormats as Array<FirecrawlFormat>,
                            },
                        });

                        if (!response.success) {
                            throw new Error(response.error ?? `Firecrawl search returned no data for query: ${query}`);
                        }

                        return {
                            query,
                            warning: response.warning,
                            results: response.data.map<StructuredSearchDocument>((doc) => {
                                const docWithSummary = doc as { summary?: string; warning?: string };
                                return {
                                    url: doc.url ?? doc.metadata?.sourceURL,
                                    title: doc.title ?? doc.metadata?.title ?? doc.url,
                                    summary: truncate(
                                        docWithSummary.summary ?? doc.description ?? doc.metadata?.description ?? doc.markdown,
                                        600
                                    ),
                                    markdown: truncate(doc.markdown, maxChars),
                                    links: doc.links,
                                    metadata: doc.metadata as Record<string, unknown> | undefined,
                                    publishedTime: doc.metadata?.publishedTime ?? doc.metadata?.modifiedTime,
                                    warning: docWithSummary.warning,
                                };
                            }),
                        };
                    })
                );

                const formattedSummary = summarizeSearches(args.objective, searches);
                const payload = {
                    provider: "firecrawl",
                    objective: args.objective,
                    searches,
                };

                return `${formattedSummary}\n\nRaw Firecrawl payload:\n${JSON.stringify(payload, null, 2)}`;
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
                const formats: string[] = ["markdown", "links"];
                if (args.excerpts ?? true) {
                    formats.push("summary");
                }
                if (args.fullContent) {
                    formats.push("rawHtml");
                }

                const pages = await Promise.all(
                    args.urls.map(async (url) => {
                        const response = await client.scrapeUrl(url, {
                            formats: formats as unknown as Array<FirecrawlFormat>,
                        });

                        if (!response.success) {
                            throw new Error(`Firecrawl scrape failed for ${url}: ${response.error}`);
                        }

                        return {
                            url,
                            markdown: response.markdown ? truncate(response.markdown, 10000) : undefined,
                            rawHtml: args.fullContent ? response.rawHtml ?? response.html : undefined,
                            summary: (response as { summary?: string }).summary ?? response.metadata?.description,
                            links: response.links,
                            metadata: response.metadata as Record<string, unknown> | undefined,
                            warning: response.warning,
                        };
                    })
                );

                const formattedSummary = summarizeExtractions(args.objective, pages);
                const payload = {
                    provider: "firecrawl",
                    objective: args.objective,
                    pages,
                };

                return `${formattedSummary}\n\nRaw Firecrawl payload:\n${JSON.stringify(payload, null, 2)}`;
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

