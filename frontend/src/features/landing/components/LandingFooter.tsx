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
          <div className="landing-footer-brand">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8faff' }}>
                SmartSchedule
              </span>
            </div>
            <p className="landing-footer-tagline">
              Nền tảng sắp xếp thời khóa biểu và tối ưu hóa thời gian tự học cho sinh viên FPT University Quy Nhơn AI Campus.
            </p>
            <span className="landing-footer-campus">
              Khu đô thị An Phú Thịnh, Phường Nhơn Bình, TP. Quy Nhơn, Bình Định
            </span>
          </div>

          {/* Quick Links Column */}
          <div className="landing-footer-col">
            <h4 className="landing-footer-heading">Khám phá</h4>
            <div className="landing-footer-links">
              <button
                type="button"
                className="landing-footer-link"
                onClick={() => scrollTo('chaos')}
              >
                Thực trạng lịch học
              </button>
              <button
                type="button"
                className="landing-footer-link"
                onClick={() => scrollTo('features')}
              >
                Tính năng chuẩn FPTU
              </button>
              <button
                type="button"
                className="landing-footer-link"
                onClick={() => scrollTo('ai-assistant')}
              >
                Trợ lý AI 24/7
              </button>
              <button
                type="button"
                className="landing-footer-link"
                onClick={() => scrollTo('product-preview')}
              >
                Trình mô phỏng Sandbox
              </button>
              <button
                type="button"
                className="landing-footer-link"
                onClick={() => scrollTo('how-it-works')}
              >
                Quy trình đồng bộ FAP
              </button>
            </div>
          </div>

          {/* Academic Portal Column */}
          <div className="landing-footer-col">
            <h4 className="landing-footer-heading">Cổng thông tin</h4>
            <div className="landing-footer-links">
              <a
                href="https://fap.fpt.edu.vn"
                target="_blank"
                rel="noreferrer"
                className="landing-footer-link"
              >
                FAP Quy Nhơn ↗
              </a>
              <a
                href="https://flm.fpt.edu.vn"
                target="_blank"
                rel="noreferrer"
                className="landing-footer-link"
              >
                FLM Đề cương môn học ↗
              </a>
              <a
                href="https://cms.fpt.edu.vn"
                target="_blank"
                rel="noreferrer"
                className="landing-footer-link"
              >
                CMS Học tập trực tuyến ↗
              </a>
              <a
                href="https://quynhon.fpt.edu.vn"
                target="_blank"
                rel="noreferrer"
                className="landing-footer-link"
              >
                Trang chủ Campus ↗
              </a>
            </div>
          </div>

          {/* Student Auth Column */}
          <div className="landing-footer-col">
            <h4 className="landing-footer-heading">Sinh viên</h4>
            <div className="landing-footer-links">
              <Link to="/login" className="landing-footer-link">
                Đăng nhập tài khoản
              </Link>
              <Link to="/register" className="landing-footer-link">
                Đăng ký thành viên mới
              </Link>
              <button
                type="button"
                className="landing-footer-link"
                onClick={() => scrollTo('faq')}
              >
                Câu hỏi thường gặp
              </button>
            </div>
          </div>
        </div>

        {/* Footer Bottom Bar */}
        <div className="landing-footer-bottom">
          <span>
            © {new Date().getFullYear()} SmartSchedule · Phát triển vì cộng đồng sinh viên FPT University Quy Nhơn AI Campus
          </span>
          <div style={{ display: 'flex', gap: '20px' }}>
            <span>Bảo mật 100% dữ liệu</span>
            <span>Zero Tracking</span>
            <span>Phiên bản v2.5 AI Ready</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
