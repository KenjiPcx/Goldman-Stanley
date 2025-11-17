import type { Id } from '@/convex/_generated/dataModel';

export type OfficeEmployeeState = 'idle' | 'walking' | 'working' | 'busy';
export type StatusType = 'none' | 'info' | 'success' | 'question' | 'warning';
export type AnimationState = 'idle' | 'typing' | 'thinking' | 'walking' | 'celebrating';

export interface ToolCallInfo {
    toolName: string;
    message: string;
    detail?: string;
    timestamp: number;
}

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
    // Enhanced fields for animations and tool calls
    animationState?: AnimationState;
    currentToolCall?: ToolCallInfo;
    progress?: number;
    // Navigation control
    shouldReturnToDesk?: boolean;
    lastMessageTimestamp?: number;
    // Task queue information
    workerId?: number;
    queuedTaskIds?: Id<'taskExecutions'>[];
    runningTaskIds?: Id<'taskExecutions'>[];
    queueDepth?: number;
}

export interface OfficeDesk {
    id: string;
    position: [number, number, number];
    rotationY: number;
    occupantId?: string; // Employee ID (e.g., "worker-0")
    taskExecutionId?: Id<'taskExecutions'>;
}

