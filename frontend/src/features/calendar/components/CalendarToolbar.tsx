import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  Check,
  Calendar,
  CalendarDays,
  Plus,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  FileSpreadsheet,
  CalendarSync,
} from 'lucide-react';
import type { CalendarViewType, SemanticZoomLevel } from '../../../stores/preferenceStore';
import { DEFAULT_TIMEZONE, formatDate } from '../../../utils/dateTime';

export interface CalendarToolbarProps {
  currentDate: Date;
  currentView: CalendarViewType;
  semanticZoom: SemanticZoomLevel;
  isMiniCalendarOpen?: boolean;
  timeZone?: string;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  onNavigateToday: () => void;
  onChangeView: (view: CalendarViewType) => void;
  onChangeZoom: (zoom: SemanticZoomLevel) => void;
  onToggleMiniCalendar?: () => void;
  // Consolidated stats & actions
  fixedCount?: number;
  plannedCount?: number;
  unscheduledCount?: number;
  canEdit?: boolean;
  onOpenCreate?: () => void;
  onToggleWhatIf?: () => void;
  isWhatIfActive?: boolean;
  onOpenConstraints?: () => void;
  onOpenGoogleImport?: (tab: 'sheets' | 'calendar') => void;
}

const VIEW_OPTIONS: { id: CalendarViewType; label: string; iconLabel: string }[] = [
  { id: 'timeGridDay', label: 'Ngày', iconLabel: '📅' },
  { id: 'timeGridWeek', label: 'Tuần', iconLabel: '🗓️' },
  { id: 'dayGridMonth', label: 'Tháng', iconLabel: '📆' },
  { id: 'quarter', label: 'Quý', iconLabel: '📊' },
  { id: 'year', label: 'Năm', iconLabel: '📈' },
  { id: 'timeline', label: 'Dự án (Timeline)', iconLabel: '⏱️' },
  { id: 'listWeek', label: 'Danh sách', iconLabel: '📋' },
];

