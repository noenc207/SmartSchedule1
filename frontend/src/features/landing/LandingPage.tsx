import React, { useEffect } from 'react';
import { LandingNavbar } from './components/LandingNavbar';
import { LandingHero } from './components/LandingHero';
import { LandingChaos } from './components/LandingChaos';
import { LandingFeatures } from './components/LandingFeatures';
import { LandingAIAssistant } from './components/LandingAIAssistant';
import { LandingProductPreview } from './components/LandingProductPreview';
import { LandingHowItWorks } from './components/LandingHowItWorks';
import { LandingTrust } from './components/LandingTrust';
import { LandingFAQ } from './components/LandingFAQ';
import { ClosingScene } from './components/ClosingScene';
import { LandingFooter } from './components/LandingFooter';
import './landing.css';

export function LandingPage() {
  useEffect(() => {
    // Dynamic page title & meta for high SEO and clear branding
    document.title = 'SmartSchedule · Tối ưu hóa lịch học FPT University Quy Nhơn với Trợ lý 3D & AI';

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute(
      'content',
      'Nền tảng sắp xếp thời khóa biểu và kế hoạch học thuật thông minh cho sinh viên FPT University Quy Nhơn AI Campus cùng Mascot 3D Cóc AI. Tự động phát hiện xung đột, tính đệm di chuyển và quản lý deadline đồ án.',
    );

    // Passive, RAF-throttled pointer tracker for subtle ambient glow on desktop
    let rafId: number | null = null;
    const handlePointerMove = (e: MouseEvent) => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
        document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
        rafId = null;
      });
    };
    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="landing-page-root">
      {/* Accessible skip link for keyboard navigation */}
      <a href="#main-content" className="landing-skip-link">
        Chuyển đến nội dung chính
      </a>

      {/* Subtle Ambient Mouse Glow (Desktop Only, Pointer-Events None) */}
      <div className="landing-cursor-glow" aria-hidden="true" />

      {/* Warm Ambient Radial Glows */}
      <div className="landing-ambient-layer" aria-hidden="true">
        <div className="landing-glow-top" />
        <div className="landing-glow-mid" />
        <div className="landing-glow-bottom" />
      </div>

      {/* Sticky Accessible Navigation Bar */}
      <LandingNavbar />

      {/* Semantic Main Content Storytelling Flow */}
      <main id="main-content">
        {/* Section 1: Hero with 3D Front-Facing Mascot Centerpiece */}
        <LandingHero />

        {/* Section 2: The Academic Chaos (Student problem & live conflict simulation) */}
        <LandingChaos />

        {/* Section 3: Smart Scheduling (6 FPT Slots & CSP Solver) */}
        <LandingFeatures />

        {/* Section 4: AI Academic Assistant (Interactive Chat Scenarios & Deep Work) */}
        <LandingAIAssistant />

        {/* Section 5: Interactive Product Preview (3-Tab Simulator) */}
        <LandingProductPreview />

        {/* Section 6: How It Works (4-Step Flow) */}
        <LandingHowItWorks />

        {/* Trust & Campus Security */}
        <LandingTrust />

        {/* FAQ */}
        <LandingFAQ />

        {/* Section 7: Final CTA with Front-Facing 3D Mascot Return */}
        <ClosingScene />

        {/* Footer */}
        <LandingFooter />
      </main>
    </div>
  );
}

export default LandingPage;
