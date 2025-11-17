"use client";

import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronDown, ListChecks } from "lucide-react";
import { useState } from "react";
import { Response } from "../ai-elements/response";
import { Loader } from "@/components/ai-elements/loader";
import { SubResearcherAgentUIMessage } from "@/convex/agents/tools/subResearcher.tool";

interface TodosToolProps {
    part: SubResearcherAgentUIMessage["parts"][number] & { type: "tool-writeTodos" };
    defaultOpen?: boolean;
}

export function TodosTool({ part, defaultOpen = false }: TodosToolProps) {
    const [isExpanded, setIsExpanded] = useState(defaultOpen);

    const callId = part.toolCallId;
    const todos = part.input?.todos || "";

    // State-based rendering logic
    switch (part.state) {
        case "input-streaming":
            return (
                <div key={callId} className="border rounded-lg overflow-hidden bg-muted/30 w-full">
                    <div className="p-4 flex items-center gap-3">
                        <ListChecks className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">Todos Streaming...</span>
                                <Loader />
                            </div>
                        </div>
                    </div>
                </div>
            );

        case "input-available":
        case "output-available": {
            // Count checked and unchecked todos
            const checkedCount = (todos.match(/- \[x\]/gi) || []).length;
            const uncheckedCount = (todos.match(/- \[ \]/g) || []).length;
            const totalCount = checkedCount + uncheckedCount;

            return (
                <div key={callId} className="border rounded-lg overflow-hidden bg-muted/30 w-full">
                    {/* Header */}
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

                        <ListChecks className="h-4 w-4 text-green-600 flex-shrink-0" />

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">Todos Updated</span>
                                {totalCount > 0 && (
                                    <Badge variant="outline" className="text-xs">
                                        {checkedCount}/{totalCount} completed
                                    </Badge>
                                )}
                            </div>
                            {!isExpanded && totalCount > 0 && (
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-green-600 transition-all"
                                            style={{ width: `${(checkedCount / totalCount) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && (
                        <div className="border-t bg-background/50 p-4">
                            <div className="text-xs font-semibold text-muted-foreground mb-3 flex items-center justify-between">
                                <span>TODO LIST</span>
                                {totalCount > 0 && (
                                    <span className="text-green-600">
                                        {checkedCount} of {totalCount} done ({Math.round((checkedCount / totalCount) * 100)}%)
                                    </span>
                                )}
                            </div>
                            <div className="prose prose-sm max-w-none dark:prose-invert bg-background p-4 rounded border">
                                <Response>
                                    {todos}
                                </Response>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        case "output-error":
            return (
                <div key={callId} className="border rounded-lg overflow-hidden bg-red-50 dark:bg-red-950/20 w-full">
                    <div className="p-4">
                        <div className="flex items-center gap-3 mb-2">
                            <ListChecks className="h-4 w-4 text-red-600 flex-shrink-0" />
                            <span className="font-medium text-sm text-red-700 dark:text-red-400">Todos Error</span>
                        </div>
                        <pre className="text-xs whitespace-pre-wrap font-mono text-red-900 dark:text-red-300">
                            {part.errorText || "An error occurred"}
                        </pre>
                    </div>
                </div>
            );
    }
}

