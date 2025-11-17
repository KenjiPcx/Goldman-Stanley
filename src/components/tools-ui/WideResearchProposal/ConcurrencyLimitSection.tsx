/**
 * ConcurrencyLimitSection - Component for setting concurrency limit
 * 
 * Displays a slider control for configuring how many research tasks run in parallel.
 * This helps balance speed vs. rate limit concerns when processing multiple targets.
 * 
 * Features:
 * - Slider control (range: 1 to user's worker count)
 * - Current value display as a badge
 * - Respects user's purchased worker limit from Autumn
 * - Helpful description text explaining the trade-offs
 * 
 * Props:
 * - value: Current concurrency limit value
 * - onChange: Callback when value changes
 * - maxWorkers: Maximum workers available (from Autumn)
 */

import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ConcurrencyLimitSectionProps {
    value: number;
    onChange: (value: number) => void;
}

export function ConcurrencyLimitSection({ value, onChange }: ConcurrencyLimitSectionProps) {
    const purchasedWorkers = useQuery(api.concurrency.workQueue.getPurchasedWorkers);

    // Show loading state
    if (purchasedWorkers === undefined) {
        return (
            <div className="flex items-center gap-2 py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Loading worker limits...</span>
            </div>
        );
    }

    const maxWorkers = purchasedWorkers;

    // Ensure value doesn't exceed max workers
    if (value > maxWorkers) {
        onChange(maxWorkers);
    }

    return (
        <div className="space-y-3">
            <div>
                <div className="flex items-center justify-between mb-3">
                    <Label className="text-xs font-medium">
                        Concurrency Limit
                    </Label>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs font-mono">
                            {value} / {maxWorkers} workers
                        </Badge>
                    </div>
                </div>
                <Slider
                    value={[value]}
                    onValueChange={(vals: number[]) => onChange(Math.min(vals[0] ?? 1, maxWorkers))}
                    min={1}
                    max={maxWorkers}
                    step={1}
                    className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-2">
                    Number of research tasks to run simultaneously. Limited by your available workers ({maxWorkers}).
                </p>
            </div>

            {value === maxWorkers && maxWorkers < 10 && (
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                        You're using all {maxWorkers} workers. Purchase more workers to increase parallel processing capacity.
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}

