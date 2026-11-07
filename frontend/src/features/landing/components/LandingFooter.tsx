import React from 'react';
import { Link } from 'react-router-dom';
import { BRAND_ASSETS } from '../assets/brandAssets';

export function LandingFooter() {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="landing-footer" role="contentinfo">
      <div className="landing-container">
        <div className="landing-footer-grid">
          {/* Brand Column */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <img
                src={BRAND_ASSETS.fptLogoUrl}
                alt="FPT University Logo"
                width={110}
                height={32}
                style={{ objectFit: 'contain' }}
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>
                Smart<span style={{ color: '#f97316' }}>Schedule</span>
              </span>
            </div>
            <p className="landing-footer-desc">
              Nền tảng sắp xếp thời khóa biểu 6 slot và điều phối tiến độ đồ án thông minh dành riêng cho sinh viên FPT University Quy Nhơn AI Campus.
            </p>
            <p className="landing-footer-address">
              📍 Khu đô thị mới An Phú Thịnh, Phường Nhơn Bình & Phường Đống Đa, TP. Quy Nhơn, Bình Định
            </p>
          </div>

          {/* Quick Links Column */}
          <div>
            <h4 className="landing-footer-col-title">Khám phá</h4>
            <div className="landing-footer-links">
              <button type="button" className="landing-footer-link" onClick={() => scrollTo('chaos')}>
                Mô phỏng xung đột lịch
              </button>
              <button type="button" className="landing-footer-link" onClick={() => scrollTo('features')}>
                Kiến trúc 6 Slot FPTU
              </button>
              <button type="button" className="landing-footer-link" onClick={() => scrollTo('ai-assistant')}>
                Trợ lý Cóc AI 24/7
              </button>
              <button type="button" className="landing-footer-link" onClick={() => scrollTo('product-preview')}>
                Trình mô phỏng Studio
              </button>
              <button type="button" className="landing-footer-link" onClick={() => scrollTo('how-it-works')}>
                Quy trình 4 bước
              </button>
            </div>
          </div>

          {/* Academic Portal Column */}
          <div>
            <h4 className="landing-footer-col-title">Hệ sinh thái FPTU</h4>
            <div className="landing-footer-links">
              <a href="https://fap.fpt.edu.vn" target="_blank" rel="noreferrer" className="landing-footer-link">
                FAP Academic Portal ↗
              </a>
              <a href="https://flm.fpt.edu.vn" target="_blank" rel="noreferrer" className="landing-footer-link">
                FLM Learning Materials ↗
              </a>
              <a href="https://cms.fpt.edu.vn" target="_blank" rel="noreferrer" className="landing-footer-link">
                CMS Course Management ↗
              </a>
              <a href="https://quynhon.fpt.edu.vn" target="_blank" rel="noreferrer" className="landing-footer-link">
                FPTU Quy Nhơn AI Campus ↗
              </a>
            </div>
          </div>

          {/* Student Auth Column */}
          <div>
            <h4 className="landing-footer-col-title">Bắt đầu ngay</h4>
            <div className="landing-footer-links">
              <Link to="/login" className="landing-footer-link">
                Đăng nhập Không gian Học tập →
              </Link>
              <Link to="/register" className="landing-footer-link">
                Đăng ký tài khoản Sinh viên mới →
              </Link>
              <button type="button" className="landing-footer-link" onClick={() => scrollTo('faq')}>
                Câu hỏi thường gặp (FAQ)
              </button>
            </div>
          </div>
        </div>

        {/* Footer Bottom Bar */}
        <div className="landing-footer-bottom">
          <span>
            © {new Date().getFullYear()} SmartSchedule · Phát triển vì cộng đồng sinh viên FPT University Quy Nhơn AI Campus
          </span>
          <div className="landing-footer-status">
            <span className="landing-status-indicator">● OR-Tools CP-SAT v2.4 Online</span>
            <span>Bảo mật OAuth 2.0</span>
            <span>Zero Tracking</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
