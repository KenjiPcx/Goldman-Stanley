import { Canvas } from '@react-three/fiber';
import { OrbitControls, Box, Cylinder, Sphere } from '@react-three/drei';
import { Employee } from './Employee';
import { Desk } from './Desk';
import { useRef, useEffect, useMemo, memo, useState } from 'react';
import * as THREE from 'three';
import {
    FLOOR_SIZE,
    HALF_FLOOR,
    WALL_THICKNESS,
    WALL_HEIGHT,
    PLANT_POSITIONS,
    COUCH_POSITION,
    COUCH_ROTATION_Y,
    CEO_DESK_POS,
} from '@/lib/office/constants';
import { initializeGrid } from '@/lib/office/pathfinding/a-star-pathfinding';
import type { OfficeEmployee, OfficeDesk } from '@/lib/office/types';

// Helper to convert CSS color variable to THREE.Color
function getCSSColor(variable: string): THREE.Color {
    if (typeof window === 'undefined') return new THREE.Color('#cccccc');

    const root = document.documentElement;
    const value = getComputedStyle(root).getPropertyValue(variable).trim();

    // Parse oklch format: oklch(L C H)
    if (value.startsWith('oklch')) {
        const match = value.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/);
        if (match) {
            const [, l, c, h] = match;
            // Convert OKLCH to RGB (approximate conversion)
            const lightness = parseFloat(l);
            const chroma = parseFloat(c);
            const hue = parseFloat(h);

            // Simple approximation: convert to HSL-like values
            const s = chroma * 100;
            const hslH = hue;
            const hslL = lightness * 100;

            return new THREE.Color().setHSL(hslH / 360, s / 100, hslL / 100);
        }
    }

    // Fallback to direct color value if not oklch
    return new THREE.Color(value || '#cccccc');
}

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
    const ceoDeskRef = useRef<THREE.Group | null>(null);
    const gridInitialized = useRef(false);
    const deskIdsKey = useMemo(() => desks.map((desk) => desk.id).join(','), [desks]);
    const ceoDeskData = useMemo<OfficeDesk>(() => ({
        id: 'ceo-desk',
        position: CEO_DESK_POS,
        rotationY: Math.PI,
    }), []);

    // Get theme colors for walls and floor from CSS variables
    const [floorColor, setFloorColor] = useState<THREE.Color>(new THREE.Color('#ffffff'));
    const [wallColor, setWallColor] = useState<THREE.Color>(new THREE.Color('#d0d0d0'));

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setFloorColor(getCSSColor('--office-floor') || new THREE.Color('#ffffff'));
            setWallColor(getCSSColor('--office-wall') || new THREE.Color('#d0d0d0'));
        }
    }, []);

    // Get lighting colors from CSS variables
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [ambientLightColor, setAmbientLightColor] = useState<THREE.Color>(new THREE.Color('#ffffff'));
    const [directionalLightColor, setDirectionalLightColor] = useState<THREE.Color>(new THREE.Color('#ffffff'));
    const [accentLightColor, setAccentLightColor] = useState<THREE.Color>(new THREE.Color('#ffffff'));

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const root = document.documentElement;
            const isDark = root.classList.contains('dark');
            setIsDarkMode(isDark);

            // Update lighting colors from CSS variables
            setAmbientLightColor(getCSSColor('--office-ambient-light') || new THREE.Color('#ffffff'));
            setDirectionalLightColor(getCSSColor('--office-directional-light') || new THREE.Color('#ffffff'));
            setAccentLightColor(getCSSColor('--office-accent-light') || new THREE.Color('#ffffff'));

            const observer = new MutationObserver(() => {
                const isDark = root.classList.contains('dark');
                setIsDarkMode(isDark);
                setAmbientLightColor(getCSSColor('--office-ambient-light') || new THREE.Color('#ffffff'));
                setDirectionalLightColor(getCSSColor('--office-directional-light') || new THREE.Color('#ffffff'));
                setAccentLightColor(getCSSColor('--office-accent-light') || new THREE.Color('#ffffff'));
            });

            observer.observe(root, { attributes: true, attributeFilter: ['class'] });
            return () => observer.disconnect();
        }
    }, []);

    useEffect(() => {
        gridInitialized.current = false;
    }, [deskIdsKey]);

    useEffect(() => {
        if (gridInitialized.current) return;

        const interval = setInterval(() => {
            const deskObjects = desks.map((desk) => deskRefs.current.get(desk.id)).filter((ref): ref is THREE.Group => !!ref);
            const ceoDeskObj = ceoDeskRef.current;
            if (deskObjects.length === desks.length && desks.length > 0 && ceoDeskObj) {
                initializeGrid(FLOOR_SIZE, [...deskObjects, ceoDeskObj], 2, 4);
                gridInitialized.current = true;
                clearInterval(interval);
            }
        }, 200);

        return () => clearInterval(interval);
    }, [desks, deskIdsKey]);

    return (
        <>
            {/* Ambient lighting from CSS variables */}
            <ambientLight
                intensity={isDarkMode ? 0.6 : 1.0}
                color={ambientLightColor}
            />

            {/* Main directional light from CSS variables */}
            <directionalLight
                position={[10, 20, 10]}
                intensity={isDarkMode ? 1.2 : 2.0}
                color={directionalLightColor}
                castShadow
            />

            {/* Accent point lights from CSS variables */}
            <pointLight
                position={[-10, 15, -10]}
                intensity={isDarkMode ? 0.8 : 0.8}
                color={accentLightColor}
            />
            <pointLight
                position={[10, 15, 10]}
                intensity={isDarkMode ? 0.8 : 0.8}
                color={accentLightColor}
            />

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
                <meshStandardMaterial color={floorColor} />
            </Box>

            <Box
                args={[FLOOR_SIZE, WALL_HEIGHT, WALL_THICKNESS]}
                position={[0, WALL_HEIGHT / 2, -HALF_FLOOR]}
                castShadow
                receiveShadow
            >
                <meshStandardMaterial color={wallColor} />
            </Box>
            <Box
                args={[FLOOR_SIZE, WALL_HEIGHT, WALL_THICKNESS]}
                position={[0, WALL_HEIGHT / 2, HALF_FLOOR]}
                castShadow
                receiveShadow
            >
                <meshStandardMaterial color={wallColor} />
            </Box>
            <Box
                args={[WALL_THICKNESS, WALL_HEIGHT, FLOOR_SIZE + WALL_THICKNESS]}
                position={[-HALF_FLOOR, WALL_HEIGHT / 2, 0]}
                castShadow
                receiveShadow
            >
                <meshStandardMaterial color={wallColor} />
            </Box>
            <Box
                args={[WALL_THICKNESS, WALL_HEIGHT, FLOOR_SIZE + WALL_THICKNESS]}
                position={[HALF_FLOOR, WALL_HEIGHT / 2, 0]}
                castShadow
                receiveShadow
            >
                <meshStandardMaterial color={wallColor} />
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

            <Desk
                desk={ceoDeskData}
                ref={(node) => {
                    ceoDeskRef.current = node;
                }}
                isHovered={false}
                showComputer
            />

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

            {/* CEO office partition */}
            <group position={[0, 0.6, HALF_FLOOR - 5]} rotation={[0, Math.PI, 0]}>
                <Box args={[8, 1.2, 0.05]} position={[0, 0, 0]}>
                    <meshStandardMaterial color="#93c5fd" opacity={0.35} transparent />
                </Box>
                <Box args={[0.05, 1.2, 4]} position={[-4, 0, -2]}>
                    <meshStandardMaterial color="#c084fc" opacity={0.5} transparent />
                </Box>
                <Box args={[0.05, 1.2, 4]} position={[4, 0, -2]}>
                    <meshStandardMaterial color="#c084fc" opacity={0.5} transparent />
                </Box>
            </group>
        </>
    );
}

