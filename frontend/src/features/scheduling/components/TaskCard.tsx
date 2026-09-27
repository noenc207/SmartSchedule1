import React, { useState, useRef, useEffect } from 'react';
import type { Task, Category, EventItem } from '../../../types/domain';
import {
  getTaskScheduledMinutes,
  getTaskRemainingMinutes,
  getTaskSchedulingState,
  formatMinutes,
  formatDeadline,
  getDeadlineRisk,
} from '../utils/taskCalculations';
import { resolveTaskColor } from '../../calendar/utils/colorPalette';
import { ColorPickerPopover } from './ColorPickerPopover';
import { QuickSchedulePopover } from './QuickSchedulePopover';

interface TaskCardProps {
  task: Task;
  category?: Category;
  events: EventItem[];
  isSelected: boolean;
  isSplitEnabled: boolean;
  onToggleSelect: (taskId: string) => void;
  onToggleSplit: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onDuplicateTask: (task: Task) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onScheduleSlot: (task: Task, startsAt: string, endsAt: string) => Promise<void>;
}

const DURATION_OPTIONS = [
  { label: '30m', value: 30 },
  { label: '1h', value: 60 },
  { label: '1h30', value: 90 },
  { label: '2h', value: 120 },
  { label: '3h', value: 180 },
  { label: '4h', value: 240 },
];

