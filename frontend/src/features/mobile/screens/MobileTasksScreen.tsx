import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Circle,
  Plus,
  Search,
  Filter,
  Calendar,
  AlertCircle,
  Tag,
} from 'lucide-react';
import {
  MobilePageHeader,
  MobileFormField,
  MobileEmptyState,
} from '../../../components/mobile';
import { useDashboardData } from '../../dashboard/hooks/useDashboardData';
import type { Task } from '../../../types/domain';

export function MobileTasksScreen() {
  const { tasks, toggleTaskComplete } = useDashboardData();
  const [filter, setFilter] = useState<'all' | 'today' | 'urgent' | 'completed'>('all');
  const [search, setSearch] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Local task list state for instantaneous UI feedback
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);

  React.useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const handleToggle = (task: Task) => {
    setLocalTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? { ...t, status: t.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED' }
          : t
      )
    );
    toggleTaskComplete(task);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      status: 'PENDING',
      priority: 'HIGH',
      estimatedDurationMinutes: 60,
      deadline: new Date(Date.now() + 86400000 * 2).toISOString(),
    } as any;

    setLocalTasks([newTask, ...localTasks]);
    setNewTaskTitle('');
    setIsAdding(false);
  };

  const filteredTasks = localTasks.filter((t) => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'completed') return t.status === 'COMPLETED';
    if (filter === 'urgent') return t.priority === 'HIGH' && t.status !== 'COMPLETED';
    if (filter === 'today') return t.status !== 'COMPLETED';
    return true;
  });

  return (
    <div className="mobile-app-shell">
      <MobilePageHeader
        title="Công việc"
        subtitle={`${filteredTasks.length} nhiệm vụ`}
        rightAction={
          <button
            type="button"
            onClick={() => setIsAdding(!isAdding)}
            className="mobile-touch-target p-2 rounded-full bg-[var(--m-brand-primary)] text-white hover:bg-[var(--m-brand-bright)] shadow-sm"
            aria-label="Thêm công việc"
          >
            <Plus size={18} />
          </button>
        }
      />

      <main className="mobile-view-container">
        {/* Quick Add Form Drawer / Input */}
        <AnimatePresence>
          {isAdding && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleAddTask}
              className="mb-4 p-3.5 rounded-2xl bg-[var(--m-surface)] border border-[var(--m-brand-primary)] shadow-sm flex flex-col gap-3"
            >
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--m-brand-primary)]">
                Thêm bài tập / công việc mới
              </h3>
              <MobileFormField
                label="Tiêu đề nhiệm vụ"
                placeholder="Nhập tên bài tập (ví dụ: Nộp bài Lab 3 PRN211)..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                required
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--m-text-secondary)]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[var(--m-brand-primary)] text-white shadow-sm"
                >
                  Lưu bài tập
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Filter Chips */}
        <section className="mb-4">
          <div className="mobile-chip-row">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`mobile-chip ${filter === 'all' ? 'active' : ''}`}
            >
              Tất cả ({localTasks.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('today')}
              className={`mobile-chip ${filter === 'today' ? 'active' : ''}`}
            >
              Cần làm ({localTasks.filter((t) => t.status !== 'COMPLETED').length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('urgent')}
              className={`mobile-chip ${filter === 'urgent' ? 'active' : ''}`}
            >
              Ưu tiên cao ({localTasks.filter((t) => t.priority === 'HIGH' && t.status !== 'COMPLETED').length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('completed')}
              className={`mobile-chip ${filter === 'completed' ? 'active' : ''}`}
            >
              Đã xong ({localTasks.filter((t) => t.status === 'COMPLETED').length})
            </button>
          </div>
        </section>

        {/* Task List */}
        <div className="flex flex-col gap-2.5">
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task) => {
              const isDone = task.status === 'COMPLETED';
              return (
                <motion.div
                  key={task.id}
                  layout
                  className={`mobile-card p-3.5 flex items-start gap-3 transition-all ${
                    isDone ? 'opacity-65 bg-[var(--m-surface-subtle)]' : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleToggle(task)}
                    className="mobile-touch-target p-1 text-[var(--m-brand-primary)] hover:scale-110 active:scale-95 transition-transform shrink-0"
                    aria-label={`Hoàn thành ${task.title}`}
                  >
                    {isDone ? (
                      <CheckCircle2 size={22} className="text-[var(--m-campus-green)]" />
                    ) : (
                      <Circle size={22} className="text-[var(--m-text-muted)]" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <h3
                      className={`text-sm font-semibold text-[var(--m-text-primary)] leading-snug truncate ${
                        isDone ? 'line-through text-[var(--m-text-muted)]' : ''
                      }`}
                    >
                      {task.title}
                    </h3>

                    <div className="flex items-center gap-2 text-xs text-[var(--m-text-muted)] mt-1.5">
                      {task.deadline && (
                        <span className="flex items-center gap-1 font-medium">
                          <Calendar size={12} className="text-[var(--m-brand-primary)]" />
                          {new Date(task.deadline).toLocaleDateString('vi-VN', {
                            day: 'numeric',
                            month: 'numeric',
                          })}
                        </span>
                      )}

                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          task.priority === 'HIGH'
                            ? 'bg-[var(--m-campus-red-soft)] text-[var(--m-campus-red)]'
                            : 'bg-[var(--m-surface-subtle)] text-[var(--m-text-secondary)]'
                        }`}
                      >
                        {task.priority || 'MEDIUM'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <MobileEmptyState
              title="Không có công việc nào"
              description="Không tìm thấy bài tập phù hợp với bộ lọc hiện tại."
              actionLabel="Thêm bài tập"
              onAction={() => setIsAdding(true)}
            />
          )}
        </div>
      </main>
    </div>
  );
}
