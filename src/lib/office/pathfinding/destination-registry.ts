import * as THREE from 'three';

const MIN_DESTINATION_DISTANCE = 1.0;

interface DestinationReservation {
    id: string;
    position: THREE.Vector3;
    expiresAt: number;
}

const activeDestinations: DestinationReservation[] = [];

function cleanupExpiredReservations() {
    const now = Date.now();
    let i = 0;
    while (i < activeDestinations.length) {
        if (activeDestinations[i].expiresAt < now) {
            activeDestinations.splice(i, 1);
        } else {
            i++;
        }
    }
}

function isDestinationOccupied(position: THREE.Vector3, employeeId: string): boolean {
    cleanupExpiredReservations();

    for (const reservation of activeDestinations) {
        if (reservation.id === employeeId) continue;
        const distance = position.distanceTo(reservation.position);
        if (distance < MIN_DESTINATION_DISTANCE) {
            return true;
        }
    }

    return false;
}

export function findAvailableDestination(
    requestedDestination: THREE.Vector3,
    employeeId: string,
    maxAttempts = 8
): THREE.Vector3 {
    if (!isDestinationOccupied(requestedDestination, employeeId)) {
        reserveDestination(requestedDestination, employeeId);
        return requestedDestination;
    }

    const originalY = requestedDestination.y;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const radius = MIN_DESTINATION_DISTANCE * (1 + (attempt * 0.5));
        const angles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5, Math.PI / 4, Math.PI * 3 / 4, Math.PI * 5 / 4, Math.PI * 7 / 4];

        for (const angle of angles) {
            const offsetX = Math.cos(angle) * radius;
            const offsetZ = Math.sin(angle) * radius;

            const alternativePosition = new THREE.Vector3(
                requestedDestination.x + offsetX,
                originalY,
                requestedDestination.z + offsetZ,
            );

            if (!isDestinationOccupied(alternativePosition, employeeId)) {
                reserveDestination(alternativePosition, employeeId);
                return alternativePosition;
            }
        }
    }

    console.warn(`Employee ${employeeId} couldn't find alternative destination, using original.`);
    reserveDestination(requestedDestination, employeeId);
    return requestedDestination;
}

export function reserveDestination(
    position: THREE.Vector3,
    employeeId: string,
    durationMs = 15000
): void {
    cleanupExpiredReservations();
    releaseEmployeeReservations(employeeId);
    activeDestinations.push({
        id: employeeId,
        position: position.clone(),
        expiresAt: Date.now() + durationMs,
    });
}

export function releaseEmployeeReservations(employeeId: string): void {
    let i = 0;
    while (i < activeDestinations.length) {
        if (activeDestinations[i].id === employeeId) {
            activeDestinations.splice(i, 1);
        } else {
            i++;
        }
    }
}

export function getActiveDestinations(): DestinationReservation[] {
    cleanupExpiredReservations();
    return [...activeDestinations];
}

