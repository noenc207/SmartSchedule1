import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, ArrowRight, ListTodo, Plus } from 'lucide-react';
import { DeadlineItem } from './DeadlineItem';
import type { Task } from '../../../../types/domain';

interface DeadlineCardProps {
  tasks: Task[];
  onToggleComplete?: (task: Task) => void;
  onSelectTask?: (task: Task) => void;
}

type PriorityFilter = 'ALL' | 'HIGH';

export function DeadlineCard({ tasks, onToggleComplete, onSelectTask }: DeadlineCardProps) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<PriorityFilter>('ALL');

  const filteredTasks = useMemo(() => {
    if (filter === 'HIGH') {
      return tasks.filter((t) => t.priority === 'HIGH');
    }
    return tasks;
  }, [tasks, filter]);

  const highCount = tasks.filter((t) => t.priority === 'HIGH').length;

  return (
    <motion.section
      className="gradient-panel upcoming-deadlines-section"
      aria-labelledby="deadline-card-title"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="panel-card-header">
        <div className="card-header-left">
          <div className="card-pill-tag">
            <ListTodo size={13} className="pill-icon" />
            <span>Nhiệm vụ cần hoàn thành</span>
            <span className="dot-divider">·</span>
            <span className="pending-count-pill">{tasks.length} bài tập chưa xong</span>
          </div>
          <h2 id="deadline-card-title" className="card-header-heading">
            Hạn chót & Bài tập sắp tới
          </h2>
        </div>

        <div className="card-header-right">
          <div className="deadline-filter-tabs">
            <button
              type="button"
              className={`filter-tab-btn ${filter === 'ALL' ? 'active' : ''}`}
              onClick={() => setFilter('ALL')}
            >
              Tất cả ({tasks.length})
            </button>
            <button
              type="button"
              className={`filter-tab-btn highlight-urgent ${filter === 'HIGH' ? 'active' : ''}`}
              onClick={() => setFilter('HIGH')}
            >
              <AlertTriangle size={12} />
              <span>Khẩn cấp ({highCount})</span>
            </button>
          </div>

          <button
            type="button"
            className="link-btn-gradient"
            onClick={() => navigate('/tasks')}
          >
            <span>Xem tất cả bài tập</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>

      <div className="deadlines-card-body">
        {filteredTasks.length === 0 ? (
          <div className="empty-state clean-empty-deadlines">
            <div className="empty-tag-pill">HOÀN TẤT</div>
            <strong className="empty-title">Không có bài tập nào dồn ứ</strong>
            <p className="empty-desc">
              {filter === 'HIGH'
                ? 'Không có bài tập ưu tiên cao nào cần giải quyết gấp.'
                : 'Bạn đã hoàn thành các bài tập hiện tại. Có thể tạo thêm nhiệm vụ mới để lên lịch.'}
            </p>
            <button
              type="button"
              className="hero-btn-gradient-primary compact"
              onClick={() => navigate('/tasks')}
            >
              <Plus size={14} />
              <span>Thêm bài tập mới</span>
            </button>
          </div>
        ) : (
          <div className="playful-deadlines-grid" role="list" aria-label="Danh sách bài tập sắp đến hạn">
            <AnimatePresence>
              {filteredTasks.map((task) => (
                <DeadlineItem
                  key={task.id}
                  task={task}
                  onToggleComplete={onToggleComplete}
                  onSelectTask={onSelectTask}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.section>
  );
}
