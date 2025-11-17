/**
 * CreditsDisplay - Shows user's available workers and research task credits
 * 
 * Fetches and displays:
 * - Number of purchased workers (from Autumn "workers" feature)
 * - Number of available research tasks (from Autumn "research-tasks" feature)
 * 
 * Used in navigation bars to give users quick visibility of their available resources
 */

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Users, Search, Loader2 } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export function CreditsDisplay() {
    const purchasedWorkers = useQuery(api.concurrency.workQueue.getPurchasedWorkers);
    const researchTasksBalance = useQuery(api.research.researchCredits.getResearchTasksBalance);

    if (purchasedWorkers === undefined || researchTasksBalance === undefined) {
        return (
            <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <TooltipProvider>
            <div className="flex items-center gap-2">
                {/* Workers Badge */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Badge variant="secondary" className="gap-1.5 cursor-help">
                            <Users className="h-3 w-3" />
                            <span className="font-mono">{purchasedWorkers}</span>
                        </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p className="text-xs">Available Workers</p>
                        <p className="text-xs text-muted-foreground">
                            Max parallel tasks you can run
                        </p>
                    </TooltipContent>
                </Tooltip>

                {/* Research Tasks Badge */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Badge variant="secondary" className="gap-1.5 cursor-help">
                            <Search className="h-3 w-3" />
                            <span className="font-mono">{researchTasksBalance}</span>
                        </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p className="text-xs">Research Tasks Remaining</p>
                        <p className="text-xs text-muted-foreground">
                            Number of research tasks you can execute
                        </p>
                    </TooltipContent>
                </Tooltip>
            </div>
        </TooltipProvider>
    );
}

