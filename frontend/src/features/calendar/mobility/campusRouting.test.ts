import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEMO_CAMPUS_LOCATIONS,
  computeCampusShortestPath,
  computeDynamicRoute,
  calculateHaversineDistance,
  registerUserLocations,
  evaluateCandidateMobility,
  buildTransitionSignature,
  isWarningAcknowledged,
  acknowledgeWarning,
  resolveLocationRef,
} from './campusRouting';
import type { EventItem, UserLocation } from '../../../types/domain';

describe('Campus-Aware Mobility & Local Routing Engine', () => {
  const buildingA = DEMO_CAMPUS_LOCATIONS.find((l) => l.name === 'Campus Building A')!;
  const buildingB = DEMO_CAMPUS_LOCATIONS.find((l) => l.name === 'Campus Building B')!;
  const campusLab = DEMO_CAMPUS_LOCATIONS.find((l) => l.name === 'Campus Lab')!;
  const centralHall = DEMO_CAMPUS_LOCATIONS.find((l) => l.name === 'Central Hall')!;

  const baseEvent: EventItem = {
    id: 'evt-existing-1',
    scheduleId: 'test-sched',
    categoryId: 'cat-1',
    title: 'Database Systems',
    description: null,
    startsAt: '2026-09-21T09:00:00Z',
    endsAt: '2026-09-21T11:00:00Z',
    location: buildingA.name,
    locationId: buildingA.id,
    priority: 'HIGH',
    status: 'SCHEDULED',
    recurrenceRule: null,
    reminderMinutes: 15,
    notes: null,
    occurrenceId: 'evt-existing-1',
    seriesId: 'evt-existing-1',
    fixed: true,
    locked: true,
    createdAt: '2026-09-21T08:00:00Z',
    updatedAt: '2026-09-21T08:00:00Z',
  };

  describe('Rule A: Location 100% Optional Fast Path', () => {
    it('returns NORMAL with 0 travel minutes when location is empty or undefined', () => {
      const candidate = {
        title: 'Independent Study',
        startsAt: '2026-09-21T11:05:00Z',
        endsAt: '2026-09-21T12:00:00Z',
        location: '',
        locationId: null,
      };

      const finding = evaluateCandidateMobility(candidate, [baseEvent]);
      expect(finding.status).toBe('NORMAL');
      expect(finding.hasWarning).toBe(false);
      expect(finding.isHardConflict).toBe(false);
      expect(finding.travelMinutes).toBe(0);
    });

    it('returns NORMAL with 0 travel minutes when location is ONLINE or TBD', () => {
      const candidateOnline = {
        title: 'Virtual Meeting',
        startsAt: '2026-09-21T11:02:00Z',
        endsAt: '2026-09-21T12:00:00Z',
        location: 'Online / Virtual',
        locationId: '10000000-0000-0000-0000-000000000007',
      };

      const findingOnline = evaluateCandidateMobility(candidateOnline, [baseEvent]);
      expect(findingOnline.status).toBe('NORMAL');
      expect(findingOnline.hasWarning).toBe(false);

      const candidateTbd = {
        title: 'TBD Discussion',
        startsAt: '2026-09-21T11:02:00Z',
        endsAt: '2026-09-21T12:00:00Z',
        location: 'To Be Decided',
        locationId: '10000000-0000-0000-0000-000000000008',
      };

      const findingTbd = evaluateCandidateMobility(candidateTbd, [baseEvent]);
      expect(findingTbd.status).toBe('NORMAL');
      expect(findingTbd.hasWarning).toBe(false);
    });
  });

  describe('Rule 6: Same Physical Location Fast Path', () => {
    it('returns NORMAL with 0 travel when both events are in the same building/room', () => {
      const candidate = {
        title: 'Lab Follow-up Session',
        startsAt: '2026-09-21T11:00:00Z',
        endsAt: '2026-09-21T12:00:00Z',
        location: buildingA.name,
        locationId: buildingA.id,
      };

      const finding = evaluateCandidateMobility(candidate, [baseEvent]);
      expect(finding.status).toBe('NORMAL');
      expect(finding.hasWarning).toBe(false);
      expect(finding.isHardConflict).toBe(false);
      expect(finding.travelMinutes).toBe(0);
    });
  });

  describe('Dijkstra Campus Graph Routing', () => {
    it('computes shortest path from Building A to Central Hall (4 minutes direct)', () => {
      const estimate = computeCampusShortestPath(buildingA.id, centralHall.id);
      expect(estimate).not.toBeNull();
      expect(estimate!.durationMinutes).toBe(4);
      expect(estimate!.distanceMeters).toBe(240);
      expect(estimate!.mode).toBe('WALK');
    });

    it('computes multi-hop shortest path from Building A to Campus Lab (4 + 5 = 9 minutes via Central Hall)', () => {
      const estimate = computeCampusShortestPath(buildingA.id, campusLab.id);
      expect(estimate).not.toBeNull();
      expect(estimate!.durationMinutes).toBe(9);
      expect(estimate!.distanceMeters).toBe(540);
    });
  });

  describe('Candidate Pre-Commit Mobility Evaluation', () => {
    it('detects MOBILITY_CONFLICT when available time is strictly less than walking time (5m available < 9m needed)', () => {
      // Base ends at 11:00 at Building A. Candidate starts at 11:05 at Campus Lab.
      // Available = 5m. Travel required = 9m.
      const candidate = {
        title: 'AI Robotics Lab',
        startsAt: '2026-09-21T11:05:00Z',
        endsAt: '2026-09-21T12:30:00Z',
        location: campusLab.name,
        locationId: campusLab.id,
      };

      const finding = evaluateCandidateMobility(candidate, [baseEvent]);
      expect(finding.status).toBe('MOBILITY_CONFLICT');
      expect(finding.isHardConflict).toBe(true);
      expect(finding.hasWarning).toBe(false);
      expect(finding.travelMinutes).toBe(9);
      expect(finding.availableMinutes).toBe(5);
      expect(finding.message).toContain('Không đủ thời gian di chuyển');
    });

    it('detects MOBILITY_WARNING when feasible but tight buffer (12m available, 9m travel + 5m buffer = 14m)', () => {
      // Base ends at 11:00 at Building A. Candidate starts at 11:12 at Campus Lab.
      // Available = 12m. Travel = 9m. Travel + Buffer = 14m. 9 <= 12 < 14 -> Warning!
      const candidate = {
        title: 'AI Robotics Lab',
        startsAt: '2026-09-21T11:12:00Z',
        endsAt: '2026-09-21T12:30:00Z',
        location: campusLab.name,
        locationId: campusLab.id,
      };

      const finding = evaluateCandidateMobility(candidate, [baseEvent]);
      expect(finding.status).toBe('MOBILITY_WARNING');
      expect(finding.hasWarning).toBe(true);
      expect(finding.isHardConflict).toBe(false);
      expect(finding.travelMinutes).toBe(9);
      expect(finding.availableMinutes).toBe(12);
      expect(finding.message).toContain('Thời gian chuyển tiếp khá sát');
    });

    it('returns NORMAL when available time is plenty (25m available >= 14m)', () => {
      // Base ends at 11:00 at Building A. Candidate starts at 11:25 at Campus Lab.
      const candidate = {
        title: 'AI Robotics Lab',
        startsAt: '2026-09-21T11:25:00Z',
        endsAt: '2026-09-21T12:30:00Z',
        location: campusLab.name,
        locationId: campusLab.id,
      };

      const finding = evaluateCandidateMobility(candidate, [baseEvent]);
      expect(finding.status).toBe('NORMAL');
      expect(finding.hasWarning).toBe(false);
      expect(finding.isHardConflict).toBe(false);
    });
  });

  describe('Strict Adjacency Rule (No Bridging Across Virtual/Locationless Events)', () => {
    it('does NOT evaluate transit across an intermediate online event', () => {
      // Event 1 (09:00 - 10:00): Building A
      // Intermediate (10:00 - 11:00): ONLINE meeting
      // Candidate (11:05 - 12:00): Campus Lab
      // Under strict adjacency, Candidate's adjacent predecessor is the ONLINE meeting,
      // so NO warning or conflict is raised for Building A -> Campus Lab!
      const onlineIntermediate: EventItem = {
        id: 'evt-online-inter',
        scheduleId: 'test-sched',
        categoryId: 'cat-1',
        title: 'Online Standup',
        description: null,
        startsAt: '2026-09-21T10:00:00Z',
        endsAt: '2026-09-21T11:00:00Z',
        location: 'Online / Virtual',
        locationId: '10000000-0000-0000-0000-000000000007',
        priority: 'MEDIUM',
        status: 'SCHEDULED',
        recurrenceRule: null,
        reminderMinutes: 15,
        notes: null,
        occurrenceId: 'evt-online-inter',
        seriesId: 'evt-online-inter',
        fixed: false,
        locked: false,
        createdAt: '2026-09-21T08:00:00Z',
        updatedAt: '2026-09-21T08:00:00Z',
      };

      const candidate = {
        title: 'Campus Lab Session',
        startsAt: '2026-09-21T11:05:00Z',
        endsAt: '2026-09-21T12:00:00Z',
        location: campusLab.name,
        locationId: campusLab.id,
      };

      const finding = evaluateCandidateMobility(candidate, [baseEvent, onlineIntermediate]);
      expect(finding.status).toBe('NORMAL');
      expect(finding.hasWarning).toBe(false);
      expect(finding.isHardConflict).toBe(false);
    });
  });

  describe('Warn Once & Material Change Invalidation', () => {
    it('suppresses subsequent warning once acknowledged, but re-evaluates on material time change', async () => {
      const candidate = {
        id: 'cand-1',
        title: 'AI Robotics Lab',
        startsAt: '2026-09-21T11:12:00Z',
        endsAt: '2026-09-21T12:30:00Z',
        location: campusLab.name,
        locationId: campusLab.id,
      };

      const finding1 = evaluateCandidateMobility(candidate, [baseEvent]);
      expect(finding1.hasWarning).toBe(true);
      expect(finding1.isAcknowledged).toBe(false);

      // User clicks [Vẫn lưu] -> acknowledges signature
      await acknowledgeWarning(finding1.signature, 'cand-1');

      // Subsequent evaluation with the identical signature recognizes it as acknowledged
      const finding2 = evaluateCandidateMobility(candidate, [baseEvent]);
      expect(finding2.hasWarning).toBe(true);
      expect(finding2.isAcknowledged).toBe(true);

      // Material change: start time moved 4 minutes earlier (11:08)
      // Produces new signature that is NOT yet acknowledged
      const modifiedCandidate = {
        ...candidate,
        startsAt: '2026-09-21T11:08:00Z',
      };

      const finding3 = evaluateCandidateMobility(modifiedCandidate, [baseEvent]);
      expect(finding3.isAcknowledged).toBe(false);
    });
  });

  describe('Dynamic Location Engine & Custom POI Routing', () => {
    it('calculates accurate geodesic Haversine distance between coordinates', () => {
      // Distance between Building A (13.7589, 109.2185) and Library (13.7578, 109.2188) in Quy Nhon ~126m
      const dist = calculateHaversineDistance(13.7589, 109.2185, 13.7578, 109.2188);
      expect(dist).toBeGreaterThan(100);
      expect(dist).toBeLessThan(160);
    });

    it('routes walking mode when custom POIs are within 2km', () => {
      const homePoi = {
        id: 'user-home',
        name: 'Nhà riêng',
        type: 'CUSTOM' as const,
        latitude: 13.7589,
        longitude: 109.2185,
      };
      const cafePoi = {
        id: 'user-cafe',
        name: 'Quán Cafe Quen',
        type: 'CUSTOM' as const,
        latitude: 13.7620,
        longitude: 109.2210,
      };

      const route = computeDynamicRoute(homePoi, cafePoi);
      expect(route).not.toBeNull();
      expect(route!.mode).toBe('WALK');
      expect(route!.source).toBe('HAVERSINE_WALK');
      expect(route!.durationMinutes).toBeGreaterThanOrEqual(1);
      expect(route!.distanceMeters).toBeLessThan(2000);
    });

    it('routes driving mode with traffic buffer when custom POIs are >= 2km apart', () => {
      const officePoi = {
        id: 'user-office',
        name: 'Tòa nhà công ty',
        type: 'CUSTOM' as const,
        latitude: 13.7550,
        longitude: 109.2100,
      };
      const distantHome = {
        id: 'user-home-far',
        name: 'Nhà riêng ngoại thành',
        type: 'CUSTOM' as const,
        latitude: 13.8200, // ~7km away
        longitude: 109.2300,
      };

      const route = computeDynamicRoute(officePoi, distantHome);
      expect(route).not.toBeNull();
      expect(route!.mode).toBe('DRIVE');
      expect(route!.source).toBe('HAVERSINE_DRIVE');
      expect(route!.durationMinutes).toBeGreaterThanOrEqual(5);
      expect(route!.distanceMeters).toBeGreaterThanOrEqual(2000);
    });

    it('registers user-defined locations and resolves them correctly', () => {
      const customLocations: UserLocation[] = [
        {
          id: 'custom-gym-1',
          userId: 'test-user',
          workspaceId: 'test-workspace',
          name: 'Phòng Gym Campus',
          category: 'GYM',
          latitude: 13.7590,
          longitude: 109.2190,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      registerUserLocations(customLocations);

      const resolvedById = resolveLocationRef('custom-gym-1');
      expect(resolvedById).not.toBeNull();
      expect(resolvedById!.name).toBe('Phòng Gym Campus');
      expect(resolvedById!.category).toBe('GYM');

      const resolvedByName = resolveLocationRef(null, 'Phòng Gym Campus');
      expect(resolvedByName).not.toBeNull();
      expect(resolvedByName!.id).toBe('custom-gym-1');
    });
  });
});
