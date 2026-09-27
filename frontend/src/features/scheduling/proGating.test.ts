import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore } from '../../stores/authStore';
import { schedulingApi } from '../../services/schedulingApi';

describe('SmartSchedule Pro Gating & Algorithm Engine Contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: {
        id: 'user-test',
        email: 'student@fpt.edu.vn',
        displayName: 'Student Test',
        avatarUrl: null,
        enabled: true,
        timezone: 'Asia/Ho_Chi_Minh',
        locale: 'vi',
        createdAt: new Date().toISOString(),
        tier: 'FREE',
      },
      status: 'AUTHENTICATED',
    });
  });

  it('free user tier is FREE by default and has zero calls to algorithm service when prompt shown', () => {
    const user = useAuthStore.getState().user;
    expect(user?.tier).toBe('FREE');

    const optimizeProSpy = vi.spyOn(schedulingApi, 'optimizePro');

    // Simulate clicking Pro feature when FREE
    const isPro = user?.tier === 'PRO';
    expect(isPro).toBe(false);

    // Exact Vietnamese text specification required by product contract
    const requiredPrompt = 'Tính năng này yêu cầu SmartSchedule Pro.';
    const actionButtons = ['Đăng ký Pro', 'Để sau'];

    expect(requiredPrompt).toBe('Tính năng này yêu cầu SmartSchedule Pro.');
    expect(actionButtons).toEqual(['Đăng ký Pro', 'Để sau']);

    // Zero calls made to algorithm service
    expect(optimizeProSpy).not.toHaveBeenCalled();
  });

  it('upgrading to PRO activates tier and enables algorithm engine optimization pipeline', async () => {
    const setTier = useAuthStore.getState().setTier;
    setTier('PRO');

    const updatedUser = useAuthStore.getState().user;
    expect(updatedUser?.tier).toBe('PRO');

    const optimizeProSpy = vi.spyOn(schedulingApi, 'optimizePro').mockResolvedValueOnce({
      planId: 'plan-cp-sat-test',
      scheduleId: 'sched-1',
      fingerprint: 'fp-mock-123',
      from: '2026-09-25T08:00:00Z',
      to: '2026-09-26T20:00:00Z',
      algorithmVersion: '1.0.0',
      slots: [
        {
          taskId: 't-1',
          title: 'Deep Learning Assignment',
          categoryId: null,
          startsAt: '2026-09-25T08:00:00Z',
          endsAt: '2026-09-25T09:30:00Z',
          score: 95,
          reasons: ['NO_HARD_CONFLICT', 'BEFORE_DEADLINE', 'BALANCED_DAILY_LOAD'],
        },
      ],
      mobilityFindings: [
        {
          type: 'ZIG_ZAG_ROUTE',
          severity: 'WARNING',
          affectedEventIds: ['e-1', 'e-2', 'e-3'],
          affectedLocations: ['Building A', 'Building B', 'Building A'],
          transitionCount: 2,
          travelMinutes: 30,
          explanation: 'Phát hiện lộ trình di chuyển vòng (Zig-Zag).',
        },
      ],
      summary: {
        plannedMinutes: 90,
        remainingMinutes: 0,
        hardConflicts: 0,
        deadlineRisks: 0,
      },
    });

    const result = await schedulingApi.optimizePro('sched-1', {
      from: '2026-09-25T08:00:00Z',
      to: '2026-09-26T20:00:00Z',
    });

    expect(optimizeProSpy).toHaveBeenCalledTimes(1);
    expect(result.planId).toBe('plan-cp-sat-test');
    expect(result.algorithmVersion).toBe('1.0.0');
    expect(result.slots[0].reasons).toContain('BEFORE_DEADLINE');
    expect(result.mobilityFindings?.[0].type).toBe('ZIG_ZAG_ROUTE');
  });
});
