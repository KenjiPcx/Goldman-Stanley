import { forwardRef } from 'react';
import { Box } from '@react-three/drei';
import type { Group } from 'three';
import * as THREE from 'three';

import { DESK_WIDTH, DESK_DEPTH, DESK_HEIGHT, COMPUTER_HEIGHT } from '@/lib/office/constants';
import type { OfficeDesk } from '@/lib/office/types';

interface DeskProps {
    desk: OfficeDesk;
    onClick?: () => void;
    isHovered?: boolean;
    showComputer?: boolean;
}

const defaultTableColor = new THREE.Color("white");
const hoveredTableColor = new THREE.Color("#a7f3d0");

export const Desk = forwardRef<Group, DeskProps>(function Desk(
    { desk, onClick, isHovered = false, showComputer = false }: DeskProps,
    ref,
) {
    const isOccupied = !!desk.occupantId;
    const tableColor = isHovered ? hoveredTableColor : defaultTableColor;
    const renderComputer = isOccupied || showComputer;

    return (
        <group
            ref={ref}
            position={[...desk.position]}
            rotation={[0, desk.rotationY, 0]}
            name={`desk-${desk.id}`}
            onClick={(e) => {
                e.stopPropagation();
                onClick?.();
            }}
            onPointerOver={() => (document.body.style.cursor = 'pointer')}
            onPointerOut={() => (document.body.style.cursor = 'default')}
        >
            <Box args={[DESK_WIDTH, 0.1, DESK_DEPTH]} position={[0, DESK_HEIGHT, 0]} castShadow>
                <meshStandardMaterial color={tableColor} />
            </Box>

            {[
                [-DESK_WIDTH / 2 + 0.1, -DESK_DEPTH / 2 + 0.1],
                [DESK_WIDTH / 2 - 0.1, -DESK_DEPTH / 2 + 0.1],
                [-DESK_WIDTH / 2 + 0.1, DESK_DEPTH / 2 - 0.1],
                [DESK_WIDTH / 2 - 0.1, DESK_DEPTH / 2 - 0.1],
            ].map(([x, z], i) => (
                <Box
                    key={i}
                    args={[0.1, DESK_HEIGHT, 0.1]}
                    position={[x, DESK_HEIGHT / 2, z]}
                    castShadow
                >
                    <meshStandardMaterial color="darkgrey" />
                </Box>
            ))}

            {renderComputer && (
                <group position={[0, DESK_HEIGHT + 0.1, -DESK_DEPTH / 4]}>
                    <Box args={[0.6, COMPUTER_HEIGHT, 0.05]} position={[0, COMPUTER_HEIGHT / 2, 0]} castShadow>
                        <meshStandardMaterial color="#1a1a1a" />
                    </Box>
                    <Box args={[0.2, 0.05, 0.2]} position={[0, 0.025, 0]} castShadow>
                        <meshStandardMaterial color="#333333" />
                    </Box>
                </group>
            )}
        </group>
    );
});

