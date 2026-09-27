import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckSquare, AlertCircle, FileText, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Task } from '../../../types/domain';

interface PendingTasksCardProps {
  tasks?: Task[];
  onToggleComplete?: (task: Task) => void;
}

export function PendingTasksCard({ tasks: propTasks, onToggleComplete }: PendingTasksCardProps) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'urgent'>('all');

  let taskList: {
    id: string;
    title: string;
    due: string;
    badge: string;
    badgeVariant: string;
    iconBoxClass: string;
    isUrgent: boolean;
  }[] = [];

  if (propTasks && propTasks.length > 0) {
    const pending = propTasks.filter((t) => t.status !== 'COMPLETED');
    taskList = pending.slice(0, 5).map((t) => {
      const isUrgent = t.priority === 'HIGH';
      let dueFormatted = 'Hôm nay';
      if (t.deadline) {
        const d = new Date(t.deadline);
        dueFormatted = `Hạn: ${d.getDate()}/${d.getMonth() + 1} - ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      }
      return {
        id: t.id,
        title: t.title,
        due: dueFormatted,
        badge: isUrgent ? 'Khẩn cấp' : 'Quan trọng',
        badgeVariant: isUrgent ? 'pill-red' : 'pill-blue',
        iconBoxClass: isUrgent ? 'icon-box-red' : 'icon-box-blue',
        isUrgent,
      };
    });
  }

  const urgentCount = taskList.filter((t) => t.isUrgent).length;
  const totalCount = taskList.length;
  const displayedTasks = filter === 'urgent' ? taskList.filter((t) => t.isUrgent) : taskList;

  return (
    <motion.div
      className="mock-card mock-pending-tasks-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.2 }}
    >
      {/* Header */}
      <div className="mock-card-header">
        <div className="mock-card-title-group">
          <CheckSquare size={16} className="mock-header-icon" />
          <h2 className="mock-card-title">Nhiệm vụ cần hoàn thành</h2>
        </div>
        <span className="mock-count-pill pill-blue">{totalCount} bài tập chưa xong</span>
      </div>

      <div className="mock-tasks-subheading">Hạn chót & Bài tập sắp tới</div>

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

      {/* Task List */}
      {displayedTasks.length === 0 ? (
        <div
          style={{
            padding: '24px 16px',
            textAlign: 'center',
            color: '#64748b',
            fontSize: 13,
            background: '#f8fafc',
            borderRadius: 12,
            border: '1px dashed #cbd5e1',
            margin: '8px 0',
          }}
        >
          ✨ Bạn chưa có nhiệm vụ nào cần làm — Hãy tạo bài tập mới để lên kế hoạch nhé!
        </div>
      ) : (
        <div className="mock-task-items-list">
          {displayedTasks.map((t) => (
            <div key={t.id} className="mock-task-item" onClick={() => navigate('/tasks')} style={{ cursor: 'pointer' }}>
              <div className={`mock-task-icon-box ${t.iconBoxClass}`}>
                {t.isUrgent ? (
                  <AlertCircle size={15} className="text-red" />
                ) : (
                  <FileText size={15} className="text-blue" />
                )}
              </div>
              <div className="mock-task-details">
                <strong className="mock-task-title">{t.title}</strong>
                <span className="mock-task-due">{t.due}</span>
              </div>
              <div className="mock-task-meta-right">
                <span className={`mock-task-badge ${t.badgeVariant}`}>
                  {t.badge}
                </span>
                <button
                  type="button"
                  className="mock-task-detail-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/tasks');
                  }}
                >
                  <span>Xem chi tiết</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
