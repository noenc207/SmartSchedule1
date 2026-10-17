import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AuthVisual3D } from './AuthVisual3D';
import { BorderBeam } from '../../components/ui/border-beam';
import ShinyText from '../../components/ShinyText';

describe('SmartSchedule 3D Visual Hero, Local Asset Skills & Zero-Icon Verification', () => {
  it('1. BorderBeam renders with custom duration, size, and gradient colors', () => {
    const html = renderToStaticMarkup(
      <BorderBeam size={150} duration={8} colorFrom="#ea580c" colorTo="#fbbf24" />
    );
    expect(html).toContain('animate-border-beam');
    expect(html).toContain('--size:150px');
    expect(html).toContain('--duration:8s');
    expect(html).toContain('--color-from:#ea580c');
    expect(html).toContain('--color-to:#fbbf24');
  });

  it('2. ShinyText renders shimmering typography without icons', () => {
    const html = renderToStaticMarkup(
      <ShinyText text="Academic Knowledge Core" speed={4} />
    );
    expect(html).toContain('Academic Knowledge Core');
    expect(html).toContain('animate-shine');
    expect(html).toContain('linear-gradient');
    expect(html).not.toContain('<svg');
    expect(html).not.toContain('lucide');
  });

  it('3. AuthVisual3D renders static WebP fallback in test/non-WebGL environment', () => {
    const html = renderToStaticMarkup(<AuthVisual3D mode="login" />);
    expect(html).toContain('auth-visual-hero');
    expect(html).toContain('anim-3d-crystal-polyhedron.webp');
    expect(html).toContain('Academic Knowledge Core');
    expect(html).toContain('3D Geometric Representation');
  });

  it('4. AuthVisual3D renders academic branding and status matrix', () => {
    const html = renderToStaticMarkup(<AuthVisual3D mode="login" />);
    expect(html).toContain('FPT UNIVERSITY QUY NHƠN · AI CAMPUS');
    expect(html).toContain('Constraint satisfaction engine');
    expect(html).toContain('3D Architecture');
    expect(html).toContain('Interactive WebGL');
    expect(html).toContain('Constraint Matrix');
    expect(html).toContain('0 Conflicts');
    expect(html).toContain('Optimizer Efficiency');
    expect(html).toContain('99.8% Pacing');
  });

  it('5. AuthVisual3D registers register mode typography cleanly', () => {
    const html = renderToStaticMarkup(<AuthVisual3D mode="register" />);
    expect(html).toContain('Initialize Your');
    expect(html).toContain('Academic Odyssey');
  });

  it('6. Strict Zero-Icon Compliance: No SVG icons or Lucide in AuthVisual3D', () => {
    const html = renderToStaticMarkup(<AuthVisual3D mode="login" />);
    expect(html).not.toContain('lucide');
    expect(html).not.toContain('font-awesome');
    // Ensure no svg icons were added
    expect(html).not.toContain('<svg');
  });

  it('7. Verify prohibited React Bits Pro effects are not rendered in AuthVisual3D', () => {
    const html = renderToStaticMarkup(<AuthVisual3D mode="login" />);
    expect(html).not.toContain('luminous-filaments');
    expect(html).not.toContain('binary-orbits');
    expect(html).not.toContain('rising-lines');
    expect(html).not.toContain('magic-transform');
  });
});
