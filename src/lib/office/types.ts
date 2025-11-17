import type { Id } from '@/convex/_generated/dataModel';

export type OfficeEmployeeState = 'idle' | 'walking' | 'working' | 'busy';
export type StatusType = 'none' | 'info' | 'success' | 'question' | 'warning';

export interface OfficeEmployee {
    id: string;
    name: string;
    initialPosition: [number, number, number];
    workState: OfficeEmployeeState;
    isBusy: boolean;
    status?: StatusType;
    statusMessage?: string;
    taskExecutionId?: Id<'taskExecutions'>;
    deskId?: string;
    isCEO?: boolean;
}

export interface OfficeDesk {
    id: string;
    position: [number, number, number];
    rotationY: number;
    occupantId?: Id<'taskExecutions'>;
    taskExecutionId?: Id<'taskExecutions'>;
}

