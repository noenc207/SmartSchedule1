/**
 * Campus-Aware Mobility & Local Routing Engine for SmartSchedule
 *
 * Designed for FPT University Quy Nhon campus topology.
 * Supports 100% offline Demo Mode via local Dijkstra campus graph
 * with strict adjacency evaluation, same-location fast path, and
 * material-change signature acknowledgement suppression.
 */

import type { EventItem, LocationRef, MobilityFinding, TravelEstimate, UserLocation } from '../../../types/domain';
import { travelApi } from '../../../services/travelApi';

/**
 * DEMO_CAMPUS_DATA
 * Note: Demo campus topology — replace with official FPTU Quy Nhơn campus data.
 */
export const DEMO_CAMPUS_LOCATIONS: LocationRef[] = [
  { id: '10000000-0000-0000-0000-000000000001', name: 'Campus Building A', type: 'CAMPUS', building: 'Building A', room: 'A101', campusId: 'fptu-qn' },
  { id: '10000000-0000-0000-0000-000000000002', name: 'Campus Building B', type: 'CAMPUS', building: 'Building B', room: 'B201', campusId: 'fptu-qn' },
  { id: '10000000-0000-0000-0000-000000000003', name: 'Central Hall', type: 'CAMPUS', building: 'Central Hall', room: 'Hall 1', campusId: 'fptu-qn' },
  { id: '10000000-0000-0000-0000-000000000004', name: 'Campus Lab', type: 'CAMPUS', building: 'Tech Wing', room: 'Lab 302', campusId: 'fptu-qn' },
  { id: '10000000-0000-0000-0000-000000000005', name: 'Campus Library', type: 'CAMPUS', building: 'Learning Hub', room: 'Floor 2', campusId: 'fptu-qn' },
  { id: '10000000-0000-0000-0000-000000000006', name: 'Campus Canteen', type: 'CAMPUS', building: 'Student Center', room: 'Floor 1', campusId: 'fptu-qn' },
  { id: '10000000-0000-0000-0000-000000000007', name: 'Online / Virtual', type: 'ONLINE' },
  { id: '10000000-0000-0000-0000-000000000008', name: 'To Be Decided', type: 'TBD' },
];

export type CampusEdgeData = {
  fromId: string;
  toId: string;
  walkingMinutes: number;
  distanceMeters: number;
};

export const DEMO_CAMPUS_EDGES: CampusEdgeData[] = [
  // Building A <-> Central Hall = 4 min
  { fromId: '10000000-0000-0000-0000-000000000001', toId: '10000000-0000-0000-0000-000000000003', walkingMinutes: 4, distanceMeters: 240 },
  { fromId: '10000000-0000-0000-0000-000000000003', toId: '10000000-0000-0000-0000-000000000001', walkingMinutes: 4, distanceMeters: 240 },
  // Central Hall <-> Campus Lab = 5 min (Building A -> Lab = 9 min total via Central Hall)
  { fromId: '10000000-0000-0000-0000-000000000003', toId: '10000000-0000-0000-0000-000000000004', walkingMinutes: 5, distanceMeters: 300 },
  { fromId: '10000000-0000-0000-0000-000000000004', toId: '10000000-0000-0000-0000-000000000003', walkingMinutes: 5, distanceMeters: 300 },
  // Building A <-> Library = 3 min
  { fromId: '10000000-0000-0000-0000-000000000001', toId: '10000000-0000-0000-0000-000000000005', walkingMinutes: 3, distanceMeters: 180 },
  { fromId: '10000000-0000-0000-0000-000000000005', toId: '10000000-0000-0000-0000-000000000001', walkingMinutes: 3, distanceMeters: 180 },
  // Central Hall <-> Library = 3 min
  { fromId: '10000000-0000-0000-0000-000000000003', toId: '10000000-0000-0000-0000-000000000005', walkingMinutes: 3, distanceMeters: 200 },
  { fromId: '10000000-0000-0000-0000-000000000005', toId: '10000000-0000-0000-0000-000000000003', walkingMinutes: 3, distanceMeters: 200 },
  // Central Hall <-> Building B = 4 min
  { fromId: '10000000-0000-0000-0000-000000000003', toId: '10000000-0000-0000-0000-000000000002', walkingMinutes: 4, distanceMeters: 250 },
  { fromId: '10000000-0000-0000-0000-000000000002', toId: '10000000-0000-0000-0000-000000000003', walkingMinutes: 4, distanceMeters: 250 },
  // Building B <-> Canteen = 3 min
  { fromId: '10000000-0000-0000-0000-000000000002', toId: '10000000-0000-0000-0000-000000000006', walkingMinutes: 3, distanceMeters: 180 },
  { fromId: '10000000-0000-0000-0000-000000000006', toId: '10000000-0000-0000-0000-000000000002', walkingMinutes: 3, distanceMeters: 180 },
  // Campus Lab <-> Canteen = 6 min
  { fromId: '10000000-0000-0000-0000-000000000004', toId: '10000000-0000-0000-0000-000000000006', walkingMinutes: 6, distanceMeters: 360 },
  { fromId: '10000000-0000-0000-0000-000000000006', toId: '10000000-0000-0000-0000-000000000004', walkingMinutes: 6, distanceMeters: 360 },
];

