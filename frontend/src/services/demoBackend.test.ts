import { describe, it, expect, beforeEach } from 'vitest';
import apiClient from './apiClient';
import { seedDemoData, resetDemoData } from './demoBackend';
import { setDemoMode, getDemoDate } from './demoMode';
import { eventApi } from './eventApi';
import { schedulingApi } from './schedulingApi';
import { publicScheduleApi } from './publicScheduleApi';

describe('SmartSchedule Demo Mode & Adapter', () => {
  beforeEach(() => {
    setDemoMode(true);
    resetDemoData();
  });

  it('seeds initial student dataset with 5 fixed lectures and 5 tasks', () => {
    const data = seedDemoData();
    expect(data.schedules[0].name).toBe('Academic Schedule');
    expect(data.schedules[0].timezone).toBe('Asia/Ho_Chi_Minh');

    // 5 fixed classes
    expect(data.events).toHaveLength(5);
    const titles = data.events.map((e) => e.title);
    expect(titles).toContain('Database Systems');
    expect(titles).toContain('Machine Learning');
    expect(titles).toContain('Operating Systems');
    expect(titles).toContain('Software Engineering');
    expect(titles).toContain('Computer Networks');

    // All 5 fixed classes are locked & fixed
    expect(data.events.every((e) => e.fixed && e.locked)).toBe(true);

    // 5 tasks
    expect(data.tasks).toHaveLength(5);
    const taskTitles = data.tasks.map((t) => t.title);
    expect(taskTitles).toContain('Machine Learning Assignment');
    expect(taskTitles).toContain('Database Project');
    expect(taskTitles).toContain('Operating Systems Review');
    expect(taskTitles).toContain('Research Paper');
    expect(taskTitles).toContain('English Practice');
  });

  it('fetches schedule list via apiClient and demoAdapter', async () => {
    const schedules = (await apiClient.get('/schedules')).data;
    expect(schedules).toHaveLength(1);
    expect(schedules[0].name).toBe('Academic Schedule');
  });

  it('detects event conflict when time overlaps an existing event', async () => {
    // Overlaps Wednesday 09:00-11:00 Operating Systems lecture
    const wedStart = getDemoDate(2, 10, 0); // Wed 10:00
    const wedEnd = getDemoDate(2, 12, 0);   // Wed 12:00

    const conflictResult = await eventApi.checkConflict('demo-schedule', wedStart, wedEnd);
    expect(conflictResult.hasConflict).toBe(true);
    expect(conflictResult.conflicts.length).toBeGreaterThan(0);
    expect(conflictResult.conflicts[0].title).toBe('Operating Systems');

    // Open slot with no conflict (e.g. Wednesday 06:00-08:00)
    const openStart = getDemoDate(2, 6, 0);
    const openEnd = getDemoDate(2, 8, 0);
    const noConflictResult = await eventApi.checkConflict('demo-schedule', openStart, openEnd);
    expect(noConflictResult.hasConflict).toBe(false);
  });

  it('generates deterministic 6-slot plan and applies it to the calendar', async () => {
    const plan = await schedulingApi.generate('demo-schedule', {
      from: getDemoDate(0, 8, 0),
      to: getDemoDate(6, 22, 0),
    });

    expect(plan.slots).toHaveLength(6);
    expect(plan.summary?.plannedMinutes).toBe(720); // 12 hours
    expect(plan.summary?.remainingMinutes).toBe(180); // 3 hours
    expect(plan.summary?.hardConflicts).toBe(0);
    expect(plan.summary?.deadlineRisks).toBe(1);

    // Apply the plan
    await schedulingApi.apply('demo-schedule', plan);

    // Now events list should contain 5 fixed + 6 generated = 11 events
    const allEvents = await eventApi.list('demo-schedule', getDemoDate(0, 0, 0), getDemoDate(7, 23, 59));
    expect(allEvents.length).toBe(11);
    const mlSession = allEvents.find((e) => e.title.includes('Machine Learning Assignment'));
    expect(mlSession).toBeDefined();
    expect(mlSession?.fixed).toBe(false);
  });

  it('returns clean public schedule hiding internal metadata', async () => {
    const publicData = await publicScheduleApi.get('smart-schedule-demo');
    expect(publicData.name).toContain('Alex Nguyen');
    expect(publicData.timezone).toBe('Asia/Ho_Chi_Minh');
    expect(publicData.events.length).toBeGreaterThanOrEqual(5);

    for (const item of publicData.events) {
      expect(item.title).toBeDefined();
      expect(item.startsAt).toBeDefined();
      expect(item.endsAt).toBeDefined();
      // Internal metadata not present on public events
      expect((item as any).id).toBeUndefined();
      expect((item as any).notes).toBeUndefined();
    }
  });
});
