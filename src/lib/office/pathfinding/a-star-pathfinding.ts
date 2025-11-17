import * as THREE from 'three';

const CELL_SIZE = 0.5;
const OBSTACLE_PADDING = 1;
const DESK_PADDING = 4;

let gridWidth = 0;
let gridDepth = 0;
let worldOffsetX = 0;
let worldOffsetZ = 0;
let walkableGrid: boolean[][] = [];
let currentObstaclePadding = OBSTACLE_PADDING;
let currentDeskPadding = DESK_PADDING;

class PathNode {
    x: number;
    z: number;
    gCost = Number.POSITIVE_INFINITY;
    hCost = 0;
    fCost = Number.POSITIVE_INFINITY;
    parent: PathNode | null = null;
    isWalkable = true;

    constructor(x: number, z: number, isWalkable = true) {
        this.x = x;
        this.z = z;
        this.isWalkable = isWalkable;
    }
}

export const getGridData = () => ({
    gridWidth,
    gridDepth,
    cellSize: CELL_SIZE,
    worldOffsetX,
    worldOffsetZ,
    walkableGrid,
    obstaclePadding: currentObstaclePadding,
    deskPadding: currentDeskPadding,
});

export function initializeGrid(
    floorSize: number,
    obstacles: THREE.Object3D[],
    obstaclePadding?: number,
    deskPadding?: number
) {
    currentObstaclePadding = obstaclePadding ?? OBSTACLE_PADDING;
    currentDeskPadding = deskPadding ?? DESK_PADDING;

    gridWidth = Math.ceil(floorSize / CELL_SIZE);
    gridDepth = Math.ceil(floorSize / CELL_SIZE);
    worldOffsetX = floorSize / 2;
    worldOffsetZ = floorSize / 2;
    walkableGrid = Array(gridWidth).fill(null).map(() => Array(gridDepth).fill(true));

    const boundaryPadding = Math.max(2, currentObstaclePadding);
    for (let i = 0; i < gridWidth; i++) {
        for (let j = 0; j < boundaryPadding; j++) {
            if (j < gridDepth) walkableGrid[j][i] = false;
            if (gridWidth - 1 - j < gridWidth && gridWidth - 1 - j >= 0) walkableGrid[gridWidth - 1 - j][i] = false;
            if (i < gridWidth) walkableGrid[i][j] = false;
            if (i < gridWidth && gridDepth - 1 - j < gridDepth && gridDepth - 1 - j >= 0) walkableGrid[i][gridDepth - 1 - j] = false;
        }
    }

    for (const obstacle of obstacles) {
        const box = new THREE.Box3().setFromObject(obstacle, true);
        const min = worldToGrid(box.min.x, box.min.z);
        const max = worldToGrid(box.max.x, box.max.z);

        let padding = currentObstaclePadding;
        const isProbablyDesk = obstacle.name?.includes('cluster') || obstacle.name?.includes('desk');
        if (isProbablyDesk) {
            padding = currentDeskPadding;
        }

        if (obstacle.userData?.footprint) {
            const footprint = obstacle.userData.footprint;
            for (const point of footprint) {
                const fpX = Math.floor((point.x + floorSize / 2) / CELL_SIZE);
                const fpZ = Math.floor((point.z + floorSize / 2) / CELL_SIZE);
                markObstacle(fpX, fpZ, padding);
            }
        } else {
            const paddedMin = {
                x: Math.max(0, min.x - padding),
                z: Math.max(0, min.z - padding),
            };

            const paddedMax = {
                x: Math.min(gridWidth - 1, max.x + padding),
                z: Math.min(gridDepth - 1, max.z + padding),
            };

            for (let x = paddedMin.x; x <= paddedMax.x; x++) {
                for (let z = paddedMin.z; z <= paddedMax.z; z++) {
                    if (x >= 0 && x < gridWidth && z >= 0 && z < gridDepth) {
                        walkableGrid[x][z] = false;
                    }
                }
            }
        }
    }
}

export function worldToGrid(worldX: number, worldZ: number): { x: number, z: number } {
    const gridX = Math.floor((worldX + worldOffsetX) / CELL_SIZE);
    const gridZ = Math.floor((worldZ + worldOffsetZ) / CELL_SIZE);
    return {
        x: Math.max(0, Math.min(gridWidth - 1, gridX)),
        z: Math.max(0, Math.min(gridDepth - 1, gridZ)),
    };
}

export function gridToWorld(gridX: number, gridZ: number): THREE.Vector3 {
    const worldX = gridX * CELL_SIZE - worldOffsetX + CELL_SIZE / 2;
    const worldZ = gridZ * CELL_SIZE - worldOffsetZ + CELL_SIZE / 2;
    return new THREE.Vector3(worldX, 0, worldZ);
}