// In-memory route cache
const travelCache = new Map<string, TravelEstimate>();

// Local acknowledgement suppression cache
const localAcknowledgements = new Set<string>();

// User-defined custom POIs registry
let registeredUserLocations: LocationRef[] = [];

/**
 * Registers user-defined custom locations (Nhà riêng, Tòa nhà công ty, Quán cafe quen...)
 * into the active mobility routing engine.
 */
export function registerUserLocations(locations: (LocationRef | UserLocation)[]): void {
  registeredUserLocations = locations.map((loc) => ({
    id: loc.id,
    name: loc.name,
    type: (loc as LocationRef).type || ((loc as UserLocation).category === 'CAMPUS' ? 'CAMPUS' : 'CUSTOM'),
    category: (loc as UserLocation).category || 'CUSTOM',
    address: (loc as UserLocation).address,
    building: loc.building,
    room: loc.room,
    latitude: loc.latitude,
    longitude: loc.longitude,
    radiusMeters: (loc as UserLocation).radiusMeters,
    userId: (loc as UserLocation).userId,
    workspaceId: (loc as UserLocation).workspaceId,
  }));
}

/**
 * Computes exact geodesic distance (in meters) between two Lat/Lng points using Haversine formula.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's mean radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Resolves location reference from id, name or object, searching both custom User_Locations
 * and built-in campus topology.
 */
export function resolveLocationRef(
  locationId?: string | null,
  locationName?: string | null
): LocationRef | null {
  if (locationId) {
    const customFound = registeredUserLocations.find((l) => l.id === locationId);
    if (customFound) return customFound;
    const campusFound = DEMO_CAMPUS_LOCATIONS.find((l) => l.id === locationId);
    if (campusFound) return campusFound;
  }
  if (locationName && locationName.trim()) {
    const lower = locationName.trim().toLowerCase();
    const customFound = registeredUserLocations.find(
      (l) => l.name.toLowerCase() === lower
    );
    if (customFound) return customFound;
    const campusFound = DEMO_CAMPUS_LOCATIONS.find(
      (l) => l.name.toLowerCase() === lower
    );
    if (campusFound) return campusFound;

    // Default to a generic location if typed
    return {
      id: `loc-custom-${lower.replace(/\s+/g, '-')}`,
      name: locationName.trim(),
      type: lower.includes('online') || lower.includes('meet') || lower.includes('zoom') ? 'ONLINE' : 'CUSTOM',
    };
  }
  return null;
}

/**
 * Universal Dynamic Routing Engine:
 * - Interpolates geodesic distance via Haversine
 * - If < 2km: Walking mode with city winding coefficient (k = 1.35, ~80m/min)
 * - If >= 2km: Driving / transit mode with traffic buffer (k = 1.30, ~500m/min + 4 min buffer)
 * - Falls back to Campus Graph Dijkstra if nodes exist in campus topology
 */
