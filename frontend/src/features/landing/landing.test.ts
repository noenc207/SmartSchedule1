import { describe, expect, it } from 'vitest';
import { BRAND_ASSETS, BRAND_COLORS } from './assets/brandAssets';

describe('Landing page brand assets and configurations', () => {
  it('specifies the canonical mascot model path', () => {
    expect(BRAND_ASSETS.mascotModelUrl).toBe('/models/base_basic_pbr.glb');
  });

  it('specifies the official FPT University logo path', () => {
    expect(BRAND_ASSETS.fptLogoUrl).toBe('/fpt-logo.png');
  });

  it('contains the official FPT corporate color definitions', () => {
    expect(BRAND_COLORS.fptOrange).toBe('#f27024');
    expect(BRAND_COLORS.fptBlue).toBe('#0047ba');
    expect(BRAND_COLORS.fptGreen).toBe('#009a3e');
  });
});
