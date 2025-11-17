"use client";

import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronDown, FileText } from "lucide-react";
import { useState } from "react";
import { CodeBlock, CodeBlockCopyButton } from "@/components/ai-elements/code-block";
import { Loader } from "@/components/ai-elements/loader";
import { SubResearcherAgentUIMessage } from "@/convex/agents/tools/subResearcher.tool";

interface ExtractPageToolProps {
    part: SubResearcherAgentUIMessage["parts"][number] & { type: "tool-extractPage" };
    defaultOpen?: boolean;
}

export function ExtractPageTool({
    part,
    defaultOpen = false,
}: ExtractPageToolProps) {
    const [isExpanded, setIsExpanded] = useState(defaultOpen);

    const callId = part.toolCallId;
    const input = part.input as { urls?: string[]; objective?: string; excerpts?: boolean; fullContent?: boolean } | undefined;
    const urls = input?.urls || [];
    const objective = input?.objective || "";
    const excerpts = input?.excerpts !== undefined ? input.excerpts : true;
    const fullContent = input?.fullContent !== undefined ? input.fullContent : false;

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
                        <FileText className="h-4 w-4 text-purple-600 flex-shrink-0" />
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">Extracting Page Content...</span>
                                <Loader />
                            </div>
                            {urls.length > 0 && (
                                <p className="text-xs text-muted-foreground mt-1 truncate">
                                    {urls[0]}...
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
                        <FileText className="h-4 w-4 text-purple-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">Extracting Page Content...</span>
                                <Loader />
                            </div>
                            {!isExpanded && urls.length > 0 && (
                                <p className="text-xs text-muted-foreground mt-1 truncate">
                                    {urls[0]}...
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
                            {urls.length > 0 && (
                                <div className="mb-3">
                                    <div className="text-xs font-semibold text-muted-foreground mb-2">
                                        URLS
                                    </div>
                                    <ul className="list-disc list-inside text-sm space-y-1">
                                        {urls.map((url, idx) => (
                                            <li key={idx} className="break-all">
                                                <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                    {url}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            <div className="text-xs text-muted-foreground space-y-1">
                                <div>Excerpts: {excerpts ? "Yes" : "No"}</div>
                                <div>Full Content: {fullContent ? "Yes" : "No"}</div>
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
                        <FileText className="h-4 w-4 text-purple-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">Page Extraction Results</span>
                                <Badge variant="outline" className="text-xs bg-green-500">
                                    ✓ completed
                                </Badge>
                            </div>
                            {!isExpanded && urls.length > 0 && (
                                <p className="text-xs text-muted-foreground mt-1 truncate">
                                    {urls[0]}...
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
                                    {urls.length > 0 && (
                                        <div className="mt-3">
                                            <div className="text-xs font-semibold text-muted-foreground mb-2">
                                                URLS
                                            </div>
                                            <ul className="list-disc list-inside text-sm space-y-1">
                                                {urls.map((url, idx) => (
                                                    <li key={idx} className="break-all">
                                                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                            {url}
                                                        </a>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="p-4 bg-green-50 dark:bg-green-950/20">
                                <div className="text-xs font-semibold mb-3 text-green-700 dark:text-green-400">
                                    ✓ EXTRACTION RESULTS
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
                        <FileText className="h-4 w-4 text-red-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm text-red-700 dark:text-red-400">Page Extraction Error</span>
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
                                    {urls.length > 0 && (
                                        <div className="mt-3">
                                            <div className="text-xs font-semibold text-red-700 dark:text-red-400 mb-2">
                                                URLS
                                            </div>
                                            <ul className="list-disc list-inside text-sm space-y-1">
                                                {urls.map((url, idx) => (
                                                    <li key={idx} className="break-all">
                                                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                            {url}
                                                        </a>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
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