export function computeDynamicRoute(
  fromLoc: LocationRef,
  toLoc: LocationRef
): TravelEstimate | null {
  if (!fromLoc || !toLoc) return null;
  if (fromLoc.id === toLoc.id || fromLoc.name.toLowerCase() === toLoc.name.toLowerCase()) {
    return {
      fromLocationId: fromLoc.id,
      toLocationId: toLoc.id,
      durationMinutes: 0,
      distanceMeters: 0,
      mode: 'WALK',
      source: 'FAST_PATH',
      cached: true,
    };
  }

  const cacheKey = `dyn:${fromLoc.id}:${toLoc.id}`;
  if (travelCache.has(cacheKey)) {
    return travelCache.get(cacheKey)!;
  }

  // 1. Geodesic coordinates routing (User_Locations custom POIs)
  if (
    typeof fromLoc.latitude === 'number' &&
    typeof fromLoc.longitude === 'number' &&
    typeof toLoc.latitude === 'number' &&
    typeof toLoc.longitude === 'number'
  ) {
    const straightDistance = calculateHaversineDistance(
      fromLoc.latitude,
      fromLoc.longitude,
      toLoc.latitude,
      toLoc.longitude
    );

    let estimate: TravelEstimate;

    if (straightDistance < 2000) {
      // Walking distance (<2km)
      const roadDistance = Math.round(straightDistance * 1.35); // City street winding factor
      const durationMins = Math.max(1, Math.round(roadDistance / 80)); // 80m / min (~4.8 km/h)
      estimate = {
        fromLocationId: fromLoc.id,
        toLocationId: toLoc.id,
        durationMinutes: durationMins,
        distanceMeters: roadDistance,
        mode: 'WALK',
        source: 'HAVERSINE_WALK',
        cached: false,
      };
    } else {
      // Driving / Transit distance (>=2km)
      const roadDistance = Math.round(straightDistance * 1.30);
      const durationMins = Math.max(3, Math.round(roadDistance / 500 + 4)); // 500m / min (~30 km/h) + 4m buffer
      estimate = {
        fromLocationId: fromLoc.id,
        toLocationId: toLoc.id,
        durationMinutes: durationMins,
        distanceMeters: roadDistance,
        mode: 'DRIVE',
        source: 'HAVERSINE_DRIVE',
        cached: false,
      };
    }

    travelCache.set(cacheKey, estimate);
    return estimate;
  }

  // 2. Campus graph Dijkstra fallback
  const campusEst = computeCampusShortestPath(fromLoc.id, toLoc.id);
  if (campusEst) {
    travelCache.set(cacheKey, campusEst);
    return campusEst;
  }

  // 3. Fallback generic travel estimate
  const fallbackEst: TravelEstimate = {
    fromLocationId: fromLoc.id,
    toLocationId: toLoc.id,
    durationMinutes: 8,
    distanceMeters: 500,
    mode: 'WALK',
    source: 'FALLBACK_ESTIMATE',
    cached: false,
  };
  travelCache.set(cacheKey, fallbackEst);
  return fallbackEst;
}

/**
 * Deterministic Dijkstra algorithm on local campus graph.
 */
export function computeCampusShortestPath(fromId: string, toId: string): TravelEstimate | null {
  if (!fromId || !toId) return null;
  if (fromId === toId) {
    return { fromLocationId: fromId, toLocationId: toId, durationMinutes: 0, distanceMeters: 0, mode: 'WALK', source: 'FAST_PATH', cached: true };
  }

  const cacheKey = `${fromId}:${toId}:WALK`;
  if (travelCache.has(cacheKey)) {
    return travelCache.get(cacheKey)!;
  }

  // Build graph
  const graph = new Map<string, Array<{ to: string; mins: number; dist: number }>>();
  for (const edge of DEMO_CAMPUS_EDGES) {
    if (!graph.has(edge.fromId)) graph.set(edge.fromId, []);
    graph.get(edge.fromId)!.push({ to: edge.toId, mins: edge.walkingMinutes, dist: edge.distanceMeters });
  }

  if (!graph.has(fromId) || !graph.has(toId)) {
    // If not in campus graph, default 5 mins if both are campus
    const estimate: TravelEstimate = {
      fromLocationId: fromId,
      toLocationId: toId,
      durationMinutes: 5,
      distanceMeters: 300,
      mode: 'WALK',
      source: 'FALLBACK_ESTIMATE',
      cached: false,
    };
    travelCache.set(cacheKey, estimate);
    return estimate;
  }

  // Dijkstra
  const distances = new Map<string, number>();
  const distMeters = new Map<string, number>();
  const visited = new Set<string>();

  for (const loc of DEMO_CAMPUS_LOCATIONS) {
    distances.set(loc.id, Infinity);
    distMeters.set(loc.id, Infinity);
  }

  distances.set(fromId, 0);
  distMeters.set(fromId, 0);

  while (visited.size < distances.size) {
    let u: string | null = null;
    let minDist = Infinity;

    for (const [node, d] of distances.entries()) {
      if (!visited.has(node) && d < minDist) {
        minDist = d;
        u = node;
      }
    }

    if (!u || minDist === Infinity || u === toId) break;
    visited.add(u);

    for (const edge of graph.get(u) || []) {
      if (visited.has(edge.to)) continue;
      const alt = minDist + edge.mins;
      if (alt < (distances.get(edge.to) ?? Infinity)) {
        distances.set(edge.to, alt);
        distMeters.set(edge.to, (distMeters.get(u) || 0) + edge.dist);
      }
    }
  }

  const finalMins = distances.get(toId);
  if (finalMins === undefined || finalMins === Infinity) {
    return null;
  }

  const estimate: TravelEstimate = {
    fromLocationId: fromId,
    toLocationId: toId,
    durationMinutes: finalMins,
    distanceMeters: distMeters.get(toId) || finalMins * 60,
    mode: 'WALK',
    source: 'CAMPUS_LOCAL',
    cached: false,
  };

  travelCache.set(cacheKey, estimate);
  return estimate;
}

