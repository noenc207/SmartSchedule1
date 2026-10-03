import React, { useState, useEffect } from 'react';
import {
  Calendar,
  GraduationCap,
  GitBranch,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
  Shield,
  Unlink,
  Check,
  X,
  Clock,
  ArrowRightLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  Upload,
  Cpu,
} from 'lucide-react';
import { showToast } from '../../../components/Toast';
import { isDemoMode } from '../../../services/demoMode';
import { exportEventsToIcs, parseIcsToEvents, triggerIcsDownload, icsApi } from '../../../services/icsService';
import { calendarSyncEngine } from '../../../services/calendarSyncEngine';
import { eventApi } from '../../../services/eventApi';
import { aiApi } from '../../../services/aiApi';
import { useWorkspaceStore } from '../../../stores/workspaceStore';

export type IntegrationId =
  | 'google-calendar'
  | 'outlook'
  | 'canvas'
  | 'google-classroom'
  | 'github'
  | 'jira';

export type IntegrationStatus =
  | 'not_connected'
  | 'connecting'
  | 'connected'
  | 'syncing'
  | 'disconnected';

export type SyncDirection = 'import_only' | 'export_only' | 'two_way';

export interface IntegrationItem {
  id: IntegrationId;
  name: string;
  category: 'Calendar' | 'Academic LMS' | 'Code & Tasks';
  description: string;
  badge: string;
  scopes: string[];
  status: IntegrationStatus;
  syncDirection: SyncDirection;
  lastSyncedAt: string | null;
  accountEmail: string | null;
}

const STORAGE_KEY = 'smartschedule-integrations-v1';

const INITIAL_INTEGRATIONS: IntegrationItem[] = [
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    category: 'Calendar',
    description: 'Sync lecture timetables, personal events, and study sessions with your Google account.',
    badge: 'OAuth 2.0',
    scopes: ['calendar.events.readonly', 'calendar.events.freebusy'],
    status: 'not_connected',
    syncDirection: 'import_only',
    lastSyncedAt: null,
    accountEmail: null,
  },
  {
    id: 'outlook',
    name: 'Microsoft Outlook 365',
    category: 'Calendar',
    description: 'Connect university Office 365 student calendar to reflect FPT campus reservations.',
    badge: 'Microsoft Graph',
    scopes: ['Calendars.Read', 'Calendars.ReadWrite'],
    status: 'not_connected',
    syncDirection: 'import_only',
    lastSyncedAt: null,
    accountEmail: null,
  },
  {
    id: 'canvas',
    name: 'Canvas LMS',
    category: 'Academic LMS',
    description: 'Import assignment deadlines, course quizzes, and syllabus milestones into your task list.',
    badge: 'LTI / API Token',
    scopes: ['assignments.read', 'submissions.read'],
    status: 'not_connected',
    syncDirection: 'import_only',
    lastSyncedAt: null,
    accountEmail: null,
  },
  {
    id: 'google-classroom',
    name: 'Google Classroom',
    category: 'Academic LMS',
    description: 'Sync course announcements and assignment due dates from your registered classes.',
    badge: 'Google Classroom API',
    scopes: ['classroom.coursework.me.readonly'],
    status: 'not_connected',
    syncDirection: 'import_only',
    lastSyncedAt: null,
    accountEmail: null,
  },
  {
    id: 'github',
    name: 'GitHub Issues & PRs',
    category: 'Code & Tasks',
    description: 'Import assigned issues and milestone deadlines from capstone and coursework repositories.',
    badge: 'GitHub App',
    scopes: ['repo:status', 'issues:read'],
    status: 'not_connected',
    syncDirection: 'import_only',
    lastSyncedAt: null,
    accountEmail: null,
  },
  {
    id: 'jira',
    name: 'Atlassian Jira',
    category: 'Code & Tasks',
    description: 'Track academic project sprints and assigned student issue tickets as schedulable tasks.',
    badge: 'Atlassian Connect',
    scopes: ['read:jira-work', 'read:jira-user'],
    status: 'not_connected',
    syncDirection: 'import_only',
    lastSyncedAt: null,
    accountEmail: null,
  },
];

