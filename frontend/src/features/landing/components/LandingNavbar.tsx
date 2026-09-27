import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BRAND_ASSETS } from '../assets/brandAssets';

export function LandingNavbar() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className={`landing-navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="landing-navbar-inner">
        {/* Brand identity: FPT Logo + SmartSchedule Title */}
        <div
          className="landing-brand"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          role="button"
          tabIndex={0}
        >
          <img
            src={BRAND_ASSETS.fptLogoUrl}
            alt="FPT University Logo"
            className="landing-fpt-logo"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div className="landing-brand-text">
            <span className="landing-brand-name">SmartSchedule</span>
            <span className="landing-brand-sub">FPTU Quy Nhơn</span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="landing-nav-links">
          <button type="button" className="landing-nav-link" onClick={() => scrollToSection('problem')}>
            Vấn đề
          </button>
          <button type="button" className="landing-nav-link" onClick={() => scrollToSection('transformation')}>
            Chuyển đổi
          </button>
          <button type="button" className="landing-nav-link" onClick={() => scrollToSection('smart-plan')}>
            Smart Plan
          </button>
          <button type="button" className="landing-nav-link" onClick={() => scrollToSection('mobility')}>
            Di chuyển
          </button>
          <button type="button" className="landing-nav-link" onClick={() => scrollToSection('what-if')}>
            What-if
          </button>
          <button type="button" className="landing-nav-link" onClick={() => scrollToSection('control')}>
            Kiểm soát
          </button>
        </nav>

        {/* CTA Button */}
        <div className="landing-nav-actions">
          <button
            type="button"
            className="btn-primary-glow"
            onClick={() => navigate('/calendar')}
          >
            Vào SmartSchedule →
          </button>

          {/* Mobile hamburger toggle */}
          <button
            type="button"
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="landing-mobile-menu">
          <button type="button" className="landing-mobile-nav-link" onClick={() => scrollToSection('problem')}>
            Vấn đề thực tế
          </button>
          <button type="button" className="landing-mobile-nav-link" onClick={() => scrollToSection('transformation')}>
            Dòng thời gian chuyển đổi
          </button>
          <button type="button" className="landing-mobile-nav-link" onClick={() => scrollToSection('smart-plan')}>
            Cơ chế Smart Plan
          </button>
          <button type="button" className="landing-mobile-nav-link" onClick={() => scrollToSection('mobility')}>
            Nhận thức di chuyển
          </button>
          <button type="button" className="landing-mobile-nav-link" onClick={() => scrollToSection('what-if')}>
            Mô phỏng What-if
          </button>
          <button type="button" className="landing-mobile-nav-link" onClick={() => scrollToSection('control')}>
            Quyền kiểm soát
          </button>
          <button
            type="button"
            className="btn-primary-glow mobile-cta"
            onClick={() => {
              setMobileMenuOpen(false);
              navigate('/calendar');
            }}
          >
            Vào SmartSchedule →
          </button>
        </div>
      )}
    </header>
  );
}
