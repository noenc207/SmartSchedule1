import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  CalendarSync,
  X,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  aiApi,
  SheetAnalysisResult,
  CalendarImportResult,
  ParsedSheetEvent,
  GoogleWorkspaceStatus,
} from '../../../services/aiApi';
import { showToast } from '../../../components/Toast';

export interface GoogleQuickSyncModalProps {
  isOpen: boolean;
  initialTab?: 'sheets' | 'calendar';
  onClose: () => void;
  onSyncComplete?: () => void;
}

export function GoogleQuickSyncModal({
  isOpen,
  initialTab = 'sheets',
  onClose,
  onSyncComplete,
}: GoogleQuickSyncModalProps) {
  const [activeTab, setActiveTab] = useState<'sheets' | 'calendar'>(initialTab);

  // Sheets state
  const [sheetUrl, setSheetUrl] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [isAnalyzingSheet, setIsAnalyzingSheet] = useState(false);
  const [sheetResult, setSheetResult] = useState<SheetAnalysisResult | null>(null);
  const [isImportingSheet, setIsImportingSheet] = useState(false);
  const [skipSheetConflicts, setSkipSheetConflicts] = useState(true);
  const [showSheetDetails, setShowSheetDetails] = useState(false);

  // Calendar state
  const [calendarStatus, setCalendarStatus] = useState<GoogleWorkspaceStatus | null>(null);
  const [daysAhead, setDaysAhead] = useState<number>(14);
  const [isPreparingCalendar, setIsPreparingCalendar] = useState(false);
  const [calendarResult, setCalendarResult] = useState<CalendarImportResult | null>(null);
  const [isImportingCalendar, setIsImportingCalendar] = useState(false);
  const [skipCalConflicts, setSkipCalConflicts] = useState(true);
  const [showCalendarDetails, setShowCalendarDetails] = useState(false);

  // Update tab on open
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      // Fetch Google connection status
      aiApi
        .getGoogleWorkspaceStatus()
        .then((st) => setCalendarStatus(st))
        .catch(() => setCalendarStatus(null));
    }
  }, [isOpen, initialTab]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Handle Sheet Analysis
  const handleAnalyzeSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = sheetUrl.trim();
    if (!cleanUrl) {
      showToast('Vui lòng dán liên kết Google Sheets hợp lệ.', 'warning');
      return;
    }
    if (!cleanUrl.includes('docs.google.com/spreadsheets')) {
      showToast('Đường dẫn phải bắt đầu bằng https://docs.google.com/spreadsheets/...', 'warning');
      return;
    }

    setIsAnalyzingSheet(true);
    setSheetResult(null);
    try {
      const res = await aiApi.analyzeGoogleSheet(cleanUrl, sheetName.trim() || undefined);
      setSheetResult(res);
      if (res.validEvents === 0) {
        showToast('Không tìm thấy sự kiện nào hợp lệ trong trang tính.', 'info');
      } else {
        showToast(`Đã nhận diện thành công ${res.validEvents} sự kiện!`, 'success');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể đọc Google Sheet. Vui lòng kiểm tra quyền chia sẻ.';
      showToast(msg, 'error');
    } finally {
      setIsAnalyzingSheet(false);
    }
  };

  // Handle Sheet Import
  const handleImportSheet = async () => {
    if (!sheetResult || sheetResult.validEvents === 0) return;
    setIsImportingSheet(true);
    try {
      const res = await aiApi.importGoogleSheet(
        sheetResult.spreadsheetId,
        sheetResult.events,
        skipSheetConflicts
      );
      showToast(`Đã thêm thành công ${res.createdCount} sự kiện vào lịch!`, 'success');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('smartschedule:calendar-refresh'));
      }
      onSyncComplete?.();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Có lỗi khi nhập sự kiện.';
      showToast(msg, 'error');
    } finally {
      setIsImportingSheet(false);
    }
  };

  // Handle Calendar Prepare
  const handlePrepareCalendar = async () => {
    setIsPreparingCalendar(true);
    setCalendarResult(null);
    try {
      const res = await aiApi.prepareGoogleCalendarImport('primary', daysAhead);
      setCalendarResult(res);
      showToast(`Đã tìm thấy ${res.totalFound} sự kiện từ Google Calendar (${res.newCount} mới).`, 'success');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể đọc Google Calendar. Vui lòng kiểm tra kết nối.';
      showToast(msg, 'error');
    } finally {
      setIsPreparingCalendar(false);
    }
  };

  // Handle Calendar Import
  const handleImportCalendar = async () => {
    if (!calendarResult || calendarResult.eventsToImport.length === 0) return;
    setIsImportingCalendar(true);
    try {
      const res = await aiApi.importGoogleCalendar(
        calendarResult.calendarId,
        calendarResult.eventsToImport,
        skipCalConflicts
      );
      showToast(`Đồng bộ thành công ${res.createdCount} sự kiện vào SmartSchedule!`, 'success');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('smartschedule:calendar-refresh'));
      }
      onSyncComplete?.();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Có lỗi khi đồng bộ Calendar.';
      showToast(msg, 'error');
    } finally {
      setIsImportingCalendar(false);
    }
  };

  return (
    <div className="dialog-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="confirm-dialog google-quick-sync-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          maxWidth: 620,
          width: '92vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          borderRadius: 16,
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--card-bg, #ffffff)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: activeTab === 'sheets' ? '#ecfdf5' : '#eff6ff',
                color: activeTab === 'sheets' ? '#059669' : '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {activeTab === 'sheets' ? <FileSpreadsheet size={20} /> : <CalendarSync size={20} />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-color, #1e293b)' }}>
                {activeTab === 'sheets' ? 'Nhập Lịch từ Google Sheets' : 'Đồng bộ Google Calendar'}
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--muted-color, #64748b)' }}>
                {activeTab === 'sheets'
                  ? 'Dán liên kết trang tính Google để nhập thời khóa biểu nhanh'
                  : 'Nạp sự kiện trực tiếp từ Google Calendar vào SmartSchedule'}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Đóng"
            style={{ borderRadius: 8, padding: 6 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-color, #e2e8f0)',
            background: 'var(--bg-secondary, #f8fafc)',
            padding: '4px 16px',
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('sheets')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              color: activeTab === 'sheets' ? '#059669' : '#64748b',
              borderBottom: activeTab === 'sheets' ? '2px solid #059669' : '2px solid transparent',
              transition: 'all 0.2s',
            }}
          >
            <FileSpreadsheet size={15} />
            <span>Dán link Google Sheet</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              color: activeTab === 'calendar' ? '#2563eb' : '#64748b',
              borderBottom: activeTab === 'calendar' ? '2px solid #2563eb' : '2px solid transparent',
              transition: 'all 0.2s',
            }}
          >
            <CalendarSync size={15} />
            <span>Đồng bộ Google Calendar</span>
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {activeTab === 'sheets' ? (
            /* TAB 1: GOOGLE SHEETS */
            <div>
              <form onSubmit={handleAnalyzeSheet} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: 'var(--text-color, #1e293b)',
                      marginBottom: 6,
                    }}
                  >
                    Đường dẫn Google Sheets (URL) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="url"
                    required
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/edit"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: '1px solid var(--border-color, #cbd5e1)',
                      fontSize: 13,
                      background: 'var(--card-bg, #ffffff)',
                      color: 'var(--text-color, #1e293b)',
                      boxSizing: 'border-box',
                    }}
                  />
                  <small style={{ fontSize: 11.5, color: '#64748b', marginTop: 4, display: 'block' }}>
                    💡 Hãy đảm bảo trang tính đã được bật quyền <strong>"Bất kỳ ai có liên kết đều có thể xem"</strong> (Anyone with link can view).
                  </small>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: 'var(--text-color, #1e293b)',
                      marginBottom: 6,
                    }}
                  >
                    Tên Sheet / Tab (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={sheetName}
                    onChange={(e) => setSheetName(e.target.value)}
                    placeholder="Ví dụ: TKB, Sheet1 (Để trống sẽ tự đọc trang đầu tiên)"
                    style={{
                      width: '100%',
                      padding: '9px 14px',
                      borderRadius: 10,
                      border: '1px solid var(--border-color, #cbd5e1)',
                      fontSize: 13,
                      background: 'var(--card-bg, #ffffff)',
                      color: 'var(--text-color, #1e293b)',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                  <button
                    type="submit"
                    className="primary-button"
                    disabled={isAnalyzingSheet || !sheetUrl.trim()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '9px 18px',
                      background: '#059669',
                      borderColor: '#059669',
                    }}
                  >
                    {isAnalyzingSheet ? (
                      <>
                        <RefreshCw size={15} className="animate-spin" />
                        <span>Đang phân tích bảng tính...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={15} />
                        <span>Phân tích Sheet</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Analysis Result Display */}
              {sheetResult && (
                <div
                  style={{
                    marginTop: 20,
                    borderTop: '1px solid var(--border-color, #e2e8f0)',
                    paddingTop: 16,
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                      gap: 8,
                      marginBottom: 14,
                    }}
                  >
                    <div className="google-stat-pill blue">
                      <span className="pill-num">{sheetResult.rowsDetected}</span>
                      <span className="pill-txt">Dòng quét</span>
                    </div>
                    <div className="google-stat-pill green">
                      <span className="pill-num">{sheetResult.validEvents}</span>
                      <span className="pill-txt">Hợp lệ</span>
                    </div>
                    {sheetResult.conflictCount > 0 && (
                      <div className="google-stat-pill amber">
                        <span className="pill-num">{sheetResult.conflictCount}</span>
                        <span className="pill-txt">Xung đột</span>
                      </div>
                    )}
                    {sheetResult.missingTimeCount > 0 && (
                      <div className="google-stat-pill red">
                        <span className="pill-num">{sheetResult.missingTimeCount}</span>
                        <span className="pill-txt">Thiếu giờ</span>
                      </div>
                    )}
                  </div>

                  {sheetResult.warnings && sheetResult.warnings.length > 0 && (
                    <div className="google-warnings-box" style={{ marginBottom: 12 }}>
                      <AlertTriangle size={14} className="text-amber-500" />
                      <div>
                        {sheetResult.warnings.map((w, idx) => (
                          <div key={idx}>{w}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Toggle Preview Details */}
                  {sheetResult.events.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <button
                        type="button"
                        onClick={() => setShowSheetDetails(!showSheetDetails)}
                        className="google-review-toggle"
                        style={{ width: '100%', justifyContent: 'space-between' }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Calendar size={14} />
                          <span>Xem trước danh sách ({sheetResult.events.length} sự kiện)</span>
                        </span>
                        {showSheetDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>

                      {showSheetDetails && (
                        <div
                          style={{
                            maxHeight: 180,
                            overflowY: 'auto',
                            marginTop: 8,
                            border: '1px solid var(--border-color, #e2e8f0)',
                            borderRadius: 10,
                            padding: 8,
                            background: 'var(--bg-secondary, #f8fafc)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                          }}
                        >
                          {sheetResult.events.map((ev, i) => (
                            <div
                              key={i}
                              style={{
                                padding: '6px 10px',
                                borderRadius: 8,
                                background: '#ffffff',
                                border: '1px solid #e2e8f0',
                                fontSize: 12,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <div>
                                <strong style={{ color: '#1e293b' }}>{ev.title}</strong>
                                <div style={{ color: '#64748b', fontSize: 11, display: 'flex', gap: 10 }}>
                                  <span>📅 {ev.date || 'Chưa rõ ngày'}</span>
                                  <span>⏰ {ev.startTime || '??:??'} - {ev.endTime || '??:??'}</span>
                                  {ev.location && <span>📍 {ev.location}</span>}
                                </div>
                              </div>
                              {ev.hasConflict && (
                                <span style={{ fontSize: 10.5, color: '#d97706', fontWeight: 600 }}>
                                  Trùng giờ
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Import Action Row */}
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      marginTop: 10,
                    }}
                  >
                    <label style={{ fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={skipSheetConflicts}
                        onChange={(e) => setSkipSheetConflicts(e.target.checked)}
                      />
                      <span>Tự động bỏ qua các sự kiện trùng/xung đột giờ</span>
                    </label>

                    <button
                      type="button"
                      className="primary-button"
                      disabled={isImportingSheet || sheetResult.validEvents === 0}
                      onClick={handleImportSheet}
                      style={{
                        padding: '9px 18px',
                        background: '#059669',
                        borderColor: '#059669',
                      }}
                    >
                      {isImportingSheet ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>Đang nạp vào lịch...</span>
                        </>
                      ) : (
                        <span>Nhập {sheetResult.validEvents} sự kiện vào Lịch</span>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* TAB 2: GOOGLE CALENDAR */
            <div>
              {/* Connection Status Box */}
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: 12,
                  background: calendarStatus?.connected ? '#f0fdf4' : '#fffbeb',
                  border: `1px solid ${calendarStatus?.connected ? '#bbf7d0' : '#fef08a'}`,
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckCircle2
                    size={20}
                    color={calendarStatus?.connected ? '#16a34a' : '#d97706'}
                  />
                  <div>
                    <strong style={{ fontSize: 13, color: '#1e293b', display: 'block' }}>
                      {calendarStatus?.connected
                        ? 'Đã kết nối tài khoản Google Workspace'
                        : 'Chưa liên kết Google Workspace'}
                    </strong>
                    <span style={{ fontSize: 11.5, color: '#64748b' }}>
                      {calendarStatus?.googleEmail
                        ? `Tài khoản: ${calendarStatus.googleEmail}`
                        : 'Bạn có thể đồng bộ thời khóa biểu trực tiếp từ Google Calendar.'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Scope & Date Range Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: 'var(--text-color, #1e293b)',
                      marginBottom: 6,
                    }}
                  >
                    Phạm vi thời gian đồng bộ
                  </label>
                  <select
                    value={daysAhead}
                    onChange={(e) => setDaysAhead(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '9px 14px',
                      borderRadius: 10,
                      border: '1px solid var(--border-color, #cbd5e1)',
                      fontSize: 13,
                      background: 'var(--card-bg, #ffffff)',
                      color: 'var(--text-color, #1e293b)',
                    }}
                  >
                    <option value={7}>7 ngày tiếp theo</option>
                    <option value={14}>14 ngày tiếp theo (Khuyên dùng)</option>
                    <option value={30}>30 ngày tiếp theo (1 tháng)</option>
                    <option value={60}>60 ngày tiếp theo (2 tháng)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="primary-button"
                    disabled={isPreparingCalendar}
                    onClick={handlePrepareCalendar}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '9px 18px',
                    }}
                  >
                    {isPreparingCalendar ? (
                      <>
                        <RefreshCw size={15} className="animate-spin" />
                        <span>Đang kiểm tra Google Calendar...</span>
                      </>
                    ) : (
                      <>
                        <CalendarSync size={15} />
                        <span>Quét sự kiện từ Google</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Calendar Result Display */}
              {calendarResult && (
                <div
                  style={{
                    marginTop: 20,
                    borderTop: '1px solid var(--border-color, #e2e8f0)',
                    paddingTop: 16,
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                      gap: 8,
                      marginBottom: 14,
                    }}
                  >
                    <div className="google-stat-pill blue">
                      <span className="pill-num">{calendarResult.totalFound}</span>
                      <span className="pill-txt">Tìm thấy</span>
                    </div>
                    <div className="google-stat-pill green">
                      <span className="pill-num">{calendarResult.newCount}</span>
                      <span className="pill-txt">Sự kiện mới</span>
                    </div>
                    <div className="google-stat-pill purple">
                      <span className="pill-num">{calendarResult.duplicateCount}</span>
                      <span className="pill-txt">Đã có (trùng)</span>
                    </div>
                    {calendarResult.conflictCount > 0 && (
                      <div className="google-stat-pill amber">
                        <span className="pill-num">{calendarResult.conflictCount}</span>
                        <span className="pill-txt">Xung đột</span>
                      </div>
                    )}
                  </div>

                  {calendarResult.warnings && calendarResult.warnings.length > 0 && (
                    <div className="google-warnings-box" style={{ marginBottom: 12 }}>
                      <AlertTriangle size={14} className="text-amber-500" />
                      <div>
                        {calendarResult.warnings.map((w, idx) => (
                          <div key={idx}>{w}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Toggle Preview Details */}
                  {calendarResult.eventsToImport.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <button
                        type="button"
                        onClick={() => setShowCalendarDetails(!showCalendarDetails)}
                        className="google-review-toggle"
                        style={{ width: '100%', justifyContent: 'space-between' }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Calendar size={14} />
                          <span>Xem danh sách nạp ({calendarResult.eventsToImport.length} sự kiện)</span>
                        </span>
                        {showCalendarDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>

                      {showCalendarDetails && (
                        <div
                          style={{
                            maxHeight: 180,
                            overflowY: 'auto',
                            marginTop: 8,
                            border: '1px solid var(--border-color, #e2e8f0)',
                            borderRadius: 10,
                            padding: 8,
                            background: 'var(--bg-secondary, #f8fafc)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                          }}
                        >
                          {calendarResult.eventsToImport.map((ev, i) => (
                            <div
                              key={i}
                              style={{
                                padding: '6px 10px',
                                borderRadius: 8,
                                background: '#ffffff',
                                border: '1px solid #e2e8f0',
                                fontSize: 12,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <div>
                                <strong style={{ color: '#1e293b' }}>{ev.title}</strong>
                                <div style={{ color: '#64748b', fontSize: 11, display: 'flex', gap: 10 }}>
                                  <span>📅 {ev.date || 'Chưa rõ ngày'}</span>
                                  <span>⏰ {ev.startTime || '??:??'} - {ev.endTime || '??:??'}</span>
                                  {ev.location && <span>📍 {ev.location}</span>}
                                </div>
                              </div>
                              {ev.hasConflict && (
                                <span style={{ fontSize: 10.5, color: '#d97706', fontWeight: 600 }}>
                                  Xung đột
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Import Action Row */}
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      marginTop: 10,
                    }}
                  >
                    <label style={{ fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={skipCalConflicts}
                        onChange={(e) => setSkipCalConflicts(e.target.checked)}
                      />
                      <span>Bỏ qua sự kiện xung đột</span>
                    </label>

                    <button
                      type="button"
                      className="primary-button"
                      disabled={isImportingCalendar || calendarResult.eventsToImport.length === 0}
                      onClick={handleImportCalendar}
                      style={{ padding: '9px 18px' }}
                    >
                      {isImportingCalendar ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>Đang đồng bộ...</span>
                        </>
                      ) : (
                        <span>Đồng bộ {calendarResult.eventsToImport.length} sự kiện vào Lịch</span>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border-color, #e2e8f0)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--bg-secondary, #f8fafc)',
          }}
        >
          <small style={{ fontSize: 11.5, color: '#64748b' }}>
            🔒 Dữ liệu bảo mật · Kiểm tra trùng lặp tự động
          </small>
          <button type="button" className="secondary-button" onClick={onClose} style={{ padding: '6px 14px' }}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