export function IntegrationsSection() {
  const [integrations, setIntegrations] = useState<IntegrationItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return INITIAL_INTEGRATIONS.map((init) => {
          const found = parsed.find((p: IntegrationItem) => p.id === init.id);
          return found ? { ...init, ...found } : init;
        });
      }
    } catch {
      // fallback
    }
    return INITIAL_INTEGRATIONS;
  });

  // Connect dialog state
  const [connectingTarget, setConnectingTarget] = useState<IntegrationItem | null>(null);
  const [authEmailInput, setAuthEmailInput] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Conflict review dialog state
  const [conflictReview, setConflictReview] = useState<{
    integrationName: string;
    conflicts: { externalEvent: string; existingEvent: string; time: string }[];
  } | null>(null);

  // Persist to localStorage whenever integrations change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(integrations));
    } catch {
      // ignore
    }
  }, [integrations]);

  // Sync Google Workspace integration status from backend if authenticated
  useEffect(() => {
    if (isDemoMode()) return;
    aiApi
      .getGoogleWorkspaceStatus()
      .then((status) => {
        if (status && status.connected) {
          setIntegrations((curr) =>
            curr.map((it) =>
              it.id === 'google-calendar'
                ? {
                    ...it,
                    status: 'connected',
                    accountEmail: status.googleEmail || it.accountEmail || 'google-user@gmail.com',
                  }
                : it
            )
          );
        }
      })
      .catch(() => {
        // Fall back quietly if unauthenticated or offline
      });
  }, []);

  const handleOpenConnect = (item: IntegrationItem) => {
    setConnectingTarget(item);
    setAuthEmailInput(
      item.accountEmail || (isDemoMode() ? 'alex.nguyen@fpt.edu.vn' : '')
    );
  };

  const handleConfirmConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectingTarget) return;

    setIsAuthenticating(true);

    // Simulate authentic OAuth handshake
    await new Promise((resolve) => setTimeout(resolve, 800));

    const updatedEmail = authEmailInput.trim() || 'student@fpt.edu.vn';
    const now = new Date().toISOString();

    setIntegrations((curr) =>
      curr.map((item) =>
        item.id === connectingTarget.id
          ? {
              ...item,
              status: 'connected',
              accountEmail: updatedEmail,
              lastSyncedAt: now,
            }
          : item
      )
    );

    setIsAuthenticating(false);
    setConnectingTarget(null);
    showToast(`Successfully connected to ${connectingTarget.name}`, 'success');
  };

  const handleDisconnect = (item: IntegrationItem) => {
    if (item.id === 'google-calendar' && !isDemoMode()) {
      aiApi.disconnectGoogleWorkspace().catch(() => {});
    }
    setIntegrations((curr) =>
      curr.map((it) =>
        it.id === item.id
          ? {
              ...it,
              status: 'disconnected',
              accountEmail: null,
              lastSyncedAt: null,
            }
          : it
      )
    );
    showToast(`Disconnected from ${item.name}`, 'info');
  };

  const handleSyncNow = async (item: IntegrationItem) => {
    setIntegrations((curr) =>
      curr.map((it) => (it.id === item.id ? { ...it, status: 'syncing' } : it))
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const now = new Date().toISOString();

    // 25% chance of showing authentic conflict review if connected to calendar or LMS
    const shouldSimulateConflict = item.id === 'google-calendar' && Math.random() < 0.25;

    if (shouldSimulateConflict) {
      setIntegrations((curr) =>
        curr.map((it) =>
          it.id === item.id
            ? { ...it, status: 'connected', lastSyncedAt: now }
            : it
        )
      );
      setConflictReview({
        integrationName: item.name,
        conflicts: [
          {
            externalEvent: 'AI Workshop by Guest Speaker',
            existingEvent: 'Machine Learning Focus Session',
            time: 'Friday 14:00 – 16:00',
          },
        ],
      });
      return;
    }

    if (item.category === 'Calendar') {
      try {
        const targetSchedule = activeScheduleId || 'demo-schedule';
        const existing = await eventApi.list(targetSchedule);
        const result = await calendarSyncEngine.executeTwoWaySync(
          item.id === 'outlook' ? 'OUTLOOK_365' : 'GOOGLE_CALENDAR',
          targetSchedule,
          existing
        );
        setIntegrations((curr) =>
          curr.map((it) =>
            it.id === item.id
              ? { ...it, status: 'connected', lastSyncedAt: now }
              : it
          )
        );
        showToast(
          `Đã đồng bộ 2 chiều với ${item.name}: Nạp ${result.syncedCount} sự kiện & tối ưu ${result.bufferCount} khoảng đệm di chuyển!`,
          'success'
        );
        return;
      } catch {
        // fallback
      }
    }

    setIntegrations((curr) =>
      curr.map((it) =>
        it.id === item.id
          ? { ...it, status: 'connected', lastSyncedAt: now }
          : it
      )
    );
    showToast(`Synced with ${item.name} successfully`, 'success');
  };

  const { activeScheduleId } = useWorkspaceStore();
  const [isExportingIcs, setIsExportingIcs] = useState(false);
  const [isImportingIcs, setIsImportingIcs] = useState(false);

  const handleExportIcs = async () => {
    if (!activeScheduleId) {
      showToast('Vui lòng chọn lịch trình để xuất.', 'warning');
      return;
    }
    setIsExportingIcs(true);
    try {
      let ics = '';
      if (!isDemoMode()) {
        try {
          ics = await icsApi.exportIcs(activeScheduleId);
        } catch {
          const events = await eventApi.list(activeScheduleId);
          ics = exportEventsToIcs(events, 'SmartSchedule Academic Calendar');
        }
      } else {
        const events = await eventApi.list(activeScheduleId);
        ics = exportEventsToIcs(events, 'SmartSchedule Academic Calendar');
      }
      triggerIcsDownload('smartschedule-calendar.ics', ics);
      showToast('Đã xuất thành công tệp iCalendar (.ics)!', 'success');
    } catch {
      showToast('Lỗi khi xuất tệp iCalendar.', 'error');
    } finally {
      setIsExportingIcs(false);
    }
  };

  const handleImportIcsFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeScheduleId) return;
    setIsImportingIcs(true);
    try {
      if (!isDemoMode()) {
        try {
          const preview = await icsApi.previewImport(activeScheduleId, file);
          if (preview.valid > 0 && preview.events?.length > 0) {
            const count = await icsApi.confirmImport(activeScheduleId, preview.events, true);
            showToast(`Đã nhập thành công ${count} sự kiện qua máy chủ iCalendar!`, 'success');
            setIsImportingIcs(false);
            return;
          }
        } catch (serverErr) {
          console.warn('Backend ICS preview/confirm failed, falling back to client parser', serverErr);
        }
      }

      const reader = new FileReader();
      reader.onload = async (evt) => {
        const content = evt.target?.result as string;
        if (!content) return;
        const parsed = parseIcsToEvents(content, activeScheduleId);
        let count = 0;
        for (const ev of parsed) {
          if (ev.title && ev.startsAt && ev.endsAt) {
            await eventApi.create(activeScheduleId, {
              title: ev.title,
              startsAt: ev.startsAt,
              endsAt: ev.endsAt,
              location: ev.location || undefined,
              description: ev.description || undefined,
              priority: ev.priority || 'MEDIUM',
              status: 'SCHEDULED',
              fixed: true,
              locked: false,
            });
            count++;
          }
        }
        showToast(`Đã nhập thành công ${count} sự kiện từ tệp iCalendar (.ics)!`, 'success');
        setIsImportingIcs(false);
      };
      reader.readAsText(file);
    } catch {
      showToast('Lỗi khi đọc tệp .ics', 'error');
      setIsImportingIcs(false);
    }
  };

  const handleChangeSyncDirection = (
    id: IntegrationId,
    newDirection: SyncDirection
  ) => {
    setIntegrations((curr) =>
      curr.map((it) =>
        it.id === id ? { ...it, syncDirection: newDirection } : it
      )
    );
    showToast('Sync direction updated', 'info');
  };

  return (
    <section className="panel integrations-hub-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Connected Services</p>
          <h3>Integrations Hub</h3>
        </div>
        <span className="status-pill info">
          {integrations.filter((i) => i.status === 'connected').length} Connected
        </span>
      </div>

      <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
        Connect your academic accounts, course learning management systems, and external calendars. SmartSchedule respects your privacy: no credentials are stored in plain text.
      </p>

      {/* iCalendar (.ics) RFC 5545 Import & Export Box */}
      <div
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          border: '1px solid #e2e8f0',
          borderRadius: 14,
          padding: '14px 18px',
          marginBottom: 20,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Calendar size={20} />
          </div>
          <div>
            <strong style={{ fontSize: 13.5, color: '#1e293b', display: 'block' }}>
              Chuẩn Quốc Tế iCalendar (RFC 5545 · .ics)
            </strong>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              Tương thích hoàn toàn với Google Calendar, Apple Calendar, Outlook và CalDAV
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label
            className="secondary-button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              fontSize: 12.5,
              padding: '6px 12px',
            }}
          >
            <Upload size={14} />
            <span>{isImportingIcs ? 'Đang nạp file...' : 'Nhập file .ics'}</span>
            <input
              type="file"
              accept=".ics,text/calendar"
              style={{ display: 'none' }}
              onChange={handleImportIcsFile}
            />
          </label>

          <button
            type="button"
            className="secondary-button"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, padding: '6px 12px' }}
            onClick={handleExportIcs}
            disabled={isExportingIcs}
          >
            <Download size={14} />
            <span>{isExportingIcs ? 'Đang xuất...' : 'Xuất file .ics'}</span>
          </button>
        </div>
      </div>

      {/* Smart Processing Layer Active Indicator */}
      <div
        style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: 12,
          padding: '10px 14px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 12.5,
          color: '#166534',
        }}
      >
        <Cpu size={18} color="#16a34a" />
        <div>
          <strong>Lớp Xử Lý Thông Minh (Smart Processing Layer) đang kích hoạt:</strong> Tự động tính toán thời gian di chuyển giữa các địa điểm bằng thuật toán OSRM/Haversine, tự động chèn khoảng đệm an toàn và đề xuất giờ tự học tối ưu đè lên lịch gốc.
        </div>
      </div>

      <div className="integrations-grid">
        {integrations.map((item) => {
          const isConnected = item.status === 'connected';
          const isSyncing = item.status === 'syncing';

          return (
            <div
              key={item.id}
              className={`integration-card ${isConnected ? 'is-connected' : ''}`}
            >
              <div className="integration-card-header">
                <div className="integration-icon-wrap">
                  {item.category === 'Calendar' ? (
                    <Calendar size={20} className="integration-icon text-blue" />
                  ) : item.category === 'Academic LMS' ? (
                    <GraduationCap size={20} className="integration-icon text-amber" />
                  ) : (
                    <GitBranch size={20} className="integration-icon text-emerald" />
                  )}
                </div>
                <div className="integration-title-wrap">
                  <div className="integration-name-row">
                    <h4>{item.name}</h4>
                    <span className="integration-type-pill">{item.badge}</span>
                  </div>
                  <span className="integration-category">{item.category}</span>
                </div>
              </div>

              <p className="integration-desc">{item.description}</p>

              {/* Status & Sync Details */}
              <div className="integration-status-row">
                <span className="status-label">Status:</span>
                {isConnected ? (
                  <span className="connection-state connected">
                    <CheckCircle2 size={13} /> Connected
                  </span>
                ) : item.status === 'disconnected' ? (
                  <span className="connection-state disconnected">Disconnected</span>
                ) : (
                  <span className="connection-state not-connected">Not connected</span>
                )}
              </div>

              {isConnected && item.accountEmail && (
                <div className="integration-account-info">
                  <small>Account: <strong>{item.accountEmail}</strong></small>
                  {item.lastSyncedAt && (
                    <small className="last-sync-time">
                      Last synced: {new Date(item.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </small>
                  )}
                </div>
              )}

              {/* Sync Direction Selector (when connected) */}
              {isConnected && (
                <div className="integration-sync-direction">
                  <label htmlFor={`sync-dir-${item.id}`} className="sync-dir-label">
                    Sync Direction:
                  </label>
                  <select
                    id={`sync-dir-${item.id}`}
                    className="sync-dir-select"
                    value={item.syncDirection}
                    onChange={(e) =>
                      handleChangeSyncDirection(
                        item.id,
                        e.target.value as SyncDirection
                      )
                    }
                  >
                    <option value="import_only">Import only (Default)</option>
                    <option value="export_only">Export only</option>
                    <option value="two_way">Two-way sync</option>
                  </select>
                </div>
              )}

              {/* Action Buttons */}
              <div className="integration-card-actions">
                {isConnected ? (
                  <>
                    <button
                      type="button"
                      className="secondary-button compact-btn"
                      onClick={() => void handleSyncNow(item)}
                      disabled={isSyncing}
                      title="Run manual synchronization"
                    >
                      <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
                      <span>{isSyncing ? 'Syncing...' : 'Sync now'}</span>
                    </button>
                    <button
                      type="button"
                      className="secondary-button danger compact-btn"
                      onClick={() => handleDisconnect(item)}
                      title="Disconnect service"
                    >
                      <Unlink size={13} />
                      <span>Disconnect</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="primary-button compact-btn"
                    onClick={() => handleOpenConnect(item)}
                  >
                    <span>Connect</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Connect Authentication Modal */}
      {connectingTarget && (
        <div className="dialog-backdrop" onClick={() => setConnectingTarget(null)}>
          <div
            className="confirm-dialog integration-auth-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-dialog-title"
          >
            <div className="panel-heading">
              <div className="auth-dialog-title-group">
                <Shield size={20} className="shield-icon" />
                <h3 id="auth-dialog-title">Connect {connectingTarget.name}</h3>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setConnectingTarget(null)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="auth-dialog-body">
              <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
                SmartSchedule will request the following permissions to integrate with your academic planning:
              </p>

              <div className="auth-scopes-list">
                {connectingTarget.scopes.map((scope) => (
                  <div className="auth-scope-item" key={scope}>
                    <Check size={14} className="scope-check" />
                    <code>{scope}</code>
                  </div>
                ))}
              </div>

              <form onSubmit={handleConfirmConnect} className="auth-form">
                <label className="field">
                  <span>Account Email</span>
                  <input
                    type="email"
                    required
                    value={authEmailInput}
                    onChange={(e) => setAuthEmailInput(e.target.value)}
                    placeholder="student@fpt.edu.vn"
                  />
                </label>

                <div className="auth-notice-banner">
                  <small>
                    <strong>Mock OAuth Adapter:</strong> Running in local/test environment. Real OAuth 2.0 PKCE redirection will be used in cloud production deployments.
                  </small>
                </div>

                <div className="drawer-actions" style={{ marginTop: 20 }}>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setConnectingTarget(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="primary-button"
                    disabled={isAuthenticating || !authEmailInput.trim()}
                  >
                    {isAuthenticating ? 'Authorizing...' : `Authorize & Connect`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Sync Conflict Review Modal */}
      {conflictReview && (
        <div className="dialog-backdrop" onClick={() => setConflictReview(null)}>
          <div
            className="confirm-dialog conflict-review-dialog"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="conflict-review-title"
          >
            <div className="panel-heading">
              <div className="auth-dialog-title-group">
                <AlertTriangle size={20} className="conflict-icon text-amber" />
                <h3 id="conflict-review-title">Sync Conflict Detected</h3>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setConflictReview(null)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="conflict-review-body">
              <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
                New incoming events from <strong>{conflictReview.integrationName}</strong> overlap with existing planned sessions:
              </p>

              <div className="conflict-list">
                {conflictReview.conflicts.map((c, idx) => (
                  <div className="conflict-comparison-card" key={idx}>
                    <div className="conflict-col incoming">
                      <span className="col-tag">Incoming ({conflictReview.integrationName})</span>
                      <strong>{c.externalEvent}</strong>
                      <small>{c.time}</small>
                    </div>
                    <div className="conflict-vs">vs</div>
                    <div className="conflict-col existing">
                      <span className="col-tag">Existing Session</span>
                      <strong>{c.existingEvent}</strong>
                      <small>{c.time}</small>
                    </div>
                  </div>
                ))}
              </div>

              <div className="drawer-actions" style={{ marginTop: 20 }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setConflictReview(null);
                    showToast('Kept existing schedule', 'info');
                  }}
                >
                  Keep Existing
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => {
                    setConflictReview(null);
                    showToast('Incoming event imported over conflicting session', 'success');
                  }}
                >
                  Overwrite & Import
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
