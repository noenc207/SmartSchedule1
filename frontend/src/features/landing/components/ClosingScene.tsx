import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { BorderBeam } from '../../../components/ui/border-beam';
import { HeroScene } from './HeroScene';

export function ClosingScene() {
  const navigate = useNavigate();
  const [celebratePulse, setCelebratePulse] = useState(0);

  return (
    <section className="landing-closing-section" aria-labelledby="closing-heading">
      <div className="landing-container">
        <div
          style={{
            position: 'relative',
            borderRadius: 32,
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #0f172a 100%)',
            border: '1px solid rgba(148, 163, 184, 0.25)',
            boxShadow: '0 32px 72px -18px rgba(15, 23, 42, 0.35)',
            padding: '48px 44px',
            overflow: 'hidden',
            color: '#f8fafc',
          }}
        >
          <BorderBeam size={320} duration={12} colorFrom="#f97316" colorTo="#38bdf8" />

          {/* Ambient Campus Photography Backdrop Overlay */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'url(/banner/hero_bg_landscape.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center right',
              opacity: 0.16,
              pointerEvents: 'none',
            }}
          />

          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(90deg, rgba(15, 23, 42, 0.96) 0%, rgba(15, 23, 42, 0.88) 55%, rgba(15, 23, 42, 0.72) 100%)',
              pointerEvents: 'none',
            }}
          />

          <div
            style={{
              position: 'relative',
              zIndex: 2,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 36,
              alignItems: 'center',
            }}
          >
            {/* Left Column: Headline & CTAs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  alignSelf: 'flex-start',
                  padding: '6px 14px',
                  borderRadius: 999,
                  background: 'rgba(249, 115, 22, 0.18)',
                  border: '1px solid rgba(249, 115, 22, 0.45)',
                  color: '#fdba74',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  letterSpacing: '0.05em',
                }}
              >
                <Sparkles size={13} />
                SẴN SÀNG CHO KỲ HỌC BỨT PHÁ TẠI FPTU
              </div>

              <h2
                id="closing-heading"
                style={{
                  fontSize: 'clamp(1.95rem, 3.4vw, 2.75rem)',
                  fontWeight: 900,
                  lineHeight: 1.15,
                  letterSpacing: '-0.03em',
                  color: '#ffffff',
                  margin: 0,
                }}
              >
                Bắt đầu một kỳ học rõ ràng, chủ động cùng{' '}
                <span
                  style={{
                    background: 'linear-gradient(135deg, #fb923c 0%, #f97316 50%, #38bdf8 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  SmartSchedule
                </span>
              </h2>

              <p
                style={{
                  fontSize: '1.02rem',
                  color: '#cbd5e1',
                  lineHeight: 1.65,
                  margin: 0,
                  maxWidth: 560,
                }}
              >
                Trải nghiệm trọn vẹn sức mạnh xếp lịch thông minh: từ nhận diện xung đột 6 slot học, tự động tính toán đệm di chuyển giữa Tòa Alpha – Beta đến chia nhỏ tiến độ đồ án Capstone theo nhịp sinh học.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginTop: 4 }}>
                <motion.button
                  type="button"
                  onClick={() => navigate('/register')}
                  whileHover={{ scale: 1.025 }}
                  whileTap={{ scale: 0.975 }}
                  style={{
                    appearance: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '15px 28px',
                    borderRadius: 14,
                    fontSize: '0.98rem',
                    fontWeight: 800,
                    color: '#ffffff',
                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                    boxShadow: '0 12px 28px -4px rgba(234, 88, 12, 0.5)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span>Tạo tài khoản sinh viên FPTU</span>
                  <ArrowRight size={16} />
                </motion.button>

                <motion.button
                  type="button"
                  onClick={() => navigate('/login')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    appearance: 'none',
                    cursor: 'pointer',
                    padding: '15px 24px',
                    borderRadius: 14,
                    fontSize: '0.98rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.24)',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  Đăng nhập vào Workspace
                </motion.button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, marginTop: 6 }}>
                {[
                  '100% Miễn phí cho sinh viên FPTU',
                  'Xác thực an toàn @fpt.edu.vn',
                  'Đồng bộ tức thì Mobile & Desktop',
                ].map((text) => (
                  <div
                    key={text}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      fontSize: '0.84rem',
                      color: '#e2e8f0',
                      fontWeight: 600,
                    }}
                  >
                    <CheckCircle2 size={15} color="#34d399" />
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Official 3D Cóc AI Mascot & Campus Showcase Card */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  maxWidth: 380,
                  borderRadius: 24,
                  padding: '24px 22px',
                  background: 'rgba(30, 41, 59, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  boxShadow: '0 20px 44px rgba(0, 0, 0, 0.35)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: 12,
                }}
              >
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '4px 12px',
                    borderRadius: 999,
                    background: 'rgba(16, 185, 129, 0.18)',
                    color: '#6ee7b7',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                  }}
                >
                  ● Thư viện & Atrium AI Campus: Đang mở cửa
                </span>

                <div style={{ width: '100%', height: 240, position: 'relative' }}>
                  <HeroScene
                    interactive={true}
                    activeMode={2}
                    actionPulse={celebratePulse}
                    onMascotClick={() => setCelebratePulse((prev) => prev + 1)}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setCelebratePulse((prev) => prev + 1)}
                  style={{
                    appearance: 'none',
                    border: '1px solid rgba(255, 122, 50, 0.5)',
                    background: 'rgba(234, 88, 12, 0.22)',
                    color: '#fed7aa',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    padding: '5px 14px',
                    borderRadius: 999,
                    cursor: 'pointer',
                  }}
                >
                  🎉 Chạm để Cóc 3D nhảy ăn mừng!
                </button>

                <div>
                  <strong style={{ fontSize: '1.08rem', color: '#ffffff', display: 'block' }}>
                    Cóc 3D đang chờ bạn trong Workspace!
                  </strong>
                  <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                    FPT University Quy Nhơn · Khu đô thị An Phú Thịnh
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
