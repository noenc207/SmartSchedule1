import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  ArrowRight,
  Bot,
  Zap,
  Flame,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Compass,
  MapPin,
  TrendingUp,
  Activity,
  Layers,
  GraduationCap,
} from 'lucide-react';
import { BorderBeam } from '../../../components/ui/border-beam';
import { HeroScene } from './HeroScene';

type HeroTabId = 0 | 1 | 2;

const MASCOT_QUOTES = [
  '“Chào bạn! Cóc 3D đã tối ưu 6 slot học & 0 xung đột cho bạn!”',
  '“Tuyệt vời! Bạn có 11h khung giờ vàng hôm nay để hoàn thành Capstone!”',
  '“Đã bật đệm 15 phút chuyển tòa Alpha ↔ Beta, không lo trễ điểm danh!”',
  '“Xoay nhẹ chuột hoặc chạm vào Cóc 3D để xem hiệu ứng nhảy 360° nhé!”',
];

const HERO_TABS: {
  id: HeroTabId;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
}[] = [
  { id: 0, label: '01. Lịch học 6 Slot FPTU', icon: Clock },
  { id: 1, label: '02. Đệm di chuyển Alpha–Beta', icon: Compass },
  { id: 2, label: '03. Cóc AI & Nhịp Sinh học', icon: Bot },
];

