import {
    FileText,
    Edit3,
    FileSearch,
    ListChecks,
    Users,
    Terminal,
    Search,
    Globe,
    MapIcon,
    type LucideIcon,
} from "lucide-react";
import { DeepResearchUIMessage } from "@/convex/agents/deepResearcher/researcher";

// Helper: Map tool names to icons
export const getToolIcon = (toolName: string): LucideIcon => {
    const iconMap: Record<string, LucideIcon> = {
        writeScratchpad: FileText,
        replaceScratchpadString: Edit3,
        readScratchpad: FileSearch,
        writeTodos: ListChecks,
        delegateToSubResearcherAgent: Users,
        runPythonCode: Terminal,
        tavily_search: Search,
        tavily_extract: Globe,
        firecrawl_map: MapIcon,
        firecrawl_scrape: Globe,
    };
    return iconMap[toolName] || Terminal;
};

// Helper: Get friendly label for tool
export const getToolLabel = (toolName: string): string => {
    const labelMap: Record<string, string> = {
        writeScratchpad: "Creating Research Plan",
        replaceScratchpadString: "Updating Progress",
        readScratchpad: "Reviewing Notes",
        writeTodos: "Organizing Tasks",
        delegateToSubResearcherAgent: "Delegating Research",
        runPythonCode: "Running Calculation",
        tavily_search: "Searching Web",
        tavily_extract: "Extracting Data",
        firecrawl_map: "Mapping Website",
        firecrawl_scrape: "Scraping Page",
    };
    return labelMap[toolName] || toolName;
};

// Helper: Get streaming message for tool
export const getToolStreamingMessage = (toolName: string): string => {
    switch (toolName) {
        case "delegateToSubResearcherAgent":
            return "Delegating to sub-agent...";
        case "runPythonCode":
            return "Executing Python code...";
        case "tavily_search":
            return "Searching the web...";
        case "firecrawl_scrape":
            return "Scraping website...";
        case "firecrawl_map":
            return "Mapping website...";
        case "writeScratchpad":
            return "Creating research plan...";
        case "replaceScratchpadString":
            return "Updating progress...";
        case "readScratchpad":
            return "Reviewing notes...";
        default:
            return "Processing...";
    }
};

// Helper: Get status based on tool part state
export const getStepStatus = (
    toolPart: DeepResearchUIMessage["parts"][number] & { type: `tool-${string}` },
    isLatest: boolean
): "complete" | "active" | "pending" => {
    if ('errorText' in toolPart && toolPart.errorText) return "complete";
    if ('output' in toolPart && toolPart.output) return "complete";
    if (isLatest) return "active";
    return "pending";
};

// Helper: Extract search results for badge display
export const extractSearchResults = (toolName: string, output: unknown): string[] => {
    if (!output) return [];

    // If output is already an object, use it directly
    let parsed = output;
    if (typeof output === 'string') {
        try {
            parsed = JSON.parse(output);
        } catch {
            // Not JSON, keep as string
        }
    }

    try {
        switch (toolName) {
            case "tavily_search":
                // Extract titles or URLs from Tavily search results
                if (Array.isArray((parsed as Record<string, unknown>)?.results)) {
                    return ((parsed as Record<string, unknown>).results as Array<Record<string, unknown>>).slice(0, 5).map((r) => (r.title as string) || (r.url as string) || "Result").filter(Boolean);
                }
                break;

            case "firecrawl_map":
                // Extract found URLs from firecrawl map
                if (Array.isArray((parsed as Record<string, unknown>)?.links)) {
                    return ((parsed as Record<string, unknown>).links as Array<string | Record<string, unknown>>).slice(0, 5).map((link) => {
                        if (typeof link === 'string') return link;
                        return ((link as Record<string, unknown>).url as string) || ((link as Record<string, unknown>).href as string) || "Link";
                    }).filter(Boolean);
                }
                if (Array.isArray(parsed)) {
                    return (parsed as Array<Record<string, unknown>>).slice(0, 5).map((item) => (item.url as string) || (item.title as string) || "Page").filter(Boolean);
                }
                break;

            case "firecrawl_scrape":
                // Show the scraped URL
                if ((parsed as Record<string, unknown>)?.url) {
                    return [(parsed as Record<string, unknown>).url as string];
                }
                if ((parsed as Record<string, Record<string, unknown>>)?.metadata?.sourceURL) {
                    return [(parsed as Record<string, Record<string, unknown>>).metadata.sourceURL as string];
                }
                break;

            case "tavily_extract":
                // Show extracted data summary
                if ((parsed as Record<string, unknown>)?.results) {
                    return ["Data extracted"];
                }
                break;
        }

        // Fallback: try to find URLs in the output if it's a string
        if (typeof output === 'string') {
            const urlRegex = /https?:\/\/[^\s)]+/g;
            const urls = output.match(urlRegex);
            if (urls && urls.length > 0) {
                return urls.slice(0, 3);
            }
        }
    } catch {
        // Not JSON, try to extract info from raw text
        if ((toolName === "tavily_search" || toolName === "firecrawl_map") && typeof output === 'string') {
            const urlRegex = /https?:\/\/[^\s)]+/g;
            const urls = output.match(urlRegex);
            if (urls && urls.length > 0) {
                return urls.slice(0, 3);
            }
        }
    }

    return [];
};

