import { useMemo, useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Group } from "three";
import type { StatusType } from "@/lib/office/types";

interface StatusIndicatorProps {
    status: StatusType;
    message?: string;
    visible: boolean;
}

const StatusIcons = {
    info: ({ color }: { color: string }) => (
        <group>
            <mesh position={[0, 0, 0]}>
                <cylinderGeometry args={[0.025, 0.025, 0.125, 8]} />
                <meshStandardMaterial color={color} roughness={0.2} />
            </mesh>
            <mesh position={[0, 0.1, 0]}>
                <sphereGeometry args={[0.03, 12, 12]} />
                <meshStandardMaterial color={color} roughness={0.2} />
            </mesh>
        </group>
    ),
    success: ({ color }: { color: string }) => (
        <group rotation={[Math.PI, 0, 0]}>
            <mesh position={[-0.05, 0, 0]} rotation={[0, 0, Math.PI / 4]}>
                <boxGeometry args={[0.075, 0.04, 0.04]} />
                <meshStandardMaterial color={color} roughness={0.2} />
            </mesh>
            <mesh position={[0.05, -0.02, 0]} rotation={[0, 0, -Math.PI / 4]}>
                <boxGeometry args={[0.21, 0.04, 0.04]} />
                <meshStandardMaterial color={color} roughness={0.2} />
            </mesh>
        </group>
    ),
    question: ({ color }: { color: string }) => (
        <group>
            <mesh position={[0, 0.075, 0]}>
                <torusGeometry args={[0.05, 0.025, 8, 16, 1.6 * Math.PI]} />
                <meshStandardMaterial color={color} roughness={0.2} />
            </mesh>
            <mesh position={[0.0, 0, 0]}>
                <cylinderGeometry args={[0.025, 0.025, 0.08, 8]} />
                <meshStandardMaterial color={color} roughness={0.2} />
            </mesh>
            <mesh position={[0, -0.08, 0]}>
                <sphereGeometry args={[0.03, 12, 12]} />
                <meshStandardMaterial color={color} roughness={0.2} />
            </mesh>
        </group>
    ),
    warning: ({ color }: { color: string }) => (
        <group>
            <mesh position={[0, 0.05, 0]}>
                <cylinderGeometry args={[0.025, 0.025, 0.15, 8]} />
                <meshStandardMaterial color={color} roughness={0.2} />
            </mesh>
            <mesh position={[0, -0.08, 0]}>
                <sphereGeometry args={[0.03, 12, 12]} />
                <meshStandardMaterial color={color} roughness={0.2} />
            </mesh>
        </group>
    ),
    none: () => <group />,
};

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
            return '#FFFFFF';
    }
};

export default function StatusIndicator({ status = 'none', message, visible }: StatusIndicatorProps) {
    const groupRef = useRef<Group>(null);
    const messageTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [showMessage, setShowMessage] = useState(!!message);
    const [isHovered, setIsHovered] = useState(false);

    const validStatuses: StatusType[] = ['info', 'success', 'question', 'warning', 'none'];
    const safeStatus = validStatuses.includes(status) ? status : 'none';

    const timeOffset = useMemo(() => Math.random() * Math.PI * 2, []);
    const statusColor = useMemo(() => getStatusColor(safeStatus), [safeStatus]);
    const shouldPulse = useMemo(() => safeStatus === 'warning' || safeStatus === 'question', [safeStatus]);

    const startMessageTimer = () => {
        if (messageTimerRef.current) {
            clearTimeout(messageTimerRef.current);
        }

        messageTimerRef.current = setTimeout(() => {
            setShowMessage(false);
        }, 60000);
    };

    useEffect(() => {
        if (message) {
            setShowMessage(true);
            startMessageTimer();
        }

        return () => {
            if (messageTimerRef.current) {
                clearTimeout(messageTimerRef.current);
            }
        };
    }, [message]);

    const handlePointerEnter = () => {
        setIsHovered(true);
        if (message) {
            setShowMessage(true);
            startMessageTimer();
        }
    };

    const handlePointerLeave = () => {
        setIsHovered(false);
    };

    useFrame((state) => {
        if (groupRef.current) {
            const timeElapsed = state.clock.elapsedTime;
            const bobHeight = 0.05;
            const bobSpeed = 1.0;
            groupRef.current.position.y = 0.65 + Math.sin((timeElapsed * bobSpeed) + timeOffset) * bobHeight;

            if (!showMessage) {
                groupRef.current.rotation.y = timeElapsed * 0.5;
            }

            if (shouldPulse && !showMessage) {
                const pulse = 1.0 + Math.sin((timeElapsed * 2) + timeOffset) * 0.1;
                groupRef.current.scale.set(pulse, pulse, pulse);
            } else {
                groupRef.current.scale.set(1, 1, 1);
            }
        }
    });

    if (!visible || safeStatus === 'none') return null;

    const IconComponent = StatusIcons[safeStatus];
    if (!IconComponent) return null;

    return (
        <group
            ref={groupRef}
            position={[0, 0.65, 0]}
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
        >
            {showMessage && message ? (
                <Html
                    position={[0, 0.15, 0]}
                    center
                    distanceFactor={8}
                    zIndexRange={[1, 0]}
                >
                    <div style={{
                        background: statusColor,
                        padding: '8px 12px',
                        borderRadius: '12px',
                        maxWidth: '350px',
                        minWidth: "125px",
                        fontSize: '11px',
                        color: 'white',
                        fontWeight: 'bold',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <div style={{
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(255, 255, 255, 0.2)',
                            borderRadius: '50%',
                            flexShrink: 0
                        }}>
                            {safeStatus === 'info' && 'i'}
                            {safeStatus === 'success' && '✓'}
                            {safeStatus === 'question' && '?'}
                            {safeStatus === 'warning' && '!'}
                        </div>
                        <div style={{
                            whiteSpace: 'normal',
                            wordBreak: 'normal',
                            textAlign: 'center'
                        }}>
                            {message}
                        </div>
                    </div>
                </Html>
            ) : (
                <IconComponent color={statusColor} />
            )}
        </group>
    );
}

