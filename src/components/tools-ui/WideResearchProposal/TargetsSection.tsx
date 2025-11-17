/**
 * TargetsSection - Component for managing research targets
 * 
 * Displays and manages the list of targets to research. Supports two modes:
 * - View mode: Shows targets as badges
 * - Edit mode: Shows deletable pills with an input to add new ones
 * 
 * Features:
 * - Displays count of valid (non-empty) targets
 * - Deletable pill badges in edit mode
 * - Single input field to add new targets
 * - Badge display in view mode
 * 
 * Props:
 * - targets: Array of target strings
 * - isEditing: Whether in edit mode
 * - onAdd: Callback to add a new target
 * - onRemove: Callback to remove a target by index
 * - onUpdate: Callback to update a target by index
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useState } from "react";

interface TargetsSectionProps {
    targets: string[];
    isEditing: boolean;
    onAdd: () => void;
    onRemove: (index: number) => void;
    onUpdate: (index: number, value: string) => void;
}

export function TargetsSection({
    targets,
    isEditing,
    onAdd,
    onRemove,
    onUpdate
}: TargetsSectionProps) {
    const [newTarget, setNewTarget] = useState("");

    const handleAddTarget = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && newTarget.trim()) {
            onAdd();
            // Update the newly added target with the input value
            const newIndex = targets.length;
            setTimeout(() => {
                onUpdate(newIndex, newTarget.trim());
                setNewTarget("");
            }, 0);
        }
    };

    return (
        <div>
            <Label className="text-xs font-medium mb-2 block">
                Targets ({targets.filter(t => t.trim()).length})
            </Label>

            {isEditing ? (
                <div className="space-y-2">
                    {/* Deletable Pills */}
                    <div className="flex flex-wrap gap-2 min-h-[32px] p-2 bg-background/50 rounded-md border">
                        {targets.filter(t => t.trim()).map((target, idx) => {
                            const originalIndex = targets.findIndex((t, i) => i >= idx && t === target);
                            return (
                                <Badge
                                    key={originalIndex}
                                    variant="secondary"
                                    className="text-xs h-6 px-2 py-1 flex items-center gap-1 group hover:bg-destructive/20 transition-colors"
                                >
                                    <span>{target}</span>
                                    <button
                                        onClick={() => onRemove(originalIndex)}
                                        className="ml-1 hover:text-destructive transition-colors"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            );
                        })}
                        {targets.filter(t => t.trim()).length === 0 && (
                            <span className="text-xs text-muted-foreground">No targets yet. Add one below...</span>
                        )}
                    </div>

                    {/* Add New Target Input */}
                    <Input
                        value={newTarget}
                        onChange={(e) => setNewTarget(e.target.value)}
                        onKeyDown={handleAddTarget}
                        placeholder="Type target and press Enter (e.g., USA, OpenAI, Product X)"
                        className="h-8 text-sm"
                    />
                </div>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {targets.filter(t => t.trim()).map((target, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                            {target}
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    );
}