export function LandingHero() {
  const [activeTab, setActiveTab] = useState<HeroTabId>(0);
  const [isPaused, setIsPaused] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [actionPulse, setActionPulse] = useState(0);

  const handleMascotJump = () => {
    setActionPulse((prev) => prev + 1);
  };

  // Auto-cycle through the 3 tabs every 6 seconds unless user hovers
  useEffect(() => {
    if (isPaused) return;
    const interval = window.setInterval(() => {
      setActiveTab((prev) => ((prev + 1) % 3) as HeroTabId);
    }, 6000);
    return () => window.clearInterval(interval);
  }, [isPaused]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width - 0.5;
    const relY = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: relY * -7, y: relX * 9 });
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
    setTilt({ x: 0, y: 0 });
  };

  return (
    <section className="landing-hero" aria-labelledby="hero-heading" style={{ overflow: 'hidden' }}>
      <div className="landing-container">
        <div className="landing-hero-grid" style={{ alignItems: 'center', gap: 36 }}>
          {/* Left Column: Value Proposition & Interactive CTAs */}
          <div className="landing-hero-content" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Top Campus Pill */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 14px',
                  borderRadius: 999,
                  background: 'rgba(242, 112, 36, 0.1)',
                  border: '1px solid rgba(242, 112, 36, 0.3)',
                  boxShadow: '0 4px 12px rgba(234, 88, 12, 0.08)',
                }}
              >
                <motion.span
                  animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: '#ea580c',
                    boxShadow: '0 0 8px #ea580c',
                  }}
                />
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 800,
                    color: '#c2410c',
                    letterSpacing: '0.04em',
                  }}
                >
                  FPT UNIVERSITY QUY NHƠN · AI CAMPUS
                </span>
              </div>

              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 12px',
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700,
                  background: 'rgba(37, 99, 235, 0.08)',
                  border: '1px solid rgba(37, 99, 235, 0.22)',
                  color: '#1d4ed8',
                }}
              >
                <Sparkles size={12} color="#2563eb" />
                Bộ giải OR-Tools CP-SAT v2.4
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              id="hero-heading"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              style={{
                fontSize: 'clamp(1.95rem, 3.1vw, 2.75rem)',
                lineHeight: 1.14,
                fontWeight: 900,
                letterSpacing: '-0.03em',
                color: '#0f172a',
                margin: 0,
              }}
            >
              Làm chủ lịch học cùng{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #ea580c 0%, #f97316 55%, #0284c7 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  display: 'inline',
                }}
              >
                Cóc Trợ Lý 3D
              </span>{' '}
              & AI SmartSchedule
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              style={{
                fontSize: '1.06rem',
                lineHeight: 1.65,
                color: '#475569',
                margin: 0,
                maxWidth: 580,
              }}
            >
              Tạm biệt nỗi lo chồng chéo 6 slot học, quên hạn nộp đồ án Capstone hay trễ giờ chạy giữa Tòa Alpha và Beta. Cóc AI và thuật toán CSP tự động tính toán đệm di chuyển, phân bổ thời gian học sâu cá nhân hóa cho sinh viên FPTU.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginTop: 4 }}
            >
              <motion.div
                whileHover={{ scale: 1.025, boxShadow: '0 14px 30px -4px rgba(234, 88, 12, 0.5)' }}
                whileTap={{ scale: 0.975 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                <Link
                  to="/login"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '14px 26px',
                    fontSize: '0.98rem',
                    fontWeight: 800,
                    color: '#ffffff',
                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                    borderRadius: 14,
                    textDecoration: 'none',
                    boxShadow: '0 10px 26px -4px rgba(234, 88, 12, 0.45)',
                  }}
                >
                  <span>Bắt đầu lập lịch miễn phí</span>
                  <ArrowRight size={16} />
                </Link>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                <a
                  href="#chaos"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '14px 22px',
                    fontSize: '0.98rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: 14,
                    textDecoration: 'none',
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)',
                  }}
                >
                  <span>Mô phỏng xung đột thực tế</span>
                </a>
              </motion.div>
            </motion.div>

            {/* Metrics Row */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 14,
                paddingTop: 14,
                borderTop: '1px solid #e2e8f0',
                marginTop: 6,
              }}
            >
              {[
                { val: '6 Slot', label: 'Chuẩn hóa lịch FPTU', sub: '07:30 – 17:30', color: '#ea580c' },
                { val: '15 Phút', label: 'Đệm di chuyển an toàn', sub: 'Tòa Alpha ↔ Beta', color: '#0284c7' },
                { val: '99.8%', label: 'Chủ động Pacing đồ án', sub: 'Bảo vệ Capstone', color: '#059669' },
              ].map((m, idx) => (
                <motion.div
                  key={idx}
                  whileHover={{ y: -3 }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '12px 14px',
                    borderRadius: 14,
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)',
                  }}
                >
                  <strong style={{ fontSize: '1.35rem', fontWeight: 900, color: m.color }}>
                    {m.val}
                  </strong>
                  <span style={{ fontSize: '0.8rem', color: '#0f172a', fontWeight: 700, marginTop: 2 }}>
                    {m.label}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>{m.sub}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* Social Proof */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: -2 }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {['#2563eb', '#7c3aed', '#ea580c', '#059669'].map((col, i) => (
                  <div
                    key={i}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: col,
                      border: '2px solid #ffffff',
                      boxShadow: '0 2px 6px rgba(15,23,42,0.12)',
                      marginLeft: i > 0 ? -7 : 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 9.5,
                      fontWeight: 800,
                      color: '#ffffff',
                    }}
                  >
                    K{15 + i}
                  </div>
                ))}
              </div>
              <span style={{ fontSize: '0.82rem', color: '#475569' }}>
                Hơn <strong style={{ color: '#ea580c' }}>2,400+ sinh viên</strong> FPT University Quy Nhơn đã tối ưu hóa lịch kỳ Fall 2026
              </span>
            </div>
          </div>

          {/* Right Column: Rebuilt Interactive High-Tech 3D Mascot & Schedule Stage */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            onMouseEnter={() => setIsPaused(true)}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
              position: 'relative',
              width: '100%',
              borderRadius: 24,
              perspective: 1200,
            }}
          >
            <motion.div
              style={{
                position: 'relative',
                borderRadius: 24,
                background: 'linear-gradient(145deg, rgba(17, 26, 58, 0.92) 0%, rgba(8, 11, 26, 0.95) 100%)',
                border: '1.5px solid rgba(157, 231, 255, 0.2)',
                boxShadow: '0 28px 70px -15px rgba(0, 0, 0, 0.75), 0 0 40px -8px rgba(234, 88, 12, 0.25)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                transition: 'transform 0.18s ease-out',
                backdropFilter: 'blur(16px)',
              }}
            >
              {/* BorderBeam Animated Light Ring */}
              <BorderBeam size={260} duration={10} colorFrom="#ff7a32" colorTo="#38bdf8" />

              {/* Ambient Floating Glow Inside Card */}
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: -60,
                  right: -60,
                  width: 240,
                  height: 240,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(234, 88, 12, 0.22) 0%, transparent 70%)',
                  pointerEvents: 'none',
                }}
              />
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  bottom: -40,
                  left: -40,
                  width: 220,
                  height: 220,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(56, 189, 248, 0.18) 0%, transparent 70%)',
                  pointerEvents: 'none',
                }}
              />

              {/* Stage Top HUD */}
              <div
                style={{
                  padding: '12px 18px',
                  background: 'rgba(8, 11, 26, 0.85)',
                  borderBottom: '1px solid rgba(157, 231, 255, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 8,
                  position: 'relative',
                  zIndex: 2,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      color: '#ff7a32',
                      background: 'rgba(234, 88, 12, 0.16)',
                      border: '1px solid rgba(255, 122, 50, 0.4)',
                      padding: '4px 10px',
                      borderRadius: 999,
                      letterSpacing: '0.04em',
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#ff7a32',
                        boxShadow: '0 0 8px #ff7a32',
                      }}
                    />
                    CÓC AI 3D ENGINE · LIVE
                  </span>
                  <span style={{ fontSize: '0.78rem', color: '#9de7ff', fontWeight: 600 }}>
                    FPTU Quy Nhơn · AI Campus
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    onClick={handleMascotJump}
                    style={{
                      appearance: 'none',
                      border: '1px solid rgba(255, 122, 50, 0.5)',
                      background: 'linear-gradient(135deg, rgba(234, 88, 12, 0.3) 0%, rgba(234, 88, 12, 0.14) 100%)',
                      color: '#fed7aa',
                      fontSize: '0.73rem',
                      fontWeight: 800,
                      padding: '3px 10px',
                      borderRadius: 999,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    🎉 Chạm Cóc 3D Nhảy!
                  </button>
                  <span
                    style={{
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      color: '#34d399',
                      background: 'rgba(16, 185, 129, 0.15)',
                      padding: '3px 9px',
                      borderRadius: 999,
                      border: '1px solid rgba(52, 211, 153, 0.3)',
                    }}
                  >
                    ● 0 Xung Đột
                  </span>
                </div>
              </div>

              {/* Tab Navigation for Interactive Simulator */}
              <div
                style={{
                  display: 'flex',
                  gap: 6,
                  padding: '8px 14px',
                  background: 'rgba(17, 26, 58, 0.5)',
                  borderBottom: '1px solid rgba(157, 231, 255, 0.08)',
                  overflowX: 'auto',
                  position: 'relative',
                  zIndex: 2,
                }}
              >
                {HERO_TABS.map((tab) => {
                  const active = activeTab === tab.id;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab.id);
                        handleMascotJump();
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 12px',
                        borderRadius: 999,
                        fontSize: '0.76rem',
                        fontWeight: active ? 800 : 600,
                        border: active
                          ? '1.5px solid #ff7a32'
                          : '1px solid rgba(157, 231, 255, 0.12)',
                        background: active
                          ? 'linear-gradient(135deg, rgba(234, 88, 12, 0.28) 0%, rgba(234, 88, 12, 0.12) 100%)'
                          : 'rgba(8, 11, 26, 0.4)',
                        color: active ? '#ffffff' : '#94a3b8',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.18s ease',
                      }}
                    >
                      <Icon size={12} color={active ? '#ff7a32' : '#94a3b8'} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Main Visual Arena with Dynamic Scene & Floating Mascot */}
              <div
                style={{
                  position: 'relative',
                  height: 380,
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  overflow: 'hidden',
                }}
              >
                {/* Dynamic Content Views */}
                <AnimatePresence mode="wait">
                  {/* TAB 0: 6 Slot FPTU Schedule Simulation */}
                  {activeTab === 0 && (
                    <motion.div
                      key="tab-slots"
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 16 }}
                      transition={{ duration: 0.3 }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 9,
                        maxWidth: '64%',
                        position: 'relative',
                        zIndex: 2,
                      }}
                    >
                      {/* Slot 1 */}
                      <motion.div
                        whileHover={{ x: 4 }}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 14,
                          background: 'rgba(15, 23, 42, 0.88)',
                          border: '1px solid rgba(56, 189, 248, 0.35)',
                          borderLeft: '4px solid #38bdf8',
                          boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#38bdf8' }}>
                            SLOT 1 · 07:30 – 09:00
                          </span>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              color: '#34d399',
                              background: 'rgba(16, 185, 129, 0.2)',
                              padding: '2px 7px',
                              borderRadius: 999,
                            }}
                          >
                            ● Đang diễn ra
                          </span>
                        </div>
                        <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#f8faff', marginTop: 3 }}>
                          CS401 · Machine Learning Lab 3
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: 1 }}>
                          Phòng Lab 302 · Tòa Alpha
                        </div>
                      </motion.div>

                      {/* Travel Buffer Connector */}
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 10px',
                          borderRadius: 8,
                          background: 'rgba(234, 88, 12, 0.16)',
                          border: '1px dashed rgba(255, 122, 50, 0.45)',
                          color: '#fdba74',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          width: 'fit-content',
                        }}
                      >
                        <Compass size={11} />
                        <span>Đệm di chuyển 15p (Tòa Alpha → Beta · 280m)</span>
                      </div>

                      {/* Slot 2 */}
                      <motion.div
                        whileHover={{ x: 4 }}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 14,
                          background: 'rgba(15, 23, 42, 0.88)',
                          border: '1px solid rgba(168, 85, 247, 0.35)',
                          borderLeft: '4px solid #a855f7',
                          boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#c084fc' }}>
                            SLOT 2 · 09:15 – 10:45
                          </span>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              color: '#ff7a32',
                              background: 'rgba(234, 88, 12, 0.18)',
                              padding: '2px 7px',
                              borderRadius: 999,
                            }}
                          >
                            Hạn nộp: 2 ngày
                          </span>
                        </div>
                        <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#f8faff', marginTop: 3 }}>
                          PRN231 · Đồ án Capstone AI (Sprint 3)
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: 1 }}>
                          Phòng Seminar 402 · Tòa Beta
                        </div>
                      </motion.div>

                      {/* Atrium Deep Work Slot */}
                      <motion.div
                        whileHover={{ x: 4 }}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 12,
                          background: 'rgba(15, 23, 42, 0.75)',
                          border: '1px solid rgba(255, 196, 107, 0.25)',
                          borderLeft: '4px solid #f59e0b',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#fcd34d' }}>
                            TỰ HỌC SÂU · 14:00 – 16:30
                          </span>
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#34d399' }}>
                            96% Focus
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f8faff', marginTop: 2 }}>
                          Atrium AI Campus · Bàn số 12 (Cóc AI đặt trước)
                        </div>
                      </motion.div>
                    </motion.div>
                  )}

                  {/* TAB 1: Mobility & Alpha-Beta Campus Routing */}
                  {activeTab === 1 && (
                    <motion.div
                      key="tab-mobility"
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 16 }}
                      transition={{ duration: 0.3 }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                        maxWidth: '64%',
                        position: 'relative',
                        zIndex: 2,
                      }}
                    >
                      <div
                        style={{
                          padding: '12px 14px',
                          borderRadius: 14,
                          background: 'rgba(15, 23, 42, 0.9)',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#38bdf8', fontSize: '0.8rem', fontWeight: 800 }}>
                          <MapPin size={13} />
                          <span>Bản đồ Tuyến đường Di chuyển Campus</span>
                        </div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ffffff', marginTop: 4 }}>
                          Tòa Alpha (Tầng 3) ➔ Tòa Beta (Tầng 4)
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                          <div style={{ padding: '6px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Khoảng cách</div>
                            <strong style={{ fontSize: '0.84rem', color: '#f8faff' }}>280 mét</strong>
                          </div>
                          <div style={{ padding: '6px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Thời gian đi bộ</div>
                            <strong style={{ fontSize: '0.84rem', color: '#38bdf8' }}>4.2 phút</strong>
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          padding: '10px 12px',
                          borderRadius: 12,
                          background: 'rgba(16, 185, 129, 0.12)',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          color: '#6ee7b7',
                          fontSize: '0.76rem',
                          lineHeight: 1.45,
                        }}
                      >
                        <strong>✓ Đệm an toàn 15 phút đã kích hoạt:</strong> Thuật toán tự động giữ khoảng trống giữa 2 slot, đảm bảo bạn không bao giờ bị trễ điểm danh do thang máy hoặc di chuyển giữa các tòa.
                      </div>

                      <div
                        style={{
                          padding: '8px 12px',
                          borderRadius: 10,
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          fontSize: '0.74rem',
                          color: '#cbd5e1',
                        }}
                      >
                        ⚡ Tiết kiệm trung bình <strong>4.5 giờ/tuần</strong> thời gian trống vô nghĩa.
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 2: Cóc AI Focus Biometrics & Streak */}
                  {activeTab === 2 && (
                    <motion.div
                      key="tab-focus"
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 16 }}
                      transition={{ duration: 0.3 }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        maxWidth: '64%',
                        position: 'relative',
                        zIndex: 2,
                      }}
                    >
                      <div
                        style={{
                          padding: '10px 12px',
                          borderRadius: 12,
                          background: 'rgba(15, 23, 42, 0.9)',
                          border: '1px solid rgba(255, 122, 50, 0.35)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#ff7a32' }}>
                            NHỊP SINH HỌC & FOCUS
                          </span>
                          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#34d399' }}>
                            Top 10% K15
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                          {[
                            { label: 'Ca Sáng (08:00 – 11:30)', pct: 96, col: '#ff7a32' },
                            { label: 'Ca Chiều (14:00 – 17:30)', pct: 88, col: '#38bdf8' },
                            { label: 'Ca Tối (19:30 – 21:30)', pct: 79, col: '#c084fc' },
                          ].map((b, i) => (
                            <div key={i}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#cbd5e1' }}>
                                <span>{b.label}</span>
                                <strong style={{ color: b.col }}>{b.pct}% Focus</strong>
                              </div>
                              <div style={{ height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.1)', marginTop: 2 }}>
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${b.pct}%` }}
                                  transition={{ duration: 0.6, delay: i * 0.1 }}
                                  style={{ height: '100%', borderRadius: 999, background: b.col }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div
                        style={{
                          padding: '9px 12px',
                          borderRadius: 12,
                          background: 'linear-gradient(135deg, rgba(234, 88, 12, 0.2) 0%, rgba(15, 23, 42, 0.8) 100%)',
                          border: '1px solid rgba(255, 122, 50, 0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <Flame size={16} color="#ff7a32" />
                          <div>
                            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#ffffff' }}>
                              Chuỗi Học Tập: 5 Ngày
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>
                              Hoàn thành 100% mục tiêu tuần
                            </div>
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            color: '#34d399',
                            background: 'rgba(16, 185, 129, 0.2)',
                            padding: '2px 8px',
                            borderRadius: 999,
                          }}
                        >
                          Hạng A+
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Right Interactive Floating 3D Mascot Stage (/models/base_basic_pbr.glb) */}
                <div
                  style={{
                    position: 'absolute',
                    right: 4,
                    bottom: 6,
                    width: 235,
                    height: 350,
                    zIndex: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                  }}
                >
                  {/* Floating Speech Bubble from 3D Mascot */}
                  <motion.div
                    key={actionPulse}
                    initial={{ opacity: 0, y: 8, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 360, damping: 22 }}
                    onClick={handleMascotJump}
                    style={{
                      padding: '7px 11px',
                      borderRadius: 14,
                      background: 'rgba(15, 23, 42, 0.94)',
                      border: '1.5px solid rgba(255, 122, 50, 0.55)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.55)',
                      maxWidth: 205,
                      fontSize: '0.71rem',
                      lineHeight: 1.35,
                      color: '#fed7aa',
                      marginBottom: 4,
                      position: 'relative',
                      textAlign: 'center',
                      cursor: 'pointer',
                      zIndex: 4,
                    }}
                  >
                    <span style={{ fontWeight: 800, color: '#ff7a32', display: 'block' }}>
                      Cóc 3D Trợ Lý (Bấm để nhảy!):
                    </span>
                    {MASCOT_QUOTES[actionPulse % MASCOT_QUOTES.length]}
                    {/* Small speech arrow */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: -6,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 0,
                        height: 0,
                        borderLeft: '6px solid transparent',
                        borderRight: '6px solid transparent',
                        borderTop: '6px solid rgba(255, 122, 50, 0.55)',
                      }}
                    />
                  </motion.div>

                  {/* Live Interactive 3D WebGL Canvas Stage */}
                  <div
                    style={{
                      width: 230,
                      height: 255,
                      position: 'relative',
                      borderRadius: 18,
                      overflow: 'visible',
                    }}
                  >
                    <HeroScene
                      interactive={true}
                      activeMode={activeTab}
                      actionPulse={actionPulse}
                      onMascotClick={handleMascotJump}
                    />
                  </div>
                </div>
              </div>

              {/* Stage Bottom Interactive HUD Bar */}
              <div
                style={{
                  padding: '9px 16px',
                  background: 'rgba(8, 11, 26, 0.85)',
                  borderTop: '1px solid rgba(157, 231, 255, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.76rem',
                  color: '#94a3b8',
                  position: 'relative',
                  zIndex: 2,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={12} color="#ff7a32" />
                  <span>Xoay chuột hoặc chạm trực tiếp vào Cóc 3D để xem hiệu ứng nhảy 360°</span>
                </div>
                <strong style={{ color: '#fdba74' }}>WebGL 3D · 60 FPS</strong>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Subtle Scroll Down Prompt Cue */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: [0, 5, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
          style={{ marginTop: 28, display: 'flex', justifyContent: 'center' }}
        >
          <a
            href="#chaos"
            aria-label="Cuộn xuống khám phá tiếp"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 18px',
              borderRadius: 999,
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05)',
              color: '#475569',
              fontSize: '0.82rem',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <span>Cuộn để khám phá mô phỏng xung đột lịch trình</span>
            <span style={{ color: '#ea580c', fontWeight: 900 }} aria-hidden="true">↓</span>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
