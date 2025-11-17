import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Box, Edges, Text } from "@react-three/drei";
import type { Group } from "three";
import * as THREE from 'three';

import {
    HAIR_COLORS,
    HAIR_WIDTH,
    HAIR_HEIGHT,
    HEAD_HEIGHT,
    HEAD_WIDTH,
    PANTS_COLORS,
    SHIRT_COLORS,
    SKIN_COLORS,
    TOTAL_HEIGHT,
    BODY_HEIGHT,
    LEG_HEIGHT,
    BODY_WIDTH,
    IDLE_DESTINATIONS,
} from "@/lib/office/constants";
import type { OfficeEmployee, AnimationState } from "@/lib/office/types";
import { findPathAStar, isGridReady } from "@/lib/office/pathfinding/a-star-pathfinding";
import { findAvailableDestination, releaseEmployeeReservations } from "@/lib/office/pathfinding/destination-registry";
import PathVisualizer from "./navigation/path-visualizer";
import StatusIndicator from "./navigation/status-indicator";
import ChatBubble from "./navigation/chat-bubble";
import FloatingStatusBar from "./navigation/floating-status-bar";

interface EmployeeProps {
    employee: OfficeEmployee;
    onClick: () => void;
    debugMode?: boolean;
}

function getRandomItem<T>(items: T[]): T {
    return items[Math.floor(Math.random() * items.length)];
}