export function findPathAStar(startWorldPos: THREE.Vector3, endWorldPos: THREE.Vector3): THREE.Vector3[] | null {
    if (!walkableGrid.length) {
        console.log("A* grid not initialized.");
        return null;
    }

    const startGrid = worldToGrid(startWorldPos.x, startWorldPos.z);
    const endGrid = worldToGrid(endWorldPos.x, endWorldPos.z);

    if (!walkableGrid[startGrid.x]?.[startGrid.z] || !walkableGrid[endGrid.x]?.[endGrid.z]) {
        const nearestStart = findNearestWalkable(startGrid.x, startGrid.z);
        const nearestEnd = findNearestWalkable(endGrid.x, endGrid.z);
        if (!nearestStart || !nearestEnd) {
            console.error("A*: Could not find nearby walkable nodes for start/end.");
            return null;
        }
        startGrid.x = nearestStart.x;
        startGrid.z = nearestStart.z;
        endGrid.x = nearestEnd.x;
        endGrid.z = nearestEnd.z;
    }

    const startNode = new PathNode(startGrid.x, startGrid.z, true);
    const endNode = new PathNode(endGrid.x, endGrid.z, true);

    const openSet = new Set<PathNode>();
    const closedSet = new Set<string>();
    const nodeMap: PathNode[][] = Array(gridWidth).fill(null).map(() => Array(gridDepth));

    function getNode(x: number, z: number): PathNode {
        if (!nodeMap[x]) nodeMap[x] = [];
        if (!nodeMap[x][z]) nodeMap[x][z] = new PathNode(x, z, walkableGrid[x][z]);
        return nodeMap[x][z];
    }

    startNode.gCost = 0;
    startNode.hCost = heuristic(startNode, endNode);
    startNode.fCost = startNode.gCost + startNode.hCost;
    openSet.add(startNode);
    nodeMap[startGrid.x][startGrid.z] = startNode;

    while (openSet.size > 0) {
        const currentNode = getLowestFCostNode(openSet);
        if (!currentNode) break;

        if (currentNode.x === endNode.x && currentNode.z === endNode.z) {
            return reconstructPath(currentNode);
        }

        openSet.delete(currentNode);
        closedSet.add(`${currentNode.x},${currentNode.z}`);

        for (const neighborData of getNeighbors(currentNode)) {
            const neighborNode = getNode(neighborData.x, neighborData.z);
            if (!neighborNode.isWalkable || closedSet.has(`${neighborNode.x},${neighborNode.z}`)) continue;

            const tentativeGCost = currentNode.gCost + neighborData.cost;
            if (tentativeGCost < neighborNode.gCost) {
                neighborNode.parent = currentNode;
                neighborNode.gCost = tentativeGCost;
                neighborNode.hCost = heuristic(neighborNode, endNode);
                neighborNode.fCost = neighborNode.gCost + neighborNode.hCost;
                if (!openSet.has(neighborNode)) openSet.add(neighborNode);
            }
        }
    }

    console.warn(`A*: No path found from (${startGrid.x},${startGrid.z}) to (${endGrid.x},${endGrid.z})`);
    return null;
}

function heuristic(nodeA: PathNode, nodeB: PathNode): number {
    const dx = Math.abs(nodeA.x - nodeB.x);
    const dz = Math.abs(nodeA.z - nodeB.z);
    return (dx + dz);
}

function getLowestFCostNode(nodeSet: Set<PathNode>): PathNode | null {
    let lowestFCostNode: PathNode | null = null;
    for (const node of nodeSet) {
        if (lowestFCostNode === null || node.fCost < lowestFCostNode.fCost) {
            lowestFCostNode = node;
        }
    }
    return lowestFCostNode;
}

function getNeighbors(node: PathNode): { x: number, z: number, cost: number }[] {
    const neighbors: { x: number, z: number, cost: number }[] = [];
    const dirs = [
        { x: 0, z: 1, cost: 1 }, { x: 0, z: -1, cost: 1 },
        { x: 1, z: 0, cost: 1 }, { x: -1, z: 0, cost: 1 },
    ];
    for (const dir of dirs) {
        const neighborX = node.x + dir.x;
        const neighborZ = node.z + dir.z;
        if (neighborX >= 0 && neighborX < gridWidth && neighborZ >= 0 && neighborZ < gridDepth) {
            if (walkableGrid[neighborX][neighborZ]) {
                neighbors.push({ x: neighborX, z: neighborZ, cost: dir.cost });
            }
        }
    }
    return neighbors;
}

function reconstructPath(endNode: PathNode): THREE.Vector3[] {
    const path: THREE.Vector3[] = [];
    let currentNode: PathNode | null = endNode;
    while (currentNode !== null) {
        path.push(gridToWorld(currentNode.x, currentNode.z));
        currentNode = currentNode.parent;
    }
    return path.reverse();
}

function findNearestWalkable(startX: number, startZ: number): { x: number, z: number } | null {
    if (walkableGrid[startX]?.[startZ]) return { x: startX, z: startZ };

    const maxRadius = Math.max(gridWidth, gridDepth);
    for (let r = 1; r < maxRadius; r++) {
        for (let dx = -r; dx <= r; dx++) {
            for (let dz = -r; dz <= r; dz++) {
                if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
                const checkX = startX + dx;
                const checkZ = startZ + dz;
                if (checkX >= 0 && checkX < gridWidth && checkZ >= 0 && checkZ < gridDepth) {
                    if (walkableGrid[checkX][checkZ]) {
                        return { x: checkX, z: checkZ };
                    }
                }
            }
        }
    }
    return null;
}

function markObstacle(centerX: number, centerZ: number, padding: number) {
    if (centerX < 0 || centerX >= gridWidth || centerZ < 0 || centerZ >= gridDepth) {
        return;
    }

    walkableGrid[centerX][centerZ] = false;

    for (let dx = -padding; dx <= padding; dx++) {
        for (let dz = -padding; dz <= padding; dz++) {
            const x = centerX + dx;
            const z = centerZ + dz;

            if (x < 0 || x >= gridWidth || z < 0 || z >= gridDepth) {
                continue;
            }

            walkableGrid[x][z] = false;
        }
    }
}

