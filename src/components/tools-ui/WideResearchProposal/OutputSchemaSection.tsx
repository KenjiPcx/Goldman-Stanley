/**
 * OutputSchemaSection - Component for managing output schema fields
 * 
 * Displays and manages the output schema definition for structured data extraction.
 * Each schema field has a name and description. Supports two modes:
 * - View mode: Shows schema fields as read-only cards
 * - Edit mode: Shows editable inputs with add/remove controls
 * 
 * Features:
 * - Displays count of valid (non-empty) schema fields
 * - Add button (only in edit mode)
 * - Individual field editors with name and description inputs
 * - Remove buttons for each field
 * - Scrollable container for long schema lists
 * 
 * Props:
 * - schema: Array of OutputSchemaField objects
 * - isEditing: Whether in edit mode
 * - onAdd: Callback to add a new schema field
 * - onRemove: Callback to remove a schema field by index
 * - onUpdate: Callback to update a schema field (name or description) by index
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";
import { OutputSchemaField } from "./types";

interface OutputSchemaSectionProps {
    schema: OutputSchemaField[];
    isEditing: boolean;
    onAdd: () => void;
    onRemove: (index: number) => void;
    onUpdate: (index: number, field: "fieldId" | "name" | "type" | "description" | "required", value: string | boolean) => void;
}

export function OutputSchemaSection({
    schema,
    isEditing,
    onAdd,
    onRemove,
    onUpdate
}: OutputSchemaSectionProps) {
    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-medium">
                    Output Schema ({schema.filter(f => f.name.trim()).length} fields)
                </Label>
                {isEditing && (
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={onAdd}
                        className="h-6 text-xs"
                    >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Field
                    </Button>
                )}
            </div>

            {isEditing ? (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {schema.map((field, idx) => (
                        <div key={idx} className="flex gap-2 p-3 bg-background/60 border rounded-lg">
                            <div className="flex-1 space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Field ID</Label>
                                        <Input
                                            value={field.fieldId}
                                            onChange={(e) => onUpdate(idx, "fieldId", e.target.value)}
                                            placeholder="e.g., revenue, founded_year"
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Display Name</Label>
                                        <Input
                                            value={field.name}
                                            onChange={(e) => onUpdate(idx, "name", e.target.value)}
                                            placeholder="e.g., Annual Revenue"
                                            className="h-8 text-sm font-medium"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Type</Label>
                                        <Select
                                            value={field.type}
                                            onValueChange={(value) => onUpdate(idx, "type", value)}
                                        >
                                            <SelectTrigger className="h-8 text-sm">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="text">Text</SelectItem>
                                                <SelectItem value="number">Number</SelectItem>
                                                <SelectItem value="date">Date</SelectItem>
                                                <SelectItem value="url">URL</SelectItem>
                                                <SelectItem value="boolean">Boolean</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex items-center space-x-2 h-8">
                                        <Checkbox
                                            id={`required-${idx}`}
                                            checked={field.required}
                                            onCheckedChange={(checked) => onUpdate(idx, "required", checked as boolean)}
                                        />
                                        <label
                                            htmlFor={`required-${idx}`}
                                            className="text-xs text-muted-foreground cursor-pointer"
                                        >
                                            Required
                                        </label>
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">Description</Label>
                                    <Input
                                        value={field.description}
                                        onChange={(e) => onUpdate(idx, "description", e.target.value)}
                                        placeholder="What to extract and how to find it..."
                                        className="h-8 text-xs"
                                    />
                                </div>
                            </div>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onRemove(idx)}
                                className="h-8 w-8 p-0 self-start"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-2">
                    {schema.filter(f => f.name.trim()).map((field, idx) => (
                        <div key={idx} className="bg-background/60 border rounded p-2.5">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium">{field.name}</p>
                                        <span className="text-xs text-muted-foreground">({field.type})</span>
                                        {field.required && (
                                            <span className="text-xs bg-orange-500/10 text-orange-600 px-1.5 py-0.5 rounded">
                                                required
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">{field.description}</p>
                                    <p className="text-xs text-muted-foreground/70 mt-0.5">ID: {field.fieldId}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

