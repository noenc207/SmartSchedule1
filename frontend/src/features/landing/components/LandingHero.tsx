import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HeroScene } from './HeroScene';
import { SoftBlurInText, ShimmerSweepBadge } from '../../../components/effects/AnimateText';

export function LandingHero() {
  return (
    <section className="landing-hero" aria-labelledby="hero-heading">
      <div className="landing-container">
        <div className="landing-hero-grid">
          {/* Left Column: Value Proposition & CTAs */}
          <div className="landing-hero-content">
            <ShimmerSweepBadge delay={0.08} duration={0.8} className="inline-block">
              <div className="landing-pill-badge">
                <span className="landing-pill-dot" aria-hidden="true" />
                <span>FPT UNIVERSITY QUY NHƠN · AI CAMPUS</span>
              </div>
            </ShimmerSweepBadge>

            <h1 id="hero-heading" className="landing-hero-headline">
              <SoftBlurInText
                text="Làm chủ lịch học cùng "
                delay={0.18}
                duration={0.85}
                stagger={0.02}
                trigger="inView"
              />
              <span className="landing-hero-headline-highlight">
                <SoftBlurInText
                  text="Cóc Trợ Lý 3D"
                  delay={0.4}
                  duration={0.85}
                  stagger={0.022}
                  highlight={true}
                  trigger="inView"
                />
              </span>
              <SoftBlurInText
                text=" & AI SmartSchedule"
                delay={0.55}
                duration={0.85}
                stagger={0.02}
                trigger="inView"
              />
            </h1>

            <motion.p
              className="landing-hero-subheadline"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.38, ease: [0.22, 1, 0.36, 1] }}
            >
              Tạm biệt nỗi lo chồng chéo 6 slot học, quên hạn nộp đồ án Capstone hay trễ giờ chạy giữa Tòa Alpha và Beta. Cóc AI và thuật toán CSP tự động tính toán đệm di chuyển, phân bổ thời gian học sâu cá nhân hóa cho sinh viên FPTU.
            </motion.p>

            <motion.div
              className="landing-hero-cta-group"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.52, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div
                whileHover={{ scale: 1.025, boxShadow: '0 0 28px rgba(234, 88, 12, 0.55)' }}
                whileTap={{ scale: 0.975 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                <Link to="/register" className="landing-btn-hero-primary">
                  Bắt đầu lập lịch miễn phí →
                </Link>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                <a href="#chaos" className="landing-btn-hero-secondary">
                  Xem vấn đề thực tế
                </a>
              </motion.div>
            </motion.div>

            <div className="landing-hero-metrics" role="region" aria-label="Chỉ số hiệu quả">
              {[
                { val: '6 Slot', label: 'Chuẩn hóa lịch FPTU', delay: 0.62 },
                { val: '15 Phút', label: 'Đệm di chuyển an toàn', delay: 0.72 },
                { val: '100%', label: 'Chủ động deadline đồ án', delay: 0.82 },
              ].map((m) => (
                <motion.div
                  key={m.label}
                  className="landing-metric-item"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: m.delay, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ y: -3, transition: { duration: 0.2 } }}
                >
                  <span className="landing-metric-val">{m.val}</span>
                  <span className="landing-metric-label">{m.label}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right Column: Prominent Cosmic 3D Mascot Stage */}
          <motion.div
            className="landing-hero-3d-wrapper"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.85, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="landing-cosmic-stage">
              <div className="landing-cosmic-stage-hud-top">
                <span className="landing-cosmic-live-pill">
                  <span className="landing-cosmic-live-dot" />
                  CANONICAL 3D MASCOT · LIVE
                </span>
                <span className="landing-cosmic-meta-tag">FPTU Quy Nhơn · AI Campus</span>
              </div>

              {/* 3D Scene Viewport (Unbounded cosmic depth) */}
              <div className="landing-cosmic-viewport">
                <HeroScene interactive={true} />
              </div>

              {/* Cosmic HUD Footer */}
              <div className="landing-cosmic-stage-hud-bottom">
                <span className="landing-cosmic-hint-icon">✦</span>
                <span className="landing-cosmic-hint-text">
                  Kéo nhẹ hoặc di chuột để tương tác 3D đa chiều cùng Cóc Trợ Lý AI
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Subtle Scroll Down Prompt Cue */}
        <motion.div
          className="landing-hero-scroll-cue"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: [0.4, 0.9, 0.4], y: [0, 6, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 1.1 }}
        >
          <a href="#chaos" className="landing-scroll-cue-link" aria-label="Cuộn xuống khám phá tiếp">
            <span className="landing-scroll-cue-text">Cuộn để khám phá</span>
            <span className="landing-scroll-cue-icon" aria-hidden="true">↓</span>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