export function CalendarToolbar({
  currentDate,
  currentView,
  semanticZoom,
  isMiniCalendarOpen = true,
  timeZone = DEFAULT_TIMEZONE,
  onNavigatePrev,
  onNavigateNext,
  onNavigateToday,
  onChangeView,
  onChangeZoom,
  onToggleMiniCalendar,
  fixedCount,
  plannedCount,
  unscheduledCount,
  canEdit = true,
  onOpenCreate,
  onToggleWhatIf,
  isWhatIfActive = false,
  onOpenConstraints,
  onOpenGoogleImport,
}: CalendarToolbarProps) {
  const [viewDropdownOpen, setViewDropdownOpen] = useState(false);
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);
  const viewDropdownRef = useRef<HTMLDivElement>(null);
  const optionsMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (viewDropdownRef.current && !viewDropdownRef.current.contains(event.target as Node)) {
        setViewDropdownOpen(false);
      }
      if (optionsMenuRef.current && !optionsMenuRef.current.contains(event.target as Node)) {
        setOptionsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format title label based on active view and date
  const formatToolbarTitle = (): string => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    switch (currentView) {
      case 'timeGridDay': {
        const vnDays = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
        const dayName = vnDays[currentDate.getDay()];
        const d = String(currentDate.getDate()).padStart(2, '0');
        const m = String(month + 1).padStart(2, '0');
        return `${dayName}, ${d}/${m}/${year}`;
      }
      case 'timeGridWeek':
      case 'listWeek': {
        const startOfWeek = new Date(currentDate);
        const day = (startOfWeek.getDay() + 6) % 7; // Monday = 0
        startOfWeek.setDate(startOfWeek.getDate() - day);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        const d1 = String(startOfWeek.getDate()).padStart(2, '0');
        const m1 = String(startOfWeek.getMonth() + 1).padStart(2, '0');
        const d2 = String(endOfWeek.getDate()).padStart(2, '0');
        const m2 = String(endOfWeek.getMonth() + 1).padStart(2, '0');
        const y2 = endOfWeek.getFullYear();
        return `Tuần ${d1}/${m1} – ${d2}/${m2}/${y2}`;
      }
      case 'dayGridMonth':
        return `Tháng ${month + 1}, ${year}`;
      case 'quarter': {
        const q = Math.floor(month / 3) + 1;
        return `Quý ${q}, ${year}`;
      }
      case 'year':
        return `Năm ${year}`;
      case 'timeline':
        return `Dự án Tháng ${month + 1}, ${year}`;
      default:
        return formatDate(currentDate, timeZone);
    }
  };

  const isTimeGrid = currentView === 'timeGridWeek' || currentView === 'timeGridDay';
  const activeViewOption = VIEW_OPTIONS.find((v) => v.id === currentView) || VIEW_OPTIONS[1];

  return (
    <div className="unified-calendar-toolbar">
      {/* 1. Left Group: Title with Icon & Date Navigation */}
      <div className="toolbar-left-group">
        <div className="toolbar-main-heading">
          <Calendar size={18} className="toolbar-calendar-icon" />
          <h2 className="toolbar-title-text">
            {currentView === 'timeGridWeek'
              ? 'Thời khóa biểu tuần'
              : currentView === 'dayGridMonth'
              ? 'Thời khóa biểu tháng'
              : currentView === 'timeline'
              ? 'Dòng thời gian'
              : 'Thời khóa biểu'}
          </h2>
        </div>

        <div className="toolbar-nav-buttons">
          <button
            type="button"
            className="toolbar-nav-icon-btn"
            onClick={onNavigatePrev}
            aria-label="Khoảng thời gian trước"
            title="Khoảng thời gian trước (P)"
          >
            <ChevronLeft size={16} />
          </button>
          <span
            className="toolbar-nav-date-label"
            onClick={onNavigateToday}
            title="Bấm để quay về hôm nay"
          >
            {formatToolbarTitle()}
          </span>
          <button
            type="button"
            className="toolbar-nav-icon-btn"
            onClick={onNavigateNext}
            aria-label="Khoảng thời gian tiếp theo"
            title="Khoảng thời gian tiếp theo (N)"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* 2. Center: Intelligence Metrics Pills (Compact) */}
      <div className="toolbar-center-stats">
        {fixedCount !== undefined && (
          <span className="toolbar-stat-pill fixed" title="Lớp học cố định trên trường">
            <span className="stat-label">Lớp:</span>
            <strong>{fixedCount}</strong>
          </span>
        )}
        {plannedCount !== undefined && (
          <span className="toolbar-stat-pill planned" title="Lịch tự học / làm việc đã xếp">
            <span className="stat-label">Tự học:</span>
            <strong>{plannedCount}</strong>
          </span>
        )}
        {unscheduledCount !== undefined && (
          <span
            className={`toolbar-stat-pill unscheduled ${unscheduledCount > 0 ? 'has-pending' : ''}`}
            title="Nhiệm vụ cần xếp lịch"
          >
            <span className="stat-label">Cần xếp:</span>
            <strong>{unscheduledCount}</strong>
          </span>
        )}
      </div>

      {/* 3. Right: Segmented View Pills (Tuần | Tháng | Timeline | ...) + Zoom + Actions */}
      <div className="toolbar-right-group">
        {/* Semantic Zoom Segmented Toggle (Day & Week) */}
        {isTimeGrid && (
          <div className="semantic-zoom-segmented" role="group" aria-label="Độ chi tiết khung giờ">
            <button
              type="button"
              className={`zoom-seg-btn ${semanticZoom === 'compact' ? 'active' : ''}`}
              onClick={() => onChangeZoom('compact')}
              title="Khung giờ 60 phút mỗi ô"
            >
              60p
            </button>
            <button
              type="button"
              className={`zoom-seg-btn ${semanticZoom === 'normal' ? 'active' : ''}`}
              onClick={() => onChangeZoom('normal')}
              title="Khung giờ 30 phút mỗi ô"
            >
              30p
            </button>
            <button
              type="button"
              className={`zoom-seg-btn ${semanticZoom === 'detailed' ? 'active' : ''}`}
              onClick={() => onChangeZoom('detailed')}
              title="Khung giờ 15 phút mỗi ô"
            >
              15p
            </button>
          </div>
        )}

        {/* Segmented View Pills: Ngày | Tuần | Tháng | Timeline | ... */}
        <div className="toolbar-segmented-views" role="group" aria-label="Chế độ xem lịch">
          <button
            type="button"
            data-view="timeGridDay"
            className={`seg-view-btn ${currentView === 'timeGridDay' ? 'active' : ''}`}
            onClick={() => onChangeView('timeGridDay')}
            title="Xem theo Ngày"
          >
            Ngày
          </button>
          <button
            type="button"
            data-view="timeGridWeek"
            className={`seg-view-btn ${currentView === 'timeGridWeek' ? 'active' : ''}`}
            onClick={() => onChangeView('timeGridWeek')}
            title="Xem theo Tuần"
          >
            Tuần
          </button>
          <button
            type="button"
            data-view="dayGridMonth"
            className={`seg-view-btn ${currentView === 'dayGridMonth' ? 'active' : ''}`}
            onClick={() => onChangeView('dayGridMonth')}
            title="Xem theo Tháng"
          >
            Tháng
          </button>
          <button
            type="button"
            data-view="timeline"
            className={`seg-view-btn seg-view-timeline ${currentView === 'timeline' ? 'active' : ''}`}
            onClick={() => onChangeView('timeline')}
            title="Xem theo Dòng thời gian / Dự án"
          >
            Timeline
          </button>

          {/* ... More Views Dropdown */}
          <div className="toolbar-dropdown-wrap" ref={viewDropdownRef}>
            <button
              type="button"
              className={`seg-view-btn more-btn ${!['timeGridDay', 'timeGridWeek', 'dayGridMonth', 'timeline'].includes(currentView) ? 'active' : ''}`}
              onClick={() => setViewDropdownOpen(!viewDropdownOpen)}
              title="Chế độ xem khác (Quý, Năm, Danh sách)"
              aria-expanded={viewDropdownOpen}
            >
              {!['timeGridDay', 'timeGridWeek', 'dayGridMonth', 'timeline'].includes(currentView) ? activeViewOption.label : '•••'}
            </button>

            {viewDropdownOpen && (
              <div className="toolbar-dropdown-menu right-aligned" role="menu">
                {VIEW_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    role="menuitem"
                    className={`toolbar-menu-item ${currentView === opt.id ? 'active' : ''}`}
                    onClick={() => {
                      onChangeView(opt.id);
                      setViewDropdownOpen(false);
                    }}
                  >
                    <span className="menu-item-emoji">{opt.iconLabel}</span>
                    <span className="menu-item-text">{opt.label}</span>
                    {currentView === opt.id && <Check size={14} className="menu-item-check" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Create Event Primary Button */}
        {canEdit && onOpenCreate && (
          <button
            type="button"
            className="toolbar-create-event-btn"
            onClick={onOpenCreate}
            title="Thêm sự kiện mới (C)"
            aria-label="Thêm sự kiện mới"
          >
            <Plus size={15} />
            <span className="create-event-btn-text">Thêm sự kiện</span>
          </button>
        )}

        {/* Quick Google Sheets Import Button */}
        {onOpenGoogleImport && (
          <button
            type="button"
            className="toolbar-google-quick-btn toolbar-sheet-quick-btn"
            onClick={() => onOpenGoogleImport('sheets')}
            title="Dán liên kết Google Sheets để nhập lịch nhanh"
            aria-label="Dán link Google Sheet"
          >
            <FileSpreadsheet size={15} color="#059669" />
            <span className="create-event-btn-text">Dán link Sheet</span>
          </button>
        )}

        {/* Quick Google Calendar Sync Button */}
        {onOpenGoogleImport && (
          <button
            type="button"
            className="toolbar-google-quick-btn toolbar-cal-quick-btn"
            onClick={() => onOpenGoogleImport('calendar')}
            title="Đồng bộ với Google Calendar"
            aria-label="Đồng bộ Google Calendar"
          >
            <CalendarSync size={15} color="#2563eb" />
            <span className="create-event-btn-text">Đồng bộ Google</span>
          </button>
        )}

        {/* Mini Calendar Toggle */}
        {onToggleMiniCalendar && (
          <button
            type="button"
            className={`toolbar-icon-toggle-btn ${isMiniCalendarOpen ? 'active' : ''}`}
            onClick={onToggleMiniCalendar}
            title={isMiniCalendarOpen ? 'Ẩn lịch thu nhỏ' : 'Hiện lịch thu nhỏ'}
            aria-pressed={isMiniCalendarOpen}
          >
            <CalendarDays size={15} />
          </button>
        )}

        {/* More Options Dropdown */}
        {(onToggleWhatIf || onOpenConstraints) && (
          <div className="toolbar-dropdown-wrap" ref={optionsMenuRef}>
            <button
              type="button"
              className={`toolbar-icon-toggle-btn ${isWhatIfActive || optionsMenuOpen ? 'active' : ''}`}
              onClick={() => setOptionsMenuOpen(!optionsMenuOpen)}
              title="Tùy chọn mô phỏng & ràng buộc"
              aria-label="Tùy chọn khác"
            >
              <SlidersHorizontal size={14} />
            </button>

            {optionsMenuOpen && (
              <div className="toolbar-dropdown-menu right-aligned" role="menu">
                {onToggleWhatIf && (
                  <button
                    type="button"
                    className="toolbar-menu-item"
                    onClick={() => {
                      setOptionsMenuOpen(false);
                      onToggleWhatIf();
                    }}
                  >
                    <Sparkles size={14} />
                    <span>{isWhatIfActive ? 'Thoát mô phỏng What-If' : 'Mô phỏng What-If'}</span>
                  </button>
                )}
                {onOpenConstraints && (
                  <button
                    type="button"
                    className="toolbar-menu-item"
                    onClick={() => {
                      setOptionsMenuOpen(false);
                      onOpenConstraints();
                    }}
                  >
                    <Clock size={14} />
                    <span>Ràng buộc nâng cao...</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
