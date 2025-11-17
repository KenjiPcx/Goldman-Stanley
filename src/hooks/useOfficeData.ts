import { useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { OfficeEmployee, OfficeDesk, StatusType, ToolCallInfo } from '@/lib/office/types';
import { DESK_SPACING, HALF_FLOOR } from '@/lib/office/constants';

/**
 * Custom hook to fetch and transform office data from Convex
 * Handles data fetching, memoization, and transformation logic
 */
// Hardcoded static base desks - computed once at module level
const BASE_DESKS: OfficeDesk[] = (() => {
    const layout: OfficeDesk[] = [];
    const desksPerRow = 5;
    const rows = 2;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < desksPerRow; col++) {
            const x = (col - (desksPerRow - 1) / 2) * DESK_SPACING;
            const z = (row - (rows - 1) / 2) * DESK_SPACING;

            layout.push({
                id: `desk-${row}-${col}`,
                position: [x, 0, z],
                rotationY: Math.PI,
            });
        }
    }

    return layout;
})();

// Hardcoded static CEO employee - created once at module level
const LEADER_EMPLOYEE: OfficeEmployee = {
    id: 'leader-agent',
    name: 'Chief of Knowledge Work',
    initialPosition: [0, 0, HALF_FLOOR - 1.5],
    workState: 'working',
    isBusy: false,
    status: 'info',
    statusMessage: 'Click to open Research HQ',
    isCEO: true,
};

/**
 * Messages that trigger employees to return to their desks
 * These indicate completion or need for desk-based work
 */
const DESK_RETURN_TRIGGERS = [
    'completed',
    'saving',
    'writing',
    'finalizing',
    'done',
    'finished',
    'saved',
];

/**
 * Check if a message should trigger return to desk
 */
function shouldReturnToDesk(message?: string): boolean {
    if (!message) return false;
    const lowerMessage = message.toLowerCase();
    return DESK_RETURN_TRIGGERS.some(trigger => lowerMessage.includes(trigger));
}

/**
 * Extract tool call info from task execution step
 */
function extractToolCallInfo(step: { stepName: string; message?: string; detail?: string; createdAt: number }): ToolCallInfo | undefined {
    if (!step.message) return undefined;

    // Extract tool name from stepName or message
    const toolNameMatch = step.stepName.match(/(\w+)/);
    const toolName = toolNameMatch ? toolNameMatch[1] : 'unknown';

    return {
        toolName,
        message: step.message,
        detail: step.detail,
        timestamp: step.createdAt,
    };
}