const OfficeScene = memo((props: OfficeSceneProps) => {
    const [bgColor, setBgColor] = useState('#b8d4e8');
    const canvasKey = 'office-scene-canvas'; // Stable key to prevent unnecessary recreation

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const root = document.documentElement;

            // Get sky color from CSS variable
            const skyColor = getCSSColor('--office-sky');
            setBgColor(`#${skyColor.getHexString()}`);

            // Listen for theme changes
            const observer = new MutationObserver(() => {
                const skyColor = getCSSColor('--office-sky');
                setBgColor(`#${skyColor.getHexString()}`);
            });

            observer.observe(root, { attributes: true, attributeFilter: ['class'] });

            return () => observer.disconnect();
        }
    }, []);

    return (
        <Canvas
            key={canvasKey}
            shadows
            camera={{ position: [0, 30, 40], fov: 50 }}
            style={{ background: bgColor, transition: 'background 0.3s ease' }}
            gl={{
                // Prevent context loss during React Strict Mode double-mounting
                preserveDrawingBuffer: true,
                powerPreference: 'high-performance',
                antialias: true,
                // Add fail if major performance caveat to avoid context loss
                failIfMajorPerformanceCaveat: false,
            }}
            onCreated={({ gl }) => {
                const canvas = gl.domElement;

                // Handle context loss gracefully (happens during React Strict Mode in dev)
                // This is expected in development and will auto-restore
                const handleContextLost = (e: Event) => {
                    e.preventDefault(); // Prevent default behavior to allow restoration
                    // Only log in production to avoid dev noise
                    if (import.meta.env.PROD) {
                        console.warn('[OfficeScene] WebGL context lost, will attempt restore...');
                    }
                };

                const handleContextRestored = () => {
                    if (import.meta.env.PROD) {
                        console.log('[OfficeScene] WebGL context restored successfully');
                    }
                };

                canvas.addEventListener('webglcontextlost', handleContextLost);
                canvas.addEventListener('webglcontextrestored', handleContextRestored);

                // Clean up listeners when canvas is destroyed
                return () => {
                    canvas.removeEventListener('webglcontextlost', handleContextLost);
                    canvas.removeEventListener('webglcontextrestored', handleContextRestored);
                };
            }}
            frameloop="always"
        >
            <SceneContents {...props} />
        </Canvas>
    );
}, (prevProps, nextProps) => {
    // Custom comparison to prevent Canvas remounts when arrays change reference but not content
    // This is crucial for performance - prevents WebGL context recreation on every prop update

    // Check if array lengths changed
    if (prevProps.employees.length !== nextProps.employees.length) return false;
    if (prevProps.desks.length !== nextProps.desks.length) return false;

    // Check if employee data meaningfully changed
    for (let i = 0; i < prevProps.employees.length; i++) {
        const prev = prevProps.employees[i];
        const next = nextProps.employees[i];
        if (!prev || !next) {
            console.log('[OfficeScene] REMOUNT: employee undefined at index', i);
            return false;
        }

        // Check critical fields that affect rendering
        if (prev.id !== next.id) {
            console.log('[OfficeScene] REMOUNT: employee id changed at index', i, prev.id, '→', next.id);
            return false;
        }
        if (prev.workState !== next.workState) {
            console.log('[OfficeScene] REMOUNT: employee workState changed', prev.id, prev.workState, '→', next.workState);
            return false;
        }
        if (prev.status !== next.status) {
            console.log('[OfficeScene] REMOUNT: employee status changed', prev.id, prev.status, '→', next.status);
            return false;
        }
        if (prev.statusMessage !== next.statusMessage) {
            console.log('[OfficeScene] REMOUNT: employee statusMessage changed', prev.id, prev.statusMessage, '→', next.statusMessage);
            return false;
        }
        if (prev.isBusy !== next.isBusy) {
            console.log('[OfficeScene] REMOUNT: employee isBusy changed', prev.id, prev.isBusy, '→', next.isBusy);
            return false;
        }

        // Check position changes
        if (prev.initialPosition[0] !== next.initialPosition[0] ||
            prev.initialPosition[1] !== next.initialPosition[1] ||
            prev.initialPosition[2] !== next.initialPosition[2]) {
            console.log('[OfficeScene] REMOUNT: employee position changed', prev.id);
            return false;
        }
    }

    // Check if desk data meaningfully changed
    for (let i = 0; i < prevProps.desks.length; i++) {
        const prev = prevProps.desks[i];
        const next = nextProps.desks[i];
        if (!prev || !next) {
            console.log('[OfficeScene] REMOUNT: desk undefined at index', i);
            return false;
        }

        if (prev.id !== next.id) {
            console.log('[OfficeScene] REMOUNT: desk id changed at index', i);
            return false;
        }
        if (prev.occupantId !== next.occupantId) {
            console.log('[OfficeScene] REMOUNT: desk occupantId changed', prev.id, prev.occupantId, '→', next.occupantId);
            return false;
        }
        if (prev.taskExecutionId !== next.taskExecutionId) {
            console.log('[OfficeScene] REMOUNT: desk taskExecutionId changed', prev.id, prev.taskExecutionId, '→', next.taskExecutionId);
            return false;
        }

        // Check position changes
        if (prev.position[0] !== next.position[0] ||
            prev.position[1] !== next.position[1] ||
            prev.position[2] !== next.position[2]) {
            console.log('[OfficeScene] REMOUNT: desk position changed', prev.id);
            return false;
        }
    }

    // Props are equal in content, skip re-render (return true)
    return true;
});

OfficeScene.displayName = 'OfficeScene';
export default OfficeScene;
