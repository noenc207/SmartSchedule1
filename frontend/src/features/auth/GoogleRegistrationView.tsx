import React, { useState } from 'react';
import type { SocialProvider } from '../../types/auth';

export interface SocialRegistrationViewProps {
  provider?: SocialProvider | string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  isLoading: boolean;
  error: string | null;
  onSubmit: (registrationKey: string) => void;
  onBack: () => void;
}

/**
 * Social Registration View — Zero-Icon Minimal Academic SaaS
 * Enforces registration key requirement for first-time social sign-ups with zero icon usage.
 */
export function SocialRegistrationView({
  provider = 'GOOGLE',
  email,
  displayName,
  avatarUrl,
  isLoading,
  error,
  onSubmit,
  onBack,
}: SocialRegistrationViewProps) {
  const [key, setKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim() || isLoading) return;
    onSubmit(key.trim());
  };

  const normalizedProvider = (provider || 'GOOGLE').toUpperCase();
  const providerLabel =
    normalizedProvider === 'GITHUB'
      ? 'GitHub'
      : normalizedProvider === 'FACEBOOK'
      ? 'Facebook'
      : 'Google';

  const defaultInitial =
    normalizedProvider === 'GITHUB'
      ? 'GH'
      : normalizedProvider === 'FACEBOOK'
      ? 'FB'
      : 'G';

  return (
    <div className="login-form">
      <div className="social-identity-card">
        <div className="social-identity-header">
          <span className="social-identity-tag">{providerLabel}</span>
          <span className="social-verified-tag">Verified Identity</span>
        </div>

        <div className="social-identity-body">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="social-identity-avatar" />
          ) : (
            <div className="social-identity-avatar-placeholder">
              {email ? email.charAt(0).toUpperCase() : defaultInitial}
            </div>
          )}
          <div className="social-identity-meta">
            {displayName && displayName !== email && (
              <strong className="social-identity-name">{displayName}</strong>
            )}
            <span className="social-identity-email">{email}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="login-form" noValidate>
        <div className="login-field">
          <label htmlFor="reg-key-input" className="login-label">
            Registration Key
          </label>
          <input
            id="reg-key-input"
            type="text"
            autoComplete="off"
            placeholder="Enter your academic registration key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            disabled={isLoading}
            className="login-input"
            autoFocus
          />
          <div className="academic-notice-box">
            <span className="academic-notice-title">Notice</span>
            <span>Registration Key is required only once when creating your account. Subsequent sign-ins with {providerLabel} do not require it.</span>
          </div>
        </div>

        {error && (
          <div className="login-error-alert" role="alert">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="login-submit-btn"
          disabled={!key.trim() || isLoading}
        >
          {isLoading ? 'Creating account…' : 'Complete Registration'}
        </button>

        <button
          type="button"
          className="login-back-btn"
          onClick={onBack}
          disabled={isLoading}
        >
          Back to sign in
        </button>
      </form>
    </div>
  );
}

// Backward-compatibility alias
export const GoogleRegistrationView = SocialRegistrationView;
export type GoogleRegistrationViewProps = SocialRegistrationViewProps;
