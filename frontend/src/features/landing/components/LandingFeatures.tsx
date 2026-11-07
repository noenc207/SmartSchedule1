import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Compass,
  Layers,
  ShieldAlert,
  CheckCircle2,
  Clock,
  MapPin,
  Sparkles,
  Zap,
} from 'lucide-react';

const FPTU_SLOTS = [
  { id: 1, name: 'Slot 1', time: '07:30 – 09:00', course: 'PRN231 · Building Cross-Platform Web APIs', room: 'P.A302 · Tòa Alpha', type: 'Lý thuyết chuyên ngành', color: '#2563eb' },
  { id: 2, name: 'Slot 2', time: '09:15 – 10:45', course: 'AIL303m · Machine Learning Thực hành', room: 'Lab B204 · Tòa Beta', type: 'Thực hành Lab AI (Đệm 15p)', color: '#ea580c' },
  { id: 3, name: 'Slot 3', time: '11:00 – 12:30', course: 'Deep Work · Đồ án SWP391 Sprint 2', room: 'Không gian Atrium Tầng 2', type: 'Cóc AI tự động xếp lịch', color: '#059669' },
  { id: 4, name: 'Slot 4', time: '12:50 – 14:20', course: 'JPD123 · Tiếng Nhật Sơ cấp 2', room: 'P.A405 · Tòa Alpha', type: 'Ngoại ngữ bắt buộc', color: '#7c3aed' },
  { id: 5, name: 'Slot 5', time: '14:30 – 16:00', course: 'Họp Mentor Đồ án Tốt nghiệp', room: 'Phòng Thảo luận G102', type: 'Lịch nhóm đồng bộ', color: '#0284c7' },
  { id: 6, name: 'Slot 6', time: '16:10 – 17:40', course: 'Rèn luyện Vovinam / CLB F-Code', room: 'Sân tập Đa năng Campus', type: 'Hoạt động ngoại khóa', color: '#d97706' },
];

