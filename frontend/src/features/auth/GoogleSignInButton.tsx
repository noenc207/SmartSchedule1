import { useState } from 'react';
import { Mail, Sparkles, X } from 'lucide-react';

interface GoogleSignInButtonProps {
  onTokenReceived: (idToken: string) => void;
  isLoading?: boolean;
}

export function GoogleSignInButton({ onTokenReceived, isLoading }: GoogleSignInButtonProps) {
  const [showDevPicker, setShowDevPicker] = useState(false);
  const [customEmail, setCustomEmail] = useState('');

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const handleClick = () => {
    // If real Google Identity Services is available and configured:
    if (clientId && typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
      const google = (window as any).google;
      google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: { credential: string }) => {
          if (response?.credential) {
            onTokenReceived(response.credential);
          }
        },
      });
      google.accounts.id.prompt();
      return;
    }

    // In dev / test / non-GIS environment: show interactive Google account picker
    setShowDevPicker(true);
  };

  const handleSelectMockAccount = (email: string, name: string) => {
    setShowDevPicker(false);
    const sub = 'google-sub-' + Math.abs(hashCode(email));
    const token = `mock-google-token:${sub}:${email}:${name}:https://lh3.googleusercontent.com/a/default`;
    onTokenReceived(token);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim()) return;
    const email = customEmail.trim().toLowerCase();
    const name = email.split('@')[0];
    handleSelectMockAccount(email, name);
  };

  return (
    <>
      <button
        type="button"
        className="google-sign-in-btn"
        onClick={handleClick}
        disabled={isLoading}
      >
        <svg className="google-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
        <span>{isLoading ? 'Connecting to Google…' : 'Continue with Google'}</span>
      </button>

      {/* Dev / Quick Test Account Modal when GIS is not configured */}
      {showDevPicker && (
        <div className="google-modal-backdrop" role="dialog" aria-modal="true">
          <div className="google-modal-card">
            <div className="google-modal-header">
              <div className="google-modal-badge" style={{ background: '#e8f0fe', color: '#1a73e8' }}>
                <Sparkles size={20} />
              </div>
              <button
                type="button"
                className="google-modal-close"
                onClick={() => setShowDevPicker(false)}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            <div className="google-modal-copy">
              <h2>Sign in with Google</h2>
              <p className="google-modal-subtitle">
                Choose an account to continue to SmartSchedule
              </p>
            </div>

            <div className="google-account-list">
              <button
                type="button"
                className="google-account-option"
                onClick={() => handleSelectMockAccount('alex.nguyen@fpt.edu.vn', 'Alex Nguyen')}
              >
                <div className="google-account-avatar">A</div>
                <div className="google-account-text">
                  <strong>Alex Nguyen</strong>
                  <span>alex.nguyen@fpt.edu.vn</span>
                </div>
              </button>

              <button
                type="button"
                className="google-account-option"
                onClick={() => handleSelectMockAccount('nhi.vn@fpt.edu.vn', 'Vũ Ngọc Nhi')}
              >
                <div className="google-account-avatar" style={{ background: '#fce8e6', color: '#c5221f' }}>N</div>
                <div className="google-account-text">
                  <strong>Vũ Ngọc Nhi</strong>
                  <span>nhi.vn@fpt.edu.vn</span>
                </div>
              </button>
            </div>

            <form onSubmit={handleCustomSubmit} className="google-custom-email-form">
              <div className="field">
                <label htmlFor="custom-google-email">
                  <span>Hoặc nhập tài khoản Google / Gmail khác:</span>
                </label>
                <div className="password-field">
                  <input
                    id="custom-google-email"
                    type="email"
                    placeholder="example@gmail.com"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                  />
                </div>
              </div>
              <button
                type="submit"
                className="secondary-button"
                style={{ width: '100%', marginTop: '8px' }}
                disabled={!customEmail.trim()}
              >
                <Mail size={15} style={{ marginRight: '6px' }} />
                Tiếp tục với email này
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
}
