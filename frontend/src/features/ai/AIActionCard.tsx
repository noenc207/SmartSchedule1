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
} from 'lucide-react';
import type { ProposedActionDto, ActionStatus } from '../../services/aiApi';
import { formatDate, formatTimeRange, formatTime } from '../../utils/dateTime';

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
      default:
        return {
          title: 'Thao tác lịch',
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
      await onConfirm(action.id);
      setLocalStatus('SUCCESS');
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
      await onCancel(action.id);
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
              <span>Đang lưu...</span>
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
          <span>{action.resultDetails || 'Đã cập nhật thời khóa biểu thành công.'}</span>
        </div>
      )}

      {localStatus === 'FAILED' && (
        <div className="ai-action-result-banner failed">
          <XCircle size={14} />
          <span>{action.errorMessage || 'Lỗi khi áp dụng thay đổi lịch.'}</span>
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
            className={`ai-btn-confirm ${action.hasConflict ? 'warn' : ''}`}
            onClick={handleConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 size={13} className="spin-icon" />
                <span>Đang xử lý...</span>
              </>
            ) : action.hasConflict ? (
              tool === 'reschedule_event' ? 'Vẫn dời' : tool === 'replace_schedule' ? 'Vẫn thay' : 'Vẫn tạo'
            ) : (
              'Xác nhận'
            )}
          </button>
        </div>
      )}

      {localStatus === 'PROPOSED' && isExpired && (
        <div className="ai-action-expired-banner">
          Thao tác này đã hết hạn sau 15 phút. Vui lòng yêu cầu AI xếp lại lịch mới.
        </div>
      )}
    </div>
  );
}
