import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { BrandLogo } from '../../components/BrandLogo';
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

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        padding: '24px',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: 440,
          width: '100%',
          textAlign: 'center',
          padding: '36px 28px',
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        }}
      >
        <BrandLogo />
        <h2 style={{ marginTop: 20, fontSize: '1.25rem', fontWeight: 600, color: '#0f172a' }}>
          {errorMessage ? 'Lỗi xác thực' : statusMessage}
        </h2>
        <p style={{ marginTop: 8, fontSize: '0.875rem', color: errorMessage ? '#dc2626' : '#64748b' }}>
          {errorMessage
            ? errorMessage
            : `Vui lòng giữ cửa sổ này trong khi SmartSchedule kiểm tra danh tính ${providerLabel} và thiết lập phiên của bạn.`}
        </p>
        {!errorMessage && (
          <div
            style={{
              margin: '24px auto 0',
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: '3px solid #e2e8f0',
              borderTopColor: '#2563eb',
              animation: 'spin 0.8s linear infinite',
            }}
          />
        )}
      </div>
    </div>
  );
}

// Backward-compatibility export
export const GoogleOAuthCallback = SocialOAuthCallback;
