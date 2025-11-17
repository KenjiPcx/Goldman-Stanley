import { Button } from "@/components/ui/button";
import { Plus, MessageSquare } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ChatSidebarProps {
    threads: Array<{ _id: string; title?: string }> | undefined;
    threadId: string | null;
    onThreadSelect: (threadId: string) => void;
    onNewThread: () => void;
    sidebarOpen: boolean;
}

export function ChatSidebar({ 
    threads, 
    threadId, 
    onThreadSelect, 
    onNewThread,
    sidebarOpen 
}: ChatSidebarProps) {
    return (
        <div
            className={cn(
                "border-r bg-muted/10 transition-all duration-300 flex flex-col",
                sidebarOpen ? "w-64" : "w-0"
            )}
        >
            {sidebarOpen && (
                <>
                    <div className="p-4 border-b flex items-center justify-between">
                        <h2 className="font-semibold text-sm">Conversations</h2>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={onNewThread}
                            className="h-8 w-8 p-0"
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                    <ScrollArea className="flex-1">
                        <div className="p-2 space-y-1">
                            {threads?.map((thread) => (
                                <div
                                    key={thread._id}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer hover:bg-accent transition-colors w-60",
                                        thread._id === threadId && "bg-accent"
                                    )}
                                    onClick={() => onThreadSelect(thread._id)}
                                >
                                    <MessageSquare className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className="flex-1 min-w-0 text-sm truncate">
                                                {thread.title || "New Chat"}
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent side="right">
                                            <p>{thread.title || "New Chat"}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </>
            )}
        </div>
    );
}

