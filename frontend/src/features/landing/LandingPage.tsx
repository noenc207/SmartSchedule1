import React, { Component, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { LandingNavbar } from './components/LandingNavbar';
import { HeroScene } from './components/HeroScene';
import { ProblemSection } from './components/ProblemSection';
import { TransformationSection } from './components/TransformationSection';
import { SmartPlanSection } from './components/SmartPlanSection';
import { MobilitySection } from './components/MobilitySection';
import { WhatIfSection } from './components/WhatIfSection';
import { ControlSection } from './components/ControlSection';
import { ClosingScene } from './components/ClosingScene';
import { LandingFooter } from './components/LandingFooter';
import { motion } from './components/AnimatedSection';
import './landing.css';

interface WebGLErrorBoundaryProps {
  children: ReactNode;
}

interface WebGLErrorBoundaryState {
  hasError: boolean;
}

class WebGLErrorBoundary extends Component<WebGLErrorBoundaryProps, WebGLErrorBoundaryState> {
  constructor(props: WebGLErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.warn('WebGL render fallback triggered in Landing Page:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="hero-3d-canvas-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px' }}>
          <span className="status-badge badge-info" style={{ marginBottom: '12px' }}>3D SCHEDULE WORLD</span>
          <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#ffffff', marginBottom: '8px' }}>
            Mascot & Không gian Lịch trình
          </div>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', maxWidth: '320px' }}>
            SmartSchedule kết nối bài tập, lịch học FPT University Quy Nhơn và đệm di chuyển.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

export function LandingPage() {
  const navigate = useNavigate();

  const scrollToProblem = () => {
    const el = document.getElementById('problem');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-page-root">
      {/* Ambient background glows */}
      <div className="landing-ambient-glow-1" />
      <div className="landing-ambient-glow-2" />

      {/* Sticky Navigation Bar */}
      <LandingNavbar />

      {/* Hero Section */}
      <section className="landing-section cyber-hero-section">
        <div className="hero-layout-full3d">
          {/* Left Hero Content Card */}
          <motion.div
            className="hero-content-card"
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="landing-hero-badge-row">
              <span className="hero-badge">AI CAMPUS · FPT UNIVERSITY QUY NHƠN</span>
            </div>

            <h1 className="hero-title">
              Your day, <br />
              <span className="hero-title-accent">intelligently arranged.</span>
            </h1>

            <p className="hero-subtitle">
              Lịch trình của bạn không chỉ là danh sách giờ học. SmartSchedule kết nối bài tập, deadline, lịch cố định và thời gian di chuyển để tạo nên một ngày rõ ràng hơn.
            </p>

            <div className="landing-hero-actions-row">
              <button
                type="button"
                className="btn-primary-glow large-btn"
                onClick={() => navigate('/calendar')}
              >
                Vào SmartSchedule →
              </button>
              <button
                type="button"
                className="btn-secondary-glass"
                onClick={scrollToProblem}
              >
                Xem cách hoạt động
              </button>
            </div>

            <div className="hero-metrics-strip">
              <div className="hero-metric-item">
                <span className="metric-val">100%</span>
                <span className="metric-label">Khả thi thực tế</span>
              </div>
              <div className="hero-metric-item">
                <span className="metric-val">0 Phút</span>
                <span className="metric-label">Trễ hẹn do thiếu đệm</span>
              </div>
              <div className="hero-metric-item">
                <span className="metric-val">5 Bước</span>
                <span className="metric-label">Quyền kiểm soát cá nhân</span>
              </div>
            </div>
          </motion.div>

          {/* Right Hero 3D Diorama Stage (No Box Frame) */}
          <motion.div
            className="hero-3d-stage"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            <WebGLErrorBoundary>
              <HeroScene interactive={true} />
            </WebGLErrorBoundary>
            <div className="hero-3d-hint-pill">✦ Di chuyển chuột để nghiêng góc nhìn · Kéo chuột để xoay 360°</div>
          </motion.div>
        </div>
      </section>

      {/* 1. Problem Section */}
      <ProblemSection />

      {/* 2. Transformation Section */}
      <TransformationSection />

      {/* 3. Smart Plan Engine Section */}
      <SmartPlanSection />

      {/* 4. Optional Campus Mobility Section */}
      <MobilitySection />

      {/* 5. What-if Simulator Section */}
      <WhatIfSection />

      {/* 6. User Control Section */}
      <ControlSection />

      {/* 7. Mascot Closing Scene */}
      <WebGLErrorBoundary>
        <ClosingScene />
      </WebGLErrorBoundary>

      {/* 8. Institutional Footer */}
      <LandingFooter />
    </div>
  );
}
export default LandingPage;
