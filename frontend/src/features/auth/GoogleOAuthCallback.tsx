import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { BrandLogo } from '../../components/BrandLogo';

export function GoogleOAuthCallback() {
  const navigate = useNavigate();
  const [statusMessage, setStatusMessage] = useState('Đang kết nối tài khoản Google…');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // 1. Extract params from URL hash (standard for response_type=id_token) or query string
    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.substring(1)
      : window.location.hash;
    const params = new URLSearchParams(hash || window.location.search);

    const idToken = params.get('id_token') || params.get('credential');
    const error = params.get('error');
    const errorDescription = params.get('error_description');

    // 2. If opened in a popup from SmartSchedule: communicate with opener and close window
    if (window.opener && !window.opener.closed) {
      try {
        window.opener.postMessage(
          {
            type: 'GOOGLE_OAUTH_RESPONSE',
            idToken: idToken || null,
            error: error ? (errorDescription ? `${error}: ${errorDescription}` : error) : null,
          },
          window.location.origin
        );
        window.close();
        return;
      } catch (err) {
        console.warn('Failed to send postMessage to opener:', err);
      }
    }

    // 3. If running in full-window redirect mode
    if (error) {
      setErrorMessage(`Đăng nhập Google không thành công: ${errorDescription || error}`);
      setTimeout(() => {
        navigate('/login', {
          replace: true,
          state: { error: `Google sign-in error: ${errorDescription || error}` },
        });
      }, 2000);
      return;
    }

    if (!idToken) {
      setErrorMessage('Không nhận được token xác thực từ Google. Đang quay lại trang đăng nhập…');
      setTimeout(() => navigate('/login', { replace: true }), 2000);
      return;
    }

    setStatusMessage('Đang hoàn tất xác thực với SmartSchedule…');

    // Exchange Google token with backend
    void (async () => {
      try {
        const res = await useAuthStore.getState().googleAuth({ idToken });
        if (res.status === 'AUTHENTICATED') {
          navigate('/dashboard', { replace: true });
        } else if (res.status === 'KEY_REQUIRED') {
          // Transition new Google user to enter Registration Key
          navigate('/login', {
            replace: true,
            state: {
              pendingGoogleAuth: {
                idToken,
                email: res.email || '',
                displayName: res.displayName,
                avatarUrl: res.avatarUrl,
              },
            },
          });
        }
      } catch (authErr: any) {
        setErrorMessage(authErr?.message || 'Xác thực tài khoản Google thất bại.');
        setTimeout(() => {
          navigate('/login', {
            replace: true,
            state: { error: authErr?.message || 'Xác thực tài khoản Google thất bại.' },
          });
        }, 2000);
      }
    })();
  }, [navigate]);

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
            : 'Vui lòng giữ cửa sổ này trong khi SmartSchedule kiểm tra danh tính và thiết lập phiên của bạn.'}
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