export const Employee = memo(function Employee({
    employee,
    onClick,
    debugMode = false,
}: EmployeeProps) {
    const groupRef = useRef<Group>(null);
    const isMountedRef = useRef(false);
    const initialPositionRef = useRef<THREE.Vector3>(
        new THREE.Vector3(employee.initialPosition[0], TOTAL_HEIGHT / 2, employee.initialPosition[2])
    );
    const [isHovered, setIsHovered] = useState(false);
    const ceoLabelRef = useRef<THREE.Group>(null);

    const [path, setPath] = useState<THREE.Vector3[] | null>(null);
    const [pathIndex, setPathIndex] = useState<number>(0);
    const [currentDestination, setCurrentDestination] = useState<THREE.Vector3 | null>(null);
    const [originalPath, setOriginalPath] = useState<THREE.Vector3[] | null>(null);
    const [idleState, setIdleState] = useState<'wandering' | 'waiting'>('wandering');
    const [idleTimer, setIdleTimer] = useState<number>(0);
    const [isGoingToDesk, setIsGoingToDesk] = useState(false);
    const [animationState, setAnimationState] = useState<AnimationState>('idle');
    const [showChatBubble, setShowChatBubble] = useState(false);

    // Track mount status
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const movementSpeed = 1.5;
    const arrivalThreshold = 0.1;

    // Animation refs for typing/thinking animations
    const headRef = useRef<THREE.Mesh>(null);
    const bodyRef = useRef<THREE.Mesh>(null);

    const colors = useMemo(() => {
        if (employee.isCEO) {
            return {
                hair: "#FFD700",
                skin: "#FFE4C4",
                shirt: "#1E3A8A",
                pants: "#111827",
            };
        }

        return {
            hair: getRandomItem(HAIR_COLORS),
            skin: getRandomItem(SKIN_COLORS),
            shirt: getRandomItem(SHIRT_COLORS),
            pants: getRandomItem(PANTS_COLORS),
        };
    }, [employee.isCEO]);

    useEffect(() => {
        return () => {
            releaseEmployeeReservations(employee.id);
        };
    }, [employee.id]);

    useEffect(() => {
        initialPositionRef.current = new THREE.Vector3(
            employee.initialPosition[0],
            TOTAL_HEIGHT / 2,
            employee.initialPosition[2],
        );
        if (groupRef.current) {
            groupRef.current.position.copy(initialPositionRef.current);
        }
    }, [employee.initialPosition]);

    // Update animation state based on employee work state and tool calls
    useEffect(() => {
        if (employee.isBusy && employee.workState === 'working') {
            if (employee.currentToolCall) {
                setAnimationState('typing');
                setShowChatBubble(true);
            } else {
                setAnimationState('thinking');
                setShowChatBubble(false);
            }
        } else if (employee.workState === 'walking' || isGoingToDesk) {
            setAnimationState('walking');
            setShowChatBubble(false);
        } else {
            setAnimationState('idle');
            setShowChatBubble(false);
        }
    }, [employee.isBusy, employee.workState, employee.currentToolCall, isGoingToDesk]);

    // Handle navigation triggers - return to desk on certain messages
    useEffect(() => {
        if (employee.shouldReturnToDesk && !isGoingToDesk && !employee.isCEO) {
            setIsGoingToDesk(true);
        }
    }, [employee.shouldReturnToDesk, isGoingToDesk, employee.isCEO]);

    const chooseNewIdleDestination = useCallback(() => {
        const currentPos = groupRef.current?.position;
        if (!currentPos) return null;

        let newDest: THREE.Vector3;
        do {
            newDest = getRandomItem(IDLE_DESTINATIONS).clone();
            newDest.y = TOTAL_HEIGHT / 2;
        } while (newDest.distanceTo(currentPos) < 1 && IDLE_DESTINATIONS.length > 1);

        return findAvailableDestination(newDest, employee.id);
    }, [employee.id]);

    const getRandomWaitTime = useCallback(() => {
        return Math.random() * 4 + 4;
    }, []);

    const findAndSetPath = useCallback((
        startPos: THREE.Vector3,
        endPos: THREE.Vector3
    ) => {
        const finalDestination = isGoingToDesk ? endPos : findAvailableDestination(endPos, employee.id);

        const newPath = findPathAStar(startPos, finalDestination);

        if (newPath) {
            setOriginalPath(newPath.map(p => p.clone()));
            setPath(newPath);
            setPathIndex(0);
        }

        return newPath;
    }, [employee.id, isGoingToDesk]);

    useFrame((state, delta) => {
        if (!groupRef.current) return;

        const currentPos = groupRef.current.position;
        const desiredY = TOTAL_HEIGHT / 2;
        currentPos.y = desiredY;

        if (employee.isCEO) {
            const ceoHome = initialPositionRef.current;
            currentPos.lerp(ceoHome, 0.15);
            if (ceoLabelRef.current) {
                ceoLabelRef.current.quaternion.copy(state.camera.quaternion);
            }
            return;
        }

        // Don't attempt pathfinding until grid is initialized
        if (!isGridReady()) {
            return;
        }

        let targetPathNode: THREE.Vector3 | null = null;
        let isMoving = false;

        if (employee.isBusy) {
            setIdleState('wandering');
            setIdleTimer(0);

            const deskPosition = initialPositionRef.current;
            if (currentPos.distanceTo(deskPosition) > arrivalThreshold) {
                if (!path || currentDestination !== deskPosition) {
                    setIsGoingToDesk(true);
                    const newPath = findAndSetPath(currentPos.clone(), deskPosition.clone());
                    setCurrentDestination(deskPosition);
                    if (!newPath) console.warn(`Employee ${employee.id} could not find path to desk.`);
                }

                if (path && pathIndex < path.length) {
                    targetPathNode = path[pathIndex];
                    isMoving = true;
                }
            } else {
                if (path) {
                    setPath(null);
                    setOriginalPath(null);
                    setIsGoingToDesk(false);
                    releaseEmployeeReservations(employee.id);
                }
                setCurrentDestination(null);
                if (currentPos.distanceTo(deskPosition) > 0.01) currentPos.lerp(deskPosition, 0.1);
            }
        } else {
            if (idleState === 'wandering') {
                if (!path) {
                    const newDest = chooseNewIdleDestination();
                    if (newDest) {
                        setIsGoingToDesk(false);
                        const newPath = findAndSetPath(currentPos.clone(), newDest.clone());
                        setCurrentDestination(newDest);
                        if (!newPath) console.warn(`Employee ${employee.id} could not find path to new destination.`);
                    }
                } else {
                    if (pathIndex < path.length) {
                        targetPathNode = path[pathIndex];
                        isMoving = true;
                    } else {
                        setPath(null);
                        setOriginalPath(null);
                        setCurrentDestination(null);
                        setIdleState('waiting');
                        setIdleTimer(getRandomWaitTime());
                    }
                }
            } else if (idleState === 'waiting') {
                setIdleTimer((t) => Math.max(0, t - delta));
                if (idleTimer <= 0) {
                    releaseEmployeeReservations(employee.id);
                    setIdleState('wandering');
                }
            }
        }

        if (isMoving && targetPathNode) {
            targetPathNode = targetPathNode.clone();
            targetPathNode.y = desiredY;

            const direction = new THREE.Vector3().subVectors(targetPathNode, currentPos);
            const distance = direction.length();

            if (distance < arrivalThreshold) {
                setPathIndex((prev) => prev + 1);
            } else {
                direction.normalize();
                const moveDistance = movementSpeed * delta;
                groupRef.current.position.add(direction.multiplyScalar(Math.min(moveDistance, distance)));

                // Rotate employee to face movement direction
                if (direction.length() > 0.01) {
                    const angle = Math.atan2(direction.x, direction.z);
                    groupRef.current.rotation.y = angle;
                }
            }
        }

        // Animation: Typing/thinking animations
        if (headRef.current && bodyRef.current) {
            const timeElapsed = state.clock.elapsedTime;
            const baseYPos = -TOTAL_HEIGHT / 2;

            if (animationState === 'typing') {
                // Typing animation: head bobs slightly, body leans forward
                const typingSpeed = 8;
                const headBob = Math.sin(timeElapsed * typingSpeed) * 0.02;
                headRef.current.position.y = baseYPos + LEG_HEIGHT + BODY_HEIGHT + HEAD_HEIGHT / 2 + headBob;
                bodyRef.current.rotation.x = Math.sin(timeElapsed * typingSpeed * 0.5) * 0.05;
            } else if (animationState === 'thinking') {
                // Thinking animation: head tilts side to side
                const thinkingSpeed = 2;
                headRef.current.rotation.z = Math.sin(timeElapsed * thinkingSpeed) * 0.1;
                bodyRef.current.rotation.x = 0.02; // Slight lean back
            } else {
                // Reset to default
                headRef.current.position.y = baseYPos + LEG_HEIGHT + BODY_HEIGHT + HEAD_HEIGHT / 2;
                headRef.current.rotation.z = 0;
                bodyRef.current.rotation.x = 0;
            }
        }
    });

    const handleClick = useCallback((event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        onClick();
    }, [onClick]);

    const handlePointerOver = useCallback((event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation();
        setIsHovered(true);
        document.body.style.cursor = 'pointer';
    }, []);

    const handlePointerOut = useCallback((event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation();
        setIsHovered(false);
        document.body.style.cursor = 'default';
    }, []);

    const pathVisualizerData = useMemo(() => {
        if (!debugMode || !groupRef.current) return { originalPath: null, remainingPath: null };

        const currentPos = groupRef.current.position.clone();
        const origPath = originalPath ? [currentPos, ...originalPath.slice(1)] : null;
        const remainPath = path && path.length > pathIndex ?
            [currentPos, ...path.slice(pathIndex)] : null;

        return {
            originalPath: origPath,
            remainingPath: remainPath,
        };
    }, [debugMode, originalPath, path, pathIndex]);

    const currentStatus = useMemo(() => {
        if (employee.status && employee.status !== 'none') {
            return employee.status;
        }

        if (employee.isBusy) {
            return 'info';
        }
        return 'none';
    }, [employee.status, employee.isBusy]);

    const baseY = -TOTAL_HEIGHT / 2;

    return (
        <>
            <group
                ref={groupRef}
                onClick={handleClick}
                onPointerOver={handlePointerOver}
                onPointerOut={handlePointerOut}
                name={`employee-${employee.id}`}
                castShadow
                position={[employee.initialPosition[0], TOTAL_HEIGHT / 2, employee.initialPosition[2]]}
            >
                <Box args={[BODY_WIDTH, LEG_HEIGHT, BODY_WIDTH * 0.6]} position={[0, baseY + LEG_HEIGHT / 2, 0]} castShadow>
                    <meshStandardMaterial color={colors.pants} />
                </Box>
                <Box
                    ref={bodyRef}
                    args={[BODY_WIDTH, BODY_HEIGHT, BODY_WIDTH * 0.6]}
                    position={[0, baseY + LEG_HEIGHT + BODY_HEIGHT / 2, 0]}
                    castShadow
                >
                    <meshStandardMaterial color={colors.shirt} />
                </Box>
                <Box
                    ref={headRef}
                    args={[HEAD_WIDTH, HEAD_HEIGHT, HEAD_WIDTH]}
                    position={[0, baseY + LEG_HEIGHT + BODY_HEIGHT + HEAD_HEIGHT / 2, 0]}
                    castShadow
                >
                    <meshStandardMaterial color={colors.skin} />
                </Box>
                <Box args={[HAIR_WIDTH, HAIR_HEIGHT, HAIR_WIDTH]} position={[0, baseY + LEG_HEIGHT + BODY_HEIGHT + HEAD_HEIGHT + HAIR_HEIGHT / 2, 0]} castShadow>
                    <meshStandardMaterial color={colors.hair} />
                </Box>

                {/* Status Indicator - hide message when tool call is active (ChatBubble shows it) */}
                <StatusIndicator
                    status={currentStatus}
                    message={employee.currentToolCall ? undefined : employee.statusMessage}
                    visible={currentStatus !== 'none'}
                />

                {/* Floating Status Bar - positioned lower, only show when no tool call */}
                <FloatingStatusBar
                    status={currentStatus}
                    progress={employee.progress}
                    visible={employee.isBusy && currentStatus !== 'none' && !employee.currentToolCall}
                    position={[0, 0.7, 0]}
                    queueDepth={employee.queueDepth}
                />

                {/* Chat Bubble for Tool Calls - positioned higher, shows tool call messages */}
                {employee.currentToolCall && (
                    <ChatBubble
                        message={employee.currentToolCall.message}
                        toolName={employee.currentToolCall.toolName}
                        visible={showChatBubble && employee.isBusy}
                        position={[0, 1.3, 0]}
                    />
                )}

                {employee.isCEO && (
                    <group ref={ceoLabelRef}>
                        <Text
                            position={[0, baseY + LEG_HEIGHT + BODY_HEIGHT + HEAD_HEIGHT + 0.6, 0]}
                            fontSize={0.35}
                            color="#FDE047"
                            anchorX="center"
                            anchorY="middle"
                        >
                            CEO
                        </Text>
                    </group>
                )}

                {isHovered && <Edges scale={1.05} color="white" />}
            </group>

            {debugMode && (
                <PathVisualizer
                    originalPath={pathVisualizerData.originalPath}
                    remainingPath={pathVisualizerData.remainingPath}
                    isGoingToDesk={isGoingToDesk}
                    employeeId={employee.id}
                />
            )}
        </>
    );
});

