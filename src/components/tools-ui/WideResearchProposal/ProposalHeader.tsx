/**
 * ProposalHeader - Header component for the proposal view
 * 
 * Displays the collapsible header for the research proposal card.
 * Shows the title, chevron icon (rotates based on open state), and an Edit button
 * when not in editing mode.
 * 
 * Props:
 * - isOpen: Whether the collapsible is currently open
 * - isEditing: Whether the proposal is in edit mode
 * - onEdit: Callback to enter edit mode
 */

import { CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Target, Edit2, ChevronDown } from "lucide-react";

interface ProposalHeaderProps {
    isOpen: boolean;
    isEditing: boolean;
    onEdit: () => void;
}

export function ProposalHeader({ isOpen, isEditing, onEdit }: ProposalHeaderProps) {
    return (
        <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
                <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity flex-1">
                    <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="font-semibold">Wide Research Proposal</h3>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </CollapsibleTrigger>
            {!isEditing && (
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={onEdit}
                >
                    <Edit2 className="h-3.5 w-3.5 mr-1" />
                    Edit
                </Button>
            )}
        </div>
    );
}

