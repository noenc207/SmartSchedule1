import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollWordRevealText, ShimmerSweepBadge } from '../../../components/effects/AnimateText';

export function LandingProductPreview() {
  const [activeTab, setActiveTab] = useState<'schedule' | 'conflict' | 'tasks'>('schedule');
  const [conflictResolved, setConflictResolved] = useState(false);

  return (
    <section id="product-preview" className="landing-section landing-section-alt" aria-labelledby="preview-heading">
      <div className="landing-container">
        <motion.div
          className="landing-section-header"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <ShimmerSweepBadge delay={0.05} duration={0.8} className="inline-block">
            <span className="landing-section-pill">TRẢI NGHIỆM THỰC TẾ</span>
          </ShimmerSweepBadge>

          <h2 id="preview-heading" className="landing-section-title">
            <ScrollWordRevealText
              text="Giao diện trực quan, tương tác mượt mà"
              as="span"
              delay={0.12}
            />
          </h2>
          <motion.p
            className="landing-section-desc"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            Trải nghiệm thử các tính năng cốt lõi của SmartSchedule ngay tại đây trước khi tạo tài khoản.
          </motion.p>
        </motion.div>

        <motion.div
          className="landing-preview-box"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Tab Navigation with Interactive Feedback */}
          <div className="landing-preview-tab-bar" role="tablist" aria-label="Các chế độ xem sản phẩm">
            {[
              { id: 'schedule', label: 'Lịch học tuần (6 Slot)' },
              { id: 'conflict', label: 'Bộ giải quyết xung đột' },
              { id: 'tasks', label: 'Quản lý Deadline & Đồ án' },
            ].map((tab) => (
              <motion.button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`landing-preview-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id as 'schedule' | 'conflict' | 'tasks')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                {tab.label}
              </motion.button>
            ))}
          </div>

          {/* Tab Content Panel */}
          <div className="landing-preview-content" role="tabpanel">
            <AnimatePresence mode="wait">
              {activeTab === 'schedule' && (
                <motion.div
                  key="schedule"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#f8faff' }}>Tuần 4 · Học kỳ Spring 2026</h4>
                      <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>FPT University Quy Nhơn · Chuyên ngành Kỹ thuật phần mềm</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '0.78rem' }}>
                      <span style={{ padding: '4px 10px', background: 'rgba(56, 189, 248, 0.15)', color: '#9de7ff', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '6px', fontWeight: 600 }}>
                        ● Lớp cố định
                      </span>
                      <span style={{ padding: '4px 10px', background: 'rgba(234, 88, 12, 0.18)', color: '#ff7a32', border: '1px solid rgba(234, 88, 12, 0.4)', borderRadius: '6px', fontWeight: 600 }}>
                        ● Khối tự học
                      </span>
                      <span style={{ padding: '4px 10px', background: 'rgba(255, 255, 255, 0.08)', color: '#cbd5e1', border: '1px dashed rgba(255, 255, 255, 0.2)', borderRadius: '6px', fontWeight: 600 }}>
                        ● Đệm di chuyển
                      </span>
                    </div>
                  </div>

                  {/* Schedule Grid Simulation */}
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'separate', borderSpacing: '6px', textAlign: 'left' }}>
                      <thead>
                        <tr>
                          <th style={{ width: '80px', padding: '8px', fontSize: '0.75rem', color: '#94a3b8' }}>KHUNG GIỜ</th>
                          <th style={{ padding: '8px', fontSize: '0.82rem', fontWeight: 700, color: '#f8faff' }}>Thứ Hai</th>
                          <th style={{ padding: '8px', fontSize: '0.82rem', fontWeight: 700, color: '#f8faff' }}>Thứ Ba</th>
                          <th style={{ padding: '8px', fontSize: '0.82rem', fontWeight: 700, color: '#f8faff' }}>Thứ Tư</th>
                          <th style={{ padding: '8px', fontSize: '0.82rem', fontWeight: 700, color: '#f8faff' }}>Thứ Năm</th>
                          <th style={{ padding: '8px', fontSize: '0.82rem', fontWeight: 700, color: '#f8faff' }}>Thứ Sáu</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600 }}>
                            Slot 1<br />07:30 - 09:00
                          </td>
                          <td style={{ background: 'rgba(38, 63, 120, 0.35)', border: '1px solid rgba(157, 231, 255, 0.25)', borderRadius: '8px', padding: '10px' }}>
                            <strong style={{ fontSize: '0.85rem', color: '#f8faff', display: 'block' }}>PRN211</strong>
                            <span style={{ fontSize: '0.75rem', color: '#9de7ff' }}>P.302 · Alpha</span>
                          </td>
                          <td style={{ background: 'rgba(234, 88, 12, 0.2)', border: '1px solid rgba(234, 88, 12, 0.4)', borderRadius: '8px', padding: '10px' }}>
                            <strong style={{ fontSize: '0.85rem', color: '#ffc46b', display: 'block' }}>Tự học PRN211</strong>
                            <span style={{ fontSize: '0.75rem', color: '#ff7a32' }}>Thư viện Alpha</span>
                          </td>
                          <td style={{ background: 'rgba(38, 63, 120, 0.35)', border: '1px solid rgba(157, 231, 255, 0.25)', borderRadius: '8px', padding: '10px' }}>
                            <strong style={{ fontSize: '0.85rem', color: '#f8faff', display: 'block' }}>PRN211</strong>
                            <span style={{ fontSize: '0.75rem', color: '#9de7ff' }}>P.302 · Alpha</span>
                          </td>
                          <td style={{ background: 'rgba(255, 255, 255, 0.04)', borderRadius: '8px', padding: '10px', color: '#64748b', fontSize: '0.8rem' }}>
                            — Trống —
                          </td>
                          <td style={{ background: 'rgba(38, 63, 120, 0.35)', border: '1px solid rgba(157, 231, 255, 0.25)', borderRadius: '8px', padding: '10px' }}>
                            <strong style={{ fontSize: '0.85rem', color: '#f8faff', display: 'block' }}>SWP391</strong>
                            <span style={{ fontSize: '0.75rem', color: '#9de7ff' }}>Lab 205 · Beta</span>
                          </td>
                        </tr>
                        <tr>
                          <td style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600 }}>
                            Slot 2<br />09:15 - 10:45
                          </td>
                          <td style={{ background: 'rgba(38, 63, 120, 0.35)', border: '1px solid rgba(157, 231, 255, 0.25)', borderRadius: '8px', padding: '10px' }}>
                            <strong style={{ fontSize: '0.85rem', color: '#f8faff', display: 'block' }}>SWP391 Lab</strong>
                            <span style={{ fontSize: '0.75rem', color: '#9de7ff' }}>Lab 205 · Beta</span>
                          </td>
                          <td style={{ background: 'rgba(38, 63, 120, 0.35)', border: '1px solid rgba(157, 231, 255, 0.25)', borderRadius: '8px', padding: '10px' }}>
                            <strong style={{ fontSize: '0.85rem', color: '#f8faff', display: 'block' }}>MAS291</strong>
                            <span style={{ fontSize: '0.75rem', color: '#9de7ff' }}>P.401 · Alpha</span>
                          </td>
                          <td style={{ background: 'rgba(234, 88, 12, 0.2)', border: '1px solid rgba(234, 88, 12, 0.4)', borderRadius: '8px', padding: '10px' }}>
                            <strong style={{ fontSize: '0.85rem', color: '#ffc46b', display: 'block' }}>Họp nhóm SWP391</strong>
                            <span style={{ fontSize: '0.75rem', color: '#ff7a32' }}>Khu Co-working</span>
                          </td>
                          <td style={{ background: 'rgba(38, 63, 120, 0.35)', border: '1px solid rgba(157, 231, 255, 0.25)', borderRadius: '8px', padding: '10px' }}>
                            <strong style={{ fontSize: '0.85rem', color: '#f8faff', display: 'block' }}>MAS291</strong>
                            <span style={{ fontSize: '0.75rem', color: '#9de7ff' }}>P.401 · Alpha</span>
                          </td>
                          <td style={{ background: 'rgba(234, 88, 12, 0.2)', border: '1px solid rgba(234, 88, 12, 0.4)', borderRadius: '8px', padding: '10px' }}>
                            <strong style={{ fontSize: '0.85rem', color: '#ffc46b', display: 'block' }}>Ôn tập cuối tuần</strong>
                            <span style={{ fontSize: '0.75rem', color: '#ff7a32' }}>Thư viện Beta</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {activeTab === 'conflict' && (
                <motion.div
                  key="conflict"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
                >
                  <div style={{ background: conflictResolved ? 'rgba(16, 185, 129, 0.12)' : 'rgba(234, 88, 12, 0.14)', border: `1px solid ${conflictResolved ? 'rgba(52, 211, 153, 0.35)' : 'rgba(255, 122, 50, 0.35)'}`, borderRadius: '12px', padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                      <strong style={{ fontSize: '1rem', color: conflictResolved ? '#34d399' : '#ffc46b' }}>
                        {conflictResolved
                          ? '✓ Tất cả xung đột đã được hóa giải thành công'
                          : '⚠ Phát hiện xung đột lịch: Họp nhóm đồ án trùng giờ thi'}
                      </strong>
                      <span style={{ fontSize: '0.78rem', padding: '4px 10px', background: conflictResolved ? '#059669' : '#ea580c', color: '#ffffff', borderRadius: '6px', fontWeight: 700 }}>
                        {conflictResolved ? 'Trạng thái: Hoàn hảo' : 'Cần xử lý'}
                      </span>
                    </div>

                    <p style={{ margin: '0 0 16px', fontSize: '0.92rem', color: '#cbd5e1' }}>
                      {conflictResolved
                        ? 'Lịch họp nhóm SWP391 đã được dời an toàn sang Thứ Năm Slot 4 (13:30 - 15:00) tại Phòng Seminar Beta. Không làm ảnh hưởng giờ ôn thi MAS291.'
                        : 'Thứ Tư Slot 3 (11:00 - 12:30): Lịch thi thử MAS291 trùng với Buổi họp nhóm Sprint 2 của đồ án SWP391.'}
                    </p>

                    <motion.button
                      type="button"
                      className="landing-btn-cta"
                      style={{ padding: '10px 20px', fontSize: '0.9rem' }}
                      onClick={() => setConflictResolved(!conflictResolved)}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      {conflictResolved ? 'Xem lại xung đột ban đầu' : 'Tự động dời lịch thông minh (1-Click)'}
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {activeTab === 'tasks' && (
                <motion.div
                  key="tasks"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                    {[
                      {
                        priority: 'ƯU TIÊN CAO',
                        pBg: 'rgba(239, 68, 68, 0.2)',
                        pColor: '#f87171',
                        due: 'Hạn: 3 ngày tới',
                        title: 'SWP391 · Sơ đồ kiến trúc & Database',
                        desc: 'Ước tính cần 6h · Đã xếp vào 4 slot học tuần',
                        barW: '80%',
                        barC: '#ea580c',
                      },
                      {
                        priority: 'TRUNG BÌNH',
                        pBg: 'rgba(234, 88, 12, 0.2)',
                        pColor: '#ffc46b',
                        due: 'Hạn: 5 ngày tới',
                        title: 'PRN211 · Bài tập Lab 3 Entity Framework',
                        desc: 'Ước tính cần 3h · Đã xếp vào 2 slot tự học',
                        barW: '45%',
                        barC: '#38bdf8',
                      },
                      {
                        priority: 'TIẾN ĐỘ TỐT',
                        pBg: 'rgba(16, 185, 129, 0.2)',
                        pColor: '#34d399',
                        due: 'Tuần sau',
                        title: 'MAS291 · Giải đề cương Xác suất thống kê',
                        desc: 'Ước tính cần 4.5h · Phân bổ đều các buổi chiều',
                        barW: '25%',
                        barC: '#10b981',
                      },
                    ].map((item, idx) => (
                      <motion.div
                        key={item.title}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: idx * 0.1 }}
                        whileHover={{ y: -4, borderColor: 'rgba(255, 122, 50, 0.35)' }}
                        style={{
                          background: 'rgba(17, 26, 58, 0.75)',
                          border: '1px solid rgba(157, 231, 255, 0.15)',
                          borderRadius: '10px',
                          padding: '16px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: item.pColor, background: item.pBg, padding: '2px 8px', borderRadius: '4px' }}>
                            {item.priority}
                          </span>
                          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{item.due}</span>
                        </div>
                        <strong style={{ fontSize: '0.92rem', display: 'block', marginBottom: '6px', color: '#f8faff' }}>{item.title}</strong>
                        <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 10px' }}>{item.desc}</p>
                        <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: item.barW }}
                            transition={{ duration: 0.8, delay: 0.2 + idx * 0.1 }}
                            style={{ height: '100%', background: item.barC }}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
