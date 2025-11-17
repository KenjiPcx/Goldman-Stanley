import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Group } from "three";
import type { StatusType } from "@/lib/office/types";

// Inject CSS animations into document head
if (typeof document !== 'undefined') {
    const styleId = 'floating-status-bar-animations';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            @keyframes pulse {
                0%, 100% {
                    opacity: 1;
                }
                50% {
                    opacity: 0.5;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

interface FloatingStatusBarProps {
    status: StatusType;
    progress?: number;
    visible: boolean;
    position?: [number, number, number];
    queueDepth?: number;
}

/**
 * FloatingStatusBar component for displaying employee work status
 * Shows a progress bar and status indicator above employees
 */
export default function FloatingStatusBar({
    status,
    progress,
    visible,
    position = [0, 0.9, 0],
    queueDepth,
}: FloatingStatusBarProps) {
    const groupRef = useRef<Group>(null);
    const timeOffset = useMemo(() => Math.random() * Math.PI * 2, []);

    useFrame((state) => {
        if (groupRef.current && visible) {
            const timeElapsed = state.clock.elapsedTime;
            // Subtle floating animation
            const bobHeight = 0.02;
            const bobSpeed = 0.8;
            groupRef.current.position.y = position[1] + Math.sin((timeElapsed * bobSpeed) + timeOffset) * bobHeight;
        }
    });

    if (!visible || status === 'none') return null;

    const getStatusColor = (status: StatusType): string => {
        switch (status) {
            case 'info':
                return '#3498db';
            case 'success':
                return '#2ecc71';
            case 'question':
                return '#f1c40f';
            case 'warning':
                return '#e74c3c';
            default:
                return '#95a5a6';
        }
    };

    const statusColor = getStatusColor(status);
    const showProgress = progress !== undefined && progress > 0;

    return (
        <group ref={groupRef} position={position}>
            <Html
                center
                distanceFactor={15}
                zIndexRange={[50, 0]}
                style={{
                    pointerEvents: 'none',
                    userSelect: 'none',
                }}
            >
                <div
                    style={{
                        background: 'rgba(0, 0, 0, 0.7)',
                        padding: '6px 12px',
                        borderRadius: '12px',
                        minWidth: '120px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                        border: `1px solid ${statusColor}`,
                    }}
                >
                    {/* Status indicator bar */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '6px',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div
                                style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: statusColor,
                                    boxShadow: `0 0 8px ${statusColor}`,
                                    animation: status === 'info' || status === 'question' ? 'pulse 2s infinite' : 'none',
                                }}
                            />
                            <div
                                style={{
                                    fontSize: '10px',
                                    color: '#ffffff',
                                    fontWeight: '600',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                }}
                            >
                                {status}
                            </div>
                        </div>
                        {/* Queue depth badge */}
                        {queueDepth !== undefined && queueDepth > 0 && (
                            <div
                                style={{
                                    fontSize: '9px',
                                    color: '#ffffff',
                                    background: 'rgba(255, 255, 255, 0.2)',
                                    padding: '2px 6px',
                                    borderRadius: '8px',
                                    fontWeight: '600',
                                }}
                            >
                                +{queueDepth}
                            </div>
                        )}
                    </div>

                    {/* Progress bar */}
                    {showProgress && (
                        <div
                            style={{
                                width: '100%',
                                height: '4px',
                                background: 'rgba(255, 255, 255, 0.2)',
                                borderRadius: '2px',
                                overflow: 'hidden',
                            }}
                        >
                            <div
                                style={{
                                    width: `${Math.min(100, Math.max(0, progress * 100))}%`,
                                    height: '100%',
                                    background: statusColor,
                                    borderRadius: '2px',
                                    transition: 'width 0.3s ease',
                                }}
                            />
                        </div>
                    )}
                </div>
            </Html>
        </group>
    );
}

