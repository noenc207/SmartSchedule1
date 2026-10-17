import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AuthSpotlight } from './AuthSpotlight';
import { AuthVisual3D } from './AuthVisual3D';
import { SocialRegistrationView } from './GoogleRegistrationView';
import { SocialAuthButtons } from './SocialAuthButtons';

describe('Premium Minimal Academic SaaS Auth Redesign & Zero-Icon Verification', () => {
  it('1. AuthVisual3D renders visual scene, telemetry cards, and campus branding with zero icons', () => {
    const html = renderToStaticMarkup(
      <AuthVisual3D mode="login" />
    );

    // Verify visual hero structure
    expect(html).toContain('auth-visual-hero');

    // Verify typography and branding
    expect(html).toContain('FPT UNIVERSITY QUY NHƠN · AI CAMPUS');
    expect(html).toContain('Intelligent Academic');
    expect(html).toContain('Knowledge Core');
    expect(html).toContain('3D Architecture');
    expect(html).toContain('0 Conflicts');
    expect(html).toContain('99.8% Pacing');

    // Verify zero icon library usage
    expect(html).not.toContain('lucide');
    expect(html).not.toContain('font-awesome');
  });

  it('2. AuthSpotlight renders dual-layer beam and core with pointer-events-none and aria-hidden', () => {
    const html = renderToStaticMarkup(
      <AuthSpotlight>
        <div id="test-card">Test Card Content</div>
      </AuthSpotlight>
    );

    expect(html).toContain('auth-spotlight-wrapper');
    expect(html).toContain('auth-spotlight-beam');
    expect(html).toContain('auth-spotlight-core');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('Test Card Content');
  });

  it('3. SocialAuthButtons renders typographic buttons with zero icons (no SVG, no lucide)', () => {
    const onGoogleToken = vi.fn();
    const html = renderToStaticMarkup(
      <SocialAuthButtons
        onGoogleToken={onGoogleToken}
        isLoading={false}
      />
    );

    // Verify presence of clear text labels
    expect(html).toContain('Google');
    expect(html).toContain('GitHub');
    expect(html).toContain('Facebook');

    // Verify ABSOLUTE ZERO ICON RULE: No svg elements in social buttons
    expect(html).not.toContain('<svg');
    expect(html).not.toContain('social-icon');
  });

  it('4. SocialAuthButtons displays loading text Connecting… when busy with zero icons', () => {
    const html = renderToStaticMarkup(
      <SocialAuthButtons
        onGoogleToken={vi.fn()}
        isLoading={true}
      />
    );

    expect(html).toContain('login-social-grid');
    expect(html).not.toContain('<svg');
  });

  it('5. SocialRegistrationView enforces zero-icon rule and renders verified identity', () => {
    const html = renderToStaticMarkup(
      <SocialRegistrationView
        provider="GOOGLE"
        email="student@fpt.edu.vn"
        displayName="Le Van B"
        isLoading={false}
        error={null}
        onSubmit={vi.fn()}
        onBack={vi.fn()}
      />
    );

    // Verified text tag instead of check icon
    expect(html).toContain('Verified Identity');
    expect(html).toContain('student@fpt.edu.vn');
    expect(html).toContain('Le Van B');
    expect(html).toContain('Registration Key');
    expect(html).toContain('Complete Registration');
    expect(html).toContain('Back to sign in');

    // Strict zero-icon assertion
    expect(html).not.toContain('<svg');
    expect(html).not.toContain('lucide');
  });
});
