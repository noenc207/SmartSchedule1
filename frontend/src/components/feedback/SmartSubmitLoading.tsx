import React, { useEffect, useState, useRef } from 'react';

export interface SmartSubmitLoadingProps {
  isSubmitting: boolean;
  mode?: 'login' | 'register' | 'oauth' | 'custom';
  customTitle?: string;
  className?: string;
}

/**
 * SmartSubmitLoading — Multi-stage loading & cold-start UX for Auth forms
 *
 * Staged UX:
 * 0s - 3s:   "Submitting request to academic server…"
 * 3s - 8s:   "Waiting for server response…"
 * > 8s:      "Server instance responding slower than usual (cloud cold start in progress). Please stay on this page…"
 *
 * Zero-Icon Compliance:
 * Strict Zero-Icon Policy. 100% typography, real-time elapsed timer, and CSS shimmer line.
 */
export function SmartSubmitLoading({
  isSubmitting,
  mode = 'login',
  customTitle,
  className = '',
}: SmartSubmitLoadingProps) {
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (!isSubmitting) {
      setElapsed(0);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    startRef.current = Date.now();
    setElapsed(0);

    timerRef.current = window.setInterval(() => {
      const now = Date.now();
      const seconds = Math.floor((now - startRef.current) / 1000);
      setElapsed(seconds);
    }, 500);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isSubmitting]);

  if (!isSubmitting) return null;

  const getStageMessage = () => {
    if (elapsed < 3) {
      if (mode === 'register') {
        return {
          title: 'Đang gửi hồ sơ đăng ký tài khoản…',
          hint: 'Đang gửi dữ liệu đến máy chủ SmartSchedule',
          status: 'SENDING',
        };
      }
      if (mode === 'oauth') {
        return {
          title: 'Đang gửi thông tin xác thực mạng xã hội…',
          hint: 'Đang thiết lập phiên đăng nhập an toàn',
          status: 'SENDING',
        };
      }
      return {
        title: customTitle || 'Đang gửi yêu cầu đăng nhập…',
        hint: 'Đang xác thực thông tin tài khoản FPT University',
        status: 'SENDING',
      };
    }

    if (elapsed < 8) {
      return {
        title: 'Đang chờ máy chủ phản hồi…',
        hint: 'Hệ thống đang kiểm tra danh tính và cấp phiên làm việc',
        status: 'PROCESSING',
      };
    }

    return {
      title: 'Máy chủ phản hồi chậm hơn bình thường…',
      hint: 'Máy chủ Cloud có thể đang khởi động (Cold Start ~20-30s). Vui lòng giữ nguyên trang.',
      status: 'COLD_START',
    };
  };

  const stage = getStageMessage();

  return (
    <div
      className={`smart-submit-loading-card ${elapsed >= 8 ? 'smart-submit-coldstart' : ''} ${className}`}
      role="status"
      aria-live="polite"
      style={{
        marginTop: '12px',
        padding: '12px 14px',
        borderRadius: '10px',
        background: elapsed >= 8 ? '#fefce8' : '#fff7ed',
        border: `1px solid ${elapsed >= 8 ? '#fef08a' : '#fed7aa'}`,
        transition: 'all 0.3s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: elapsed >= 8 ? '#eab308' : '#ea580c',
              animation: 'smart-pulse 1.2s infinite',
            }}
          />
          <span
            style={{
              fontSize: '10.5px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: elapsed >= 8 ? '#854d0e' : '#9a3412',
            }}
          >
            {stage.status}
          </span>
        </div>

        <span
          style={{
            fontSize: '11px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontWeight: 700,
            color: elapsed >= 8 ? '#a16207' : '#ea580c',
            background: 'rgba(255, 255, 255, 0.7)',
            padding: '2px 8px',
            borderRadius: '9999px',
            border: '1px solid rgba(234, 88, 12, 0.2)',
          }}
        >
          {elapsed}s
        </span>
      </div>

      <div style={{ marginTop: '6px' }}>
        <div
          style={{
            fontSize: '12.5px',
            fontWeight: 700,
            color: elapsed >= 8 ? '#713f12' : '#0f172a',
          }}
        >
          {stage.title}
        </div>
        <div
          style={{
            fontSize: '11.5px',
            lineHeight: 1.45,
            marginTop: '2px',
            color: elapsed >= 8 ? '#854d0e' : '#64748b',
          }}
        >
          {stage.hint}
        </div>
      </div>

      {/* Indefinite Light-Sweep Animation Bar (Zero-Icon, No Fake % Progress) */}
      <div
        style={{
          marginTop: '8px',
          height: '3px',
          width: '100%',
          backgroundColor: elapsed >= 8 ? 'rgba(234, 179, 8, 0.2)' : 'rgba(234, 88, 12, 0.15)',
          borderRadius: '9999px',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              elapsed >= 8
                ? 'linear-gradient(90deg, transparent, #eab308, transparent)'
                : 'linear-gradient(90deg, transparent, #ea580c, #fbbf24, transparent)',
            animation: 'smart-sweep 1.8s infinite linear',
          }}
        />
      </div>
    </div>
  );
}
