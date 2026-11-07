import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Footprints,
  Flame,
  Sparkles,
  ArrowRightLeft,
  ShieldCheck,
  MapPin,
} from 'lucide-react';
import { BorderBeam } from '../../../components/ui/border-beam';
import { KnowledgeCore3D } from './KnowledgeCore3D';

const DIAGNOSTIC_CARDS = [
  {
    id: 'slot-collision',
    icon: AlertTriangle,
    accent: '#dc2626',
    bgSoft: 'rgba(220, 38, 38, 0.08)',
    borderSoft: 'rgba(220, 38, 38, 0.22)',
    metric: '68% Sinh viên gặp phải',
    title: 'Đụng độ Ca học bù & Họp nhóm Capstone',
    desc: 'Lịch học 6 slot tại FPTU thường xuyên phát sinh ca học bù, lịch bảo vệ đồ án hoặc mentor review trùng vào khung giờ tự học đã định trước.',
    solution: 'OR-Tools CP-SAT tự động khóa cứng lịch FAP và tái phân bổ ca tự học trong 0.4 giây.',
  },
  {
    id: 'campus-transit',
    icon: Footprints,
    accent: '#d97706',
    bgSoft: 'rgba(217, 119, 6, 0.08)',
    borderSoft: 'rgba(217, 119, 6, 0.24)',
    metric: '280m · Tòa Alpha ↔ Beta',
    title: 'Quên tính Đệm di chuyển giữa các Tòa',
    desc: 'Tan ca Slot 1 tại Tòa Alpha lúc 09:00 nhưng xếp lịch họp nhóm ngay 09:00 ở Tòa Beta hoặc Thư viện khiến bạn luôn trong cảnh chạy vội.',
    solution: 'Tự động chèn đệm 15 phút di chuyển thực tế theo sơ đồ Quy Nhơn AI Campus.',
  },
  {
    id: 'deadline-crunch',
    icon: Flame,
    accent: '#ea580c',
    bgSoft: 'rgba(234, 88, 12, 0.08)',
    borderSoft: 'rgba(234, 88, 12, 0.25)',
    metric: 'Tuần 9–10 · Nước rút',
    title: 'Dồn ứ Đồ án SWP391 & Lab cuối kỳ',
    desc: 'Không chia nhỏ khối lượng 12–15 giờ làm đồ án thành các Sprint theo tuần khiến sinh viên phải thức trắng đêm trước ngày nộp bài trên LMS.',
    solution: 'Cóc AI tự động cắt nhỏ đồ án thành các phiên Deep Work 90 phút rải đều vào slot trống.',
  },
];

