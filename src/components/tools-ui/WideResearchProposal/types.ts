/**
 * types.ts - TypeScript type definitions for WideResearchProposal components
 * 
 * This file contains all shared TypeScript interfaces and types used across the
 * WideResearchProposal component tree. Centralizing types here ensures consistency
 * and makes it easier to maintain type safety across the module.
 * 
 * Types defined:
 * - WideResearchProposalProps: Main component props from parent
 * - OutputSchemaField: Structure for output schema fields (name + description)
 * - ProposalFormState: Internal form state structure (not currently used but available)
 * - TargetStatus: Status information for individual research targets during execution
 */

import { Id } from "@/convex/_generated/dataModel";

export interface WideResearchProposalProps {
    toolCallId: string;
    threadId?: string; // Thread ID for sending completion notifications
    datasetName?: string;
    researchTask: string;
    targets: string[];
    outputFormat: string;
    outputSchema?: Array<{
        fieldId: string;
        name: string;
        type: "text" | "number" | "date" | "url" | "boolean";
        description: string;
        required: boolean;
    }>;
}

export interface OutputSchemaField {
    fieldId: string;
    name: string;
    type: "text" | "number" | "date" | "url" | "boolean";
    description: string;
    required: boolean;
}

export interface ProposalFormState {
    editedTask: string;
    editedTargets: string[];
    editedOutput: string;
    editedSchema: OutputSchemaField[];
    concurrencyLimit: number;
    isEditing: boolean;
}

export interface TargetStatus {
    status: string;
    threadId?: string;
    report?: string;
    taskExecutionId: Id<"taskExecutions">;
}

