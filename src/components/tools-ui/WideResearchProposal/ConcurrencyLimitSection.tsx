/**
 * ConcurrencyLimitSection - Component for setting concurrency limit
 * 
 * Displays a slider control for configuring how many research tasks run in parallel.
 * This helps balance speed vs. rate limit concerns when processing multiple targets.
 * 
 * Features:
 * - Slider control (range: 1-10)
 * - Current value display as a badge
 * - Helpful description text explaining the trade-offs
 * 
 * Props:
 * - value: Current concurrency limit value
 * - onChange: Callback when value changes
 */

import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";

interface ConcurrencyLimitSectionProps {
    value: number;
    onChange: (value: number) => void;
}

export function ConcurrencyLimitSection({ value, onChange }: ConcurrencyLimitSectionProps) {
    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <Label className="text-xs font-medium">
                    Concurrency Limit
                </Label>
                <Badge variant="outline" className="text-xs font-mono">
                    {value} parallel
                </Badge>
            </div>
            <Slider
                value={[value]}
                onValueChange={(vals: number[]) => onChange(vals[0] ?? 3)}
                min={1}
                max={10}
                step={1}
                className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-2">
                Number of research tasks to run simultaneously. Higher values are faster but may hit rate limits.
            </p>
        </div>
    );
}

