"use client";

import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronDown, Terminal } from "lucide-react";
import { useState } from "react";
import { CodeBlock, CodeBlockCopyButton } from "@/components/ai-elements/code-block";
import { Loader } from "@/components/ai-elements/loader";
import { SubResearcherAgentUIMessage } from "@/convex/agents/tools/subResearcher.tool";

interface PythonCodeToolProps {
    part: SubResearcherAgentUIMessage["parts"][number] & { type: "tool-interpreterTools" };
    defaultOpen?: boolean;
}

export function PythonCodeTool({
    part,
    defaultOpen = false,
}: PythonCodeToolProps) {
    const [isExpanded, setIsExpanded] = useState(defaultOpen);

    const callId = part.toolCallId;
    const code = part.input?.code || "";

    // Helper to parse output
    const getParsedOutput = (output: string | undefined) => {
        if (!output) return "";
        try {
            const parsed = JSON.parse(output);
            if (parsed.logs || parsed.stdout || parsed.stderr) {
                return parsed.logs || parsed.stdout || parsed.stderr || output;
            }
        } catch {
            // Keep original output if not JSON
        }
        return output;
    };

    // State-based rendering logic
    switch (part.state) {
        case "input-streaming":
            return (
                <div key={callId} className="border rounded-lg overflow-hidden bg-muted/30 w-full">
                    <div className="p-4 flex items-center gap-3">
                        <Terminal className="h-4 w-4 text-purple-600 flex-shrink-0" />
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">Python Code Streaming...</span>
                                <Loader />
                            </div>
                            {code && (
                                <p className="text-xs text-muted-foreground mt-1 truncate font-mono">
                                    {code.split('\n')[0]}...
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
                        <Terminal className="h-4 w-4 text-purple-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">Executing Python Code...</span>
                                <Loader />
                            </div>
                        </div>
                    </button>
                    {isExpanded && code && (
                        <div className="border-t bg-background/50 p-4">
                            <div className="text-xs font-semibold text-muted-foreground mb-3">
                                PYTHON CODE
                            </div>
                            <CodeBlock code={code} language="python" showLineNumbers>
                                <CodeBlockCopyButton />
                            </CodeBlock>
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
                        <Terminal className="h-4 w-4 text-purple-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">Python Code Execution</span>
                                <Badge variant="outline" className="text-xs bg-green-500">
                                    ✓ completed
                                </Badge>
                            </div>
                            {!isExpanded && code && (
                                <p className="text-xs text-muted-foreground mt-1 truncate font-mono">
                                    {code.split('\n')[0]}...
                                </p>
                            )}
                        </div>
                    </button>
                    {isExpanded && (
                        <div className="border-t bg-background/50">
                            {code && (
                                <div className="p-4 border-b">
                                    <div className="text-xs font-semibold text-muted-foreground mb-3">
                                        PYTHON CODE
                                    </div>
                                    <CodeBlock code={code} language="python" showLineNumbers>
                                        <CodeBlockCopyButton />
                                    </CodeBlock>
                                </div>
                            )}
                            <div className="p-4 bg-green-50 dark:bg-green-950/20">
                                <div className="text-xs font-semibold mb-3 text-green-700 dark:text-green-400">
                                    ✓ EXECUTION OUTPUT
                                </div>
                                <div className="rounded border p-3 font-mono text-sm whitespace-pre-wrap bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-900 dark:text-green-300">
                                    {parsedOutput}
                                </div>
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
                        <Terminal className="h-4 w-4 text-red-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm text-red-700 dark:text-red-400">Python Execution Error</span>
                                <Badge variant="outline" className="text-xs bg-red-500">
                                    ✗ error
                                </Badge>
                            </div>
                        </div>
                    </button>
                    {isExpanded && (
                        <div className="border-t border-red-200 dark:border-red-800">
                            {code && (
                                <div className="p-4 border-b border-red-200 dark:border-red-800">
                                    <div className="text-xs font-semibold text-red-700 dark:text-red-400 mb-3">
                                        PYTHON CODE
                                    </div>
                                    <CodeBlock code={code} language="python" showLineNumbers>
                                        <CodeBlockCopyButton />
                                    </CodeBlock>
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

