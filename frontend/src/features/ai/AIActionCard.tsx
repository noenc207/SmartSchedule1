import React, { useState, useEffect } from 'react';
import {
  CalendarPlus,
  CalendarSync,
  Edit3,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  FileText,
  Loader2,
  Search,
  CheckSquare,
  AlertCircle,
  Bell,
  ArrowRight,
  Settings,
  BookOpen,
  Sparkles,
  Layers,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
} from 'lucide-react';
import { aiApi, type ProposedActionDto, type ActionStatus } from '../../services/aiApi';
import { formatDate, formatTimeRange } from '../../utils/dateTime';

interface AIActionCardProps {
  action: ProposedActionDto;
  onConfirm: (actionId: string) => Promise<void>;
  onCancel: (actionId: string) => Promise<void>;
  onFindAlternative?: (title: string, date?: string) => void;
}

export function AIActionCard({
  action,
  onConfirm,
  onCancel,
  onFindAlternative,
}: AIActionCardProps) {
  const [localStatus, setLocalStatus] = useState<ActionStatus>(action.status);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [showReview, setShowReview] = useState(false);

  // Sync prop changes
  useEffect(() => {
    setLocalStatus(action.status);
  }, [action.status]);

  // Check TTL expiration (15 minutes)
  useEffect(() => {
    const checkExpiration = () => {
      if (action.expiresAt) {
        const expiresTime = new Date(action.expiresAt).getTime();
        if (Date.now() > expiresTime) {
          setIsExpired(true);
        }
      }
    };
    checkExpiration();
    const interval = setInterval(checkExpiration, 10000);
    return () => clearInterval(interval);
  }, [action.expiresAt]);

  const params = action.parameters || {};
  const tool = action.tool;

  // Format tool titles and icons
  const getToolMeta = () => {
    switch (tool) {
      case 'create_schedule':
        return {
          title: 'Tạo lịch mới',
          icon: CalendarPlus,
          colorClass: 'ai-tool-create',
        };
      case 'reschedule_event':
        return {
          title: 'Dời lịch hẹn',
          icon: CalendarSync,
          colorClass: 'ai-tool-reschedule',
        };
      case 'replace_schedule':
        return {
          title: 'Thay thế lịch',
          icon: CalendarSync,
          colorClass: 'ai-tool-reschedule',
        };
      case 'update_schedule':
        return {
          title: 'Cập nhật lịch',
          icon: Edit3,
          colorClass: 'ai-tool-update',
        };
      case 'delete_schedule':
        return {
          title: 'Xóa lịch hẹn',
          icon: Trash2,
          colorClass: 'ai-tool-delete',
        };
      case 'create_task':
        return {
          title: 'Tạo công việc',
          icon: CheckSquare,
          colorClass: 'ai-tool-task',
        };
      case 'update_task':
        return {
          title: 'Cập nhật việc',
          icon: Edit3,
          colorClass: 'ai-tool-task',
        };
      case 'complete_task':
        return {
          title: 'Hoàn thành việc',
          icon: CheckCircle2,
          colorClass: 'ai-tool-task',
        };
      case 'delete_task':
        return {
          title: 'Xóa công việc',
          icon: Trash2,
          colorClass: 'ai-tool-delete',
        };
      case 'create_deadline':
        return {
          title: 'Tạo hạn chót',
          icon: AlertCircle,
          colorClass: 'ai-tool-deadline',
        };
      case 'update_reminder':
        return {
          title: 'Cài nhắc nhở',
          icon: Bell,
          colorClass: 'ai-tool-reminder',
        };
      case 'navigate_to':
        return {
          title: 'Điều hướng',
          icon: ArrowRight,
          colorClass: 'ai-tool-nav',
        };
      case 'update_user_preferences':
        return {
          title: 'Cài đặt cá nhân',
          icon: Settings,
          colorClass: 'ai-tool-settings',
        };
      case 'create_study_plan':
        return {
          title: 'Lập kế hoạch ôn tập',
          icon: BookOpen,
          colorClass: 'ai-tool-plan',
        };
      case 'optimize_day':
      case 'optimize_week':
        return {
          title: 'Tối ưu lịch trình',
          icon: Sparkles,
          colorClass: 'ai-tool-opt',
        };
      case 'batch_action':
        return {
          title: 'Kế hoạch hành động',
          icon: Layers,
          colorClass: 'ai-tool-batch',
        };
      case 'import_google_sheet_events':
        return {
          title: 'Google Sheets Import',
          icon: FileSpreadsheet,
          colorClass: 'ai-tool-sheets',
        };
      case 'import_google_calendar':
        return {
          title: 'Google Calendar Import',
          icon: CalendarSync,
          colorClass: 'ai-tool-gcalendar',
        };
      case 'sync_google_calendar':
        return {
          title: 'Google Calendar Sync',
          icon: CalendarSync,
          colorClass: 'ai-tool-gcalendar',
        };
      case 'export_to_google_calendar':
        return {
          title: 'Đẩy sang Google Calendar',
          icon: ArrowUpRight,
          colorClass: 'ai-tool-gexport',
        };
      default:
        return {
          title: 'Thao tác hệ thống',
          icon: CalendarPlus,
          colorClass: 'ai-tool-default',
        };
    }
  };

  const meta = getToolMeta();
  const IconComponent = meta.icon;

  const handleConfirm = async () => {
    if (isProcessing || localStatus !== 'PROPOSED' || isExpired) return;
    setIsProcessing(true);
    setLocalStatus('EXECUTING');
    try {
      if (
        action.planId &&
        (tool === 'batch_action' ||
          tool === 'import_google_sheet_events' ||
          tool === 'import_google_calendar' ||
          tool === 'sync_google_calendar')
      ) {
        await aiApi.confirmPlan(action.planId);
      } else {
        await onConfirm(action.id);
      }
      setLocalStatus('SUCCESS');

      // If navigation action, dispatch event for immediate transition
      if (tool === 'navigate_to' && params.route) {
        window.dispatchEvent(
          new CustomEvent('smartschedule:navigate', { detail: { route: params.route } })
        );
      }
    } catch {
      setLocalStatus('FAILED');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (isProcessing || localStatus !== 'PROPOSED' || isExpired) return;
    setIsProcessing(true);
    try {
      if (action.planId && tool === 'batch_action') {
        await aiApi.cancelPlan(action.planId);
      } else {
        await onCancel(action.id);
      }
      setLocalStatus('CANCELLED');
    } catch {
      setLocalStatus('FAILED');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFindAnotherTime = () => {
    if (onFindAlternative) {
      const eventTitle = (params.title as string) || (params.event_title as string) || action.summary;
      const targetDate = (params.start_time as string) || (params.new_start_time as string);
      onFindAlternative(eventTitle, targetDate);
    }
  };

  // Helper for rendering date & time
  const renderTimeDetails = () => {
    // 1. Canonical ISO timestamps (single source of truth)
    const startsAt = (params.starts_at as string) || (params.startsAt as string);
    const endsAt = (params.ends_at as string) || (params.endsAt as string);

    if (startsAt && endsAt) {
      return (
        <div className="ai-action-detail-row">
          <Clock size={14} className="detail-icon" />
          <div className="time-display">
            <span>
              {formatDate(startsAt, undefined, { weekday: 'short', day: '2-digit', month: '2-digit' })},{' '}
              {formatTimeRange(startsAt, endsAt)}
            </span>
          </div>
        </div>
      );
    }

    if (tool === 'reschedule_event') {
      const newStart = params.new_start_time as string;
      const newEnd = params.new_end_time as string;
      const date = params.date as string;
      if (!newStart) return null;
      return (
        <div className="ai-action-detail-row">
          <Clock size={14} className="detail-icon" />
          <div className="time-display">
            <span className="time-new">
              {date ? `${date}, ` : ''}{newEnd ? `${newStart} – ${newEnd}` : newStart}
            </span>
          </div>
        </div>
      );
    }

    const date = params.date as string;
    const start = params.start_time as string;
    const end = params.end_time as string;

    if (start) {
      return (
        <div className="ai-action-detail-row">
          <Clock size={14} className="detail-icon" />
          <div className="time-display">
            <span>
              {date ? `${date}, ` : ''}{end ? `${start} – ${end}` : start}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const eventTitle =
    tool === 'replace_schedule' && (params.target_title || params.oldTitle) && (params.new_title || params.newTitle)
      ? `Thay "${params.target_title || params.oldTitle}" ➔ "${params.new_title || params.newTitle}"`
      : (params.title as string) ||
        (params.event_title as string) ||
        (params.new_title as string) ||
        action.summary;

  const location = params.location as string;
  const description = params.description as string;

  return (
    <div
      className={`ai-action-card status-${localStatus.toLowerCase()} ${
        action.hasConflict ? 'has-conflict' : ''
      }`}
      data-action-id={action.id}
    >
      {/* Top Header: Tool badge & Status Pill */}
      <div className="ai-action-card-header">
        <div className={`ai-action-type-pill ${meta.colorClass}`}>
          <IconComponent size={14} className="action-type-icon" />
          <span>{meta.title}</span>
        </div>

        <div className={`ai-action-status-pill status-${localStatus.toLowerCase()}`}>
          {localStatus === 'PROPOSED' && !isExpired && <span>Chờ xác nhận</span>}
          {localStatus === 'PROPOSED' && isExpired && <span>Hết hạn</span>}
          {localStatus === 'CONFIRMED' && <span>Đã xác nhận</span>}
          {localStatus === 'EXECUTING' && (
            <span className="status-flex">
              <Loader2 size={11} className="spin-icon" />
              <span>Đang xử lý...</span>
            </span>
          )}
          {localStatus === 'SUCCESS' && (
            <span className="status-flex">
              <CheckCircle2 size={12} className="success-icon" />
              <span>Đã thực hiện</span>
            </span>
          )}
          {localStatus === 'FAILED' && (
            <span className="status-flex">
              <XCircle size={12} className="failed-icon" />
              <span>Thất bại</span>
            </span>
          )}
          {localStatus === 'CANCELLED' && <span>Đã hủy</span>}
        </div>
      </div>

      {/* Main Details */}
      <div className="ai-action-body">
        <h4 className="ai-action-title">{eventTitle}</h4>

        {renderTimeDetails()}

        {location && (
          <div className="ai-action-detail-row">
            <MapPin size={14} className="detail-icon" />
            <span>{location}</span>
          </div>
        )}

        {description && (
          <div className="ai-action-detail-row">
            <FileText size={14} className="detail-icon" />
            <span className="description-text">{description}</span>
          </div>
        )}

        {/* Sub actions list for batch action plans */}
        {tool !== 'import_google_sheet_events' &&
          tool !== 'import_google_calendar' &&
          tool !== 'sync_google_calendar' &&
          action.subActions &&
          action.subActions.length > 0 && (
          <div className="ai-subactions-list">
            <div className="ai-subactions-header">Các bước trong kế hoạch:</div>
            {action.subActions.map((sub, idx) => (
              <div key={sub.id || idx} className="ai-subaction-item">
                <span className="ai-step-badge">{idx + 1}</span>
                <span className="ai-step-text">{sub.summary}</span>
              </div>
            ))}
          </div>
        )}

        {/* Special Google Workspace Summary & Review Section */}
        {(tool === 'import_google_sheet_events' ||
          tool === 'import_google_calendar' ||
          tool === 'sync_google_calendar') && (
          <div className="ai-google-import-card-details">
            <div className="ai-google-stats-badge-grid">
              {tool === 'import_google_sheet_events' ? (
                <>
                  <div className="ai-gstat-pill neutral">
                    <span className="gstat-num">{params.events_detected || params.rows_detected || 0}</span>
                    <span className="gstat-label">phát hiện</span>
                  </div>
                  <div className="ai-gstat-pill success">
                    <span className="gstat-num">{params.valid_events || 0}</span>
                    <span className="gstat-label">hợp lệ</span>
                  </div>
                  {Number(params.conflict_count || 0) > 0 && (
                    <div className="ai-gstat-pill warn">
                      <span className="gstat-num">{params.conflict_count}</span>
                      <span className="gstat-label">xung đột</span>
                    </div>
                  )}
                  {Number(params.missing_time_count || 0) > 0 && (
                    <div className="ai-gstat-pill danger">
                      <span className="gstat-num">{params.missing_time_count}</span>
                      <span className="gstat-label">thiếu giờ</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="ai-gstat-pill neutral">
                    <span className="gstat-num">{params.total_found || 0}</span>
                    <span className="gstat-label">sự kiện Google</span>
                  </div>
                  <div className="ai-gstat-pill success">
                    <span className="gstat-num">{params.new_count || 0}</span>
                    <span className="gstat-label">mới</span>
                  </div>
                  {Number(params.duplicate_count || 0) > 0 && (
                    <div className="ai-gstat-pill neutral">
                      <span className="gstat-num">{params.duplicate_count}</span>
                      <span className="gstat-label">trùng lặp</span>
                    </div>
                  )}
                  {Number(params.conflict_count || 0) > 0 && (
                    <div className="ai-gstat-pill warn">
                      <span className="gstat-num">{params.conflict_count}</span>
                      <span className="gstat-label">xung đột</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {Array.isArray(params.warnings) && params.warnings.length > 0 && (
              <div className="ai-google-warnings-box">
                {params.warnings.map((w: string, idx: number) => (
                  <div key={idx} className="ai-warning-line">
                    ⚠️ {w}
                  </div>
                ))}
              </div>
            )}

            {action.subActions && action.subActions.length > 0 && (
              <button
                type="button"
                className="ai-btn-review-toggle"
                onClick={() => setShowReview(!showReview)}
              >
                <span>{showReview ? 'Ẩn chi tiết' : `Review chi tiết (${action.subActions.length} sự kiện)`}</span>
                {showReview ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            )}

            {showReview && action.subActions && action.subActions.length > 0 && (
              <div className="ai-google-review-drawer">
                {action.subActions.map((sub, idx) => {
                  const sParams = sub.parameters || {};
                  return (
                    <div
                      key={sub.id || idx}
                      className={`ai-google-review-item ${sub.hasConflict ? 'conflict' : ''}`}
                    >
                      <div className="review-item-main">
                        <span className="review-item-title">{sParams.title || sub.summary}</span>
                        <span className="review-item-time">
                          {sParams.date} {sParams.start_time}–{sParams.end_time}
                        </span>
                        {sParams.location && (
                          <span className="review-item-loc">📍 {sParams.location}</span>
                        )}
                      </div>
                      {sub.hasConflict && (
                        <div className="review-item-conflict-note">
                          ⚠️ {sub.conflictDetails || 'Trùng giờ với lịch hiện có'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Conflict Detection Banner */}
      {action.hasConflict && (
        <div className="ai-action-conflict-banner">
          <AlertTriangle size={16} className="conflict-icon" />
          <div className="conflict-content">
            <div className="conflict-title">Phát hiện xung đột lịch!</div>
            <div className="conflict-details">{action.conflictDetails}</div>
          </div>
        </div>
      )}

      {/* Feedback & Result Message */}
      {localStatus === 'SUCCESS' && (
        <div className="ai-action-result-banner success">
          <CheckCircle2 size={14} />
          <span>{action.resultDetails || 'Thực hiện hành động thành công.'}</span>
        </div>
      )}

      {localStatus === 'FAILED' && (
        <div className="ai-action-result-banner failed">
          <XCircle size={14} />
          <span>{action.errorMessage || 'Lỗi khi áp dụng thay đổi.'}</span>
        </div>
      )}

      {localStatus === 'CANCELLED' && (
        <div className="ai-action-result-banner cancelled">
          <span>Yêu cầu đã được hủy bỏ.</span>
        </div>
      )}

      {/* Action Buttons for PROPOSED State */}
      {localStatus === 'PROPOSED' && !isExpired && (
        <div className="ai-action-button-group">
          {action.hasConflict && onFindAlternative && (
            <button
              type="button"
              className="ai-btn-find-alt"
              onClick={handleFindAnotherTime}
              disabled={isProcessing}
            >
              <Search size={13} />
              <span>Tìm giờ khác</span>
            </button>
          )}

          <button
            type="button"
            className="ai-btn-cancel"
            onClick={handleCancel}
            disabled={isProcessing}
          >
            Hủy
          </button>

          <button
            type="button"
            className={`ai-btn-confirm ${
              tool === 'batch_action' ||
              tool === 'import_google_sheet_events' ||
              tool === 'import_google_calendar' ||
              tool === 'sync_google_calendar'
                ? 'plan-btn'
                : ''
            } ${action.hasConflict ? 'warn' : ''}`}
            onClick={handleConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 size={13} className="spin-icon" />
                <span>Đang xử lý...</span>
              </>
            ) : tool === 'import_google_sheet_events' ? (
              `Import ${params.valid_events || ''} sự kiện`
            ) : tool === 'import_google_calendar' || tool === 'sync_google_calendar' ? (
              `Import ${params.new_count || ''} sự kiện`
            ) : tool === 'export_to_google_calendar' ? (
              'Đẩy sang Google Calendar'
            ) : action.hasConflict ? (
              tool === 'reschedule_event' ? 'Vẫn dời' : tool === 'replace_schedule' ? 'Vẫn thay' : 'Vẫn tạo'
            ) : tool === 'batch_action' ? (
              'Xác nhận tất cả (Do it)'
            ) : tool === 'navigate_to' ? (
              'Mở màn hình'
            ) : tool === 'complete_task' ? (
              'Đánh dấu xong'
            ) : (
              'Xác nhận'
            )}
          </button>
        </div>
      )}

      {localStatus === 'PROPOSED' && isExpired && (
        <div className="ai-action-expired-banner">
          Thao tác này đã hết hạn sau 15 phút. Vui lòng yêu cầu AI thực hiện lại.
        </div>
      )}
    </div>
  );
}
