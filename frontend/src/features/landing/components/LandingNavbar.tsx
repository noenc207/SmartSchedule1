import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BRAND_ASSETS } from '../assets/brandAssets';

export function LandingNavbar() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 15);
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
    <header className={`landing-navbar ${scrolled ? 'scrolled' : ''}`} role="banner">
      <div className="landing-container landing-navbar-inner">
        {/* Brand identity: FPT Logo + SmartSchedule Title */}
        <Link
          to="/"
          className="landing-brand"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="SmartSchedule - Trang chủ"
        >
          <img
            src={BRAND_ASSETS.fptLogoUrl}
            alt="FPT University Logo"
            className="landing-brand-logo"
            width={120}
            height={34}
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div className="landing-brand-text">
            <span className="landing-brand-title">
              Smart<span>Schedule</span>
            </span>
            <span className="landing-brand-badge">AI Campus · FPTU</span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="landing-nav-links" aria-label="Điều hướng chính">
          <button
            type="button"
            className="landing-nav-link"
            onClick={() => scrollToSection('chaos')}
          >
            Thực trạng
          </button>
          <button
            type="button"
            className="landing-nav-link"
            onClick={() => scrollToSection('features')}
          >
            Tính năng
          </button>
          <button
            type="button"
            className="landing-nav-link"
            onClick={() => scrollToSection('ai-assistant')}
          >
            Trợ lý AI
          </button>
          <button
            type="button"
            className="landing-nav-link"
            onClick={() => scrollToSection('product-preview')}
          >
            Trải nghiệm
          </button>
          <button
            type="button"
            className="landing-nav-link"
            onClick={() => scrollToSection('how-it-works')}
          >
            Quy trình
          </button>
          <button
            type="button"
            className="landing-nav-link"
            onClick={() => scrollToSection('faq')}
          >
            FAQ
          </button>
        </nav>

        {/* Navigation Action Buttons */}
        <div className="landing-nav-actions">
          <Link to="/login" className="landing-btn-login">
            Đăng nhập
          </Link>
          <Link to="/register" className="landing-btn-cta">
            Bắt đầu miễn phí
          </Link>

          {/* Mobile hamburger menu toggle */}
          <button
            type="button"
            className="landing-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Đóng menu điều hướng' : 'Mở menu điều hướng'}
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="landing-mobile-drawer open" role="dialog" aria-modal="true" aria-label="Menu di động">
          <button
            type="button"
            className="landing-mobile-link"
            onClick={() => scrollToSection('chaos')}
          >
            Thực trạng lịch học
          </button>
          <button
            type="button"
            className="landing-mobile-link"
            onClick={() => scrollToSection('features')}
          >
            Tính năng chuẩn FPTU
          </button>
          <button
            type="button"
            className="landing-mobile-link"
            onClick={() => scrollToSection('ai-assistant')}
          >
            Trợ lý Cóc AI 24/7
          </button>
          <button
            type="button"
            className="landing-mobile-link"
            onClick={() => scrollToSection('product-preview')}
          >
            Trình mô phỏng Sandbox
          </button>
          <button
            type="button"
            className="landing-mobile-link"
            onClick={() => scrollToSection('how-it-works')}
          >
            Quy trình đồng bộ FAP
          </button>
          <button
            type="button"
            className="landing-mobile-link"
            onClick={() => scrollToSection('faq')}
          >
            Câu hỏi thường gặp
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
            <Link
              to="/login"
              className="landing-btn-login"
              style={{ textAlign: 'center' }}
              onClick={() => setMobileMenuOpen(false)}
            >
              Đăng nhập tài khoản FPT
            </Link>
            <Link
              to="/register"
              className="landing-btn-cta"
              style={{ textAlign: 'center' }}
              onClick={() => setMobileMenuOpen(false)}
            >
              Tạo tài khoản mới
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
