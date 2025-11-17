import { Link, createFileRoute } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { OfficeScene } from '@/components/office/OfficeScene';
import { useState, useMemo } from 'react';
import type { OfficeEmployee, OfficeDesk, StatusType } from '@/lib/office/types';
import { DESK_SPACING } from '@/lib/office/constants';
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
import { Badge } from '@/components/ui/badge';

export const Route = createFileRoute('/office')({
    component: OfficePage,
});

function OfficePage() {
    const taskExecutions = useQuery(api.office.officeQueries.getActiveTaskExecutions);
    const officeStats = useQuery(api.office.officeQueries.getOfficeStats);

    const [selectedTaskId, setSelectedTaskId] = useState<Id<'taskExecutions'> | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Get steps for selected task
    const taskSteps = useQuery(
        api.office.officeQueries.getTaskExecutionSteps,
        selectedTaskId ? { taskExecutionId: selectedTaskId } : 'skip'
    );

    const baseDesks = useMemo<OfficeDesk[]>(() => {
        const layout: OfficeDesk[] = [];
        const desksPerRow = 5;
        const rows = 2;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < desksPerRow; col++) {
                const x = (col - (desksPerRow - 1) / 2) * DESK_SPACING;
                const z = (row - (rows - 1) / 2) * DESK_SPACING + 12;

                layout.push({
                    id: `desk-${row}-${col}`,
                    position: [x, 0, z],
                    rotationY: Math.PI,
                });
            }
        }

        return layout;
    }, []);

    const desks = useMemo<OfficeDesk[]>(() => {
        const clones = baseDesks.map((desk) => ({ ...desk }));

        if (!taskExecutions) return clones;

        taskExecutions.forEach((task, index) => {
            const deskIndex = index % clones.length;
            clones[deskIndex] = {
                ...clones[deskIndex],
                occupantId: task._id,
                taskExecutionId: task._id,
            };
        });

        return clones;
    }, [baseDesks, taskExecutions]);

    // Map task executions to employees
    const employees = useMemo<OfficeEmployee[]>(() => {
        if (!taskExecutions || desks.length === 0) return [];

        return taskExecutions.map((task, index) => {
            const desk = desks[index % desks.length];

            let workState: OfficeEmployee['workState'] = 'idle';
            switch (task.status) {
                case 'running':
                    workState = 'working';
                    break;
                case 'queued':
                case 'awaiting_input':
                    workState = 'busy';
                    break;
                default:
                    workState = 'idle';
            }

            let status: StatusType = 'none';
            if (task.status === 'failed') {
                status = 'warning';
            } else if (task.status === 'completed') {
                status = 'success';
            } else if (task.latestStep) {
                status = 'info';
            }

            const statusMessage = task.latestStep?.message || task.latestStep?.stepName;

            const initialPosition: [number, number, number] = [
                desk.position[0],
                0,
                desk.position[2] - 0.75,
            ];

            return {
                id: task._id,
                name: `Researcher ${index + 1}`,
                initialPosition,
                workState,
                isBusy: workState === 'working',
                status,
                statusMessage,
                taskExecutionId: task._id,
                deskId: desk.id,
            };
        });
    }, [taskExecutions, desks]);

    const handleEmployeeClick = (employee: OfficeEmployee) => {
        if (employee.taskExecutionId) {
            setSelectedTaskId(employee.taskExecutionId);
            setIsDialogOpen(true);
        }
    };

    const handleDeskClick = (desk: OfficeDesk) => {
        if (desk.taskExecutionId) {
            setSelectedTaskId(desk.taskExecutionId);
            setIsDialogOpen(true);
        }
    };

    return (
        <div className="relative w-full h-screen">
            {/* Navigation overlay */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur rounded-full px-4 py-2 shadow-lg">
                <Link to="/">
                    <Button variant="outline">← Back to Home</Button>
                </Link>
                <Link to="/research-chat">
                    <Button>Open Research Chat</Button>
                </Link>
            </div>

            {/* Stats overlay */}
            <div className="absolute top-4 left-4 z-10 bg-white/90 dark:bg-gray-800/90 rounded-lg shadow-lg p-4 space-y-2">
                <h2 className="text-lg font-bold">Goldman Stanley Office</h2>
                {officeStats && (
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between gap-4">
                            <span>Total Tasks:</span>
                            <Badge variant="secondary">{officeStats.totalTasks}</Badge>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span>Active:</span>
                            <Badge variant="default">{officeStats.activeTasks}</Badge>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span>Completed:</span>
                            <Badge className="bg-green-500">{officeStats.completedTasks}</Badge>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span>Failed:</span>
                            <Badge variant="destructive">{officeStats.failedTasks}</Badge>
                        </div>
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="absolute top-4 right-4 z-10 bg-white/90 dark:bg-gray-800/90 rounded-lg shadow-lg p-4 space-y-2">
                <h3 className="text-sm font-bold">Legend</h3>
                <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span>Idle</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                        <span>Walking</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500" />
                        <span>Working</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <span>Busy</span>
                    </div>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    Click on employees or desks to view task logs
                </p>
            </div>

            {/* Office scene */}
            <OfficeScene
                employees={employees}
                desks={desks}
                onEmployeeClick={handleEmployeeClick}
                onDeskClick={handleDeskClick}
            />

            {/* Task execution details dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle>Task Execution Logs</DialogTitle>
                        <DialogDescription>
                            View the detailed execution steps for this research task
                        </DialogDescription>
                    </DialogHeader>

                    <ScrollArea className="h-[60vh] pr-4">
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
                </DialogContent>
            </Dialog>
        </div>
    );
}

