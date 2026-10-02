import React, { useState } from 'react';
import { KeyRound, ShieldCheck, X } from 'lucide-react';

interface GoogleRegistrationModalProps {
  isOpen: boolean;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  isLoading: boolean;
  error: string | null;
  onSubmit: (registrationKey: string) => void;
  onClose: () => void;
}

export function GoogleRegistrationModal({
  isOpen,
  email,
  displayName,
  avatarUrl,
  isLoading,
  error,
  onSubmit,
  onClose,
}: GoogleRegistrationModalProps) {
  const [key, setKey] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim() || isLoading) return;
    onSubmit(key.trim());
  };

  return (
    <div className="google-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="google-modal-title">
      <div className="google-modal-card">
        <div className="google-modal-header">
          <div className="google-modal-badge">
            <KeyRound size={20} className="google-modal-badge-icon" />
          </div>
          <button
            type="button"
            className="google-modal-close"
            onClick={onClose}
            disabled={isLoading}
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        <div className="google-modal-copy">
          <h2 id="google-modal-title">Create your SmartSchedule account</h2>
          <p className="google-modal-subtitle">
            Registration Key is required only when creating your first account.
          </p>
        </div>

        <div className="google-account-summary">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="google-avatar-img" />
          ) : (
            <div className="google-avatar-placeholder">
              {email ? email.charAt(0).toUpperCase() : 'G'}
            </div>
          )}
          <div className="google-account-details">
            <span className="google-account-label">Google account:</span>
            <span className="google-account-email">{email}</span>
            {displayName && displayName !== email && (
              <span className="google-account-name">{displayName}</span>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="google-key-form">
          <div className="field">
            <label htmlFor="registration-key-input">
              <span>Registration Key</span>
            </label>
            <div className="password-field">
              <input
                id="registration-key-input"
                type="text"
                autoComplete="off"
                placeholder="Nhập Registration Key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                disabled={isLoading}
                autoFocus
              />
            </div>
            <div className="google-key-notice">
              <ShieldCheck size={14} className="notice-icon" />
              <span>Registration Key is required only when creating your first account.</span>
            </div>
          </div>

          {error && <div className="form-error" role="alert">{error}</div>}

          <div className="google-modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
              disabled={isLoading}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={!key.trim() || isLoading}
            >
              {isLoading ? 'Đang tạo tài khoản…' : 'Create account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