/**
 * Builds deterministic transition signature for material change detection.
 */
export function buildTransitionSignature(
  fromId: string,
  toId: string,
  fromStart: string,
  fromEnd: string,
  toStart: string,
  toEnd: string,
  fromLocationId: string,
  toLocationId: string,
  travelMinutes: number,
  bufferMinutes: number
): string {
  return `ack:${fromId}:${toId}:${fromStart}:${fromEnd}:${toStart}:${toEnd}:${fromLocationId}:${toLocationId}:${travelMinutes}:${bufferMinutes}`;
}

/**
 * Checks if a warning signature has already been acknowledged.
 */
export function isWarningAcknowledged(signature: string): boolean {
  if (!signature) return false;
  return localAcknowledgements.has(signature);
}

/**
 * Acknowledges a warning signature locally and persists to backend.
 */
export async function acknowledgeWarning(
  signature: string,
  fromEventId?: string,
  toEventId?: string
): Promise<void> {
  if (!signature) return;
  localAcknowledgements.add(signature);
  try {
    await travelApi.acknowledgeWarning(signature, fromEventId, toEventId);
  } catch {
    // Non-blocking for offline demo mode
  }
}

/**
 * Evaluates candidate event against chronologically ordered events on the same day.
 * STRICT ADJACENCY RULE:
 * - Only evaluates directly time-adjacent events.
 * - If an intermediate event has no location, is ONLINE, or is TBD, DO NOT bridge across it.
 */
export function evaluateCandidateMobility(
  candidate: {
    id?: string;
    title: string;
    startsAt: string;
    endsAt: string;
    location?: string | null;
    locationId?: string | null;
  },
  existingEvents: EventItem[],
  bufferMinutes = 5
): MobilityFinding {
  const normal: MobilityFinding = {
    status: 'NORMAL',
    hasWarning: false,
    isHardConflict: false,
    isAcknowledged: false,
    fromTitle: '',
    toTitle: '',
    fromLocationName: '',
    toLocationName: '',
    travelMinutes: 0,
    availableMinutes: 0,
    bufferMinutes,
    signature: '',
    message: '',
  };

  // Rule A & 4: Location optional fast path
  const candLoc = resolveLocationRef(candidate.locationId, candidate.location);
  if (!candLoc || candLoc.type === 'ONLINE' || candLoc.type === 'TBD') {
    return normal;
  }

  const candStartTime = new Date(candidate.startsAt).getTime();
  const candEndTime = new Date(candidate.endsAt).getTime();
  if (isNaN(candStartTime) || isNaN(candEndTime) || candEndTime <= candStartTime) {
    return normal;
  }

  // Filter existing events for the same day, excluding the event itself if editing
  const dayEvents = existingEvents
    .filter((e) => {
      if (candidate.id && (e.id === candidate.id || e.seriesId === candidate.id)) return false;
      const s = new Date(e.startsAt).getTime();
      return Math.abs(s - candStartTime) < 18 * 3600 * 1000;
    })
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  // 1. Check directly adjacent previous event
  let prevEvent: EventItem | null = null;
  for (const e of dayEvents) {
    const eEnd = new Date(e.endsAt).getTime();
    if (eEnd <= candStartTime) {
      prevEvent = e;
    } else {
      break;
    }
  }

  if (prevEvent) {
    const prevLoc = resolveLocationRef(prevEvent.locationId, prevEvent.location);
    // Strict Adjacency Rule: ONLY if previous event also has an eligible physical location
    if (prevLoc && prevLoc.type !== 'ONLINE' && prevLoc.type !== 'TBD') {
      const evalPrev = testTransition(
        prevEvent.id,
        candidate.id || 'candidate',
        prevEvent.title,
        candidate.title,
        prevEvent.startsAt,
        prevEvent.endsAt,
        candidate.startsAt,
        candidate.endsAt,
        prevLoc,
        candLoc,
        bufferMinutes
      );
      if (evalPrev.hasWarning || evalPrev.isHardConflict) {
        return evalPrev;
      }
    }
  }

  // 2. Check directly adjacent next event
  let nextEvent: EventItem | null = null;
  for (const e of dayEvents) {
    const eStart = new Date(e.startsAt).getTime();
    if (eStart >= candEndTime) {
      nextEvent = e;
      break;
    }
  }

  if (nextEvent) {
    const nextLoc = resolveLocationRef(nextEvent.locationId, nextEvent.location);
    // Strict Adjacency Rule: ONLY if next event also has an eligible physical location
    if (nextLoc && nextLoc.type !== 'ONLINE' && nextLoc.type !== 'TBD') {
      const evalNext = testTransition(
        candidate.id || 'candidate',
        nextEvent.id,
        candidate.title,
        nextEvent.title,
        candidate.startsAt,
        candidate.endsAt,
        nextEvent.startsAt,
        nextEvent.endsAt,
        candLoc,
        nextLoc,
        bufferMinutes
      );
      if (evalNext.hasWarning || evalNext.isHardConflict) {
        return evalNext;
      }
    }
  }

  return normal;
}

