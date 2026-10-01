import React, { useState, useRef, useEffect } from 'react';
import { CalendarPlus, MoreHorizontal, Clock, Tag, AlertCircle, Calendar } from 'lucide-react';
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

export interface TaskCardProps {
  task: Task;
  category?: Category;
  events: EventItem[];
  isSelected: boolean;
  isSplitEnabled: boolean;
  isZebra?: boolean;
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
  isZebra = false,
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
  const moreBtnRef = useRef<HTMLButtonElement>(null);
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
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(e.target as Node) &&
        moreBtnRef.current &&
        !moreBtnRef.current.contains(e.target as Node)
      ) {
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
      className={`compact-task-row ${isSelected ? 'selected' : ''} ${isZebra ? 'zebra-bg' : ''} state-${schedulingState.toLowerCase()}`}
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
      {/* CỘT 1 (TRÁI): Checkbox + Color Dot + Tiêu đề tác vụ */}
      <div className="compact-task-col-left">
        <label className="compact-task-checkbox-label">
          <input
            type="checkbox"
            className="compact-task-checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(task.id)}
            aria-label={`Chọn tác vụ ${task.title}`}
          />
        </label>

        {/* Task Color Indicator Dot */}
        <button
          ref={colorDotRef}
          type="button"
          className="compact-task-color-dot"
          style={{ backgroundColor: activeColor }}
          onClick={() => setShowColorPicker(true)}
          title={hasCustomColor ? 'Màu tùy chỉnh (nhấp để đổi)' : `Màu danh mục (${category?.name ?? 'Mặc định'})`}
          aria-label="Đổi màu tác vụ"
        />

        {/* Title / Inline edit */}
        <div className="compact-task-title-wrap">
          {editingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              className="compact-task-title-input"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => void handleSaveTitle()}
              onKeyDown={handleTitleKeyDown}
            />
          ) : (
            <span
              className={`compact-task-title-text ${task.status === 'COMPLETED' ? 'completed' : ''}`}
              onClick={() => setEditingTitle(true)}
              title="Nhấp để đổi tên tác vụ"
            >
              {task.status === 'COMPLETED' ? `✓ ${task.title}` : task.title}
            </span>
          )}
        </div>
      </div>

      {/* CỘT 2 (GIỮA): Các huy hiệu (Badge/Tag) nhỏ, không viền, nền nhạt */}
      <div className="compact-task-col-center">
        {/* Category Badge */}
        {category && (
          <span
            className="compact-badge category-tag"
            style={{
              backgroundColor: `${activeColor}14`,
              color: activeColor,
            }}
            title={`Danh mục: ${category.name}`}
          >
            {category.name}
          </span>
        )}

        {/* Priority Badge */}
        <div className="meta-dropdown-wrap">
          <button
            type="button"
            className={`compact-badge priority-tag priority-${task.priority.toLowerCase()}`}
            onClick={() => setShowPriorityPicker((v) => !v)}
            title="Mức ưu tiên (nhấp để đổi)"
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

        {/* Deadline Badge */}
        <div className="meta-dropdown-wrap">
          <button
            type="button"
            className={`compact-badge deadline-tag risk-${deadlineRisk} ${!task.deadline ? 'no-deadline' : ''}`}
            onClick={() => setShowDatePicker((v) => !v)}
            title="Hạn chót (nhấp để đổi)"
          >
            <Calendar size={11} className="badge-icon" />
            <span>{task.deadline ? formatDeadline(task.deadline) : 'Không hạn'}</span>
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

        {/* Split session badge (if enabled) */}
        {isSplitEnabled && (
          <span className="compact-badge split-tag" title="Cho phép chia nhỏ thành nhiều ca học">
            Chia ca
          </span>
        )}
      </div>

      {/* CỘT 3 (PHẢI): Thời lượng & Nút thao tác (Icon button thay vì text) */}
      <div className="compact-task-col-right">
        {/* Duration badge */}
        <div className="meta-dropdown-wrap">
          <button
            type="button"
            className="compact-badge duration-tag"
            onClick={() => setShowDurationPicker((v) => !v)}
            title="Đổi thời lượng dự kiến"
          >
            <Clock size={11} className="badge-icon" />
            <span>{formatMinutes(task.estimatedDurationMinutes)}</span>
            {scheduledMinutes > 0 && (
              <span className="scheduled-indicator" title={`Đã lên lịch ${scheduledMinutes}m`}>
                ({scheduledMinutes}m)
              </span>
            )}
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

        {/* Action Icon Button: Quick Schedule (CalendarPlus) */}
        <button
          ref={scheduleBtnRef}
          type="button"
          className="compact-icon-btn schedule-icon-btn"
          title="Lên lịch tác vụ vào khung giờ trống"
          aria-label={`Lên lịch ${task.title}`}
          onClick={() => setShowSchedulePopover((v) => !v)}
          disabled={remainingMinutes <= 0}
        >
          <CalendarPlus size={15} />
        </button>

        {/* Action Icon Button: More options (···) */}
        <div className="more-menu-wrap" ref={moreMenuRef}>
          <button
            ref={moreBtnRef}
            type="button"
            className="compact-icon-btn more-icon-btn"
            onClick={() => setShowMoreMenu((v) => !v)}
            aria-label="Tùy chọn tác vụ"
            title="Tùy chọn khác"
          >
            <MoreHorizontal size={15} />
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

      {/* Floating Popovers */}
      {showColorPicker && (
        <ColorPickerPopover
          open={showColorPicker}
          currentColor={task.color}
          categoryColor={category?.color}
          anchorRect={colorDotRef.current?.getBoundingClientRect()}
          onSelectColor={(color) => {
            void onUpdateTask(task.id, { color });
            setShowColorPicker(false);
          }}
          onResetToCategory={() => {
            void onUpdateTask(task.id, { color: null });
            setShowColorPicker(false);
          }}
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
