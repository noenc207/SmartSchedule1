import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { BrandLogo } from '../../components/BrandLogo';
import { SmartConnectionExperience } from '../../components/feedback/SmartConnectionExperience';
import type { SocialProvider } from '../../types/auth';

export interface SocialOAuthCallbackProps {
  defaultProvider?: SocialProvider;
}

export function SocialOAuthCallback({ defaultProvider }: SocialOAuthCallbackProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Infer provider from prop or current pathname
  const inferredProvider: SocialProvider = defaultProvider || (
    location.pathname.includes('/github')
      ? 'GITHUB'
      : location.pathname.includes('/facebook')
      ? 'FACEBOOK'
      : 'GOOGLE'
  );

  const providerLabel = inferredProvider === 'GITHUB'
    ? 'GitHub'
    : inferredProvider === 'FACEBOOK'
    ? 'Facebook'
    : 'Google';

  const [statusMessage, setStatusMessage] = useState(`Đang kết nối tài khoản ${providerLabel}…`);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // 1. Extract params from URL hash (standard for implicit id_token / access_token) or query string
    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.substring(1)
      : window.location.hash;
    const hashParams = new URLSearchParams(hash);
    const searchParams = new URLSearchParams(window.location.search);

    const idToken = hashParams.get('id_token') || searchParams.get('id_token') || hashParams.get('credential');
    const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
    const code = searchParams.get('code') || hashParams.get('code');
    const error = searchParams.get('error') || hashParams.get('error');
    const errorDescription = searchParams.get('error_description') || hashParams.get('error_description') || searchParams.get('error_reason');

    // 2. If opened in a popup from SmartSchedule: communicate with opener and close window
    if (window.opener && !window.opener.closed) {
      try {
        const errorDetails = error ? (errorDescription ? `${error}: ${errorDescription}` : error) : null;

        // Post generalized SOCIAL_OAUTH_RESPONSE
        window.opener.postMessage(
          {
            type: 'SOCIAL_OAUTH_RESPONSE',
            provider: inferredProvider,
            idToken: idToken || null,
            code: code || null,
            accessToken: accessToken || null,
            error: errorDetails,
          },
          '*'
        );

        // Also post legacy GOOGLE_OAUTH_RESPONSE if Google for backward compatibility
        if (inferredProvider === 'GOOGLE') {
          window.opener.postMessage(
            {
              type: 'GOOGLE_OAUTH_RESPONSE',
              idToken: idToken || null,
              error: errorDetails,
            },
            '*'
          );
        }

        window.close();
        return;
      } catch (err) {
        console.warn('Failed to send postMessage to opener:', err);
      }
    }

    // 3. If running in full-window redirect mode
    if (error) {
      setErrorMessage(`Đăng nhập ${providerLabel} không thành công: ${errorDescription || error}`);
      setTimeout(() => {
        navigate('/login', {
          replace: true,
          state: { error: `${providerLabel} sign-in error: ${errorDescription || error}` },
        });
      }, 2000);
      return;
    }

    const hasValidCredential = Boolean(idToken || code || accessToken);
    if (!hasValidCredential) {
      setErrorMessage(`Không nhận được thông tin xác thực từ ${providerLabel}. Đang quay lại trang đăng nhập…`);
      setTimeout(() => navigate('/login', { replace: true }), 2000);
      return;
    }

    setStatusMessage(`Đang hoàn tất xác thực với SmartSchedule…`);

    // Exchange credentials with backend
    void (async () => {
      try {
        let res: any;
        if (inferredProvider === 'GOOGLE' && idToken) {
          res = await useAuthStore.getState().googleAuth({ idToken });
        } else if (inferredProvider === 'GITHUB') {
          res = await useAuthStore.getState().githubAuth({ code: code || undefined, accessToken: accessToken || undefined });
        } else if (inferredProvider === 'FACEBOOK') {
          res = await useAuthStore.getState().facebookAuth({ accessToken: accessToken || undefined, code: code || undefined });
        } else {
          throw new Error('Unsupported authentication provider or missing credentials.');
        }

        if (res.status === 'AUTHENTICATED') {
          navigate('/dashboard', { replace: true });
        } else if (res.status === 'KEY_REQUIRED') {
          // Transition new user to enter Registration Key
          navigate('/login', {
            replace: true,
            state: {
              pendingSocialAuth: {
                provider: inferredProvider,
                idToken: idToken || undefined,
                code: code || undefined,
                accessToken: accessToken || undefined,
                email: res.email || '',
                displayName: res.displayName,
                avatarUrl: res.avatarUrl,
              },
              pendingGoogleAuth: inferredProvider === 'GOOGLE' ? {
                idToken,
                email: res.email || '',
                displayName: res.displayName,
                avatarUrl: res.avatarUrl,
              } : undefined,
            },
          });
        }
      } catch (authErr: any) {
        setErrorMessage(authErr?.message || `Xác thực tài khoản ${providerLabel} thất bại.`);
        setTimeout(() => {
          navigate('/login', {
            replace: true,
            state: { error: authErr?.message || `Xác thực tài khoản ${providerLabel} thất bại.` },
          });
        }, 2000);
      }
    })();
  }, [navigate, inferredProvider, providerLabel]);

  const connectionStatus = errorMessage ? 'FAILED' : elapsedSec > 8 ? 'SLOW' : 'CONNECTING';

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
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{ display: 'inline-flex', justifyContent: 'center', marginBottom: 12 }}>
            <BrandLogo />
          </div>
          <div>
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
                padding: '3px 12px',
                borderRadius: '9999px',
              }}
            >
              FPT University Quy Nhơn · AI Campus
            </span>
          </div>
        </div>

        <SmartConnectionExperience
          variant="card"
          status={connectionStatus}
          error={errorMessage}
          title={
            errorMessage
              ? `Lỗi xác thực ${providerLabel}`
              : elapsedSec > 8
              ? 'Máy chủ phản hồi chậm (Cold Start)'
              : statusMessage
          }
          subtitle={
            errorMessage
              ? errorMessage
              : elapsedSec > 8
              ? 'Hệ thống SmartSchedule Cloud đang khởi động container dịch vụ. Vui lòng giữ nguyên cửa sổ này…'
              : `Vui lòng giữ cửa sổ này trong khi SmartSchedule kiểm tra danh tính ${providerLabel} và thiết lập phiên học thuật của bạn.`
          }
          showConfigAction={Boolean(errorMessage)}
          onRetry={errorMessage ? () => navigate('/login', { replace: true }) : undefined}
        />

        {!errorMessage && (
          <div style={{ textAlign: 'center', marginTop: 14 }}>
            <span style={{ fontSize: '11.5px', color: '#64748b' }}>
              Thời gian xác thực: <strong>{elapsedSec}s</strong>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// Backward-compatibility export
export const GoogleOAuthCallback = SocialOAuthCallback;