export function LandingChaos() {
  const [isOptimized, setIsOptimized] = useState(false);

  return (
    <section id="chaos" className="landing-chaos-section" aria-labelledby="chaos-heading">
      <div className="landing-container">
        {/* Section Header */}
        <div className="landing-section-header">
          <div
            className="landing-pill-badge"
            style={{
              background: isOptimized ? 'rgba(16, 185, 129, 0.1)' : 'rgba(220, 38, 38, 0.08)',
              color: isOptimized ? '#059669' : '#dc2626',
              borderColor: isOptimized ? 'rgba(16, 185, 129, 0.28)' : 'rgba(220, 38, 38, 0.22)',
            }}
          >
            <span
              className="landing-pill-dot"
              style={{
                background: isOptimized ? '#10b981' : '#dc2626',
                boxShadow: isOptimized ? '0 0 8px #10b981' : '0 0 8px #dc2626',
              }}
              aria-hidden="true"
            />
            {isOptimized ? 'ĐÃ KÍCH HOẠT BỘ GIẢI OR-TOOLS CP-SAT' : 'THỰC TRẠNG HỌC KỲ TẠI FPT UNIVERSITY'}
          </div>

          <h2 id="chaos-heading" className="landing-section-title">
            Từ hỗn loạn{' '}
            <span className="landing-hero-headline-highlight">
              chồng chéo 6 Slot
            </span>{' '}
            đến lịch trình chuẩn xác từng phút
          </h2>

          <p className="landing-section-subtitle">
            Kỳ học 3 tháng (10 tuần) tại FPTU đòi hỏi tốc độ cao. Xem cách SmartSchedule hóa giải 3 điểm nghẽn lớn nhất của sinh viên Quy Nhơn AI Campus.
          </p>
        </div>

        {/* 3 Diagnostic Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
            gap: 22,
            marginBottom: 40,
          }}
        >
          {DIAGNOSTIC_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <motion.article
                key={card.id}
                whileHover={{ y: -5 }}
                transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                style={{
                  background: '#ffffff',
                  borderRadius: 22,
                  padding: '26px 24px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 12px 32px -12px rgba(15, 23, 42, 0.07)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 16,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 16,
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        background: card.bgSoft,
                        border: `1px solid ${card.borderSoft}`,
                        color: card.accent,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={22} />
                    </div>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        padding: '4px 11px',
                        borderRadius: 999,
                        background: card.bgSoft,
                        color: card.accent,
                        border: `1px solid ${card.borderSoft}`,
                      }}
                    >
                      {card.metric}
                    </span>
                  </div>

                  <h3
                    style={{
                      fontSize: '1.18rem',
                      fontWeight: 800,
                      color: '#0f172a',
                      margin: '0 0 8px',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {card.title}
                  </h3>

                  <p
                    style={{
                      fontSize: '0.92rem',
                      color: '#475569',
                      lineHeight: 1.6,
                      margin: 0,
                    }}
                  >
                    {card.desc}
                  </p>
                </div>

                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 14,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                  }}
                >
                  <ShieldCheck size={16} color="#059669" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: '0.82rem', color: '#1e293b', fontWeight: 600, lineHeight: 1.45 }}>
                    {card.solution}
                  </span>
                </div>
              </motion.article>
            );
          })}
        </div>

        {/* Interactive Before / After Simulation Board */}
        <div
          style={{
            position: 'relative',
            borderRadius: 28,
            background: '#0f172a',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            boxShadow: '0 28px 64px -16px rgba(15, 23, 42, 0.25)',
            padding: '28px 30px',
            color: '#f8fafc',
            overflow: 'hidden',
          }}
        >
          <BorderBeam
            size={280}
            duration={11}
            colorFrom={isOptimized ? '#10b981' : '#ef4444'}
            colorTo={isOptimized ? '#38bdf8' : '#f97316'}
          />

          {/* Top Bar with Interactive Toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16,
              paddingBottom: 22,
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              marginBottom: 24,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span
                  style={{
                    fontSize: '0.73rem',
                    fontWeight: 800,
                    padding: '4px 10px',
                    borderRadius: 999,
                    background: isOptimized ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: isOptimized ? '#6ee7b7' : '#fca5a5',
                    border: `1px solid ${isOptimized ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                    letterSpacing: '0.04em',
                  }}
                >
                  {isOptimized ? '● TRẠNG THÁI: ĐÃ HÓA GIẢI XUNG ĐỘT' : '▲ TRẠNG THÁI: PHÁT HIỆN 3 XUNG ĐỘT LỊCH'}
                </span>
                <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>
                  Thứ Năm · Tuần 7 Kỳ Fall 2026
                </span>
              </div>
              <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#ffffff' }}>
                Mô phỏng Trực tiếp: Thời khóa biểu Sinh viên K17 Kỹ thuật Phần mềm AI
              </h3>
            </div>

            {/* Interactive Switch Button */}
            <div
              style={{
                display: 'inline-flex',
                background: 'rgba(30, 41, 59, 0.9)',
                padding: 5,
                borderRadius: 14,
                border: '1px solid rgba(255, 255, 255, 0.12)',
                gap: 6,
              }}
            >
              <button
                type="button"
                onClick={() => setIsOptimized(false)}
                style={{
                  appearance: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '9px 16px',
                  borderRadius: 10,
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  background: !isOptimized ? '#dc2626' : 'transparent',
                  color: !isOptimized ? '#ffffff' : '#94a3b8',
                  transition: 'all 0.2s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <AlertTriangle size={14} />
                Khi tự xếp lịch (3 lỗi)
              </button>
              <button
                type="button"
                onClick={() => setIsOptimized(true)}
                style={{
                  appearance: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '9px 16px',
                  borderRadius: 10,
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  background: isOptimized
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    : 'transparent',
                  color: isOptimized ? '#ffffff' : '#94a3b8',
                  transition: 'all 0.2s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Sparkles size={14} />
                Bật OR-Tools CP-SAT
              </button>
            </div>
          </div>

          {/* Interactive 3D Academic Knowledge Core + Comparison Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
              gap: 20,
              alignItems: 'stretch',
            }}
          >
            {/* Left Interactive 3D Knowledge Core Reactor (/models/academic-knowledge-core.glb) */}
            <div
              style={{
                borderRadius: 20,
                background: 'radial-gradient(circle at 50% 45%, rgba(30, 41, 59, 0.95) 0%, rgba(8, 11, 26, 0.98) 100%)',
                border: isOptimized
                  ? '1.5px solid rgba(16, 185, 129, 0.45)'
                  : '1.5px solid rgba(249, 115, 22, 0.4)',
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden',
                minHeight: 280,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 2 }}>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    padding: '3px 9px',
                    borderRadius: 999,
                    background: isOptimized ? 'rgba(16, 185, 129, 0.2)' : 'rgba(249, 115, 22, 0.2)',
                    color: isOptimized ? '#6ee7b7' : '#fdba74',
                    border: `1px solid ${isOptimized ? 'rgba(16, 185, 129, 0.4)' : 'rgba(249, 115, 22, 0.4)'}`,
                  }}
                >
                  {isOptimized ? '● LÕI 3D: ĐỒNG BỘ 100%' : '⚡ LÕI 3D: ĐANG QUÉT XUNG ĐỘT'}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>
                  GLB 3D Core
                </span>
              </div>

              <div style={{ width: '100%', height: 215, position: 'relative' }}>
                <KnowledgeCore3D
                  isOptimized={isOptimized}
                  onCoreClick={() => setIsOptimized((prev) => !prev)}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.74rem',
                  color: '#cbd5e1',
                  paddingTop: 8,
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                  zIndex: 2,
                }}
              >
                <span>Xoay hoặc chạm khối 3D để đổi trạng thái</span>
                <strong style={{ color: isOptimized ? '#34d399' : '#fb923c' }}>
                  {isOptimized ? '0 Conflicts' : '3 Collisions'}
                </strong>
              </div>
            </div>

            {/* Right Schedule Cards */}
            <div style={{ gridColumn: 'span 2', minWidth: 280 }}>
              <AnimatePresence mode="wait">
                {!isOptimized ? (
              <motion.div
                key="chaotic-state"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: 16,
                }}
              >
                {[
                  {
                    slot: 'Slot 1 · 07:30 – 09:00',
                    course: 'MAS291 · Xác suất Thống kê',
                    room: 'Phòng A.304 · Tòa Alpha',
                    status: 'Không có đệm chuyển tòa (0 phút)',
                    badgeColor: '#f59e0b',
                    borderColor: 'rgba(245, 158, 11, 0.45)',
                    detail: 'Vừa hết tiết lúc 09:00 phải có mặt ngay tại Lab Tòa Beta cách 280m.',
                  },
                  {
                    slot: 'Slot 2 · 09:00 – 10:45 (TRÙNG GIỜ)',
                    course: 'PRN211 Lab vs. Họp Mentor Capstone',
                    room: 'Phòng B.208 Beta & Phòng G.102',
                    status: 'Xung đột cứng 2 sự kiện cùng lúc',
                    badgeColor: '#ef4444',
                    borderColor: 'rgba(239, 68, 68, 0.55)',
                    detail: 'Đặt lịch họp nhóm đè lên ca thực hành bắt buộc trên FAP.',
                  },
                  {
                    slot: 'Ca Đêm · 23:30 – 02:30 Sáng',
                    course: 'Chạy nước rút Sprint 2 SWP391',
                    room: 'Quá tải nhịp sinh học',
                    status: 'Nguy cơ kiệt sức & trễ hạn nộp',
                    badgeColor: '#ef4444',
                    borderColor: 'rgba(239, 68, 68, 0.45)',
                    detail: 'Dồn toàn bộ 6 tiếng code đồ án vào đêm trước hạn chót.',
                  },
                ].map((item) => (
                  <div
                    key={item.slot}
                    style={{
                      padding: '18px 20px',
                      borderRadius: 18,
                      background: 'rgba(30, 41, 59, 0.75)',
                      border: `1.5px solid ${item.borderColor}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#cbd5e1' }}>{item.slot}</span>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: 'rgba(239, 68, 68, 0.2)',
                          color: '#fca5a5',
                        }}
                      >
                        {item.status}
                      </span>
                    </div>
                    <strong style={{ fontSize: '1.02rem', color: '#ffffff' }}>{item.course}</strong>
                    <span style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <MapPin size={13} color="#f97316" /> {item.room}
                    </span>
                    <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#fca5a5', lineHeight: 1.45 }}>
                      {item.detail}
                    </p>
                  </div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="optimized-state"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: 16,
                }}
              >
                {[
                  {
                    slot: 'Slot 1 · 07:30 – 09:00 + Đệm 15p',
                    course: 'MAS291 · Xác suất Thống kê',
                    room: 'A.304 Alpha → Đi bộ 4.2p sang Beta',
                    status: 'Đệm an toàn 09:00 – 09:15',
                    detail: 'Cóc AI tự động khóa 15 phút nghỉ & di chuyển trước khi vào Slot 2.',
                  },
                  {
                    slot: 'Slot 2 · 09:15 – 10:45',
                    course: 'PRN211 · Thực hành Lab C#',
                    room: 'Phòng Lab B.208 · Tòa Beta',
                    status: '0 Xung đột · Đã dời lịch họp sang Slot 4',
                    detail: 'Buổi họp Mentor Capstone được tự động chuyển sang 13:30 khi cả nhóm cùng trống.',
                  },
                  {
                    slot: 'Slot 3 · 11:00 – 12:30 (Deep Work)',
                    course: 'Sprint 2 SWP391 (Phiên 3/4 · 90 phút)',
                    room: 'Khu tự học Atrium · Tầng 2',
                    status: 'Hoàn thành sớm 24h trước Deadline',
                    detail: 'Chia nhỏ đồ án vào khung giờ vàng buổi sáng, buổi tối hoàn toàn thảnh thơi.',
                  },
                ].map((item) => (
                  <div
                    key={item.slot}
                    style={{
                      padding: '18px 20px',
                      borderRadius: 18,
                      background: 'rgba(16, 185, 129, 0.09)',
                      border: '1.5px solid rgba(16, 185, 129, 0.45)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#a7f3d0' }}>{item.slot}</span>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: 'rgba(16, 185, 129, 0.25)',
                          color: '#6ee7b7',
                        }}
                      >
                        ✓ {item.status}
                      </span>
                    </div>
                    <strong style={{ fontSize: '1.02rem', color: '#ffffff' }}>{item.course}</strong>
                    <span style={{ fontSize: '0.82rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <CheckCircle2 size={13} color="#34d399" /> {item.room}
                    </span>
                    <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#a7f3d0', lineHeight: 1.45 }}>
                      {item.detail}
                    </p>
                  </div>
                ))}
              </motion.div>
            )}
              </AnimatePresence>
            </div>
          </div>

          {/* Bottom Interactive Action Bar */}
          <div
            style={{
              marginTop: 20,
              paddingTop: 16,
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
              fontSize: '0.84rem',
              color: '#94a3b8',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={15} color="#f97316" />
              <span>
                Thuật toán <strong style={{ color: '#f8fafc' }}>Google OR-Tools CP-SAT v2.4</strong> giải bài toán tối ưu 68 biến ràng buộc trong 420ms.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOptimized((prev) => !prev)}
              style={{
                appearance: 'none',
                border: 'none',
                background: 'transparent',
                color: '#fb923c',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.85rem',
              }}
            >
              <ArrowRightLeft size={14} />
              <span>{isOptimized ? 'Xem lại lịch khi chưa tối ưu' : 'Bấm để xem AI giải quyết xung đột ngay'}</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
