"use client";

import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronDown, FileText, Edit3 } from "lucide-react";
import { useState, useMemo } from "react";
import { Response } from "@/components/ai-elements/response";
import { Loader } from "@/components/ai-elements/loader";
import { diffLines, Change } from "diff";
import { SubResearcherAgentUIMessage } from "@/convex/agents/tools/subResearcher.tool";

interface ScratchpadToolProps {
    part: SubResearcherAgentUIMessage["parts"][number] & { type: "tool-writeScratchpad" | "tool-replaceScratchpadString" };
    defaultOpen?: boolean;
}

type WriteScratchpadToolPart = SubResearcherAgentUIMessage["parts"][number] & { type: "tool-writeScratchpad" };
type ReplaceScratchpadToolPart = SubResearcherAgentUIMessage["parts"][number] & { type: "tool-replaceScratchpadString" };

export function ScratchpadTool({
    part,
    defaultOpen = false,
}: ScratchpadToolProps) {
    const [isExpanded, setIsExpanded] = useState(defaultOpen);

    const callId = part.toolCallId;

    // Determine tool type
    const isWrite = 'scratchpad' in (part.input || {});
    const isReplace = 'oldString' in (part.input || {});

    // Extract data from part
    const scratchpad = isWrite ? (part as WriteScratchpadToolPart).input?.scratchpad : undefined;
    const oldString = isReplace ? (part as ReplaceScratchpadToolPart).input?.oldString : undefined;
    const newString = isReplace ? (part as ReplaceScratchpadToolPart).input?.newString : undefined;
    const workflowProgress = part.input?.workflowProgress;

    const icon = isWrite ? FileText : Edit3;
    const Icon = icon;
    const title = isWrite ? "Scratchpad Updated" : "Scratchpad Edit";
    const color = isWrite ? "text-blue-600" : "text-amber-600";

    // Calculate diff for inline display
    const diffParts = useMemo(() => {
        if (!isReplace || !oldString || !newString) return null;
        return diffLines(oldString, newString);
    }, [isReplace, oldString, newString]);

    // State-based rendering logic
    switch (part.state) {
        case "input-streaming":
            return (
                <div key={callId} className="border rounded-lg overflow-hidden bg-muted/30 w-full">
                    <div className="p-4 flex items-center gap-3">
                        <Icon className={`h-4 w-4 ${color} flex-shrink-0`} />
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{title} Streaming...</span>
                                <Loader />
                            </div>
                        </div>
                    </div>
                </div>
            );

        case "input-available":
        case "output-available":
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

                        <Icon className={`h-4 w-4 ${color} flex-shrink-0`} />

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">{title}</span>
                                {workflowProgress && (
                                    <Badge variant="outline" className="text-xs">
                                        {workflowProgress}
                                    </Badge>
                                )}
                            </div>
                            {!isExpanded && (
                                <p className="text-xs text-muted-foreground mt-1 truncate">
                                    {isWrite ? "Updated complete scratchpad" : `Changed: ${oldString?.substring(0, 50)}...`}
                                </p>
                            )}
                        </div>
                    </button>

                    {isExpanded && (
                        <div className="border-t bg-background/50">
                            {isWrite && scratchpad && (
                                <div className="p-4">
                                    <div className="text-xs font-semibold text-muted-foreground mb-3">
                                        SCRATCHPAD CONTENT
                                    </div>
                                    <div className="prose prose-sm max-w-none dark:prose-invert bg-background p-4 rounded border">
                                        <Response>
                                            {scratchpad}
                                        </Response>
                                    </div>
                                </div>
                            )}

                            {isReplace && diffParts && (
                                <div className="p-4">
                                    <div className="text-xs font-semibold text-muted-foreground mb-3">
                                        INLINE DIFF
                                    </div>
                                    <div className="bg-background p-4 rounded border space-y-px">
                                        {diffParts.map((part: Change, index: number) => {
                                            if (part.removed) {
                                                return (
                                                    <div
                                                        key={index}
                                                        className="bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300 px-2 py-1 border-l-2 border-red-500"
                                                    >
                                                        <span className="text-red-600 dark:text-red-400 mr-2 select-none">−</span>
                                                        <span className="line-through decoration-2">{part.value.replace(/\n$/, '')}</span>
                                                    </div>
                                                );
                                            }
                                            if (part.added) {
                                                return (
                                                    <div
                                                        key={index}
                                                        className="bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-300 px-2 py-1 border-l-2 border-green-500"
                                                    >
                                                        <span className="text-green-600 dark:text-green-400 mr-2 select-none">+</span>
                                                        <span className="font-medium">{part.value.replace(/\n$/, '')}</span>
                                                    </div>
                                                );
                                            }
                                            return (
                                                <div key={index} className="text-muted-foreground px-2 py-1">
                                                    <span className="opacity-50 mr-2 select-none"> </span>
                                                    <span className="whitespace-pre-wrap">{part.value.replace(/\n$/, '')}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            );

        case "output-error":
            return (
                <div key={callId} className="border rounded-lg overflow-hidden bg-red-50 dark:bg-red-950/20 w-full">
                    <div className="p-4">
                        <div className="flex items-center gap-3 mb-2">
                            <Icon className={`h-4 w-4 text-red-600 flex-shrink-0`} />
                            <span className="font-medium text-sm text-red-700 dark:text-red-400">{title} Error</span>
                        </div>
                        <pre className="text-xs whitespace-pre-wrap font-mono text-red-900 dark:text-red-300">
                            {part.errorText || "An error occurred"}
                        </pre>
                    </div>
                </div>
            );
    }
}

