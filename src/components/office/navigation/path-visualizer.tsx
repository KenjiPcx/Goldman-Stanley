import { useMemo } from "react";
import * as THREE from 'three';
import { Line } from "@react-three/drei";

interface PathVisualizerProps {
    originalPath: THREE.Vector3[] | null;
    remainingPath: THREE.Vector3[] | null;
    isGoingToDesk: boolean;
    employeeId: string;
}

export default function PathVisualizer({
    originalPath,
    remainingPath,
    isGoingToDesk,
}: PathVisualizerProps) {
    const pathSettings = useMemo(() => {
        const baseColor = isGoingToDesk ? '#0099ff' : '#ff00ff';

        return {
            original: {
                color: baseColor,
                opacity: 0.3,
                dashed: true,
                dashSize: 0.1,
                gapSize: 0.1,
                lineWidth: 0.1,
            },
            current: {
                color: baseColor,
                opacity: 1.0,
                dashed: false,
                lineWidth: 0.1,
            },
            destination: {
                color: baseColor,
                opacity: 1.0,
                radius: 0.3,
            },
        };
    }, [isGoingToDesk]);

    const destinationPoint = useMemo(() => {
        if (remainingPath && remainingPath.length > 1) {
            return remainingPath[remainingPath.length - 1];
        }
        return null;
    }, [remainingPath]);

    if ((!originalPath || originalPath.length < 2) &&
        (!remainingPath || remainingPath.length < 2)) {
        return null;
    }

    return (
        <>
            {remainingPath && remainingPath.length > 1 && (
                <Line
                    points={remainingPath}
                    color={pathSettings.current.color}
                    lineWidth={pathSettings.current.lineWidth}
                    dashed={pathSettings.current.dashed}
                    worldUnits
                >
                    <lineBasicMaterial
                        transparent
                        opacity={pathSettings.current.opacity}
                        depthTest={false}
                    />
                </Line>
            )}

            {destinationPoint && (
                <mesh position={destinationPoint} rotation={[Math.PI / 2, 0, 0]}>
                    <circleGeometry args={[pathSettings.destination.radius, 32]} />
                    <meshBasicMaterial
                        color={pathSettings.destination.color}
                        transparent
                        opacity={pathSettings.destination.opacity}
                        depthTest={false}
                        side={THREE.DoubleSide}
                    />
                </mesh>
            )}
        </>
    );
}