function testTransition(
  fromId: string,
  toId: string,
  fromTitle: string,
  toTitle: string,
  fromStart: string,
  fromEnd: string,
  toStart: string,
  toEnd: string,
  fromLoc: LocationRef,
  toLoc: LocationRef,
  bufferMinutes: number
): MobilityFinding {
  const normal: MobilityFinding = {
    status: 'NORMAL',
    hasWarning: false,
    isHardConflict: false,
    isAcknowledged: false,
    fromTitle,
    toTitle,
    fromLocationName: fromLoc.name,
    toLocationName: toLoc.name,
    travelMinutes: 0,
    availableMinutes: 0,
    bufferMinutes,
    signature: '',
    message: '',
  };

  // Rule 6: Same physical location fast path
  if (fromLoc.id === toLoc.id || fromLoc.name.toLowerCase() === toLoc.name.toLowerCase()) {
    return normal;
  }

  const estimate = computeDynamicRoute(fromLoc, toLoc);
  if (!estimate) return normal;

  const travelMinutes = estimate.durationMinutes;
  const availableMinutes = Math.round(
    (new Date(toStart).getTime() - new Date(fromEnd).getTime()) / 60000
  );

  const signature = buildTransitionSignature(
    fromId,
    toId,
    fromStart,
    fromEnd,
    toStart,
    toEnd,
    fromLoc.id,
    toLoc.id,
    travelMinutes,
    bufferMinutes
  );

  const acknowledged = isWarningAcknowledged(signature);

  // Hard conflict: Physically impossible
  if (availableMinutes < travelMinutes) {
    return {
      status: 'MOBILITY_CONFLICT',
      hasWarning: false,
      isHardConflict: true,
      isAcknowledged: acknowledged,
      fromTitle,
      toTitle,
      fromLocationName: fromLoc.name,
      toLocationName: toLoc.name,
      travelMinutes,
      availableMinutes,
      bufferMinutes,
      signature,
      message: `Không đủ thời gian di chuyển từ "${fromLoc.name}" sang "${toLoc.name}". Di chuyển ước tính: ${travelMinutes} phút, nhưng chỉ có ${availableMinutes} phút trống.`,
    };
  }

  // Soft warning: Feasible but tight
  if (availableMinutes < travelMinutes + bufferMinutes) {
    return {
      status: 'MOBILITY_WARNING',
      hasWarning: true,
      isHardConflict: false,
      isAcknowledged: acknowledged,
      fromTitle,
      toTitle,
      fromLocationName: fromLoc.name,
      toLocationName: toLoc.name,
      travelMinutes,
      availableMinutes,
      bufferMinutes,
      signature,
      message: `Thời gian chuyển tiếp khá sát giữa "${fromLoc.name}" và "${toLoc.name}". Di chuyển ước tính: ${travelMinutes} phút, thời gian trống: ${availableMinutes} phút.`,
    };
  }

  return normal;
}
