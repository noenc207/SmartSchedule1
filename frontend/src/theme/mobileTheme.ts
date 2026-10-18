/**
 * SmartSchedule Mobile Design System Tokens
 * Official FPT University Quy Nhon Academic Palette & Mobile Web Specs
 */

export const mobileTokens = {
  colors: {
    brand: {
      primary: '#EA580C',        // FPT Primary Orange
      bright: '#F97316',         // Bright energetic orange
      deep: '#C2410C',           // Deep active orange
      darkest: '#9A3412',        // Pressed / high contrast orange
      soft: '#FFF7ED',           // Warm cream ivory (50)
      subtle: '#FFEDD5',         // Soft pastel orange (100)
    },
    campus: {
      blue: '#0047BA',           // FPT Blue (Fixed classes / campus academic)
      blueSoft: '#EFF6FF',
      green: '#009A3E',          // FPT Green (Completed / healthy schedule)
      greenSoft: '#F0FDF4',
      amber: '#D97706',          // Warning / deadline soon
      amberSoft: '#FFFBEB',
      red: '#DC2626',            // Overdue / exam conflict
      redSoft: '#FEF2F2',
      purple: '#7C3AED',         // Projects / SWP capstone
      purpleSoft: '#F5F3FF',
    },
    light: {
      background: '#F8FAFC',
      surface: '#FFFFFF',
      surfaceSubtle: '#F1F5F9',
      border: '#E2E8F0',
      borderStrong: '#CBD5E1',
      textPrimary: '#0F172A',
      textSecondary: '#475569',
      textMuted: '#94A3B8',
    },
    dark: {
      background: '#0D1117',
      surface: '#161B22',
      surfaceSubtle: '#1F242C',
      border: '#21262D',
      borderStrong: '#30363D',
      textPrimary: '#F0F6FC',
      textSecondary: '#8B949E',
      textMuted: '#6E7681',
    },
  },
  touch: {
    minTarget: '44px',
    comfortTarget: '48px',
    targetPadded: '52px',
  },
  layout: {
    navHeight: '64px',
    headerHeight: '56px',
    safeTop: 'env(safe-area-inset-top, 0px)',
    safeBottom: 'env(safe-area-inset-bottom, 0px)',
    safeLeft: 'env(safe-area-inset-left, 0px)',
    safeRight: 'env(safe-area-inset-right, 0px)',
    maxContentWidth: '600px',
  },
  radius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    full: '9999px',
  },
  elevation: {
    card: '0 1px 3px rgba(15, 23, 42, 0.05), 0 1px 2px rgba(15, 23, 42, 0.03)',
    cardHover: '0 4px 12px rgba(15, 23, 42, 0.08)',
    sheet: '0 -10px 35px rgba(15, 23, 42, 0.15)',
    floating: '0 8px 24px -4px rgba(234, 88, 12, 0.35)',
  },
  spring: {
    tap: { scale: 0.96, transition: { duration: 0.1 } },
    gentle: { stiffness: 350, damping: 30 },
    snappy: { stiffness: 450, damping: 25 },
    sheet: { stiffness: 300, damping: 32 },
  },
} as const;

export type MobileTokens = typeof mobileTokens;