export function LandingFeatures() {
  const [selectedSlot, setSelectedSlot] = useState(FPTU_SLOTS[1]);

  return (
    <section id="features" className="landing-section landing-section-alt" aria-labelledby="features-heading">
      <div className="landing-container">
        <div className="landing-section-header">
          <div className="landing-pill-badge">
            <span className="landing-pill-dot" aria-hidden="true" />
            KIẾN TRÚC ĐẶC THÙ CHO SINH VIÊN FPTU
          </div>

          <h2 id="features-heading" className="landing-section-title">
            Thiết kế chuẩn xác theo{' '}
            <span className="landing-hero-headline-highlight">
              nhịp sống 6 Slot
            </span>{' '}
            tại Quy Nhơn AI Campus
          </h2>

          <p className="landing-section-desc">
            Không phải ứng dụng lịch đại trà. Mọi thuật toán của SmartSchedule đều được huấn luyện trên cấu trúc học kỳ, sơ đồ tòa nhà và khối lượng đồ án thực tế của sinh viên FPT University.
          </p>
        </div>

        {/* Asymmetric Bento Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(12, 1fr)',
            gap: 22,
          }}
        >
          {/* Bento Card 1 (7 cols): Interactive 6-Slot FPTU Explorer */}
          <motion.article
            whileHover={{ y: -4 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            style={{
              gridColumn: 'span 12',
              background: '#ffffff',
              borderRadius: 26,
              padding: '28px 30px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 16px 40px -14px rgba(15, 23, 42, 0.07)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
              gap: 28,
              alignItems: 'center',
            }}
          >
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '5px 12px',
                  borderRadius: 999,
                  background: 'rgba(234, 88, 12, 0.1)',
                  color: '#ea580c',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  marginBottom: 14,
                }}
              >
                <Calendar size={14} />
                TRỤ CỘT 01 · CHUẨN HÓA 6 SLOT HỌC FAP
              </div>

              <h3
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 900,
                  color: '#0f172a',
                  margin: '0 0 12px',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.25,
                }}
              >
                Khớp nối hoàn hảo 6 ca học từ 07:30 sáng đến 17:40 chiều
              </h3>

              <p style={{ fontSize: '0.96rem', color: '#475569', lineHeight: 1.65, margin: '0 0 20px' }}>
                Thay vì chia theo từng giờ rời rạc, SmartSchedule nhận diện trực tiếp 6 Slot chuẩn FPTU. Bấm vào từng Slot bên cạnh để xem cách AI lồng ghép lịch học chính khóa, đệm di chuyển và phiên tự học sâu.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {[
                  'Đồng bộ mã môn PRN, SWP, AIL, MAS',
                  'Tự động khóa cứng ca thi FE / PE',
                  'Phân biệt ca Lý thuyết & Lab thực hành',
                ].map((tag) => (
                  <span
                    key={tag}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 12px',
                      borderRadius: 10,
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: '#334155',
                    }}
                  >
                    <CheckCircle2 size={14} color="#059669" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Interactive 6-Slot Selector Widget */}
            <div
              style={{
                background: '#0f172a',
                borderRadius: 20,
                padding: '20px 22px',
                color: '#f8fafc',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                boxShadow: '0 20px 44px -12px rgba(15, 23, 42, 0.25)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 14,
                }}
              >
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.04em' }}>
                  BẤM CHỌN SLOT ĐỂ KIỂM TRA LỊCH TRÌNH
                </span>
                <span
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    color: '#34d399',
                    background: 'rgba(16, 185, 129, 0.16)',
                    padding: '3px 9px',
                    borderRadius: 999,
                  }}
                >
                  6/6 Slot Active
                </span>
              </div>

              {/* 6 Slot Pills */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                {FPTU_SLOTS.map((slot) => {
                  const active = selectedSlot.id === slot.id;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      style={{
                        appearance: 'none',
                        border: active ? `1.5px solid ${slot.color}` : '1px solid rgba(255,255,255,0.1)',
                        background: active ? 'rgba(255, 255, 255, 0.12)' : 'rgba(30, 41, 59, 0.7)',
                        color: active ? '#ffffff' : '#94a3b8',
                        borderRadius: 12,
                        padding: '8px 10px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.18s ease',
                      }}
                    >
                      <div style={{ fontSize: '0.82rem', fontWeight: 800 }}>{slot.name}</div>
                      <div style={{ fontSize: '0.68rem', opacity: 0.8 }}>{slot.time.split(' – ')[0]}</div>
                    </button>
                  );
                })}
              </div>

              {/* Selected Slot Detail Card */}
              <motion.div
                key={selectedSlot.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  padding: '16px 18px',
                  borderRadius: 16,
                  background: 'rgba(30, 41, 59, 0.92)',
                  borderLeft: `4px solid ${selectedSlot.color}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#fdba74' }}>
                    {selectedSlot.name} · {selectedSlot.time}
                  </span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 6,
                      background: 'rgba(255,255,255,0.08)',
                      color: '#e2e8f0',
                    }}
                  >
                    {selectedSlot.type}
                  </span>
                </div>
                <strong style={{ fontSize: '1.02rem', color: '#ffffff' }}>{selectedSlot.course}</strong>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: '#94a3b8' }}>
                  <MapPin size={13} color="#38bdf8" />
                  <span>{selectedSlot.room}</span>
                </div>
              </motion.div>
            </div>
          </motion.article>

          {/* 3 Secondary Bento Cards */}
          {[
            {
              badge: 'TRỤ CỘT 02 · ĐỊNH TUYẾN CAMPUS',
              icon: Compass,
              color: '#0284c7',
              bg: 'rgba(2, 132, 199, 0.09)',
              title: 'Đệm di chuyển thông minh Alpha ↔ Beta ↔ Atrium',
              desc: 'Tự động tính khoảng cách đi bộ thực tế (280m – 4.2 phút) giữa các tòa nhà trong khuôn viên An Phú Thịnh và chèn 15 phút đệm an toàn trước mỗi ca học.',
              footer: '✓ Cảnh báo rời lớp sớm 5 phút trên điện thoại',
            },
            {
              badge: 'TRỤ CỘT 03 · CHỐNG NƯỚC RÚT CUỐI KỲ',
              icon: Layers,
              color: '#ea580c',
              bg: 'rgba(234, 88, 12, 0.1)',
              title: 'Băm nhỏ Đồ án Capstone & SWP391 theo Sprint',
              desc: 'Chỉ cần nhập hạn nộp đồ án và tổng số giờ ước tính (ví dụ: 12 giờ), OR-Tools sẽ tự động chia thành 8 phiên học sâu 90 phút rải đều vào các slot trống trong tuần.',
              footer: '✓ Hoàn thành bài tập sớm 24h trước hạn LMS',
            },
            {
              badge: 'TRỤ CỘT 04 · LÁ CHẮN XUNG ĐỘT 24/7',
              icon: ShieldAlert,
              color: '#059669',
              bg: 'rgba(5, 150, 105, 0.1)',
              title: 'Tự động tái cấu trúc lịch khi có lịch thi đột xuất',
              desc: 'Khi giảng viên thêm lịch học bù hoặc lịch bảo vệ đồ án trùng vào ca tự học, hệ thống tự động tìm slot trống thay thế chỉ với 1 cú nhấp chuột.',
              footer: '✓ Bảo toàn 100% mục tiêu giờ học hàng tuần',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <motion.article
                key={item.title}
                whileHover={{ y: -5 }}
                transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                style={{
                  gridColumn: 'span 4',
                  background: '#ffffff',
                  borderRadius: 24,
                  padding: '26px 24px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 12px 30px -12px rgba(15, 23, 42, 0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 16,
                }}
                className="bento-col-card"
              >
                <div>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '4px 11px',
                      borderRadius: 999,
                      background: item.bg,
                      color: item.color,
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      marginBottom: 14,
                    }}
                  >
                    <Icon size={14} />
                    {item.badge}
                  </div>

                  <h3
                    style={{
                      fontSize: '1.22rem',
                      fontWeight: 800,
                      color: '#0f172a',
                      margin: '0 0 10px',
                      lineHeight: 1.3,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {item.title}
                  </h3>

                  <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.6, margin: 0 }}>
                    {item.desc}
                  </p>
                </div>

                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 12,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: item.color,
                  }}
                >
                  {item.footer}
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>

      <style>{`
        @media (max-width: 960px) {
          .bento-col-card {
            grid-column: span 12 !important;
          }
        }
      `}</style>
    </section>
  );
}
