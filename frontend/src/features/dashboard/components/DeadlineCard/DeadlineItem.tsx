import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Clock, Sparkles, ChevronRight, AlertTriangle } from 'lucide-react';
import { formatDeadline, formatMinutes } from '../../../scheduling/utils/taskCalculations';
import type { Task } from '../../../../types/domain';

interface DeadlineItemProps {
  task: Task;
  onToggleComplete?: (task: Task) => void;
  onSelectTask?: (task: Task) => void;
}

export function DeadlineItem({ task, onToggleComplete, onSelectTask }: DeadlineItemProps) {
  const navigate = useNavigate();

  const isCompleted = task.status === 'COMPLETED';
  const remainingMin = task.remainingDurationMinutes;
  const totalMin = task.estimatedDurationMinutes || 60;
  const completedMin = Math.max(0, totalMin - remainingMin);
  const progressPct = Math.min(100, Math.round((completedMin / totalMin) * 100));

  const deadlineDate = task.deadline ? new Date(task.deadline) : null;
  const now = new Date();

  // Calculate days remaining
  let dueLabel = '';
  let isOverdue = false;

  if (deadlineDate) {
    const diffHours = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (diffHours < 0) {
      isOverdue = true;
      dueLabel = 'Quá hạn';
    } else if (diffHours <= 24) {
      dueLabel = 'Hôm nay';
    } else if (diffHours <= 48) {
      dueLabel = 'Ngày mai';
    } else {
      dueLabel = formatDeadline(task.deadline!);
    }
  }

  const priorityLabelMap: Record<string, string> = {
    HIGH: 'ƯU TIÊN CAO',
    MEDIUM: 'TRUNG BÌNH',
    LOW: 'THẤP',
  };

  const priorityClass = (task.priority || 'MEDIUM').toLowerCase();
  const priorityText = priorityLabelMap[task.priority || 'MEDIUM'] || task.priority;

  return (
    <motion.div
      className={`gradient-deadline-item ${isCompleted ? 'is-completed' : ''} ${isOverdue ? 'is-overdue' : ''} interactive-task`}
      role="listitem"
      whileHover={{ y: -1 }}
      transition={{ duration: 0.15 }}
      aria-label={`${task.title}, mức độ ${priorityText}, còn ${remainingMin} phút, hạn ${dueLabel}`}
    >
      <div className="task-check-col">
        <button
          type="button"
          className={`task-square-checkbox ${isCompleted ? 'checked' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleComplete?.(task);
          }}
          aria-label={isCompleted ? `Đánh dấu ${task.title} chưa xong` : `Đánh dấu ${task.title} đã hoàn thành`}
        >
          {isCompleted && <Check size={14} className="check-icon-svg" />}
        </button>
      </div>

      <div
        className="task-main-col"
        onClick={() => onSelectTask?.(task)}
        role="button"
        tabIndex={0}
        title="Click để xem chi tiết & phương án học sâu"
      >
        <div className="task-title-line">
          <strong className="task-name-text">{task.title}</strong>
          <span className={`task-priority-pill ${priorityClass}`}>
            {priorityClass === 'high' && <AlertTriangle size={11} />}
            <span>{priorityText}</span>
          </span>
        </div>

        <div className="task-details-line">
          <span className="task-stat-text">Còn {formatMinutes(remainingMin)}</span>
          <span className="stat-separator">·</span>
          <span className="task-progress-stat">Tiến độ {progressPct}%</span>

          <div className="task-progress-rail" aria-hidden="true">
            <div className="task-progress-glow-bar" style={{ width: `${progressPct}%` }} />
          </div>

          <span className="task-inspect-hint">
            <span>Chi tiết</span>
            <ChevronRight size={12} />
          </span>
        </div>
      </div>

      <div className="task-action-col">
        <div className={`due-date-pill ${isOverdue ? 'overdue' : ''}`}>
          <Clock size={12} />
          <span>Hạn: {dueLabel}</span>
        </div>

        <button
          type="button"
          className="task-plan-gradient-btn"
          onClick={() => navigate('/scheduling')}
          title="Mở bộ xếp lịch để tạo buổi học"
        >
          <Sparkles size={13} />
          <span>Xếp lịch</span>
        </button>
      </div>
    </motion.div>
  );
}
