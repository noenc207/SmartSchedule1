import React, { useState } from 'react';
import { Sparkles, Calendar, ChevronRight, X, Maximize2 } from 'lucide-react';
import type { AiPlannerRecommendation } from '../../../services/scheduleApi';

interface CalendarAiPlannerBarProps {
  recommendation: AiPlannerRecommendation | null;
  loading?: boolean;
  onApply: () => void;
  onCustomize: () => void;
  onDismiss: () => void;
}

export function CalendarAiPlannerBar({
  recommendation,
  loading = false,
  onApply,
  onCustomize,
  onDismiss,
}: CalendarAiPlannerBarProps) {
  const [detailOpen, setDetailOpen] = useState(false);

  const fallbackRecommendation: AiPlannerRecommendation = {
    freeSlot: {
      dayOfWeek: 4,
      dayName: 'Thứ 5',
      startsAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + 200 * 60000).toISOString(),
      durationMinutes: 200,
      durationFormatted: '3h 20m',
    },
    recommendedTasks: [
      { taskId: 'ai-t1', title: 'Machine Learning Assignment', durationMinutes: 180, durationFormatted: '3h', priority: 'HIGH' },
      { taskId: 'ai-t2', title: 'OS Review', durationMinutes: 120, durationFormatted: '2h', priority: 'MEDIUM' },
    ],
    message: 'Bạn có 3h 20m trống vào thứ 5. Mình đã tìm thấy 2 nhiệm vụ ưu tiên:',
  };

  const activeRec =
    recommendation && recommendation.recommendedTasks && recommendation.recommendedTasks.length > 0
      ? recommendation
      : fallbackRecommendation;
  const { recommendedTasks, message } = activeRec;

  return (
    <>
      <div
        className="calendar-ai-planner-bar"
        role="complementary"
        aria-label="Gợi ý lên lịch thông minh"
        style={{
          marginTop: 8,
          padding: '8px 14px',
          borderRadius: 14,
          background: 'linear-gradient(90deg, #f5f3ff 0%, #ffffff 50%, #f8fafc 100%)',
          border: '1px solid #ddd6fe',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexShrink: 0,
        }}
      >
        {/* 1. Left: Brand Icon & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(99, 102, 241, 0.25)',
            }}
          >
            <Sparkles size={17} />
          </div>
          <div>
            <strong style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', display: 'block', lineHeight: 1.2 }}>
              AI Planner
            </strong>
            <span style={{ fontSize: 11, color: '#64748b' }}>Lên kế hoạch thông minh</span>
          </div>
        </div>

        {/* 2. Center: Proactive Recommendation Bubble (Compact Single-Screen Fit) */}
        <div
          onClick={() => setDetailOpen(true)}
          style={{
            flex: 1,
            minWidth: 0,
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: '6px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
          title="Bấm để mở khung chi tiết AI Planner"
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
              <Calendar size={13} color="#6366f1" />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {message}
              </span>
            </div>
            {recommendedTasks && recommendedTasks.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2, flexWrap: 'wrap' }}>
                {recommendedTasks.map((task) => (
                  <span key={task.taskId} style={{ fontSize: 11.5, color: '#334155', fontWeight: 600 }}>
                    <span style={{ color: '#6366f1', fontWeight: 800 }}>•</span> {task.title}{' '}
                    <span style={{ color: '#64748b' }}>({task.durationFormatted})</span>
                  </span>
                ))}
              </div>
            )}
          </div>
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              color: '#4f46e5',
              background: '#eef2ff',
              padding: '3px 8px',
              borderRadius: 6,
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              flexShrink: 0,
            }}
          >
            <Maximize2 size={11} /> Mở khung
          </span>
        </div>

        {/* 3. Right: Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            onClick={onApply}
            disabled={loading}
            style={{
              padding: '7px 14px',
              borderRadius: 9,
              border: 'none',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 700,
              cursor: loading ? 'wait' : 'pointer',
              boxShadow: '0 4px 10px rgba(79, 70, 229, 0.25)',
              whiteSpace: 'nowrap',
            }}
          >
            {loading ? 'Đang lên lịch...' : 'Lên lịch ngay'}
          </button>

          <button
            type="button"
            onClick={onCustomize}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '7px 11px',
              borderRadius: 9,
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <span>Tùy chỉnh</span>
            <ChevronRight size={13} />
          </button>

          <button
            type="button"
            onClick={onDismiss}
            title="Ẩn thanh gợi ý"
            aria-label="Ẩn gợi ý"
            style={{
              border: 'none',
              background: 'transparent',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Pop-out Modal when clicking "Mở khung" on AI Planner */}
      {detailOpen && (
        <div
          onClick={() => setDetailOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1300,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 540,
              background: '#ffffff',
              borderRadius: 20,
              border: '1px solid #e2e8f0',
              boxShadow: '0 24px 48px rgba(15, 23, 42, 0.2)',
              padding: '20px 24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 11,
                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Sparkles size={19} />
                </div>
                <div>
                  <strong style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', display: 'block' }}>
                    AI Planner · Đề xuất Xếp lịch Tối ưu
                  </strong>
                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    Tự động phân tích khoảng trống & ưu tiên bài tập trong tuần
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Đóng ✕
              </button>
            </div>

            <div
              style={{
                padding: '14px 16px',
                borderRadius: 14,
                background: '#f5f3ff',
                border: '1px solid #ddd6fe',
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1e1b4b', marginBottom: 10 }}>
                📅 {message}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recommendedTasks.map((t) => (
                  <div
                    key={t.taskId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: 10,
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <strong style={{ fontSize: 13, color: '#0f172a' }}>{t.title}</strong>
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: '#4f46e5',
                        background: '#eef2ff',
                        padding: '2px 9px',
                        borderRadius: 999,
                      }}
                    >
                      Thời lượng: {t.durationFormatted}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => {
                  setDetailOpen(false);
                  onCustomize();
                }}
                style={{
                  padding: '9px 16px',
                  borderRadius: 10,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#334155',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Tùy chỉnh ràng buộc ›
              </button>
              <button
                type="button"
                onClick={() => {
                  setDetailOpen(false);
                  onApply();
                }}
                style={{
                  padding: '9px 18px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  color: '#ffffff',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ⚡ Lên lịch ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
