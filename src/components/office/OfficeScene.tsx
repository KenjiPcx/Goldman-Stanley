'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Box, Cylinder, Sphere } from '@react-three/drei';
import { Employee } from './Employee';
import { Desk } from './Desk';
import { useState, useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import {
    FLOOR_SIZE,
    HALF_FLOOR,
    WALL_THICKNESS,
    WALL_HEIGHT,
    PLANT_POSITIONS,
    COUCH_POSITION,
    COUCH_ROTATION_Y,
} from '@/lib/office/constants';
import { initializeGrid } from '@/lib/office/pathfinding/a-star-pathfinding';
import type { OfficeEmployee, OfficeDesk } from '@/lib/office/types';

interface OfficeSceneProps {
    employees: OfficeEmployee[];
    desks: OfficeDesk[];
    onEmployeeClick?: (employee: OfficeEmployee) => void;
    onDeskClick?: (desk: OfficeDesk) => void;
}

const plantPotColor = new THREE.Color("#8B4513");
const plantLeafColor = new THREE.Color("#228B22");
const couchColor = new THREE.Color("#9CA3AF");

function DecorativePlant({ position }: { position: [number, number, number]; }) {
    return (
        <group position={position}>
            <Cylinder args={[0.3, 0.35, 0.5, 16]} position={[0, 0.25, 0]} castShadow>
                <meshStandardMaterial color={plantPotColor} />
            </Cylinder>
            <Sphere args={[0.5, 16, 16]} position={[0, 0.8, 0]} castShadow>
                <meshStandardMaterial color={plantLeafColor} />
            </Sphere>
        </group>
    );
}

function LoungeCouch({ position, rotationY }: { position: [number, number, number]; rotationY: number; }) {
    return (
        <group position={position} rotation={[0, rotationY, 0]}>
            <Box args={[4, 0.5, 1.2]} position={[0, 0.25, 0]} castShadow>
                <meshStandardMaterial color={couchColor} />
            </Box>
            <Box args={[4, 1, 0.3]} position={[0, 0.9, -0.45]} castShadow>
                <meshStandardMaterial color={couchColor} />
            </Box>
        </group>
    );
}

function SceneContents({
    employees,
    desks,
    onEmployeeClick,
    onDeskClick,
}: OfficeSceneProps) {
    const deskRefs = useRef<Map<string, THREE.Group | null>>(new Map());
    const gridInitialized = useRef(false);
    const deskIdsKey = useMemo(() => desks.map((desk) => desk.id).join(','), [desks]);

    useEffect(() => {
        gridInitialized.current = false;
    }, [deskIdsKey]);

    useEffect(() => {
        if (gridInitialized.current) return;

        const interval = setInterval(() => {
            const deskObjects = desks.map((desk) => deskRefs.current.get(desk.id)).filter((ref): ref is THREE.Group => !!ref);
            if (deskObjects.length === desks.length && desks.length > 0) {
                initializeGrid(FLOOR_SIZE, deskObjects, 2, 4);
                gridInitialized.current = true;
                clearInterval(interval);
            }
        }, 200);

        return () => clearInterval(interval);
    }, [desks, deskIdsKey]);

    return (
        <>
            <ambientLight intensity={0.6} />
            <directionalLight
                position={[10, 20, 10]}
                intensity={1.2}
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
                shadow-camera-far={60}
                shadow-camera-left={-HALF_FLOOR}
                shadow-camera-right={HALF_FLOOR}
                shadow-camera-top={HALF_FLOOR}
                shadow-camera-bottom={-HALF_FLOOR}
            />
            <pointLight position={[-10, 15, -10]} intensity={0.5} />
            <pointLight position={[10, 15, 10]} intensity={0.5} />

            <OrbitControls
                enableRotate={true}
                enablePan={true}
                enableZoom={true}
                maxPolarAngle={Math.PI / 2}
                minPolarAngle={0.2}
            />

            <Box
                args={[FLOOR_SIZE, WALL_THICKNESS, FLOOR_SIZE]}
                position={[0, -WALL_THICKNESS / 2, 0]}
                receiveShadow
            >
                <meshStandardMaterial color="#e8e8e8" />
            </Box>

            <Box
                args={[FLOOR_SIZE, WALL_HEIGHT, WALL_THICKNESS]}
                position={[0, WALL_HEIGHT / 2, -HALF_FLOOR]}
                castShadow
                receiveShadow
            >
                <meshStandardMaterial color="#d0d0d0" />
            </Box>
            <Box
                args={[FLOOR_SIZE, WALL_HEIGHT, WALL_THICKNESS]}
                position={[0, WALL_HEIGHT / 2, HALF_FLOOR]}
                castShadow
                receiveShadow
            >
                <meshStandardMaterial color="#d0d0d0" />
            </Box>
            <Box
                args={[WALL_THICKNESS, WALL_HEIGHT, FLOOR_SIZE + WALL_THICKNESS]}
                position={[-HALF_FLOOR, WALL_HEIGHT / 2, 0]}
                castShadow
                receiveShadow
            >
                <meshStandardMaterial color="#d0d0d0" />
            </Box>
            <Box
                args={[WALL_THICKNESS, WALL_HEIGHT, FLOOR_SIZE + WALL_THICKNESS]}
                position={[HALF_FLOOR, WALL_HEIGHT / 2, 0]}
                castShadow
                receiveShadow
            >
                <meshStandardMaterial color="#d0d0d0" />
            </Box>

            {desks.map((desk) => (
                <Desk
                    key={desk.id}
                    desk={desk}
                    ref={(node) => {
                        if (node) {
                            deskRefs.current.set(desk.id, node);
                        } else {
                            deskRefs.current.delete(desk.id);
                        }
                    }}
                    onClick={() => onDeskClick?.(desk)}
                />
            ))}

            {employees.map((employee) => (
                <Employee
                    key={employee.id}
                    employee={employee}
                    onClick={() => onEmployeeClick?.(employee)}
                />
            ))}

            {PLANT_POSITIONS.map((position, index) => (
                <DecorativePlant key={`plant-${index}`} position={position} />
            ))}
            <LoungeCouch position={COUCH_POSITION} rotationY={COUCH_ROTATION_Y} />
        </>
    );
}

export function OfficeScene(props: OfficeSceneProps) {
    const [contextLost, setContextLost] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const glRef = useRef<THREE.WebGLRenderer | null>(null);

    if (contextLost) {
        return (
            <div style={{ width: '100%', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', background: '#b8d4e8' }}>
                <h2 style={{ color: '#333', fontSize: '1.5rem', fontWeight: 'bold' }}>
                    WebGL Context Lost
                </h2>
                <p style={{ color: '#666', fontSize: '1rem' }}>
                    The WebGL context has been lost. Please refresh the page.
                </p>
                <button
                    onClick={() => window.location.reload()}
                    style={{
                        padding: '0.5rem 1rem',
                        background: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.25rem',
                        cursor: 'pointer',
                        fontSize: '1rem',
                    }}
                >
                    Refresh Page
                </button>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ width: '100%', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', background: '#b8d4e8' }}>
                <h2 style={{ color: '#d32f2f', fontSize: '1.5rem', fontWeight: 'bold' }}>
                    WebGL Error
                </h2>
                <p style={{ color: '#666', fontSize: '1rem' }}>
                    {error}
                </p>
                <button
                    onClick={() => {
                        setError(null);
                        setContextLost(false);
                    }}
                    style={{
                        padding: '0.5rem 1rem',
                        background: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.25rem',
                        cursor: 'pointer',
                        fontSize: '1rem',
                    }}
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div style={{ width: '100%', height: '100vh' }}>
            <Canvas
                shadows
                camera={{ position: [0, 30, 40], fov: 50 }}
                style={{ background: '#b8d4e8' }}
                gl={{
                    antialias: true,
                    alpha: false,
                    powerPreference: 'high-performance',
                    preserveDrawingBuffer: false,
                    failIfMajorPerformanceCaveat: false,
                }}
                onCreated={({ gl }) => {
                    glRef.current = gl;

                    const canvas = gl.domElement;
                    const handleContextLost = (event: Event) => {
                        event.preventDefault();
                        console.warn('WebGL context lost');
                        setContextLost(true);
                    };

                    const handleContextRestored = () => {
                        console.log('WebGL context restored');
                        setContextLost(false);
                        setError(null);
                    };

                    canvas.addEventListener('webglcontextlost', handleContextLost);
                    canvas.addEventListener('webglcontextrestored', handleContextRestored);

                    gl.domElement.addEventListener('error', (event: Event) => {
                        console.error('WebGL error:', event);
                        setError('WebGL rendering error occurred');
                    });

                    if (!gl.domElement) {
                        setError('Failed to initialize WebGL renderer');
                    }

                    const context = gl.getContext();
                    if (context) {
                        const debugInfo = context.getExtension('WEBGL_debug_renderer_info');
                        if (debugInfo) {
                            const renderer = context.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                            console.log('WebGL Renderer:', renderer);
                        }
                    }
                }}
            >
                <SceneContents {...props} />
            </Canvas>
        </div>
    );
}