export function TaskCard({
  task,
  category,
  events,
  isSelected,
  isSplitEnabled,
  onToggleSelect,
  onToggleSplit,
  onUpdateTask,
  onDuplicateTask,
  onDeleteTask,
  onScheduleSlot,
}: TaskCardProps) {
  // Derived state directly from canonical events
  const scheduledMinutes = getTaskScheduledMinutes(task.id, events);
  const remainingMinutes = getTaskRemainingMinutes(task, events);
  const schedulingState = getTaskSchedulingState(task, events);
  const { color: activeColor, isCustom: hasCustomColor } = resolveTaskColor(task, category);

  // Interaction popovers
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showSchedulePopover, setShowSchedulePopover] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const colorDotRef = useRef<HTMLButtonElement>(null);
  const scheduleBtnRef = useRef<HTMLButtonElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editingTitle) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [editingTitle]);

  // Click outside listener for more menu
  useEffect(() => {
    if (!showMoreMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMoreMenu]);

  const handleSaveTitle = async () => {
    const clean = titleDraft.trim();
    setEditingTitle(false);
    if (clean && clean !== task.title) {
      await onUpdateTask(task.id, { title: clean });
    } else {
      setTitleDraft(task.title);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleSaveTitle();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setTitleDraft(task.title);
      setEditingTitle(false);
    }
  };

  const handleSelectDuration = async (minutes: number) => {
    setShowDurationPicker(false);
    if (minutes !== task.estimatedDurationMinutes) {
      await onUpdateTask(task.id, {
        estimatedDurationMinutes: minutes,
        remainingDurationMinutes: Math.max(0, minutes - scheduledMinutes),
      });
    }
  };

  const handleSelectPriority = async (p: string) => {
    setShowPriorityPicker(false);
    if (p !== task.priority) {
      await onUpdateTask(task.id, { priority: p });
    }
  };

  const handleSelectDeadline = async (dateStr: string) => {
    setShowDatePicker(false);
    const newDeadline = dateStr ? new Date(dateStr).toISOString() : null;
    await onUpdateTask(task.id, { deadline: newDeadline });
  };

  const deadlineRisk = getDeadlineRisk(task.deadline);

  return (
    <div
      className={`task-workspace-card ${isSelected ? 'selected' : ''} state-${schedulingState.toLowerCase()}`}
      style={{
        borderLeftColor: isSelected ? 'var(--accent)' : activeColor,
      }}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(
          'text/plain',
          JSON.stringify({
            taskId: task.id,
            title: task.title,
            duration: remainingMinutes,
            color: activeColor,
          })
        );
      }}
    >
      <div className="task-card-main-row">
        {/* Selection checkbox (Smart Schedule generation selection) */}
        <label className="task-card-checkbox-label">
          <input
            type="checkbox"
            className="task-card-checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(task.id)}
            aria-label={`Select ${task.title} for smart scheduling`}
          />
        </label>

        {/* Task Color Indicator Dot */}
        <button
          ref={colorDotRef}
          type="button"
          className="task-card-color-dot"
          style={{ backgroundColor: activeColor }}
          onClick={() => setShowColorPicker(true)}
          title={hasCustomColor ? 'Custom color (click to change or reset)' : `Category color (${category?.name ?? 'Default'})`}
          aria-label="Change task color"
        />

        {/* Title / Inline edit */}
        <div className="task-card-title-col">
          {editingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              className="task-card-title-input"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => void handleSaveTitle()}
              onKeyDown={handleTitleKeyDown}
            />
          ) : (
            <div className="task-card-title-display-row">
              <span
                className="task-card-title-text"
                onClick={() => setEditingTitle(true)}
                title="Click to edit title"
                style={{
                  textDecoration: task.status === 'COMPLETED' ? 'line-through' : 'none',
                  opacity: task.status === 'COMPLETED' ? 0.65 : 1,
                }}
              >
                {task.status === 'COMPLETED' ? `✓ ${task.title}` : task.title}
              </span>
              {category && (
                <span className="task-category-pill" style={{ color: activeColor }}>
                  {category.name}
                </span>
              )}
            </div>
          )}

          {/* Metadata badges row */}
          <div className="task-card-meta-row">
            {/* Duration picker badge */}
            <div className="meta-dropdown-wrap">
              <button
                type="button"
                className="task-meta-badge duration-badge"
                onClick={() => setShowDurationPicker((v) => !v)}
                title="Đổi thời lượng"
              >
                <span>{formatMinutes(task.estimatedDurationMinutes)}</span>
              </button>
              {showDurationPicker && (
                <div className="meta-compact-menu">
                  {DURATION_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`meta-menu-item ${task.estimatedDurationMinutes === opt.value ? 'active' : ''}`}
                      onClick={() => void handleSelectDuration(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <span className="meta-dot">·</span>

            {/* Priority badge */}
            <div className="meta-dropdown-wrap">
              <button
                type="button"
                className={`task-meta-badge priority-badge priority-${task.priority.toLowerCase()}`}
                onClick={() => setShowPriorityPicker((v) => !v)}
                title="Đổi mức ưu tiên"
              >
                <span>{task.priority === 'HIGH' ? 'Cao' : task.priority === 'MEDIUM' ? 'Vừa' : 'Thấp'}</span>
              </button>
              {showPriorityPicker && (
                <div className="meta-compact-menu">
                  {(['LOW', 'MEDIUM', 'HIGH'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`meta-menu-item priority-${p.toLowerCase()} ${task.priority === p ? 'active' : ''}`}
                      onClick={() => void handleSelectPriority(p)}
                    >
                      {p === 'HIGH' ? 'Cao' : p === 'MEDIUM' ? 'Vừa' : 'Thấp'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <span className="meta-dot">·</span>

            {/* Deadline badge */}
            <div className="meta-dropdown-wrap">
              <button
                type="button"
                className={`task-meta-badge deadline-badge risk-${deadlineRisk}`}
                onClick={() => setShowDatePicker((v) => !v)}
                title="Đổi hạn chót"
              >
                <span>{task.deadline ? `Hạn ${formatDeadline(task.deadline)}` : 'Không hạn'}</span>
              </button>
              {showDatePicker && (
                <div className="meta-date-picker-menu">
                  <input
                    type="date"
                    className="meta-date-input"
                    defaultValue={task.deadline ? task.deadline.slice(0, 10) : ''}
                    onChange={(e) => void handleSelectDeadline(e.target.value)}
                  />
                  {task.deadline && (
                    <button
                      type="button"
                      className="text-button compact-btn"
                      onClick={() => void handleSelectDeadline('')}
                    >
                      Xóa hạn chót
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons: Quick Schedule (+) & More (⋮) */}
        <div className="task-card-actions-col">
          {/* Quick Schedule button (+) */}
          <button
            ref={scheduleBtnRef}
            type="button"
            className="task-quick-schedule-btn"
            title="Lên lịch tác vụ"
            aria-label={`Lên lịch ${task.title}`}
            onClick={() => setShowSchedulePopover((v) => !v)}
            disabled={remainingMinutes <= 0}
          >
            + Xếp
          </button>

          {/* More menu button (···) */}
          <div className="more-menu-wrap" ref={moreMenuRef}>
            <button
              type="button"
              className="task-more-menu-btn"
              onClick={() => setShowMoreMenu((v) => !v)}
              aria-label="Tùy chọn tác vụ"
            >
              ···
            </button>

            {showMoreMenu && (
              <div className="task-dropdown-menu">
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    setShowMoreMenu(false);
                    setShowSchedulePopover(true);
                  }}
                  disabled={remainingMinutes <= 0}
                >
                  <span>+ Lên lịch nhanh</span>
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    setShowMoreMenu(false);
                    setEditingTitle(true);
                  }}
                >
                  <span>Đổi tên</span>
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    setShowMoreMenu(false);
                    setShowColorPicker(true);
                  }}
                >
                  <span>Đổi màu</span>
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    setShowMoreMenu(false);
                    onToggleSplit(task.id);
                  }}
                >
                  <span>{isSplitEnabled ? 'Tắt chia nhỏ ca' : 'Bật chia nhỏ ca'}</span>
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    setShowMoreMenu(false);
                    void onDuplicateTask(task);
                  }}
                >
                  <span>Nhân bản</span>
                </button>
                <div className="dropdown-divider" />
                <button
                  type="button"
                  className="dropdown-item danger"
                  onClick={() => {
                    setShowMoreMenu(false);
                    void onDeleteTask(task.id);
                  }}
                >
                  <span>Xóa tác vụ</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer bar: Split into sessions toggle + Scheduling state indicator */}
      <div className="task-card-footer-row">
        {/* Split session toggle */}
        <label
          className="task-split-toggle-control"
          title="Cho phép SmartSchedule chia nhỏ tác vụ thành nhiều ca học phù hợp"
        >
          <input
            type="checkbox"
            className="split-checkbox"
            checked={isSplitEnabled}
            onChange={() => onToggleSplit(task.id)}
          />
          <span className="split-toggle-label">Chia nhỏ ca</span>
          <span className={`split-status-tag ${isSplitEnabled ? 'on' : 'off'}`}>
            {isSplitEnabled ? 'BẬT' : 'TẮT'}
          </span>
        </label>

        {/* Scheduling status derived canonically from actual sessions */}
        <div className="task-scheduling-state-tag">
          {schedulingState === 'UNSCHEDULED' && (
            <span className="state-badge unscheduled">Chưa xếp lịch</span>
          )}
          {schedulingState === 'PARTIAL' && (
            <span className="state-badge partial">
              <b>{formatMinutes(scheduledMinutes)}</b> đã xếp · <b>{formatMinutes(remainingMinutes)}</b> còn lại
            </span>
          )}
          {schedulingState === 'SCHEDULED' && (
            <span className="state-badge scheduled">
              Đã xếp đủ {formatMinutes(scheduledMinutes)}
            </span>
          )}
        </div>
      </div>

      {/* Popovers */}
      {showColorPicker && (
        <ColorPickerPopover
          open={showColorPicker}
          anchorRect={colorDotRef.current?.getBoundingClientRect()}
          currentColor={task.color}
          categoryColor={category?.color}
          onSelectColor={(hex) => void onUpdateTask(task.id, { color: hex })}
          onResetToCategory={() => void onUpdateTask(task.id, { color: null })}
          onClose={() => setShowColorPicker(false)}
        />
      )}

      {showSchedulePopover && (
        <QuickSchedulePopover
          task={task}
          events={events}
          anchorRect={scheduleBtnRef.current?.getBoundingClientRect()}
          onScheduleSlot={onScheduleSlot}
          onClose={() => setShowSchedulePopover(false)}
        />
      )}
    </div>
  );
}
