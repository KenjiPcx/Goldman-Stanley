"use client";

import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronDown, Search } from "lucide-react";
import { useState } from "react";
import { CodeBlock, CodeBlockCopyButton } from "@/components/ai-elements/code-block";
import { Loader } from "@/components/ai-elements/loader";
import { SubResearcherAgentUIMessage } from "@/convex/agents/tools/subResearcher.tool";

interface SearchWebToolProps {
    part: SubResearcherAgentUIMessage["parts"][number] & { type: "tool-searchWeb" };
    defaultOpen?: boolean;
}

export function SearchWebTool({
    part,
    defaultOpen = false,
}: SearchWebToolProps) {
    const [isExpanded, setIsExpanded] = useState(defaultOpen);

    const callId = part.toolCallId;
    const input = part.input as { objective?: string; search_queries?: string[]; max_results?: number } | undefined;
    const objective = input?.objective || "";
    const searchQueries = input?.search_queries || [];
    const maxResults = input?.max_results || 10;

    // Helper to parse output
    const getParsedOutput = (output: string | undefined) => {
        if (!output) return "";
        try {
            const parsed = JSON.parse(output);
            return JSON.stringify(parsed, null, 2);
        } catch {
            return output;
        }
    };

    // State-based rendering logic
    switch (part.state) {
        case "input-streaming":
            return (
                <div key={callId} className="border rounded-lg overflow-hidden bg-muted/30 w-full">
                    <div className="p-4 flex items-center gap-3">
                        <Search className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">Searching Web...</span>
                                <Loader />
                            </div>
                            {objective && (
                                <p className="text-xs text-muted-foreground mt-1 truncate">
                                    {objective}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            );

        case "input-available":
            return (
                <div key={callId} className="border rounded-lg overflow-hidden bg-muted/30 w-full">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
                    >
                        <div className="flex-shrink-0">
                            {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                            ) : (
                                <ChevronRight className="h-4 w-4" />
                            )}
                        </div>
                        <Search className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">Searching Web...</span>
                                <Loader />
                            </div>
                            {!isExpanded && objective && (
                                <p className="text-xs text-muted-foreground mt-1 truncate">
                                    {objective}
                                </p>
                            )}
                        </div>
                    </button>
                    {isExpanded && (
                        <div className="border-t bg-background/50 p-4">
                            {objective && (
                                <div className="mb-3">
                                    <div className="text-xs font-semibold text-muted-foreground mb-2">
                                        OBJECTIVE
                                    </div>
                                    <p className="text-sm">{objective}</p>
                                </div>
                            )}
                            {searchQueries.length > 0 && (
                                <div className="mb-3">
                                    <div className="text-xs font-semibold text-muted-foreground mb-2">
                                        SEARCH QUERIES
                                    </div>
                                    <ul className="list-disc list-inside text-sm space-y-1">
                                        {searchQueries.map((query, idx) => (
                                            <li key={idx}>{query}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            <div className="text-xs text-muted-foreground">
                                Max results: {maxResults}
                            </div>
                        </div>
                    )}
                </div>
            );

        case "output-available": {
            const parsedOutput = getParsedOutput(part.output);
            return (
                <div key={callId} className="border rounded-lg overflow-hidden bg-muted/30 w-full">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
                    >
                        <div className="flex-shrink-0">
                            {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                            ) : (
                                <ChevronRight className="h-4 w-4" />
                            )}
                        </div>
                        <Search className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">Web Search Results</span>
                                <Badge variant="outline" className="text-xs bg-green-500">
                                    ✓ completed
                                </Badge>
                            </div>
                            {!isExpanded && objective && (
                                <p className="text-xs text-muted-foreground mt-1 truncate">
                                    {objective}
                                </p>
                            )}
                        </div>
                    </button>
                    {isExpanded && (
                        <div className="border-t bg-background/50">
                            {objective && (
                                <div className="p-4 border-b">
                                    <div className="text-xs font-semibold text-muted-foreground mb-2">
                                        OBJECTIVE
                                    </div>
                                    <p className="text-sm">{objective}</p>
                                    {searchQueries.length > 0 && (
                                        <div className="mt-3">
                                            <div className="text-xs font-semibold text-muted-foreground mb-2">
                                                SEARCH QUERIES
                                            </div>
                                            <ul className="list-disc list-inside text-sm space-y-1">
                                                {searchQueries.map((query, idx) => (
                                                    <li key={idx}>{query}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="p-4 bg-green-50 dark:bg-green-950/20">
                                <div className="text-xs font-semibold mb-3 text-green-700 dark:text-green-400">
                                    ✓ SEARCH RESULTS
                                </div>
                                <CodeBlock code={parsedOutput} language="json" showLineNumbers>
                                    <CodeBlockCopyButton />
                                </CodeBlock>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        case "output-error":
            return (
                <div key={callId} className="border rounded-lg overflow-hidden bg-red-50 dark:bg-red-950/20 w-full">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="w-full p-4 flex items-center gap-3 hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors text-left"
                    >
                        <div className="flex-shrink-0">
                            {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-red-600" />
                            ) : (
                                <ChevronRight className="h-4 w-4 text-red-600" />
                            )}
                        </div>
                        <Search className="h-4 w-4 text-red-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm text-red-700 dark:text-red-400">Web Search Error</span>
                                <Badge variant="outline" className="text-xs bg-red-500">
                                    ✗ error
                                </Badge>
                            </div>
                        </div>
                    </button>
                    {isExpanded && (
                        <div className="border-t border-red-200 dark:border-red-800">
                            {objective && (
                                <div className="p-4 border-b border-red-200 dark:border-red-800">
                                    <div className="text-xs font-semibold text-red-700 dark:text-red-400 mb-2">
                                        OBJECTIVE
                                    </div>
                                    <p className="text-sm">{objective}</p>
                                </div>
                            )}
                            <div className="p-4">
                                <div className="text-xs font-semibold text-red-700 dark:text-red-400 mb-3">
                                    ✗ ERROR OUTPUT
                                </div>
                                <pre className="text-xs whitespace-pre-wrap font-mono text-red-900 dark:text-red-300 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-3 rounded">
                                    {part.errorText || "An error occurred"}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>
            );
    }
}

