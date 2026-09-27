import React, { useState, useRef } from 'react';
import { naturalLanguageParser, type ParsedIntent } from '../services/naturalLanguageParser';
import { taskApi } from '../../../services/taskApi';
import { eventApi } from '../../../services/eventApi';
import { useWorkspaceStore } from '../../../stores/workspaceStore';
import { useHistoryStore } from '../../../stores/historyStore';
import { showToast } from '../../../components/Toast';
import { DEFAULT_TIMEZONE, localInputToInstant } from '../../../utils/dateTime';
import { formatMinutes } from '../../scheduling/utils/taskCalculations';
import type { Task, EventItem } from '../../../types/domain';
import type { TaskInput } from '../../../services/taskApi';
import { CornerDownLeft, Sparkles, X } from 'lucide-react';

interface NlpTaskInputProps {
  onTaskCreated?: (task: Task) => void;
  onEventCreated?: (event: EventItem) => void;
  className?: string;
  placeholder?: string;
}

export function NlpTaskInput({
  onTaskCreated,
  onEventCreated,
  className = '',
  placeholder = 'Nhập nhanh: ví dụ Làm đồ án Database trong 2 tiếng chiều mai',
}: NlpTaskInputProps) {
  const { activeScheduleId } = useWorkspaceStore();
  const { recordAction } = useHistoryStore();

  const [rawText, setRawText] = useState('');
  const [parsedIntent, setParsedIntent] = useState<ParsedIntent | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Editable fields within the preview modal
  const [editTitle, setEditTitle] = useState('');
  const [editDuration, setEditDuration] = useState(60);
  const [editDate, setEditDate] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editPriority, setEditPriority] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');

  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const handleParse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) return;

    const intent = naturalLanguageParser.parse(rawText, {
      timeZone: DEFAULT_TIMEZONE,
    });

    setParsedIntent(intent);
    setEditTitle(intent.title);
    setEditDuration(intent.durationMinutes ?? 60);
    setEditDate(intent.date ?? '');
    setEditStartTime(intent.startTime ?? '');
    setEditPriority(intent.priority ?? 'MEDIUM');
    setIsEditing(false);
  };

  const handleConfirmCreateTask = async (shouldSchedule: boolean) => {
    if (!activeScheduleId) {
      showToast('Vui lòng chọn không gian lịch trước', 'error');
      return;
    }

    try {
      setLoading(true);

      const taskInput: TaskInput = {
        title: editTitle.trim() || 'Nhiệm vụ mới',
        estimatedDurationMinutes: editDuration,
        remainingDurationMinutes: editDuration,
        priority: editPriority,
        status: 'PENDING',
        minimumSessionMinutes: 30,
        maximumSessionMinutes: 120,
        deadline: editDate
          ? localInputToInstant(`${editDate}T${editStartTime || '23:59'}`, DEFAULT_TIMEZONE)
          : undefined,
      };

      const task = await taskApi.create(activeScheduleId, taskInput);
      let createdEvent: EventItem | null = null;

      if (shouldSchedule && editDate && editStartTime) {
        const startsAt = localInputToInstant(`${editDate}T${editStartTime}`, DEFAULT_TIMEZONE);
        const endsAt = new Date(
          new Date(startsAt).getTime() + editDuration * 60000
        ).toISOString();

        createdEvent = await eventApi.create(activeScheduleId, {
          title: task.title,
          startsAt,
          endsAt,
          priority: task.priority,
          status: 'SCHEDULED',
          fixed: false,
          locked: false,
          notes: task.id,
          recurrence: null,
          color: null,
        });

        await taskApi.update(task.id, {
          ...task,
          remainingDurationMinutes: Math.max(0, task.estimatedDurationMinutes - editDuration),
        });
      }

      recordAction({
        description: shouldSchedule && createdEvent
          ? `Đã tạo và lên lịch "${task.title}"`
          : `Đã tạo bài tập "${task.title}"`,
        undo: async () => {
          if (createdEvent) {
            await eventApi.remove(createdEvent.id);
          }
          await taskApi.remove(task.id);
        },
        redo: async () => {
          await taskApi.create(activeScheduleId, taskInput);
        },
      });

      showToast(
        shouldSchedule && createdEvent
          ? `Đã xếp lịch "${task.title}"`
          : `Đã tạo bài tập "${task.title}"`,
        'success'
      );

      onTaskCreated?.(task);
      if (createdEvent) onEventCreated?.(createdEvent);

      setRawText('');
      setParsedIntent(null);
    } catch {
      showToast('Không thể tạo bài tập. Vui lòng thử lại.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`nlp-input-wrapper ${className}`}>
      <div className="nlp-input-header">
        <span className="nlp-input-tag">
          <Sparkles size={11} className="nlp-sparkle-icon" />
          AI NHẬP NHANH
        </span>
        <span className="nlp-input-hint">Nhấn Enter để phân tích</span>
      </div>
      <form onSubmit={handleParse} className="nlp-input-form" role="search">
        <div className="nlp-input-box">
          <input
            ref={inputRef}
            type="text"
            className="nlp-input-field"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={placeholder}
            aria-label="Nhập nhanh bài tập hoặc sự kiện"
          />
          {rawText && (
            <button
              type="button"
              className="nlp-clear-btn"
              onClick={() => setRawText('')}
              aria-label="Xóa nội dung"
              title="Xóa nội dung"
            >
              <X size={13} />
            </button>
          )}
          <button
            type="submit"
            className={`nlp-submit-btn ${rawText.trim() ? 'active' : ''}`}
            disabled={!rawText.trim()}
            title="Phân tích nội dung (Enter)"
            aria-label="Phân tích bằng AI"
          >
            <CornerDownLeft size={14} />
          </button>
        </div>
      </form>

      {/* Confirmation & Preview Dialog */}
      {parsedIntent && (
        <div className="nlp-preview-backdrop" onClick={() => setParsedIntent(null)}>
          <div
            ref={modalRef}
            tabIndex={-1}
            className="nlp-preview-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Xác nhận nội dung nhập nhanh"
          >
            <div className="nlp-preview-header">
              <div className="nlp-preview-heading-copy">
                <span className="nlp-preview-badge">Đã nhận diện bằng AI</span>
                <h3>{isEditing ? 'Chỉnh sửa chi tiết bài tập' : 'Xem trước bài tập'}</h3>
              </div>
              <button
                type="button"
                className="text-close-btn"
                onClick={() => setParsedIntent(null)}
                aria-label="Đóng xem trước"
              >
                Đóng
              </button>
            </div>

            <div className="nlp-preview-body">
              {isEditing ? (
                <div className="nlp-edit-fields">
                  <label className="field">
                    <span>Tên bài tập</span>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      required
                    />
                  </label>
                  <div className="two-column-fields">
                    <label className="field">
                      <span>Thời lượng (phút)</span>
                      <input
                        type="number"
                        min="15"
                        step="15"
                        value={editDuration}
                        onChange={(e) => setEditDuration(Number(e.target.value))}
                      />
                    </label>
                    <label className="field">
                      <span>Mức ưu tiên</span>
                      <select
                        value={editPriority}
                        onChange={(e) => setEditPriority(e.target.value as any)}
                      >
                        <option value="LOW">Thấp (LOW)</option>
                        <option value="MEDIUM">Trung bình (MEDIUM)</option>
                        <option value="HIGH">Cao (HIGH)</option>
                      </select>
                    </label>
                  </div>
                  <div className="two-column-fields">
                    <label className="field">
                      <span>Ngày</span>
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                      />
                    </label>
                    <label className="field">
                      <span>Giờ bắt đầu</span>
                      <input
                        type="time"
                        value={editStartTime}
                        onChange={(e) => setEditStartTime(e.target.value)}
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="nlp-summary-card">
                  <div className="nlp-summary-row">
                    <strong>Nhiệm vụ:</strong>
                    <span>{editTitle}</span>
                  </div>
                  <div className="nlp-summary-badges">
                    <span className="nlp-chip">
                      {formatMinutes(editDuration)}
                    </span>
                    {editDate && (
                      <span className="nlp-chip">
                        Ngày {editDate}
                        {parsedIntent.timeOfDay ? ` (${parsedIntent.timeOfDay})` : ''}
                      </span>
                    )}
                    {editStartTime && (
                      <span className="nlp-chip accent">
                        Bắt đầu lúc {editStartTime}
                      </span>
                    )}
                    <span className={`nlp-chip priority-${editPriority.toLowerCase()}`}>
                      Ưu tiên {editPriority}
                    </span>
                  </div>

                  <p className="nlp-muted-notice">
                    Bài tập chỉ được lưu vào lịch trình khi bạn xác nhận bên dưới.
                  </p>
                </div>
              )}
            </div>

            <div className="nlp-preview-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setIsEditing(!isEditing)}
              >
                <span>{isEditing ? 'Xem tóm tắt' : 'Sửa chi tiết'}</span>
              </button>

              <div className="nlp-confirm-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setParsedIntent(null)}
                >
                  Hủy
                </button>

                {editDate && editStartTime ? (
                  <button
                    type="button"
                    className="primary-button"
                    disabled={loading}
                    onClick={() => handleConfirmCreateTask(true)}
                  >
                    <span>Tạo &amp; Xếp lịch ngay</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="primary-button"
                    disabled={loading}
                    onClick={() => handleConfirmCreateTask(false)}
                  >
                    <span>Tạo bài tập</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
