/**
 * Canonical brand assets registry for SmartSchedule Landing Page
 * Uses official assets from frontend/logo and frontend/public
 */
export const BRAND_ASSETS = {
  // 3D Mascot Model (Full PBR + Emissive workflow)
  mascotModelUrl: '/models/base_basic_pbr.glb',
  mascotEmissiveUrl: '/models/texture_emissive.png',
  mascotShadedModelUrl: '/models/base_basic_shaded.glb',

  // Official FPT University Logo (proportions intact)
  fptLogoUrl: '/fpt-logo.png',

  // Institutional and Product copy
  productName: 'SmartSchedule',
  institutionName: 'FPT University',
  campusName: 'Quy Nhơn AI Campus',
  tagline: 'Your day, intelligently arranged.',

  // Official Brand Colors
  colors: {
    fptOrange: '#f27024',
    fptBlue: '#0047ba',
    fptGreen: '#009a3e',
    darkBg: '#090c13',
    darkElevated: '#111622',
    darkSurface: '#161c2b',
    border: 'rgba(255, 255, 255, 0.08)',
    borderSubtle: 'rgba(255, 255, 255, 0.04)',
    textPrimary: '#f8fafc',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
  },
} as const;

export const BRAND_COLORS = BRAND_ASSETS.colors;