export function useOfficeData() {
    // Fetch data from Convex
    const taskExecutions = useQuery(api.office.officeQueries.getActiveTaskExecutions);
    const officeStats = useQuery(api.office.officeQueries.getOfficeStats);
    const officeQna = useQuery(api.docs.systemDocs.getOfficeQna);
    const workerMapping = useQuery(api.office.officeQueries.getWorkerDeskMapping);
    const workQueueItems = useQuery(api.office.officeQueries.getUserWorkQueueWithWorkers);

    // Note: taskExecutionsKey removed as it's no longer used

    // Map desks to workers - assign all purchased workers to desks
    // This creates stable desk assignments based on workerId
    const desks = useMemo<OfficeDesk[]>(() => {
        // Clone base desks to avoid mutation
        const clones = BASE_DESKS.map((desk) => ({ ...desk }));

        if (!workerMapping) return clones;

        // Assign ALL purchased workers to desks (not just workers with current tasks)
        // Each worker gets a deterministic desk based on workerId % total desks
        for (let workerId = 0; workerId < workerMapping.maxWorkers; workerId++) {
            const deskIndex = workerId % BASE_DESKS.length;
            const employeeId = `worker-${workerId}`;

            // Find the worker's current task if any
            const worker = workerMapping.workers.find(w => w.workerId === workerId);

            clones[deskIndex] = {
                ...clones[deskIndex],
                occupantId: employeeId,
                taskExecutionId: worker?.currentTask,
            };
        }

        return clones;
    }, [workerMapping]);

    const employees = useMemo<OfficeEmployee[]>(() => {
        const mapped: OfficeEmployee[] = [];

        if (!workerMapping || !workQueueItems || desks.length === 0) {
            return [LEADER_EMPLOYEE];
        }

        // Create employees for each purchased worker (up to maxWorkers)
        // Workers are mapped deterministically to desks via workerId % 10
        // Show ALL purchased workers, even when idle
        for (let workerId = 0; workerId < workerMapping.maxWorkers; workerId++) {
            const deskIndex = workerId % desks.length;
            const desk = desks[deskIndex];

            // Find this worker's tasks from work queue
            const workerTasks = workQueueItems.filter(item => item.workerId === workerId);
            const runningTask = workerTasks.find(t => t.status === 'running');
            const queuedTasks = workerTasks.filter(t => t.status === 'queued');

            // Always create employee for purchased workers, even if idle

            const currentTask = runningTask || queuedTasks[0];
            const taskExecution = currentTask?.taskExecution;

            // Determine work state
            let workState: OfficeEmployee['workState'] = 'idle';
            if (runningTask) {
                workState = 'working';
            } else if (queuedTasks.length > 0) {
                workState = 'busy'; // Has queued tasks
            }

            // Determine status indicator
            let status: StatusType = 'none';
            let statusMessage: string | undefined = 'Idle - Ready for tasks';

            if (taskExecution) {
                if (taskExecution.status === 'failed') {
                    status = 'warning';
                } else if (taskExecution.status === 'completed') {
                    status = 'success';
                } else if (taskExecution.latestStep) {
                    status = 'info';
                }

                // Status message shows current task + queue depth
                statusMessage = taskExecution.latestStep?.message || taskExecution.latestStep?.stepName;
                if (queuedTasks.length > 0 && runningTask) {
                    statusMessage = `${statusMessage} (+${queuedTasks.length} queued)`;
                } else if (queuedTasks.length > 1) {
                    statusMessage = `${statusMessage} (+${queuedTasks.length - 1} more)`;
                }
            }

            // Extract tool call info
            const currentToolCall = taskExecution?.latestStep
                ? extractToolCallInfo({
                    stepName: taskExecution.latestStep.stepName,
                    message: taskExecution.latestStep.message,
                    detail: undefined,
                    createdAt: taskExecution.latestStep.createdAt,
                })
                : undefined;

            const shouldReturnToDeskFlag = taskExecution?.latestStep?.message
                ? shouldReturnToDesk(taskExecution.latestStep.message)
                : false;

            const initialPosition: [number, number, number] = [
                desk.position[0],
                0,
                desk.position[2] - 0.75,
            ];

            mapped.push({
                id: `worker-${workerId}`, // Stable ID based on workerId
                name: `Researcher ${workerId + 1}`,
                initialPosition,
                workState,
                isBusy: workState === 'working',
                status,
                statusMessage,
                taskExecutionId: currentTask?.taskExecutionId,
                deskId: desk.id,
                // Enhanced fields
                currentToolCall,
                progress: taskExecution?.latestStep?.progress,
                shouldReturnToDesk: shouldReturnToDeskFlag,
                lastMessageTimestamp: taskExecution?.latestStep?.createdAt,
                // Task queue information
                workerId: workerId,
                queuedTaskIds: queuedTasks.map(t => t.taskExecutionId),
                runningTaskIds: runningTask ? [runningTask.taskExecutionId] : [],
                queueDepth: queuedTasks.length,
            });
        }

        return [...mapped, LEADER_EMPLOYEE];
    }, [workerMapping, workQueueItems, desks]);

    return {
        employees,
        desks,
        taskExecutions,
        officeStats,
        officeQna,
        isLoading: taskExecutions === undefined,
    };
}

