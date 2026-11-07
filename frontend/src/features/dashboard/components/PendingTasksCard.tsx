import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckSquare, AlertCircle, FileText, ArrowRight, Plus, Sparkles, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Task } from '../../../types/domain';
import { taskApi } from '../../../services/taskApi';
import { useWorkspaceStore } from '../../../stores/workspaceStore';
import { showToast } from '../../../components/Toast';

interface PendingTasksCardProps {
  tasks?: Task[];
  onToggleComplete?: (task: Task) => void;
}

export function PendingTasksCard({ tasks: propTasks, onToggleComplete }: PendingTasksCardProps) {
  const navigate = useNavigate();
  const { activeScheduleId } = useWorkspaceStore();
  const [filter, setFilter] = useState<'all' | 'urgent'>('all');
  const [quickTitle, setQuickTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const pending = (propTasks || []).filter((t) => t.status !== 'COMPLETED');

  const taskList = pending.map((t) => {
    const isUrgent = t.priority === 'HIGH';
    let dueFormatted = 'Hôm nay';
    if (t.deadline) {
      const d = new Date(t.deadline);
      dueFormatted = `Hạn: ${d.getDate()}/${d.getMonth() + 1} - ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    }
    return {
      raw: t,
      id: t.id,
      title: t.title,
      due: dueFormatted,
      badge: isUrgent ? 'Khẩn cấp' : 'Quan trọng',
      badgeVariant: isUrgent ? 'pill-red' : 'pill-blue',
      iconBoxClass: isUrgent ? 'icon-box-red' : 'icon-box-blue',
      isUrgent,
    };
  });

  const urgentCount = taskList.filter((t) => t.isUrgent).length;
  const totalCount = taskList.length;
  const displayedTasks = filter === 'urgent' ? taskList.filter((t) => t.isUrgent) : taskList;

  const handleQuickAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim() || !activeScheduleId) return;
    setIsAdding(true);
    try {
      await taskApi.create(activeScheduleId, {
        title: quickTitle.trim(),
        estimatedDurationMinutes: 120,
        remainingDurationMinutes: 120,
        priority: 'MEDIUM',
        status: 'PENDING',
        minimumSessionMinutes: 30,
        maximumSessionMinutes: 180,
      });
      showToast(`Đã thêm bài tập: "${quickTitle.trim()}"!`, 'success');
      setQuickTitle('');
      setTimeout(() => window.location.reload(), 400);
    } catch {
      showToast('Không thể thêm bài tập nhanh. Vui lòng thử lại.', 'error');
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddSuggestedTask = async (title: string, duration: number, priority: 'HIGH' | 'MEDIUM' | 'LOW') => {
    if (!activeScheduleId) return;
    try {
      await taskApi.create(activeScheduleId, {
        title,
        estimatedDurationMinutes: duration,
        remainingDurationMinutes: duration,
        priority,
        status: 'PENDING',
        minimumSessionMinutes: 30,
        maximumSessionMinutes: 180,
      });
      showToast(`Đã thêm nhiệm vụ mẫu: "${title}"!`, 'success');
      setTimeout(() => window.location.reload(), 400);
    } catch {
      showToast('Không thể thêm bài tập.', 'error');
    }
  };

  return (
    <motion.div
      className="mock-card mock-pending-tasks-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.2 }}
      style={{ borderRadius: 16 }}
    >
      {/* Header */}
      <div className="mock-card-header">
        <div className="mock-card-title-group">
          <CheckSquare size={16} className="mock-header-icon" />
          <h2 className="mock-card-title">Nhiệm vụ cần hoàn thành</h2>
        </div>
        <span className="mock-count-pill pill-blue">{totalCount} bài tập chưa xong</span>
      </div>

      <div className="mock-tasks-subheading">Hạn chót &amp; Bài tập sắp tới</div>

      {/* Filter Tabs & View All Link */}
      <div className="mock-tasks-filter-bar">
        <div className="mock-filter-pills-group">
          <button
            type="button"
            className={`mock-filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Tất cả ({totalCount})
          </button>
          <button
            type="button"
            className={`mock-filter-tab ${filter === 'urgent' ? 'active' : ''}`}
            onClick={() => setFilter('urgent')}
          >
            Khẩn cấp ({urgentCount})
          </button>
        </div>

        <button
          type="button"
          className="mock-view-all-link"
          onClick={() => navigate('/tasks')}
        >
          <span>Xem tất cả bài tập</span>
          <ArrowRight size={13} />
        </button>
      </div>

      {/* Task List or Smart Suggested Tasks */}
      {displayedTasks.length === 0 ? (
        <div style={{ padding: '16px 0' }}>
          <div
            style={{
              padding: '16px',
              borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.05) 100%)',
              border: '1px solid var(--border-color, #e2e8f0)',
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: '#10b981',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Check size={14} strokeWidth={3} />
              </span>
              <strong style={{ fontSize: 14, color: 'var(--text-primary, #0f172a)' }}>
                Đã giải quyết sạch bài tập tồn đọng!
              </strong>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
              Bạn đang quản lý thời gian rất xuất sắc. Hãy bấm chọn một mục tiêu gợi ý dưới đây để Cóc AI xếp lịch:
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            <div
              onClick={() => handleAddSuggestedTask('Đọc trước tài liệu Machine Learning Lab 4', 120, 'HIGH')}
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                background: 'var(--bg-subtle, #f8fafc)',
                border: '1px solid var(--border-color, #e2e8f0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div>
                <strong style={{ fontSize: 13, color: 'var(--text-primary, #0f172a)', display: 'block' }}>
                  💡 Đọc trước tài liệu Machine Learning Lab 4
                </strong>
                <span style={{ fontSize: 11, color: '#64748b' }}>Thời lượng: 2h · Ưu tiên: Cao</span>
              </div>
              <span style={{ color: '#ea580c', fontSize: 12, fontWeight: 700 }}>+ Thêm</span>
            </div>

            <div
              onClick={() => handleAddSuggestedTask('Lập trình đồ án Capstone AI Quy Nhơn', 150, 'MEDIUM')}
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                background: 'var(--bg-subtle, #f8fafc)',
                border: '1px solid var(--border-color, #e2e8f0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div>
                <strong style={{ fontSize: 13, color: 'var(--text-primary, #0f172a)', display: 'block' }}>
                  💡 Lập trình đồ án Capstone AI Quy Nhơn
                </strong>
                <span style={{ fontSize: 11, color: '#64748b' }}>Thời lượng: 2.5h · Ưu tiên: Vừa</span>
              </div>
              <span style={{ color: '#ea580c', fontSize: 12, fontWeight: 700 }}>+ Thêm</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="mock-task-items-list" style={{ marginBottom: 12 }}>
          {displayedTasks.map((t) => (
            <div
              key={t.id}
              className="mock-task-item"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 10,
                marginBottom: 6,
                background: 'var(--card-bg, #ffffff)',
                border: '1px solid var(--border-color, #e2e8f0)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="checkbox"
                  style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#10b981' }}
                  onChange={() => {
                    if (onToggleComplete) onToggleComplete(t.raw);
                    showToast(`Đã đánh dấu hoàn thành: "${t.title}"!`, 'success');
                  }}
                  title="Đánh dấu đã hoàn thành"
                />
                <div>
                  <strong style={{ fontSize: 13, color: 'var(--text-primary, #0f172a)', display: 'block' }}>
                    {t.title}
                  </strong>
                  <span style={{ fontSize: 11, color: '#64748b' }}>{t.due}</span>
                </div>
              </div>
              <span className={`mock-task-badge ${t.badgeVariant}`}>{t.badge}</span>
            </div>
          ))}
        </div>
      )}

      {/* Inline Quick Add Task Input */}
      <form onSubmit={handleQuickAddTask} style={{ marginTop: 10 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            type="text"
            placeholder="+ Nhập tên bài tập mới (nhấn Enter)..."
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            disabled={isAdding}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid var(--border-color, #cbd5e1)',
              fontSize: 13,
              background: 'var(--card-bg, #ffffff)',
            }}
          />
          <button
            type="submit"
            className="primary-button"
            disabled={!quickTitle.trim() || isAdding}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              fontSize: 13,
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              border: 'none',
            }}
          >
            Thêm
          </button>
        </div>
      </form>
    </motion.div>
  );
}
