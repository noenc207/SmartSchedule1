import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  SoftBlurInText,
  ShimmerSweepBadge,
  MicroScaleFadeText,
  PerCharacterRiseText,
  ANIMATE_TEXT_EASINGS,
} from './AnimateText';

describe('AnimateText Component Suite — animate-text Skill Parity & Zero-Icon Verification', () => {
  it('1. SoftBlurInText renders per-character split with accessible screen reader label and zero layout shift', () => {
    const html = renderToStaticMarkup(
      <SoftBlurInText text="Intelligent Academic" delay={0.18} />
    );

    // Screen reader accessible role and label
    expect(html).toContain('role="text"');
    expect(html).toContain('aria-label="Intelligent Academic"');
    expect(html).toContain('class="sr-only"');
    expect(html).toContain('Intelligent Academic');

    // Per-character split containers
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('auth-soft-blur-in');

    // Zero-icon rule
    expect(html).not.toContain('<svg');
    expect(html).not.toContain('lucide');
  });

  it('2. SoftBlurInText preserves FPTU orange text emphasis when highlight is true', () => {
    const html = renderToStaticMarkup(
      <SoftBlurInText text="Knowledge Core" highlight className="font-black" />
    );

    expect(html).toContain('Knowledge Core');
    expect(html).toContain('auth-text-highlight');
    expect(html).toContain('color:#ea580c');
  });

  it('3. ShimmerSweepBadge renders campus badge with one-shot sweep and zero icons', () => {
    const html = renderToStaticMarkup(
      <ShimmerSweepBadge className="auth-3d-badge-pill">
        <span className="auth-3d-badge-dot" />
        <span className="auth-3d-badge-text">FPT UNIVERSITY QUY NHƠN · AI CAMPUS</span>
      </ShimmerSweepBadge>
    );

    expect(html).toContain('auth-shimmer-sweep-badge');
    expect(html).toContain('auth-3d-badge-pill');
    expect(html).toContain('FPT UNIVERSITY QUY NHƠN · AI CAMPUS');
    expect(html).toContain('auth-3d-badge-dot');
    expect(html).not.toContain('<svg');
  });

  it('4. MicroScaleFadeText renders form title as whole unit without mid-word breaks or layout shifts', () => {
    const html = renderToStaticMarkup(
      <MicroScaleFadeText text="Welcome back" delay={0.15} />
    );

    expect(html).toContain('auth-micro-scale-fade');
    expect(html).toContain('Welcome back');
    expect(html).toContain('pointer-events:none');
    expect(html).not.toContain('<svg');
  });

  it('5. PerCharacterRiseText renders crisp status milestones with per-character animation and zero blur', () => {
    const html = renderToStaticMarkup(
      <PerCharacterRiseText text="OPTIMIZE" delay={0.9} />
    );

    expect(html).toContain('auth-per-character-rise');
    expect(html).toContain('aria-label="OPTIMIZE"');
    expect(html).toContain('class="sr-only"');
    expect(html).toContain('OPTIMIZE');
    // Confirm zero blur in PerCharacterRiseText
    expect(html).not.toContain('blur(');
    expect(html).not.toContain('<svg');
  });

  it('6. Exact signature easings match .agents/skills/animate-text specifications', () => {
    expect(ANIMATE_TEXT_EASINGS.softBlurIn).toEqual([0.22, 1, 0.36, 1]);
    expect(ANIMATE_TEXT_EASINGS.shimmerSweep).toEqual([0.22, 1, 0.36, 1]);
    expect(ANIMATE_TEXT_EASINGS.microScaleFade).toEqual([0.32, 0.72, 0, 1]);
    expect(ANIMATE_TEXT_EASINGS.perCharacterRise).toEqual([0.2, 0.8, 0.2, 1]);
  });
});
