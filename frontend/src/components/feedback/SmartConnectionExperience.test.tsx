import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SmartConnectionExperience } from './SmartConnectionExperience';

describe('SmartConnectionExperience — Component & Zero-Icon Verification', () => {
  it('1. Renders CONNECTED state with active badge and latency', () => {
    const html = renderToStaticMarkup(
      <SmartConnectionExperience
        status="CONNECTED"
        latencyMs={85}
        targetUrl="https://api.smartschedule.edu.vn"
      />
    );

    expect(html).toContain('ACTIVE · 85ms');
    expect(html).toContain('api.smartschedule.edu.vn');
    expect(html).toContain('smart-badge-connected');
    expect(html).toContain('smart-orbit-visual');
  });

  it('2. Renders SLOW state with Render cold start warning', () => {
    const html = renderToStaticMarkup(
      <SmartConnectionExperience
        status="SLOW"
        targetUrl="https://smartschedule.onrender.com"
      />
    );

    expect(html).toContain('SLOW RESPONSE');
    expect(html).toContain('Server Cold Start in Progress');
    expect(html).toContain('smart-badge-slow');
    expect(html).toContain('Render cold start');
  });

  it('3. Renders FAILED state with error message and retry action', () => {
    const html = renderToStaticMarkup(
      <SmartConnectionExperience
        status="FAILED"
        error="Gateway timeout 504"
        onRetry={() => {}}
      />
    );

    expect(html).toContain('LINK OFFLINE');
    expect(html).toContain('Gateway timeout 504');
    expect(html).toContain('smart-badge-failed');
    expect(html).toContain('Retry Connection');
  });

  it('4. Renders different UI variants correctly (inline, card, fullscreen)', () => {
    const htmlInline = renderToStaticMarkup(
      <SmartConnectionExperience variant="inline" status="CONNECTING" />
    );
    expect(htmlInline).toContain('smart-variant-inline');

    const htmlCard = renderToStaticMarkup(
      <SmartConnectionExperience variant="card" status="CONNECTING" />
    );
    expect(htmlCard).toContain('smart-variant-card');

    const htmlFullscreen = renderToStaticMarkup(
      <SmartConnectionExperience variant="fullscreen" status="CONNECTING" />
    );
    expect(htmlFullscreen).toContain('smart-variant-fullscreen');
  });

  it('5. Strictly satisfies ZERO-ICON COMPLIANCE (no SVG elements, pure CSS geometric orbits)', () => {
    const html = renderToStaticMarkup(
      <SmartConnectionExperience
        status="SLOW"
        targetUrl="https://smartschedule.onrender.com"
      />
    );

    // Verify ABSOLUTE ZERO SVG ICON RULE
    expect(html).not.toContain('<svg');
    expect(html).not.toContain('lucide');

    // Verify pure CSS geometric orbit visual elements
    expect(html).toContain('smart-orbit-visual');
    expect(html).toContain('smart-orbit-ring-outer');
    expect(html).toContain('smart-orbit-ring-middle');
    expect(html).toContain('smart-orbit-core');
  });
});
