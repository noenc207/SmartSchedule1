import React, { useState, useEffect } from 'react';
import { SmartConnectionExperience } from './SmartConnectionExperience';
import { getRawApiUrl } from '../../services/apiClient';
import './smartConnection.css';

export interface WorkspaceLoadingProps {
  title?: string;
  defaultSubtitle?: string;
  allowBypassToLogin?: boolean;
}

export function WorkspaceLoading({
  title = 'Đang khởi tạo không gian làm việc',
  defaultSubtitle = 'Đang kiểm tra chứng chỉ bảo mật và đồng bộ phiên đăng nhập…',
  allowBypassToLogin = true,
}: WorkspaceLoadingProps) {
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getPhaseInfo = () => {
    if (elapsedSec < 3) {
      return {
        status: 'CONNECTING' as const,
        phaseTitle: title,
        phaseSubtitle: defaultSubtitle,
        badgeText: `KHỞI TẠO · ${elapsedSec}s`,
      };
    }
    if (elapsedSec < 8) {
      return {
        status: 'CONNECTING' as const,
        phaseTitle: 'Đang kết nối cổng dịch vụ máy chủ',
        phaseSubtitle: 'Đang gửi gói tin kiểm tra phiên làm việc đến SmartSchedule Cloud…',
        badgeText: `KẾT NỐI · ${elapsedSec}s`,
      };
    }
    return {
      status: 'SLOW' as const,
      phaseTitle: 'Máy chủ đang khởi động lại (Cold Start)',
      phaseSubtitle:
        'Hệ thống cloud đang kích hoạt container dịch vụ sau thời gian nghỉ. Vui lòng giữ nguyên trang, không cần thao tác lại…',
      badgeText: `COLD START · ${elapsedSec}s`,
    };
  };

  const phase = getPhaseInfo();

  return (
    <div
      className="smart-variant-fullscreen"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        minHeight: '100vh',
      }}
      role="status"
      aria-live="polite"
    >
      <div style={{ maxWidth: 460, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <span
            style={{
              display: 'inline-block',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#ea580c',
              background: '#fff7ed',
              border: '1px solid #fed7aa',
              padding: '4px 14px',
              borderRadius: '9999px',
              marginBottom: '12px',
            }}
          >
            FPT University Quy Nhơn · AI Campus
          </span>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            SmartSchedule Workspace
          </h2>
        </div>

        <SmartConnectionExperience
          variant="card"
          status={phase.status}
          title={phase.phaseTitle}
          subtitle={phase.phaseSubtitle}
          targetUrl={getRawApiUrl()}
          showConfigAction={elapsedSec >= 8}
          onRetry={() => window.location.reload()}
        />

        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: '12px',
              color: '#64748b',
              fontWeight: 500,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: elapsedSec > 8 ? '#f97316' : '#22c55e',
                display: 'inline-block',
              }}
            />
            <span>Thời gian đã chờ: <strong>{elapsedSec}s</strong></span>
          </div>

          {elapsedSec >= 15 && allowBypassToLogin && (
            <div style={{ marginTop: 8 }}>
              <a
                href="/login"
                style={{
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#ea580c',
                  textDecoration: 'none',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: '1px solid #fed7aa',
                  background: '#fff7ed',
                  display: 'inline-block',
                }}
              >
                Chuyển thẳng đến trang Đăng nhập →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
