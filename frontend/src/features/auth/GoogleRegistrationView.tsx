import React, { useState } from 'react';
import { Check, ShieldCheck } from 'lucide-react';

interface GoogleRegistrationViewProps {
  email: string;
  displayName?: string;
  avatarUrl?: string;
  isLoading: boolean;
  error: string | null;
  onSubmit: (registrationKey: string) => void;
  onBack: () => void;
}

export function GoogleRegistrationView({
  email,
  displayName,
  avatarUrl,
  isLoading,
  error,
  onSubmit,
  onBack,
}: GoogleRegistrationViewProps) {
  const [key, setKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim() || isLoading) return;
    onSubmit(key.trim());
  };

  return (
    <div className="google-register-view">
      <div className="google-account-banner">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="google-account-avatar" />
        ) : (
          <div className="google-account-avatar-placeholder">
            {email ? email.charAt(0).toUpperCase() : 'G'}
          </div>
        )}
        <div className="google-account-info">
          <span className="google-account-label">Google account:</span>
          <div className="google-account-email-row">
            <span className="google-account-email">{email}</span>
            <span className="google-verified-badge" title="Google verified identity">
              <Check size={12} strokeWidth={3} />
            </span>
          </div>
          {displayName && displayName !== email && (
            <span className="google-account-name">{displayName}</span>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="google-register-form">
        <div className="field">
          <label htmlFor="reg-key-input">
            <span>Registration Key</span>
          </label>
          <div className="password-field">
            <input
              id="reg-key-input"
              type="text"
              autoComplete="off"
              placeholder="Nhập Registration Key của bạn"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              disabled={isLoading}
              autoFocus
            />
          </div>
          <div className="google-notice-box">
            <ShieldCheck size={14} className="notice-icon" />
            <span>Registration Key is required only for your first registration.</span>
          </div>
        </div>

        {error && <div className="form-error" role="alert">{error}</div>}

        <button
          type="submit"
          className="primary-button auth-submit"
          disabled={!key.trim() || isLoading}
        >
          {isLoading ? 'Đang tạo tài khoản…' : 'Create account'}
        </button>

        <button
          type="button"
          className="back-to-login-link"
          onClick={onBack}
          disabled={isLoading}
        >
          ← Quay lại đăng nhập
        </button>
      </form>
    </div>
  );
}
