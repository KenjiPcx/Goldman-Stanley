/**
 * ReviewConfigSelector - Select a review config for quality control
 * 
 * Allows users to choose which review rubric to apply to their research.
 */

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CheckCircle2, AlertCircle, FileCheck } from "lucide-react";

interface ReviewConfigSelectorProps {
    value: string | null;
    onChange: (value: string | null) => void;
    isEditing: boolean;
}

export function ReviewConfigSelector({ value, onChange, isEditing }: ReviewConfigSelectorProps) {
    const reviewConfigs = useQuery(api.reviews.reviewConfigs.listReviewConfigs, { activeOnly: true });

    if (!reviewConfigs) {
        return null; // Loading
    }

    const selectedConfig = reviewConfigs.find(c => c.id === value);

    if (!isEditing) {
        return (
            <div>
                <Label className="text-xs font-medium mb-2 block">Quality Review</Label>
                <div className="text-sm bg-primary/5 rounded p-3 flex items-start gap-2 border border-primary/20">
                    <FileCheck className="h-4 w-4 mt-0.5 text-primary" />
                    <div className="flex-1">
                        {selectedConfig ? (
                            <>
                                <p className="font-medium text-foreground">{selectedConfig.name}</p>
                                {selectedConfig.description && (
                                    <p className="text-xs text-muted-foreground mt-1">{selectedConfig.description}</p>
                                )}
                                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                    <span>✓ {selectedConfig.criteria.length} criteria</span>
                                    <span>✓ Passing: {(selectedConfig.overallPassingScore * 100).toFixed(0)}%</span>
                                </div>
                            </>
                        ) : (
                            <p className="text-muted-foreground italic">No review config selected (default quality checks will be applied)</p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="border-l-2 border-primary pl-3">
            <Label className="text-xs font-medium mb-2 block flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-primary" />
                Quality Review Configuration
            </Label>
            <Select value={value || "none"} onValueChange={(v) => onChange(v === "none" ? null : v)}>
                <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select review config..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="none">
                        <span className="text-muted-foreground italic">No review (use default)</span>
                    </SelectItem>
                    {reviewConfigs.map((config) => (
                        <SelectItem key={config._id} value={config.id}>
                            <div className="flex items-center gap-2">
                                {config.overallPassingScore >= 0.8 ? (
                                    <AlertCircle className="h-3.5 w-3.5 text-orange-500" />
                                ) : (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                )}
                                <div>
                                    <p className="font-medium">{config.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {config.criteria.length} criteria • Passing: {(config.overallPassingScore * 100).toFixed(0)}%
                                    </p>
                                </div>
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {selectedConfig && (
                <div className="mt-2 p-2 bg-muted/30 rounded text-xs">
                    <p className="text-muted-foreground">{selectedConfig.description}</p>
                    <div className="flex items-center gap-4 mt-1 text-muted-foreground">
                        <span>📋 {selectedConfig.criteria.length} criteria</span>
                        <span>🎯 Passing: {(selectedConfig.overallPassingScore * 100).toFixed(0)}%</span>
                    </div>
                </div>
            )}
        </div>
    );
}

