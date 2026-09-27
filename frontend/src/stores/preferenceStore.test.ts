import { beforeEach, describe, expect, it } from 'vitest';
import { usePreferenceStore, defaultPreferences } from './preferenceStore';

describe('preferenceStore', () => {
  beforeEach(() => {
    usePreferenceStore.getState().resetPreferences();
  });

  it('initializes with default preferences', () => {
    const state = usePreferenceStore.getState();
    expect(state.calendarView).toBe('timeGridWeek');
    expect(state.taskFilterStatus).toBe('ALL');
    expect(state.taskFilterPriority).toBe('ALL');
    expect(state.taskSortBy).toBe('DEADLINE');
    expect(state.sidebarCollapsed).toBe(false);
  });

  it('updates calendar view', () => {
    usePreferenceStore.getState().setCalendarView('dayGridMonth');
    expect(usePreferenceStore.getState().calendarView).toBe('dayGridMonth');
  });

  it('updates task filters and sorting', () => {
    usePreferenceStore.getState().setTaskFilterPriority('HIGH');
    usePreferenceStore.getState().setTaskSortBy('DURATION_DESC');
    expect(usePreferenceStore.getState().taskFilterPriority).toBe('HIGH');
    expect(usePreferenceStore.getState().taskSortBy).toBe('DURATION_DESC');
  });

  it('toggles sidebar collapsed state', () => {
    expect(usePreferenceStore.getState().sidebarCollapsed).toBe(false);
    usePreferenceStore.getState().toggleSidebarCollapsed();
    expect(usePreferenceStore.getState().sidebarCollapsed).toBe(true);
    usePreferenceStore.getState().toggleSidebarCollapsed();
    expect(usePreferenceStore.getState().sidebarCollapsed).toBe(false);
  });

  it('updates semantic zoom level', () => {
    expect(usePreferenceStore.getState().semanticZoomLevel).toBe('detailed');
    usePreferenceStore.getState().setSemanticZoomLevel('compact');
    expect(usePreferenceStore.getState().semanticZoomLevel).toBe('compact');
  });

  it('toggles mini calendar visibility', () => {
    expect(usePreferenceStore.getState().isMiniCalendarVisible).toBe(true);
    usePreferenceStore.getState().toggleMiniCalendar();
    expect(usePreferenceStore.getState().isMiniCalendarVisible).toBe(false);
    usePreferenceStore.getState().toggleMiniCalendar();
    expect(usePreferenceStore.getState().isMiniCalendarVisible).toBe(true);
  });

  it('resets all preferences to defaults', () => {
    usePreferenceStore.getState().setCalendarView('listWeek');
    usePreferenceStore.getState().setSemanticZoomLevel('compact');
    usePreferenceStore.getState().setIsMiniCalendarVisible(false);
    usePreferenceStore.getState().setTaskFilterPriority('LOW');
    usePreferenceStore.getState().setSidebarCollapsed(true);
    usePreferenceStore.getState().resetPreferences();

    const state = usePreferenceStore.getState();
    expect(state.calendarView).toBe(defaultPreferences.calendarView);
    expect(state.semanticZoomLevel).toBe('detailed');
    expect(state.isMiniCalendarVisible).toBe(true);
    expect(state.taskFilterPriority).toBe(defaultPreferences.taskFilterPriority);
    expect(state.sidebarCollapsed).toBe(defaultPreferences.sidebarCollapsed);
    expect(state.heroBannerTheme).toBe('fpt-quynhon');
    expect(state.weatherLocationMode).toBe('auto');
  });

  it('updates banner theme and custom image URLs', () => {
    usePreferenceStore.getState().setHeroBannerTheme('fpt-danang');
    expect(usePreferenceStore.getState().heroBannerTheme).toBe('fpt-danang');

    usePreferenceStore.getState().setHeroBannerCustomUrl('data:image/png;base64,customBannerData');
    expect(usePreferenceStore.getState().heroBannerCustomUrl).toBe('data:image/png;base64,customBannerData');

    usePreferenceStore.getState().setCustomCampusTag('FPT University - Da Nang');
    expect(usePreferenceStore.getState().customCampusTag).toBe('FPT University - Da Nang');
  });

  it('updates weather preferences', () => {
    usePreferenceStore.getState().setWeatherLocationMode('manual');
    usePreferenceStore.getState().setWeatherManualCity('TP. Hồ Chí Minh');

    const state = usePreferenceStore.getState();
    expect(state.weatherLocationMode).toBe('manual');
    expect(state.weatherManualCity).toBe('TP. Hồ Chí Minh');
  });
});
