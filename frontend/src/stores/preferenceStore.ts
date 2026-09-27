import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useAuthStore } from './authStore';

export type CalendarViewType =
  | 'timeGridDay'
  | 'timeGridWeek'
  | 'dayGridMonth'
  | 'listWeek'
  | 'quarter'
  | 'year'
  | 'timeline';

export type SemanticZoomLevel = 'compact' | 'normal' | 'detailed';
export type TaskFilterStatus = 'ALL' | 'UNSCHEDULED' | 'PARTIAL' | 'SCHEDULED' | 'SELECTED';
export type TaskFilterPriority = 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type TaskFilterDeadline = 'ALL' | 'TODAY' | 'TOMORROW' | '3DAYS' | '7DAYS' | 'OVERDUE';
export type TaskSortOption = 'DEADLINE' | 'PRIORITY' | 'DURATION_DESC' | 'DURATION_ASC' | 'TITLE';

export type TimeFormat = '24h' | '12h';

export type HeroBannerTheme = 'fpt-quynhon' | 'fpt-hanoi' | 'fpt-danang' | 'fpt-hcm' | 'custom';
export type WeatherLocationMode = 'auto' | 'manual';

export interface PreferenceState {
  calendarView: CalendarViewType;
  semanticZoomLevel: SemanticZoomLevel;
  isMiniCalendarVisible: boolean;
  timeFormat: TimeFormat;
  highContrast: boolean;
  hasCompletedOnboarding: boolean;
  preferredWorkspaceId: string | null;
  taskFilterStatus: TaskFilterStatus;
  taskFilterPriority: TaskFilterPriority;
  taskFilterDeadline: TaskFilterDeadline;
  taskSortBy: TaskSortOption;
  sidebarCollapsed: boolean;
  heroBannerTheme: HeroBannerTheme;
  heroBannerCustomUrl: string | null;
  quoteCardCustomUrl: string | null;
  customCampusTag: string | null;
  weatherLocationMode: WeatherLocationMode;
  weatherManualCity: string;

  setCalendarView: (view: CalendarViewType) => void;
  setSemanticZoomLevel: (level: SemanticZoomLevel) => void;
  setIsMiniCalendarVisible: (visible: boolean) => void;
  toggleMiniCalendar: () => void;
  setTimeFormat: (format: TimeFormat) => void;
  setHighContrast: (enabled: boolean) => void;
  setHasCompletedOnboarding: (completed: boolean) => void;
  setPreferredWorkspaceId: (id: string | null) => void;
  setTaskFilterStatus: (status: TaskFilterStatus) => void;
  setTaskFilterPriority: (priority: TaskFilterPriority) => void;
  setTaskFilterDeadline: (deadline: TaskFilterDeadline) => void;
  setTaskSortBy: (sort: TaskSortOption) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setHeroBannerTheme: (theme: HeroBannerTheme) => void;
  setHeroBannerCustomUrl: (url: string | null) => void;
  setQuoteCardCustomUrl: (url: string | null) => void;
  setCustomCampusTag: (tag: string | null) => void;
  setWeatherLocationMode: (mode: WeatherLocationMode) => void;
  setWeatherManualCity: (city: string) => void;
  resetPreferences: () => void;
}

export const defaultPreferences = {
  calendarView: 'timeGridWeek' as CalendarViewType,
  semanticZoomLevel: 'detailed' as SemanticZoomLevel,
  isMiniCalendarVisible: true,
  timeFormat: '24h' as TimeFormat,
  highContrast: false,
  hasCompletedOnboarding: false,
  preferredWorkspaceId: null as string | null,
  taskFilterStatus: 'ALL' as TaskFilterStatus,
  taskFilterPriority: 'ALL' as TaskFilterPriority,
  taskFilterDeadline: 'ALL' as TaskFilterDeadline,
  taskSortBy: 'DEADLINE' as TaskSortOption,
  sidebarCollapsed: false,
  heroBannerTheme: 'fpt-quynhon' as HeroBannerTheme,
  heroBannerCustomUrl: null as string | null,
  quoteCardCustomUrl: null as string | null,
  customCampusTag: null as string | null,
  weatherLocationMode: 'auto' as WeatherLocationMode,
  weatherManualCity: 'Quy Nhơn' as string,
};

function getScopedKey(name: string): string {
  try {
    const userId = useAuthStore.getState()?.user?.id ?? 'default';
    return `${name}_${userId}`;
  } catch {
    return name;
  }
}

const safeStorage = {
  getItem: (name: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(getScopedKey(name));
      }
    } catch {}
    return null;
  },
  setItem: (name: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(getScopedKey(name), value);
      }
    } catch {}
  },
  removeItem: (name: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(getScopedKey(name));
      }
    } catch {}
  },
};

export const usePreferenceStore = create<PreferenceState>()(
  persist(
    (set) => ({
      ...defaultPreferences,
      setCalendarView: (calendarView) => set({ calendarView }),
      setSemanticZoomLevel: (semanticZoomLevel) => set({ semanticZoomLevel }),
      setIsMiniCalendarVisible: (isMiniCalendarVisible) => set({ isMiniCalendarVisible }),
      toggleMiniCalendar: () =>
        set((state) => ({ isMiniCalendarVisible: !state.isMiniCalendarVisible })),
      setTimeFormat: (timeFormat) => set({ timeFormat }),
      setHighContrast: (highContrast) => {
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('high-contrast', highContrast);
        }
        set({ highContrast });
      },
      setHasCompletedOnboarding: (hasCompletedOnboarding) => set({ hasCompletedOnboarding }),
      setPreferredWorkspaceId: (preferredWorkspaceId) => set({ preferredWorkspaceId }),
      setTaskFilterStatus: (taskFilterStatus) => set({ taskFilterStatus }),
      setTaskFilterPriority: (taskFilterPriority) => set({ taskFilterPriority }),
      setTaskFilterDeadline: (taskFilterDeadline) => set({ taskFilterDeadline }),
      setTaskSortBy: (taskSortBy) => set({ taskSortBy }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      toggleSidebarCollapsed: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setHeroBannerTheme: (heroBannerTheme) => set({ heroBannerTheme }),
      setHeroBannerCustomUrl: (heroBannerCustomUrl) => set({ heroBannerCustomUrl }),
      setQuoteCardCustomUrl: (quoteCardCustomUrl) => set({ quoteCardCustomUrl }),
      setCustomCampusTag: (customCampusTag) => set({ customCampusTag }),
      setWeatherLocationMode: (weatherLocationMode) => set({ weatherLocationMode }),
      setWeatherManualCity: (weatherManualCity) => set({ weatherManualCity }),
      resetPreferences: () => {
        if (typeof document !== 'undefined') {
          document.documentElement.classList.remove('high-contrast');
        }
        set({ ...defaultPreferences });
      },
    }),
    {
      name: 'smartschedule_user_preferences',
      storage: createJSONStorage(() => safeStorage),
      onRehydrateStorage: () => (state) => {
        if (state && typeof document !== 'undefined') {
          document.documentElement.classList.toggle('high-contrast', Boolean(state.highContrast));
        }
      },
    }
  )
);
