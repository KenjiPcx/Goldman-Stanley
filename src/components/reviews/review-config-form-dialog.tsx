"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { X, Plus } from "lucide-react";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import type { Doc } from "@/convex/_generated/dataModel";
import type { ReviewCriterion } from "@/convex/reviews/schema";

interface ReviewConfigFormDialogProps {
    open: boolean;
    onClose: () => void;
    reviewConfig?: Doc<"reviewConfigs">;
}

export function ReviewConfigFormDialog({
    open,
    onClose,
    reviewConfig,
}: ReviewConfigFormDialogProps) {
    const createReviewConfig = useMutation(api.reviews.reviewConfigs.createReviewConfig);
    const updateReviewConfig = useMutation(api.reviews.reviewConfigs.updateReviewConfig);

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [criteria, setCriteria] = useState<ReviewCriterion[]>([]);
    const [passingScore, setPassingScore] = useState(75);
    const [customPrompt, setCustomPrompt] = useState("");

    useEffect(() => {
        if (reviewConfig) {
            setName(reviewConfig.name);
            setDescription(reviewConfig.description || "");
            setCriteria(reviewConfig.criteria);
            setPassingScore(reviewConfig.overallPassingScore * 100);
            setCustomPrompt(reviewConfig.customReviewPrompt || "");
        } else {
            // Reset form
            setName("");
            setDescription("");
            setCriteria([]);
            setPassingScore(75);
            setCustomPrompt("");
        }
    }, [reviewConfig, open]);

    const handleAddCriterion = () => {
        setCriteria([
            ...criteria,
            {
                id: nanoid(),
                name: "New Criterion",
                description: "",
                weight: 0.1,
                passingScore: 0.7,
            },
        ]);
    };

    const handleRemoveCriterion = (id: string) => {
        setCriteria(criteria.filter((c) => c.id !== id));
    };

    const handleUpdateCriterion = (id: string, updates: Partial<ReviewCriterion>) => {
        setCriteria(
            criteria.map((c) => (c.id === id ? { ...c, ...updates } : c))
        );
    };

    const normalizeWeights = (): ReviewCriterion[] => {
        const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
        if (totalWeight === 0) return criteria;
        return criteria.map((c) => ({
            ...c,
            weight: c.weight / totalWeight
        }));
    };

    const handleSubmit = async () => {
        if (!name.trim()) {
            toast.error("Please enter a review config name");
            return;
        }

        if (criteria.length === 0) {
            toast.error("Please add at least one criterion");
            return;
        }

        const normalizedCriteria = normalizeWeights();

        try {
            if (reviewConfig) {
                await updateReviewConfig({
                    reviewConfigId: reviewConfig._id,
                    name,
                    description: description || undefined,
                    isActive: true,
                    criteria: normalizedCriteria,
                    overallPassingScore: passingScore / 100,
                    customReviewPrompt: customPrompt || undefined,
                });
                toast.success("Review config updated successfully!");
            } else {
                await createReviewConfig({
                    id: name.toLowerCase().replace(/\s+/g, "-"),
                    name,
                    description: description || undefined,
                    isActive: true,
                    criteria: normalizedCriteria,
                    overallPassingScore: passingScore / 100,
                    customReviewPrompt: customPrompt || undefined,
                });
                toast.success("Review config created successfully!");
            }
            onClose();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Unknown error";
            toast.error(`Failed to save review config: ${message}`);
        }
    };

    const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {reviewConfig ? "Edit Review Config" : "Create Review Config"}
                    </DialogTitle>
                    <DialogDescription>
                        {reviewConfig
                            ? "Update review configuration"
                            : "Define quality criteria and passing thresholds"}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Name */}
                    <div className="space-y-2">
                        <Label htmlFor="name">Name *</Label>
                        <Input
                            id="name"
                            placeholder="Dataset Quality Review"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Input
                            id="description"
                            placeholder="Quality control for dataset research"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    {/* Criteria */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label>Criteria *</Label>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleAddCriterion}
                            >
                                <Plus className="h-3 w-3 mr-2" />
                                Add Criterion
                            </Button>
                        </div>

                        <div className="space-y-3 border rounded-lg p-4">
                            {criteria.map((criterion, index) => (
                                <div
                                    key={criterion.id}
                                    className="border rounded-lg p-3 space-y-3"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold">
                                            Criterion {index + 1}
                                        </span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRemoveCriterion(criterion.id)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs">Name</Label>
                                            <Input
                                                placeholder="Completeness"
                                                value={criterion.name}
                                                onChange={(e) =>
                                                    handleUpdateCriterion(criterion.id, {
                                                        name: e.target.value,
                                                    })
                                                }
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <Label className="text-xs">
                                                Weight: {(criterion.weight * 100).toFixed(0)}%
                                            </Label>
                                            <Slider
                                                value={[criterion.weight * 100]}
                                                onValueChange={([value]) =>
                                                    handleUpdateCriterion(criterion.id, {
                                                        weight: value / 100,
                                                    })
                                                }
                                                max={100}
                                                step={5}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-xs">
                                            Passing Score: {(criterion.passingScore * 100).toFixed(0)}%
                                        </Label>
                                        <Slider
                                            value={[criterion.passingScore * 100]}
                                            onValueChange={([value]) =>
                                                handleUpdateCriterion(criterion.id, {
                                                    passingScore: value / 100,
                                                })
                                            }
                                            max={100}
                                            step={5}
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-xs">Description</Label>
                                        <Textarea
                                            placeholder="All required fields are filled..."
                                            value={criterion.description}
                                            onChange={(e) =>
                                                handleUpdateCriterion(criterion.id, {
                                                    description: e.target.value,
                                                })
                                            }
                                            rows={2}
                                        />
                                    </div>
                                </div>
                            ))}

                            {criteria.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    No criteria added yet. Click &quot;Add Criterion&quot; to get started.
                                </p>
                            )}

                            {criteria.length > 0 && (
                                <div className="text-xs text-muted-foreground text-right">
                                    Total weight: {(totalWeight * 100).toFixed(0)}%
                                    {totalWeight !== 1 && (
                                        <span className="text-yellow-600 ml-2">
                                            (will be normalized to 100%)
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Passing Score */}
                    <div className="space-y-2">
                        <Label>
                            Passing Score: {passingScore}%
                        </Label>
                        <Slider
                            value={[passingScore]}
                            onValueChange={([value]) => setPassingScore(value)}
                            max={100}
                            step={5}
                        />
                        <p className="text-xs text-muted-foreground">
                            Minimum score required to pass review
                        </p>
                    </div>

                    {/* Custom Prompt */}
                    <div className="space-y-2">
                        <Label htmlFor="customPrompt">Custom Review Prompt (optional)</Label>
                        <Textarea
                            id="customPrompt"
                            placeholder="Additional instructions for the reviewer..."
                            value={customPrompt}
                            onChange={(e) => setCustomPrompt(e.target.value)}
                            rows={3}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={criteria.length === 0}>
                        {reviewConfig ? "Update" : "Create"} Review Config
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

