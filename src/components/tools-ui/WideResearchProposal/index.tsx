/**
 * WideResearchProposal - Main orchestrator component for wide/batch research proposals
 * 
 * This is the entry point component that manages the overall state and flow of the wide research feature.
 * It handles two main views:
 * 1. ProposalView: Displayed before research starts, allows users to configure and edit research parameters
 * 2. ExecutionView: Displayed during and after research execution, shows progress and results
 * 
 * Responsibilities:
 * - Manages form state (task, targets, output format, schema, concurrency limit)
 * - Handles batch research initialization via Convex mutations
 * - Tracks existing batches and restores state on component mount
 * - Routes between proposal and execution views based on batch status
 * - Provides handlers for all form interactions (add/remove targets, edit schema, etc.)
 */

"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { ProposalView } from "./ProposalView";
import { ExecutionView } from "./ExecutionView";
import { WideResearchProposalProps, TargetStatus } from "./types";

export function WideResearchProposal({
    toolCallId,
    threadId,
    datasetName,
    researchTask,
    targets,
    outputFormat,
    outputSchema = []
}: WideResearchProposalProps) {
    const [isEditing, setIsEditing] = useState(true); // Start in editing mode
    const [editedName, setEditedName] = useState(datasetName || "");
    const [editedTask, setEditedTask] = useState(researchTask);
    const [editedTargets, setEditedTargets] = useState(targets);
    const [editedOutput, setEditedOutput] = useState(outputFormat);
    const [editedSchema, setEditedSchema] = useState(outputSchema);
    const [reviewConfigId, setReviewConfigId] = useState<string | null>("datasetQuality"); // Default to datasetQuality
    const [concurrencyLimit, setConcurrencyLimit] = useState(3);
    const [batchId, setBatchId] = useState<Id<"batchTaskOrchestrations"> | null>(null);
    const [isOpen, setIsOpen] = useState(true);

    const startBatch = useMutation(api.research.wideResearch.startBatchResearch);

    // Check if there's an existing batch for this tool call
    const existingBatch = useQuery(
        api.research.wideResearch.getBatchByToolCallId,
        { toolCallId }
    );

    const batchData = useQuery(
        api.research.wideResearch.getBatchWithResearch,
        batchId ? { batchId } : "skip"
    );

    // Load existing batch ID if it exists
    useEffect(() => {
        if (existingBatch && !batchId) {
            setBatchId(existingBatch._id);
            // Schema is now stored in dataset if datasetId exists
        }
    }, [existingBatch, batchId]);

    const handleAddTarget = () => {
        setEditedTargets([...editedTargets, ""]);
    };

    const handleRemoveTarget = (index: number) => {
        setEditedTargets(editedTargets.filter((_, i) => i !== index));
    };

    const handleUpdateTarget = (index: number, value: string) => {
        const updated = [...editedTargets];
        updated[index] = value;
        setEditedTargets(updated);
    };

    const handleAddSchemaField = () => {
        setEditedSchema([...editedSchema, {
            fieldId: "",
            name: "",
            type: "text" as const,
            description: "",
            required: false,
        }]);
    };

    const handleRemoveSchemaField = (index: number) => {
        setEditedSchema(editedSchema.filter((_, i) => i !== index));
    };

    const handleUpdateSchemaField = (
        index: number,
        field: "fieldId" | "name" | "type" | "description" | "required",
        value: string | boolean
    ) => {
        const updated = [...editedSchema];
        if (field === "required") {
            updated[index][field] = value as boolean;
        } else if (field === "type") {
            updated[index][field] = value as "text" | "number" | "date" | "url" | "boolean";
        } else {
            updated[index][field] = value as string;
        }
        setEditedSchema(updated);
    };

    const handleStartResearch = async () => {
        const validTargets = editedTargets.filter(t => t.trim() !== "");

        if (validTargets.length < 2) {
            toast.error("Please add at least 2 targets");
            return;
        }

        if (!editedTask.trim()) {
            toast.error("Please specify the research task");
            return;
        }

        try {
            const validSchema = editedSchema.filter(f => f.name.trim() !== "" && f.fieldId.trim() !== "");
            const finalName = editedName.trim() || `Research: ${editedTask.substring(0, 50)}`;

            const id = await startBatch({
                datasetName: finalName,
                researchTask: editedTask,
                targets: validTargets,
                outputFormat: editedOutput,
                outputSchema: validSchema.length > 0 ? validSchema : undefined,
                toolCallId,
                threadId, // Pass thread ID for completion notifications
                concurrencyLimit,
                reviewConfigId: reviewConfigId || undefined, // Pass review config
            });
            setBatchId(id);
            setIsEditing(false);
            toast.success(`Research started! Creating "${finalName}" with ${validSchema.length} fields for ${validTargets.length} targets...`);
        } catch (error) {
            console.error("Failed to start research:", error);
            toast.error("Failed to start research");
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditedName(datasetName || "");
        setEditedTask(researchTask);
        setEditedTargets(targets);
        setEditedOutput(outputFormat);
        setEditedSchema(outputSchema);
    };

    // If research has been started, show execution UI
    if (batchId && batchData) {
        // Map targets to their research status
        const targetStatusMap = new Map<string, TargetStatus>();

        batchData.research.forEach((task) => {
            const target = task.context?.target as string;
            if (target) {
                targetStatusMap.set(target, {
                    status: task.status,
                    threadId: task.threadId,
                    taskExecutionId: task._id,
                });
            }
        });

        return (
            <ExecutionView
                isOpen={isOpen}
                onOpenChange={setIsOpen}
                batchData={batchData}
                targetStatusMap={targetStatusMap}
            />
        );
    }

    // Proposal UI (before execution)
    return (
        <ProposalView
            isOpen={isOpen}
            onOpenChange={setIsOpen}
            isEditing={isEditing}
            onEdit={() => setIsEditing(true)}
            editedName={editedName}
            onNameChange={setEditedName}
            editedTask={editedTask}
            onTaskChange={setEditedTask}
            editedTargets={editedTargets}
            onAddTarget={handleAddTarget}
            onRemoveTarget={handleRemoveTarget}
            onUpdateTarget={handleUpdateTarget}
            editedOutput={editedOutput}
            onOutputChange={setEditedOutput}
            editedSchema={editedSchema}
            onAddSchemaField={handleAddSchemaField}
            onRemoveSchemaField={handleRemoveSchemaField}
            onUpdateSchemaField={handleUpdateSchemaField}
            reviewConfigId={reviewConfigId}
            onReviewConfigChange={setReviewConfigId}
            concurrencyLimit={concurrencyLimit}
            onConcurrencyLimitChange={setConcurrencyLimit}
            onStartResearch={handleStartResearch}
            onCancel={handleCancel}
        />
    );
}

