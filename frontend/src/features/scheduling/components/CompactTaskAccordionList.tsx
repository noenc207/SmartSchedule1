import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Layers, Folder } from 'lucide-react';
import type { Task, Category, EventItem } from '../../../types/domain';
import { formatMinutes } from '../utils/taskCalculations';
import { TaskCard } from './TaskCard';

export interface CompactTaskAccordionListProps {
  tasks: Task[];
  categories: Category[];
  events: EventItem[];
  selected: string[];
  splitTasks: Record<string, boolean>;
  onToggleSelect: (taskId: string) => void;
  onToggleSplit: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onDuplicateTask: (task: Task) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onScheduleSlot: (task: Task, startsAt: string, endsAt: string) => Promise<void>;
}

interface TaskGroup {
  id: string;
  name: string;
  color?: string;
  tasks: Task[];
  totalMinutes: number;
}

export function CompactTaskAccordionList({
  tasks,
  categories,
  events,
  selected,
  splitTasks,
  onToggleSelect,
  onToggleSplit,
  onUpdateTask,
  onDuplicateTask,
  onDeleteTask,
  onScheduleSlot,
}: CompactTaskAccordionListProps) {
  // 1. Group tasks by Category (e.g. "Hồ sơ học tập", "Tùy chọn cấu hình", etc.)
  const groups: TaskGroup[] = useMemo(() => {
    const result: TaskGroup[] = [];
    const categoryMap = new Map<string, Task[]>();
    const uncategorizedTasks: Task[] = [];

    categories.forEach((cat) => {
      categoryMap.set(cat.id, []);
    });

    tasks.forEach((task) => {
      if (task.categoryId && categoryMap.has(task.categoryId)) {
        categoryMap.get(task.categoryId)!.push(task);
      } else {
        uncategorizedTasks.push(task);
      }
    });

    // Add category groups that have tasks
    categories.forEach((cat) => {
      const catTasks = categoryMap.get(cat.id) || [];
      if (catTasks.length > 0) {
        result.push({
          id: cat.id,
          name: cat.name,
          color: cat.color ?? '#2563eb',
          tasks: catTasks,
          totalMinutes: catTasks.reduce((sum, t) => sum + (t.estimatedDurationMinutes || 0), 0),
        });
      }
    });

    // Add uncategorized group
    if (uncategorizedTasks.length > 0) {
      result.push({
        id: 'uncategorized',
        name: result.length === 0 ? 'Hồ sơ học tập & Tác vụ' : 'Tùy chọn cấu hình & Tác vụ khác',
        color: '#64748b',
        tasks: uncategorizedTasks,
        totalMinutes: uncategorizedTasks.reduce((sum, t) => sum + (t.estimatedDurationMinutes || 0), 0),
      });
    }

    // Fallback if no tasks match but list isn't empty
    if (result.length === 0 && tasks.length > 0) {
      result.push({
        id: 'all',
        name: 'Hồ sơ học tập',
        color: '#2563eb',
        tasks,
        totalMinutes: tasks.reduce((sum, t) => sum + (t.estimatedDurationMinutes || 0), 0),
      });
    }

    return result;
  }, [tasks, categories]);

  // 2. Accordion State: Mở rộng mặc định nhóm đầu tiên, các nhóm sau thu gọn
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (groups.length > 0) {
      // First group is open by default
      initial[groups[0].id] = true;
      // Subsequent groups collapsed by default
      for (let i = 1; i < groups.length; i++) {
        initial[groups[i].id] = false;
      }
    }
    return initial;
  });

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    groups.forEach((g) => {
      next[g.id] = true;
    });
    setOpenGroups(next);
  };

  const collapseAll = () => {
    const next: Record<string, boolean> = {};
    groups.forEach((g) => {
      next[g.id] = false;
    });
    setOpenGroups(next);
  };

  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="compact-task-accordion-container">
      {/* Quick Group Header Controls (if multiple groups exist) */}
      {groups.length > 1 && (
        <div className="compact-accordion-meta-bar">
          <span className="compact-accordion-summary">
            <Layers size={13} />
            <span>{groups.length} nhóm danh mục · {tasks.length} tác vụ</span>
          </span>
          <div className="compact-accordion-quick-toggles">
            <button type="button" className="text-button compact-btn" onClick={expandAll}>
              Mở tất cả
            </button>
            <span className="meta-sep">·</span>
            <button type="button" className="text-button compact-btn" onClick={collapseAll}>
              Thu gọn
            </button>
          </div>
        </div>
      )}

      {/* Accordion Groups */}
      <div className="compact-accordion-list">
        {groups.map((group, gIdx) => {
          // If group state is undefined (new group after filter), default first group to open
          const isOpen = openGroups[group.id] ?? (gIdx === 0);

          return (
            <div key={group.id} className={`compact-accordion-group ${isOpen ? 'expanded' : 'collapsed'}`}>
              {/* Accordion Header */}
              <div
                className="compact-accordion-header"
                onClick={() => toggleGroup(group.id)}
                role="button"
                tabIndex={0}
                aria-expanded={isOpen}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleGroup(group.id);
                  }
                }}
              >
                <div className="accordion-header-left">
                  <span className="accordion-chevron-icon" aria-hidden="true">
                    {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </span>
                  {group.color && (
                    <span className="group-color-indicator" style={{ backgroundColor: group.color }} />
                  )}
                  <strong className="group-title">{group.name}</strong>
                  <span className="group-count-pill">{group.tasks.length}</span>
                </div>

                <div className="accordion-header-right">
                  <span className="group-duration-text">{formatMinutes(group.totalMinutes)}</span>
                </div>
              </div>

              {/* Accordion Content Body: Compact List Items */}
              {isOpen && (
                <div className="compact-accordion-body">
                  {group.tasks.map((task, idx) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      category={categories.find((c) => c.id === task.categoryId)}
                      events={events}
                      isSelected={selected.includes(task.id)}
                      isSplitEnabled={splitTasks[task.id] ?? false}
                      isZebra={idx % 2 === 1}
                      onToggleSelect={onToggleSelect}
                      onToggleSplit={onToggleSplit}
                      onUpdateTask={onUpdateTask}
                      onDuplicateTask={onDuplicateTask}
                      onDeleteTask={onDeleteTask}
                      onScheduleSlot={onScheduleSlot}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
