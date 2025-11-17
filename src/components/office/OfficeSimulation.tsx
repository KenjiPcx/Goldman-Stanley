import { useState, useCallback, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import OfficeScene from './OfficeScene';
import ResearchChatPage from '@/app/research-chat/page';
import type { OfficeEmployee, OfficeDesk } from '@/lib/office/types';
import { Id } from '@/convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ExternalLink, FileText } from 'lucide-react';
import TaskExecutionView from './TaskExecutionView';

interface OfficeSimulationProps {
    employees: OfficeEmployee[];
    desks: OfficeDesk[];
}

/**
 * Main Office Simulation Component
 * Handles the 3D scene, employee/desk interactions, and modal dialogs
 */
export default function OfficeSimulation({ employees, desks }: OfficeSimulationProps) {
    const [selectedEmployee, setSelectedEmployee] = useState<OfficeEmployee | null>(null);
    const [selectedTaskId, setSelectedTaskId] = useState<Id<'taskExecutions'> | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isLeaderModalOpen, setLeaderModalOpen] = useState(false);
    const [isFullLogOpen, setIsFullLogOpen] = useState(false);

    // Get all work queue items to show queue for selected employee
    const workQueueItems = useQuery(api.office.officeQueries.getUserWorkQueueWithWorkers);

    // Get steps for selected task (conditional query)
    const taskSteps = useQuery(
        api.office.officeQueries.getTaskExecutionSteps,
        selectedTaskId ? { taskExecutionId: selectedTaskId } : 'skip'
    );

    // Get all tasks for the selected employee's worker
    const workerTasks = useMemo(() => {
        if (!selectedEmployee?.workerId || !workQueueItems) return [];
        return workQueueItems.filter(item => item.workerId === selectedEmployee.workerId);
    }, [selectedEmployee?.workerId, workQueueItems]);

    const handleEmployeeClick = useCallback((employee: OfficeEmployee) => {
        if (employee.isCEO) {
            setLeaderModalOpen(true);
            return;
        }

        // Set selected employee to show their full queue
        setSelectedEmployee(employee);
        // Set the current task as selected for detailed view
        if (employee.taskExecutionId) {
            setSelectedTaskId(employee.taskExecutionId);
        }
        setIsDialogOpen(true);
    }, []);

    const handleDeskClick = useCallback((desk: OfficeDesk) => {
        if (desk.taskExecutionId) {
            setSelectedTaskId(desk.taskExecutionId);
            setIsDialogOpen(true);
        }
    }, []);

    return (
        <>
            {/* 3D Office Scene */}
            <OfficeScene
                employees={employees}
                desks={desks}
                onEmployeeClick={handleEmployeeClick}
                onDeskClick={handleDeskClick}
            />

            {/* Leader modal - Research HQ */}
            <Dialog open={isLeaderModalOpen} onOpenChange={setLeaderModalOpen}>
                <DialogContent className="min-w-[85vw] max-w-[85vw] h-[85vh] p-0 overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between px-6 py-4 border-b">
                        <DialogHeader>
                            <DialogTitle>Knowledge Work Command Center</DialogTitle>
                            <DialogDescription>
                                Collaborate with the chief researcher without leaving the office.
                            </DialogDescription>
                        </DialogHeader>
                        <Button variant="ghost" onClick={() => setLeaderModalOpen(false)}>
                            Close
                        </Button>
                    </div>
                    <div className="flex-1 overflow-hidden min-h-0">
                        <ResearchChatPage />
                    </div>
                </DialogContent>
            </Dialog>

            {/* Task execution details dialog - shows worker queue and current task details */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[80vh]">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <DialogTitle>
                                    {selectedEmployee?.name || 'Worker'} Task Queue
                                    {selectedEmployee?.queueDepth && selectedEmployee.queueDepth > 0 && (
                                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                                            ({selectedEmployee.queueDepth} queued)
                                        </span>
                                    )}
                                </DialogTitle>
                                <DialogDescription>
                                    {selectedEmployee?.workerId !== undefined
                                        ? `Worker ${selectedEmployee.workerId + 1} - View all tasks assigned to this worker`
                                        : "View tasks assigned to this worker"}
                                </DialogDescription>
                            </div>
                            {selectedTaskId && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setIsDialogOpen(false);
                                        setIsFullLogOpen(true);
                                    }}
                                    className="flex items-center gap-2"
                                >
                                    <FileText className="h-4 w-4" />
                                    View Full Log
                                </Button>
                            )}
                        </div>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Task Queue List */}
                        {workerTasks.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="text-sm font-semibold">Task Queue</h3>
                                <ScrollArea className="h-[200px] pr-4 border rounded-lg p-3">
                                    {workerTasks.map((queueItem, index) => {
                                        const isRunning = queueItem.status === 'running';
                                        const isSelected = queueItem.taskExecutionId === selectedTaskId;
                                        return (
                                            <div
                                                key={queueItem.queueItemId}
                                                className={`p-3 mb-2 rounded-lg border cursor-pointer transition-colors ${isSelected
                                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                                                    : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900'
                                                    }`}
                                                onClick={() => {
                                                    setSelectedTaskId(queueItem.taskExecutionId);
                                                }}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500' : 'bg-yellow-500'
                                                            }`} />
                                                        <span className="text-sm font-medium">
                                                            {isRunning ? 'Running' : 'Queued'} Task #{index + 1}
                                                        </span>
                                                    </div>
                                                    {queueItem.taskExecution?.inputPrompt && (
                                                        <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                                                            {queueItem.taskExecution.inputPrompt.substring(0, 50)}...
                                                        </span>
                                                    )}
                                                </div>
                                                {queueItem.taskExecution?.latestStep && (
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        {queueItem.taskExecution.latestStep.stepName}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </ScrollArea>
                            </div>
                        )}

                        {/* Current Task Execution Steps */}
                        {selectedTaskId && (
                            <div className="space-y-2">
                                <h3 className="text-sm font-semibold">Current Task Execution Steps</h3>
                                <ScrollArea className="h-[300px] pr-4 border rounded-lg p-3">
                                    {taskSteps && taskSteps.length > 0 ? (
                                        <div className="space-y-4">
                                            {taskSteps.map((step) => (
                                                <div
                                                    key={step._id}
                                                    className="border-l-2 border-blue-500 pl-4 py-2"
                                                >
                                                    <div className="font-semibold text-sm">{step.stepName}</div>
                                                    {step.message && (
                                                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                            {step.message}
                                                        </div>
                                                    )}
                                                    {step.detail && (
                                                        <div className="text-xs text-gray-500 dark:text-gray-500 mt-1 font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">
                                                            {step.detail}
                                                        </div>
                                                    )}
                                                    {step.progress !== undefined && (
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            Progress: {Math.round(step.progress * 100)}%
                                                        </div>
                                                    )}
                                                    <div className="text-xs text-gray-400 mt-1">
                                                        {new Date(step.createdAt).toLocaleString()}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center text-gray-500 py-8">
                                            No execution steps available
                                        </div>
                                    )}
                                </ScrollArea>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Full Task Execution Log Modal */}
            {selectedTaskId && (
                <Dialog open={isFullLogOpen} onOpenChange={setIsFullLogOpen}>
                    <DialogContent className="min-w-[90vw] max-w-[90vw] h-[90vh] p-0 overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b">
                            <DialogHeader>
                                <DialogTitle>Full Task Execution Log</DialogTitle>
                                <DialogDescription>
                                    Complete execution details, chat logs, and research report
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        window.open(`/task-execution/${selectedTaskId}`, '_blank');
                                    }}
                                    className="flex items-center gap-2"
                                >
                                    <ExternalLink className="h-4 w-4" />
                                    Open in New Tab
                                </Button>
                                <Button variant="ghost" onClick={() => setIsFullLogOpen(false)}>
                                    Close
                                </Button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden min-h-0">
                            <TaskExecutionView
                                taskExecutionId={selectedTaskId}
                                fullPage={false}
                            />
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}

