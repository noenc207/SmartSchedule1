import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BRAND_ASSETS } from '../assets/brandAssets';

export function LandingFooter() {
  const navigate = useNavigate();

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="landing-footer">
      <div className="landing-footer-top">
        <div className="footer-brand-column">
          <div className="footer-brand-row">
            <img
              src={BRAND_ASSETS.fptLogoUrl}
              alt="FPT University Logo"
              className="footer-logo"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="footer-brand-title">SmartSchedule</div>
          </div>
          <p className="footer-tagline">
            Hệ thống điều phối lịch học, bài tập và đệm di chuyển thông minh được tối ưu cho sinh viên FPT University Quy Nhơn.
          </p>
          <div className="footer-badge-campus">
            <span className="campus-dot">●</span>
            <span>AI Campus · FPT University Quy Nhơn</span>
          </div>
        </div>

        <div className="footer-links-column">
          <h4 className="footer-column-heading">Khám phá tính năng</h4>
          <ul className="footer-nav-list">
            <li>
              <button type="button" onClick={() => scrollToSection('problem')}>
                Vấn đề thực tế
              </button>
            </li>
            <li>
              <button type="button" onClick={() => scrollToSection('transformation')}>
                Dòng thời gian chuyển đổi
              </button>
            </li>
            <li>
              <button type="button" onClick={() => scrollToSection('smart-plan')}>
                Bộ điều phối Smart Plan
              </button>
            </li>
            <li>
              <button type="button" onClick={() => scrollToSection('mobility')}>
                Nhận thức di chuyển khuôn viên
              </button>
            </li>
            <li>
              <button type="button" onClick={() => scrollToSection('what-if')}>
                Mô phỏng What-if
              </button>
            </li>
            <li>
              <button type="button" onClick={() => scrollToSection('control')}>
                Quyền làm chủ lịch trình
              </button>
            </li>
          </ul>
        </div>

        <div className="footer-links-column">
          <h4 className="footer-column-heading">Ứng dụng SmartSchedule</h4>
          <ul className="footer-nav-list">
            <li>
              <button type="button" onClick={() => navigate('/calendar')}>
                Xem Lịch tuần (Calendar)
              </button>
            </li>
            <li>
              <button type="button" onClick={() => navigate('/scheduling')}>
                Điều phối công việc (Scheduling)
              </button>
            </li>
            <li>
              <button type="button" onClick={() => navigate('/smart-plan')}>
                Tạo kế hoạch tự động (Smart Plan)
              </button>
            </li>
            <li>
              <button type="button" onClick={() => navigate('/settings')}>
                Cài đặt & Tùy biến
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div className="landing-footer-bottom">
        <div className="footer-copy">
          © {new Date().getFullYear()} SmartSchedule. Thiết kế và phát triển vì trải nghiệm học tập vượt trội tại FPT University Quy Nhơn.
        </div>
        <div className="footer-tech-stack">
          <span>React 19</span>
          <span>·</span>
          <span>Three.js / React Three Fiber</span>
          <span>·</span>
          <span>TypeScript</span>
        </div>
      </div>
    </footer>
  );
}
