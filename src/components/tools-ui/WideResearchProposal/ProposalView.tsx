/**
 * ProposalView - Main view component for the research proposal (before execution)
 * 
 * This component renders the proposal UI that users see before starting research.
 * It displays all research configuration options in a collapsible card format.
 * 
 * Features:
 * - Collapsible header with edit button
 * - Research task input/display
 * - Targets management (add/remove/edit)
 * - Output format configuration
 * - Output schema editor
 * - Concurrency limit slider (only visible when editing)
 * - Action buttons (Start Research / Cancel)
 * 
 * The component receives all state and handlers as props from the parent index component,
 * making it a pure presentation component focused on UI rendering.
 */

import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { ProposalHeader } from "./ProposalHeader";
import { TargetsSection } from "./TargetsSection";
import { OutputSchemaSection } from "./OutputSchemaSection";
import { ConcurrencyLimitSection } from "./ConcurrencyLimitSection";
import { ReviewConfigSelector } from "./ReviewConfigSelector";
import { OutputSchemaField } from "./types";

interface ProposalViewProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    isEditing: boolean;
    onEdit: () => void;
    editedName: string;
    onNameChange: (value: string) => void;
    editedTask: string;
    onTaskChange: (value: string) => void;
    editedTargets: string[];
    onAddTarget: () => void;
    onRemoveTarget: (index: number) => void;
    onUpdateTarget: (index: number, value: string) => void;
    editedOutput: string;
    onOutputChange: (value: string) => void;
    editedSchema: OutputSchemaField[];
    onAddSchemaField: () => void;
    onRemoveSchemaField: (index: number) => void;
    onUpdateSchemaField: (index: number, field: "fieldId" | "name" | "type" | "description" | "required", value: string | boolean) => void;
    reviewConfigId: string | null;
    onReviewConfigChange: (value: string | null) => void;
    concurrencyLimit: number;
    onConcurrencyLimitChange: (value: number) => void;
    onStartResearch: () => void;
    onCancel: () => void;
}

export function ProposalView({
    isOpen,
    onOpenChange,
    isEditing,
    onEdit,
    editedName,
    onNameChange,
    editedTask,
    onTaskChange,
    editedTargets,
    onAddTarget,
    onRemoveTarget,
    onUpdateTarget,
    editedOutput,
    onOutputChange,
    editedSchema,
    onAddSchemaField,
    onRemoveSchemaField,
    onUpdateSchemaField,
    reviewConfigId,
    onReviewConfigChange,
    concurrencyLimit,
    onConcurrencyLimitChange,
    onStartResearch,
    onCancel
}: ProposalViewProps) {
    return (
        <Collapsible open={isOpen} onOpenChange={onOpenChange}>
            <Card className="p-4 border bg-muted/30">
                <div className="space-y-4">
                    <ProposalHeader
                        isOpen={isOpen}
                        isEditing={isEditing}
                        onEdit={onEdit}
                    />

                    <CollapsibleContent>
                        {/* Dataset Name */}
                        <div>
                            <Label className="text-xs font-medium mb-2 block">Dataset Name</Label>
                            {isEditing ? (
                                <Input
                                    value={editedName}
                                    onChange={(e) => onNameChange(e.target.value)}
                                    placeholder="e.g., Top 10 PE Firms Analysis, European Market Comparison..."
                                    className="text-sm font-medium"
                                />
                            ) : (
                                <p className="text-sm font-medium bg-background/80 rounded p-3">
                                    {editedName || <span className="text-muted-foreground italic">Auto-generated from task</span>}
                                </p>
                            )}
                        </div>

                        {/* Research Task */}
                        <div>
                            <Label className="text-xs font-medium mb-2 block">Research Task</Label>
                            {isEditing ? (
                                <Textarea
                                    value={editedTask}
                                    onChange={(e) => onTaskChange(e.target.value)}
                                    placeholder="What should be researched for each target?"
                                    className="text-sm min-h-[80px]"
                                />
                            ) : (
                                <p className="text-sm bg-background/80 rounded p-3">{editedTask}</p>
                            )}
                        </div>

                        {/* Targets */}
                        <TargetsSection
                            targets={editedTargets}
                            isEditing={isEditing}
                            onAdd={onAddTarget}
                            onRemove={onRemoveTarget}
                            onUpdate={onUpdateTarget}
                        />

                        {/* Output Format */}
                        <div>
                            <Label className="text-xs font-medium mb-2 block">Output Format</Label>
                            {isEditing ? (
                                <Textarea
                                    value={editedOutput}
                                    onChange={(e) => onOutputChange(e.target.value)}
                                    placeholder="How should the results be aggregated?"
                                    className="text-sm min-h-[60px]"
                                />
                            ) : (
                                <p className="text-sm bg-background/80 rounded p-3">{editedOutput}</p>
                            )}
                        </div>

                        {/* Output Schema */}
                        <OutputSchemaSection
                            schema={editedSchema}
                            isEditing={isEditing}
                            onAdd={onAddSchemaField}
                            onRemove={onRemoveSchemaField}
                            onUpdate={onUpdateSchemaField}
                        />

                        {/* Review Config */}
                        <ReviewConfigSelector
                            value={reviewConfigId}
                            onChange={onReviewConfigChange}
                            isEditing={isEditing}
                        />

                        {/* Concurrency Limit */}
                        {isEditing && (
                            <ConcurrencyLimitSection
                                value={concurrencyLimit}
                                onChange={onConcurrencyLimitChange}
                            />
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-2">
                            {isEditing ? (
                                <>
                                    <Button
                                        size="sm"
                                        onClick={onStartResearch}
                                        className="flex-1"
                                    >
                                        <Play className="h-3.5 w-3.5 mr-1" />
                                        Start Research
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={onCancel}
                                    >
                                        Cancel
                                    </Button>
                                </>
                            ) : (
                                <Button
                                    size="sm"
                                    onClick={onStartResearch}
                                    className="flex-1"
                                >
                                    <Play className="h-3.5 w-3.5 mr-1" />
                                    Start Research
                                </Button>
                            )}
                        </div>
                    </CollapsibleContent>
                </div>
            </Card>
        </Collapsible>
    );
}

