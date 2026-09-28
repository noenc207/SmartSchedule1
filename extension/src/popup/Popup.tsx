import React, { useEffect, useState } from 'react';
import type { UniversalScheduleItem, ExtractionDiagnostics } from '../shared/types';
import type { ExtractionRule } from '../rules/types';
import { SmartScheduleClient, type ScheduleOption } from '../api/smartScheduleClient';
import { MESSAGE_TYPES, DEFAULT_SMARTSCHEDULE_API_URL } from '../shared/constants';
import {
  Calendar,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  BookOpen,
} from 'lucide-react';

type PopupState = 'CHECKING' | 'UNSUPPORTED' | 'DETECTED' | 'EXTRACTING' | 'PREVIEW' | 'SYNCING' | 'SUCCESS' | 'ERROR';

export const Popup: React.FC = () => {
  const [state, setState] = useState<PopupState>('CHECKING');
  const [detectedRule, setDetectedRule] = useState<ExtractionRule | null>(null);
  const [extractedItems, setExtractedItems] = useState<UniversalScheduleItem[]>([]);
  const [diagnostics, setDiagnostics] = useState<ExtractionDiagnostics | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [schedules, setSchedules] = useState<ScheduleOption[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');
  const [conflictCount, setConflictCount] = useState<number>(0);
  const [importedCount, setImportedCount] = useState<number>(0);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);

  const client = new SmartScheduleClient(DEFAULT_SMARTSCHEDULE_API_URL);

  useEffect(() => {
    checkCurrentPage();
  }, []);

  const checkCurrentPage = async () => {
    setState('CHECKING');
    setErrorMessage('');

    if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.tabs.query) {
      setState('UNSUPPORTED');
      return;
    }

    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!activeTab || !activeTab.id || !activeTab.url) {
        setState('UNSUPPORTED');
        return;
      }

      chrome.tabs.sendMessage(
        activeTab.id,
        { type: MESSAGE_TYPES.CHECK_PORTAL },
        (response) => {
          if (chrome.runtime.lastError || !response || !response.detected) {
            setState('UNSUPPORTED');
          } else {
            setDetectedRule(response.rule);
            setState('DETECTED');
          }
        }
      );
    } catch {
      setState('UNSUPPORTED');
    }
  };

  const handleExtract = async () => {
    setState('EXTRACTING');
    setErrorMessage('');

    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab || !activeTab.id) {
      setErrorMessage('Không thể kết nối với tab trình duyệt.');
      setState('ERROR');
      return;
    }

    chrome.tabs.sendMessage(
      activeTab.id,
      { type: MESSAGE_TYPES.EXTRACT_SCHEDULE, rule: detectedRule },
      async (response) => {
        if (chrome.runtime.lastError || !response || !response.success) {
          setErrorMessage(response?.error || 'Không tìm thấy dữ liệu thời khóa biểu hợp lệ trên trang.');
          setState('ERROR');
          return;
        }

        const items: UniversalScheduleItem[] = response.items || [];
        if (items.length === 0) {
          setErrorMessage('Không có buổi học nào được trích xuất từ bảng.');
          setState('ERROR');
          return;
        }

        setExtractedItems(items);
        setDiagnostics(response.diagnostics);

        // Load SmartSchedule user schedules
        try {
          const userSchedules = await client.getSchedules();
          setSchedules(userSchedules);
          if (userSchedules.length > 0) {
            setSelectedScheduleId(userSchedules[0].id);
          }
        } catch {
          // If not logged in, mock default schedule for preview
          setSchedules([{ id: 'default', name: 'Lịch chính (Mặc định)' }]);
          setSelectedScheduleId('default');
        }

        setState('PREVIEW');
      }
    );
  };

  const handleSync = async () => {
    setState('SYNCING');
    setErrorMessage('');

    try {
      const targetScheduleId = selectedScheduleId || (schedules[0] ? schedules[0].id : 'default');
      const result = await client.submitPortalImport(targetScheduleId, {
        source: detectedRule?.provider || 'PORTAL',
        ruleId: detectedRule?.id,
        ruleVersion: detectedRule?.version,
        items: extractedItems,
        skipConflicts: true,
      });

      setImportedCount(result.importedCount);
      setConflictCount(result.conflictCount);
      setState('SUCCESS');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('UNAUTHORIZED') || msg.includes('401')) {
        setErrorMessage('Vui lòng đăng nhập vào SmartSchedule trên trình duyệt trước khi đồng bộ.');
      } else {
        setErrorMessage(`Lỗi đồng bộ: ${msg}`);
      }
      setState('ERROR');
    }
  };

  const handleOpenSmartSchedule = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: 'http://localhost:5173/calendar' });
    } else {
      window.open('http://localhost:5173/calendar', '_blank');
    }
  };

  // Compute unique subjects count
  const subjectCount = new Set(extractedItems.map((i) => i.courseCode || i.title)).size;

  return (
    <div>
      {/* Header */}
      <header className="app-header">
        <div className="brand-wrapper">
          <div className="brand-logo" style={{ background: '#f27123', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={16} color="#fff" />
          </div>
          <div>
            <div className="brand-title">SmartSchedule</div>
          </div>
        </div>
        <span className="brand-badge">Importer</span>
      </header>

      <div className="container">
        {/* CHECKING STATE */}
        {state === 'CHECKING' && (
          <div className="card" style={{ textAlign: 'center', padding: '30px 10px' }}>
            <div className="spinner spinner-dark" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--slate-600)', fontSize: 12 }}>Đang kiểm tra trang đào tạo...</p>
          </div>
        )}

        {/* UNSUPPORTED STATE */}
        {state === 'UNSUPPORTED' && (
          <div className="card" style={{ textAlign: 'center', padding: '24px 14px' }}>
            <BookOpen size={32} color="#94a3b8" style={{ margin: '0 auto 10px' }} />
            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Chưa phát hiện cổng trường</h4>
            <p style={{ color: 'var(--slate-500)', fontSize: 12, marginBottom: 16 }}>
              Vui lòng mở trang thời khóa biểu sinh viên đã đăng nhập (ví dụ FAP FPT, Edusoft...).
            </p>
            <button className="btn btn-secondary" onClick={checkCurrentPage}>
              <RefreshCw size={14} /> Kiểm tra lại trang hiện tại
            </button>
          </div>
        )}

        {/* DETECTED STATE */}
        {state === 'DETECTED' && detectedRule && (
          <div className="card card-highlight">
            <div className="status-banner detected" style={{ marginBottom: 12 }}>
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              <div>
                <strong>Đã nhận diện: {detectedRule.name}</strong>
                <div style={{ fontSize: 11, marginTop: 2, opacity: 0.9 }}>
                  Quy tắc: {detectedRule.id} (v{detectedRule.version})
                </div>
              </div>
            </div>
            <p style={{ color: 'var(--slate-600)', fontSize: 12, marginBottom: 14 }}>
              Hệ thống đã sẵn sàng trích xuất dữ liệu lịch học từ bảng thời khóa biểu trên trang này.
            </p>
            <button className="btn btn-primary" onClick={handleExtract}>
              <Calendar size={14} /> Trích xuất lịch học
            </button>
          </div>
        )}

        {/* EXTRACTING STATE */}
        {state === 'EXTRACTING' && (
          <div className="card" style={{ textAlign: 'center', padding: '30px 10px' }}>
            <div className="spinner spinner-dark" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Đang phân tích bảng lịch...</p>
            <p style={{ color: 'var(--slate-500)', fontSize: 11 }}>Chuẩn hóa định dạng và kiểm tra trùng lặp</p>
          </div>
        )}

        {/* PREVIEW STATE */}
        {state === 'PREVIEW' && (
          <>
            <div className="status-banner detected">
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              <div>
                <strong>Đã trích xuất {extractedItems.length} buổi học</strong>
                <div style={{ fontSize: 11, marginTop: 2 }}>
                  {subjectCount} môn học • Nguồn: {detectedRule?.provider || 'Portal'}
                </div>
              </div>
            </div>

            {diagnostics && diagnostics.warnings.length > 0 && (
              <div className="status-banner warning">
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span>{diagnostics.warnings.length} lưu ý về phòng học hoặc thời lượng.</span>
              </div>
            )}

            {/* Target Schedule Selector */}
            {schedules.length > 0 && (
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate-600)', display: 'block', marginBottom: 4 }}>
                  Đồng bộ vào lịch:
                </label>
                <select
                  value={selectedScheduleId}
                  onChange={(e) => setSelectedScheduleId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid var(--slate-200)',
                    fontSize: 12,
                    background: '#fff',
                  }}
                >
                  {schedules.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Scrollable sessions list */}
            <div className="sessions-list">
              {extractedItems.map((item, idx) => {
                const datePart = item.startTime.slice(5, 10).replace('-', '/');
                const timeStart = item.startTime.slice(11, 16);
                const timeEnd = item.endTime.slice(11, 16);
                return (
                  <div key={item.externalId || idx} className="session-item">
                    <div className="session-date-box">
                      <div className="session-day">{datePart}</div>
                      <div className="session-time">{timeStart}</div>
                    </div>
                    <div className="session-details">
                      <div className="session-title">{item.title}</div>
                      <div className="session-meta">
                        {item.courseCode && <span className="tag tag-code">{item.courseCode}</span>}
                        {item.location && <span className="tag tag-room">{item.location}</span>}
                        {item.teacher && <span className="tag tag-teacher">{item.teacher}</span>}
                        <span style={{ fontSize: 10, color: 'var(--slate-400)', alignSelf: 'center' }}>
                          {timeStart} - {timeEnd}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setState('DETECTED')}>
                Quay lại
              </button>
              <button className="btn btn-primary" onClick={handleSync}>
                <Calendar size={14} /> Đồng bộ vào SmartSchedule
              </button>
            </div>
          </>
        )}

        {/* SYNCING STATE */}
        {state === 'SYNCING' && (
          <div className="card" style={{ textAlign: 'center', padding: '30px 10px' }}>
            <div className="spinner spinner-dark" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Đang ghi nhận vào SmartSchedule...</p>
            <p style={{ color: 'var(--slate-500)', fontSize: 11 }}>Kiểm tra xung đột và tối ưu hóa</p>
          </div>
        )}

        {/* SUCCESS STATE */}
        {state === 'SUCCESS' && (
          <div className="card" style={{ textAlign: 'center', padding: '24px 14px' }}>
            <CheckCircle2 size={36} color="var(--green)" style={{ margin: '0 auto 10px' }} />
            <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--slate-900)', marginBottom: 6 }}>
              Đồng bộ thành công!
            </h4>
            <p style={{ color: 'var(--slate-600)', fontSize: 12, marginBottom: 16 }}>
              Đã ghi nhận <strong>{importedCount || extractedItems.length} buổi học</strong> vào lịch của bạn.
              {conflictCount > 0 && <span> ({conflictCount} buổi đã bỏ qua do trùng lặp).</span>}
            </p>
            <button className="btn btn-primary" onClick={handleOpenSmartSchedule} style={{ marginBottom: 8 }}>
              <ExternalLink size={14} /> Mở SmartSchedule xem lịch
            </button>
            <button className="btn btn-secondary" onClick={checkCurrentPage}>
              Hoàn tất
            </button>
          </div>
        )}

        {/* ERROR STATE */}
        {state === 'ERROR' && (
          <div className="card">
            <div className="status-banner error" style={{ marginBottom: 14 }}>
              <XCircle size={18} style={{ flexShrink: 0 }} />
              <div>
                <strong>Không thể hoàn tất</strong>
                <div style={{ fontSize: 12, marginTop: 4 }}>{errorMessage || 'Đã có lỗi xảy ra.'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" onClick={checkCurrentPage}>
                Thử lại
              </button>
              <button className="btn btn-primary" onClick={handleOpenSmartSchedule}>
                Mở SmartSchedule
              </button>
            </div>
          </div>
        )}

        {/* DIAGNOSTICS ACCORDION */}
        {diagnostics && (
          <div className="accordion">
            <div className="accordion-header" onClick={() => setShowDiagnostics(!showDiagnostics)}>
              <span>Thông tin chẩn đoán (Diagnostics)</span>
              {showDiagnostics ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
            {showDiagnostics && (
              <div className="accordion-body">
                <div>Quy tắc: {diagnostics.ruleId} v{diagnostics.ruleVersion}</div>
                <div>Phát hiện: {diagnostics.rowsDetected} hàng | Chấp nhận: {diagnostics.rowsAccepted}</div>
                <div>Trùng lặp lọc bỏ: {diagnostics.duplicatesRemoved}</div>
                <div>Thời gian xử lý: {diagnostics.executionTimeMs}ms</div>
                <div>Thời điểm: {diagnostics.timestamp}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
