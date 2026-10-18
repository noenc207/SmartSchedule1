import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ScrollWordRevealText, ShimmerSweepBadge } from '../../../components/effects/AnimateText';

export function LandingChaos() {
  const [conflictSimulated, setConflictSimulated] = useState(true);

  return (
    <section id="chaos" className="landing-chaos-section" aria-labelledby="chaos-heading">
      <div className="landing-container">
        <motion.div
          className="landing-section-header"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <ShimmerSweepBadge delay={0.05} duration={0.8} className="inline-block">
            <span className="landing-pill-badge" style={{ background: 'rgba(239, 68, 68, 0.08)', color: '#dc2626', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
              <span className="landing-pill-dot" style={{ background: '#dc2626', boxShadow: '0 0 8px rgba(220, 38, 38, 0.5)' }} aria-hidden="true" />
              THỰC TRẠNG KỲ HỌC TẠI FPTU
            </span>
          </ShimmerSweepBadge>

          <h2 id="chaos-heading" className="landing-section-title">
            <ScrollWordRevealText
              text="Nỗi ám ảnh mang tên "
              as="span"
              delay={0.1}
            />
            <span className="landing-hero-headline-highlight">
              <ScrollWordRevealText
                text='"Xung đột lịch & Chạy đua deadline"'
                as="span"
                delay={0.25}
                highlight={true}
              />
            </span>
          </h2>
          <motion.p
            className="landing-section-subtitle"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            Hệ thống 6 slot học kéo dài từ sáng sớm đến chiều muộn, kết hợp đồ án Capstone và bài tập tuần khiến sinh viên FPTU dễ rơi vào tình trạng quá tải nếu không có phương pháp tổ chức thông minh.
          </motion.p>
        </motion.div>

        {/* 3 Problem Diagnostic Cards with Staggered Entrance & Hover Lift */}
        <div className="landing-chaos-cards-grid">
          {[
            {
              icon: '⚠',
              color: '#dc2626',
              bg: 'rgba(239, 68, 68, 0.1)',
              title: 'Chồng chéo ca học & ca thi',
              desc: 'Ca học bù, lịch vấn đáp và buổi làm việc nhóm thường trùng giờ nhau, gây bối rối và làm lỡ những mốc đánh giá quan trọng.',
              delay: 0.1,
            },
            {
              icon: '⏱',
              color: '#d97706',
              bg: 'rgba(245, 158, 11, 0.1)',
              title: 'Áp lực di chuyển campus',
              desc: 'Vừa tan ca Slot 1 tại Tòa Alpha lúc 09:00, bạn phải lập tức có mặt ở Tòa Beta lúc 09:15. Không có đệm an toàn dẫn đến trễ giờ và stress liên tục.',
              delay: 0.22,
            },
            {
              icon: '📚',
              color: '#ea580c',
              bg: 'rgba(234, 88, 12, 0.1)',
              title: 'Deadline đồ án dồn tuần cuối',
              desc: 'SWP391, bài tập Coursera và đồ án chuyên ngành không được chia nhỏ theo sprint, biến tuần thứ 9 và 10 thành chuỗi ngày thức trắng đêm.',
              delay: 0.34,
            },
          ].map((c) => (
            <motion.div
              key={c.title}
              className="landing-chaos-card"
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6, delay: c.delay, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{
                y: -5,
                borderColor: 'rgba(255, 122, 50, 0.45)',
                boxShadow: '0 12px 28px rgba(0, 0, 0, 0.35)',
                transition: { type: 'spring', stiffness: 350, damping: 22 },
              }}
            >
              <div className="landing-chaos-icon-box" style={{ background: c.bg, color: c.color }}>
                {c.icon}
              </div>
              <h3 className="landing-chaos-card-title">{c.title}</h3>
              <p className="landing-chaos-card-desc">{c.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Interactive Problem vs Solution Simulation Board */}
        <motion.div
          className="landing-chaos-sandbox-card"
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          <header className="landing-sandbox-header">
            <div className="landing-sandbox-title-wrap">
              <span className="landing-sandbox-badge">MÔ PHỎNG THỜI KHÓA BIỂU NGÀY THỨ NĂM</span>
              <span className="landing-sandbox-date">Kỳ Spring · Tuần thứ 4</span>
            </div>
            <motion.button
              type="button"
              className="landing-sandbox-toggle-btn"
              onClick={() => setConflictSimulated((prev) => !prev)}
              aria-pressed={conflictSimulated}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              {conflictSimulated ? '✓ Xem sau khi SmartSchedule tối ưu' : '⚠ Xem xung đột thực tế'}
            </motion.button>
          </header>

          <div className="landing-hero-timeline" role="list" aria-label="Thời khóa biểu mô phỏng">
            {/* Slot 1 */}
            <motion.div
              className="landing-timeline-slot"
              role="listitem"
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: 0.12 }}
            >
              <div className="landing-slot-time">
                <span className="landing-slot-tag">Slot 1</span>
                <span className="landing-slot-hours">07:30 - 09:00</span>
              </div>
              <div className="landing-slot-info">
                <span className="landing-slot-subject">PRN211 · Lập trình C# .NET</span>
                <span className="landing-slot-location">Phòng 302 · Tòa Alpha</span>
              </div>
              <div className="landing-slot-status landing-status-fixed">
                Lớp cố định
              </div>
            </motion.div>

            {/* Campus Transit Buffer */}
            <motion.div
              className="landing-timeline-slot"
              style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '8px 14px' }}
              role="listitem"
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: 0.2 }}
            >
              <div className="landing-slot-time" style={{ borderRightColor: 'rgba(157, 231, 255, 0.15)' }}>
                <span className="landing-slot-tag" style={{ color: '#94a3b8' }}>Đệm</span>
                <span className="landing-slot-hours">09:00 - 09:15</span>
              </div>
              <div className="landing-slot-info">
                <span className="landing-slot-subject" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  Di chuyển Tòa Alpha → Tòa Beta (Campus Bus / Đi bộ)
                </span>
                <span className="landing-slot-location">Đệm an toàn 15 phút tránh trễ giờ lên lớp</span>
              </div>
              <div className="landing-slot-status landing-status-transit">
                Đệm di chuyển
              </div>
            </motion.div>

            {/* Slot 2 */}
            <motion.div
              className="landing-timeline-slot"
              role="listitem"
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: 0.28 }}
            >
              <div className="landing-slot-time">
                <span className="landing-slot-tag">Slot 2</span>
                <span className="landing-slot-hours">09:15 - 10:45</span>
              </div>
              <div className="landing-slot-info">
                <span className="landing-slot-subject">SWP391 · Thực hành Capstone Lab</span>
                <span className="landing-slot-location">Phòng 205 · Tòa Beta</span>
              </div>
              <div className="landing-slot-status landing-status-fixed">
                Lớp cố định
              </div>
            </motion.div>

            {/* Slot 3: Simulated Conflict vs Optimized Study */}
            {conflictSimulated ? (
              <motion.div
                className="landing-timeline-slot"
                style={{ borderColor: 'rgba(239, 68, 68, 0.5)', background: 'rgba(239, 68, 68, 0.15)' }}
                role="listitem"
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: 0.36 }}
              >
                <div className="landing-slot-time" style={{ borderRightColor: 'rgba(239, 68, 68, 0.4)' }}>
                  <span className="landing-slot-tag" style={{ color: '#f87171' }}>Xung đột!</span>
                  <span className="landing-slot-hours">11:00 - 12:30</span>
                </div>
                <div className="landing-slot-info">
                  <span className="landing-slot-subject" style={{ color: '#fca5a5' }}>
                    Trùng lịch: Họp nhóm Capstone & Thi vấn đáp MAS291
                  </span>
                  <span className="landing-slot-location" style={{ color: '#ffc46b' }}>
                    SmartSchedule đề xuất: Tự động tách ca họp nhóm sang Slot 5 (15:15)
                  </span>
                </div>
                <div className="landing-slot-status landing-status-conflict">
                  Phát hiện trùng ca
                </div>
              </motion.div>
            ) : (
              <motion.div
                className="landing-timeline-slot"
                role="listitem"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35 }}
              >
                <div className="landing-slot-time">
                  <span className="landing-slot-tag" style={{ color: '#16a34a' }}>Đã tối ưu</span>
                  <span className="landing-slot-hours">11:00 - 12:00</span>
                </div>
                <div className="landing-slot-info">
                  <span className="landing-slot-subject">Thi vấn đáp MAS291 · Giảng đường Gamma</span>
                  <span className="landing-slot-location">Ca họp nhóm Capstone đã được dời an toàn sang 15:15</span>
                </div>
                <div className="landing-slot-status landing-status-study">
                  Đã giải quyết CSP
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
