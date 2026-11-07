import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Cpu,
  ListChecks,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  MapPin,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function LandingProductPreview() {
  const [activeTab, setActiveTab] = useState<'schedule' | 'conflict' | 'tasks'>('schedule');
  const [conflictResolved, setConflictResolved] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({
    'task-1': true,
  });

  const toggleTask = (id: string) => {
    setCompletedTasks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section id="product-preview" className="landing-section landing-section-alt" aria-labelledby="preview-heading">
      <div className="landing-container">
        <div className="landing-section-header">
          <div className="landing-pill-badge">
            <span className="landing-pill-dot" aria-hidden="true" />
            TRÌNH MÔ PHỎNG KHÔNG GIAN HỌC TẬP
          </div>

          <h2 id="preview-heading" className="landing-section-title">
            Trải nghiệm trực tiếp{' '}
            <span className="landing-hero-headline-highlight">
              SmartSchedule Studio
            </span>{' '}
            ngay trên trang chủ
          </h2>

          <p className="landing-section-desc">
            Tương tác thử với 3 phân hệ cốt lõi: Lịch tuần 6 Slot FPTU, Bộ hóa giải xung đột tự động và Bảng điều phối tiến độ đồ án trước khi đăng nhập.
          </p>
        </div>

        {/* Interactive Browser Window Mockup */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 28,
            border: '1px solid #cbd5e1',
            boxShadow: '0 28px 70px -18px rgba(15, 23, 42, 0.14)',
            overflow: 'hidden',
          }}
        >
          {/* Window Chrome + Tab Bar */}
          <div
            style={{
              background: '#0f172a',
              padding: '16px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16,
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            {/* Traffic Lights & URL Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ display: 'flex', gap: 7 }}>
                <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#ef4444' }} />
                <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#f59e0b' }} />
                <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#10b981' }} />
              </div>
              <span
                style={{
                  padding: '5px 14px',
                  borderRadius: 8,
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#cbd5e1',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                }}
              >
                app.smartschedule.fpt.edu.vn/workspace
              </span>
            </div>

            {/* Interactive Tab Switcher */}
            <div
              role="tablist"
              aria-label="Các chế độ xem sản phẩm"
              style={{
                display: 'flex',
                gap: 6,
                background: 'rgba(30, 41, 59, 0.9)',
                padding: 4,
                borderRadius: 12,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                flexWrap: 'wrap',
              }}
            >
              {[
                { id: 'schedule', label: '01. Lịch học tuần (6 Slot)', icon: Calendar },
                { id: 'conflict', label: '02. Giải quyết xung đột', icon: Cpu },
                { id: 'tasks', label: '03. Quản lý Đồ án & Task', icon: ListChecks },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveTab(tab.id as 'schedule' | 'conflict' | 'tasks')}
                    style={{
                      appearance: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '8px 14px',
                      borderRadius: 9,
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      background: active
                        ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
                        : 'transparent',
                      color: active ? '#ffffff' : '#94a3b8',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'all 0.18s ease',
                    }}
                  >
                    <Icon size={14} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Workspace Body */}
          <div style={{ padding: '28px 30px', background: '#f8fafc' }} role="tabpanel">
            <AnimatePresence mode="wait">
              {activeTab === 'schedule' && (
                <motion.div
                  key="schedule"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.22 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 12,
                    }}
                  >
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.22rem', fontWeight: 900, color: '#0f172a' }}>
                        Tuần 7 · Học kỳ Fall 2026 · Kỹ thuật Phần mềm AI (K17)
                      </h3>
                      <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                        FPT University Quy Nhơn · Đã đồng bộ FAP & Cóc AI
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: '0.78rem' }}>
                      <span
                        style={{
                          padding: '5px 12px',
                          background: 'rgba(37, 99, 235, 0.1)',
                          color: '#1d4ed8',
                          borderRadius: 999,
                          fontWeight: 800,
                        }}
                      >
                        ● Lớp chính khóa FAP
                      </span>
                      <span
                        style={{
                          padding: '5px 12px',
                          background: 'rgba(234, 88, 12, 0.12)',
                          color: '#c2410c',
                          borderRadius: 999,
                          fontWeight: 800,
                        }}
                      >
                        ● Phiên học sâu AI xếp
                      </span>
                      <span
                        style={{
                          padding: '5px 12px',
                          background: 'rgba(5, 150, 105, 0.12)',
                          color: '#047857',
                          borderRadius: 999,
                          fontWeight: 800,
                        }}
                      >
                        ● Đệm di chuyển 15p
                      </span>
                    </div>
                  </div>

                  {/* 4-Day Interactive Preview Columns */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: 14,
                    }}
                  >
                    {[
                      {
                        day: 'Thứ Hai · 02/11',
                        slots: [
                          { s: 'Slot 1 · 07:30', title: 'PRN211 · Lập trình C#', room: 'P.A304 · Tòa Alpha', color: '#2563eb', bg: '#eff6ff' },
                          { s: '09:00 – 09:15', title: 'Đệm chuyển tòa Alpha → Beta', room: 'Đi bộ 4.2 phút (280m)', color: '#059669', bg: '#ecfdf5' },
                          { s: 'Slot 2 · 09:15', title: 'SWP391 · Đồ án Phần mềm', room: 'Lab B202 · Tòa Beta', color: '#2563eb', bg: '#eff6ff' },
                        ],
                      },
                      {
                        day: 'Thứ Ba · 03/11',
                        slots: [
                          { s: 'Slot 1 · 07:30', title: 'MAS291 · Xác suất Thống kê', room: 'P.A201 · Tòa Alpha', color: '#2563eb', bg: '#eff6ff' },
                          { s: 'Slot 3 · 11:00', title: 'Deep Work: Lab 4 PRN211', room: 'Atrium Tầng 2 (AI Xếp)', color: '#ea580c', bg: '#fff7ed' },
                          { s: 'Slot 5 · 14:30', title: 'JPD123 · Tiếng Nhật', room: 'P.A405 · Tòa Alpha', color: '#7c3aed', bg: '#f5f3ff' },
                        ],
                      },
                      {
                        day: 'Thứ Tư · 04/11',
                        slots: [
                          { s: 'Slot 2 · 09:15', title: 'AIL303m · Machine Learning', room: 'Lab AI B301 · Beta', color: '#2563eb', bg: '#eff6ff' },
                          { s: 'Slot 4 · 12:50', title: 'Sprint 2 SWP391 (Phiên 2/4)', room: 'Thư viện Alpha (AI Xếp)', color: '#ea580c', bg: '#fff7ed' },
                          { s: 'Slot 5 · 14:30', title: 'Họp nhóm Capstone (4/4 rảnh)', room: 'Phòng Thảo luận G104', color: '#059669', bg: '#ecfdf5' },
                        ],
                      },
                      {
                        day: 'Thứ Năm · 05/11',
                        slots: [
                          { s: 'Slot 1 · 07:30', title: 'PRN211 · Thực hành Lab', room: 'Lab B208 · Tòa Beta', color: '#2563eb', bg: '#eff6ff' },
                          { s: 'Slot 3 · 11:00', title: 'Ôn thi Vấn đáp MAS291', room: 'Atrium AI Campus', color: '#ea580c', bg: '#fff7ed' },
                          { s: 'Slot 6 · 16:10', title: 'Vovinam / Rèn luyện thể chất', room: 'Sân vận động Campus', color: '#d97706', bg: '#fffbeb' },
                        ],
                      },
                    ].map((col) => (
                      <div
                        key={col.day}
                        style={{
                          background: '#ffffff',
                          borderRadius: 18,
                          padding: 16,
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                        }}
                      >
                        <strong
                          style={{
                            fontSize: '0.86rem',
                            color: '#0f172a',
                            paddingBottom: 8,
                            borderBottom: '1px solid #f1f5f9',
                          }}
                        >
                          {col.day}
                        </strong>
                        {col.slots.map((slot) => (
                          <div
                            key={slot.s}
                            style={{
                              padding: '10px 12px',
                              borderRadius: 12,
                              background: slot.bg,
                              borderLeft: `3.5px solid ${slot.color}`,
                            }}
                          >
                            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: slot.color }}>
                              {slot.s}
                            </div>
                            <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>
                              {slot.title}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                              {slot.room}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === 'conflict' && (
                <motion.div
                  key="conflict"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.22 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
                >
                  <div
                    style={{
                      padding: '22px 24px',
                      borderRadius: 20,
                      background: conflictResolved ? '#ecfdf5' : '#fef2f2',
                      border: `1.5px solid ${conflictResolved ? '#6ee7b7' : '#fca5a5'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 16,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 14,
                          background: conflictResolved ? '#10b981' : '#ef4444',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {conflictResolved ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                      </div>
                      <div>
                        <strong style={{ fontSize: '1.1rem', color: '#0f172a', display: 'block' }}>
                          {conflictResolved
                            ? 'Đã giải quyết xung đột thành công bằng OR-Tools CP-SAT!'
                            : 'Phát hiện 1 xung đột lịch học vào Thứ Sáu · Slot 4 (12:50 – 14:20)'}
                        </strong>
                        <span style={{ fontSize: '0.88rem', color: '#475569' }}>
                          {conflictResolved
                            ? 'Phiên tự học "Hoàn thiện Slide Capstone" đã được dời sang Slot 5 (14:30 – 16:00) tại Atrium.'
                            : 'Giảng viên vừa thêm "Lịch học bù AIL303m" trùng với phiên tự học "Hoàn thiện Slide Capstone".'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setConflictResolved((prev) => !prev)}
                      style={{
                        appearance: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '12px 20px',
                        borderRadius: 12,
                        fontSize: '0.88rem',
                        fontWeight: 800,
                        background: conflictResolved
                          ? '#0f172a'
                          : 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                        color: '#ffffff',
                        boxShadow: '0 8px 20px -4px rgba(234, 88, 12, 0.35)',
                      }}
                    >
                      {conflictResolved ? 'Hoàn tác để thử lại' : '✨ Hóa giải xung đột tự động (1-Click)'}
                    </button>
                  </div>
                </motion.div>
              )}

              {activeTab === 'tasks' && (
                <motion.div
                  key="tasks"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.22 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                >
                  <div style={{ marginBottom: 4 }}>
                    <strong style={{ fontSize: '1.08rem', color: '#0f172a' }}>
                      Danh sách Đồ án & Bài tập tuần (Bấm để đánh dấu hoàn thành thử):
                    </strong>
                  </div>
                  {[
                    {
                      id: 'task-1',
                      title: 'Hoàn thành Lab 4 Machine Learning (AIL303m)',
                      meta: '120 phút · Ưu tiên CAO · Đã xếp vào Thứ Ba Slot 3',
                      tag: 'Lab Chuyên ngành',
                    },
                    {
                      id: 'task-2',
                      title: 'Thiết kế Database Schema cho Đồ án SWP391 Sprint 2',
                      meta: '180 phút (2 phiên × 90p) · Ưu tiên KHẨN CẤP · Đã xếp Thứ Tư & Năm',
                      tag: 'Đồ án SWP391',
                    },
                    {
                      id: 'task-3',
                      title: 'Luyện đề thi thử PE môn PRN211 (.NET Core)',
                      meta: '90 phút · Ưu tiên VỪA · Đã xếp vào Thứ Sáu Slot 2',
                      tag: 'Ôn thi PE',
                    },
                  ].map((t) => {
                    const done = !!completedTasks[t.id];
                    return (
                      <div
                        key={t.id}
                        onClick={() => toggleTask(t.id)}
                        style={{
                          padding: '14px 18px',
                          borderRadius: 16,
                          background: '#ffffff',
                          border: done ? '1.5px solid #10b981' : '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 7,
                              background: done ? '#10b981' : '#f1f5f9',
                              border: done ? 'none' : '1.5px solid #cbd5e1',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 900,
                              fontSize: 12,
                            }}
                          >
                            {done ? '✓' : ''}
                          </div>
                          <div>
                            <strong
                              style={{
                                fontSize: '0.95rem',
                                color: done ? '#64748b' : '#0f172a',
                                textDecoration: done ? 'line-through' : 'none',
                                display: 'block',
                              }}
                            >
                              {t.title}
                            </strong>
                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{t.meta}</span>
                          </div>
                        </div>

                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            padding: '4px 10px',
                            borderRadius: 999,
                            background: done ? 'rgba(16, 185, 129, 0.12)' : 'rgba(234, 88, 12, 0.1)',
                            color: done ? '#059669' : '#ea580c',
                          }}
                        >
                          {done ? 'Đã hoàn thành' : t.tag}
                        </span>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom Callout inside Simulator */}
            <div
              style={{
                marginTop: 22,
                paddingTop: 18,
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <span style={{ fontSize: '0.86rem', color: '#475569', fontWeight: 600 }}>
                Muốn áp dụng cho chính thời khóa biểu FAP kỳ này của bạn?
              </span>
              <Link
                to="/login"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  color: '#ea580c',
                  textDecoration: 'none',
                }}
              >
                <span>Mở toàn bộ Không gian Học tập</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
