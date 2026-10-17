import React, { useState, useEffect } from 'react';
import { type ConnectionStatus, type HealthCheckResult } from '../../services/healthService';
import { getRawApiUrl, setCustomApiUrl, CUSTOM_API_URL_KEY } from '../../services/apiClient';
import './smartConnection.css';

export interface SmartConnectionExperienceProps {
  variant?: 'inline' | 'banner' | 'modal' | 'card' | 'fullscreen';
  status?: ConnectionStatus;
  latencyMs?: number | null;
  error?: string | null;
  targetUrl?: string;
  onRetry?: () => void;
  showConfigAction?: boolean;
  className?: string;
  title?: string;
  subtitle?: string;
}

/**
 * SmartConnectionExperience — SmartSchedule Academic SaaS Connection State
 *
 * Visual Style: Premium Academic SaaS × CSS Geometric Motion × FPTU Orange
 * Zero-Icon Compliance: 100% typography, geometric orbits, and status badges.
 */
export function SmartConnectionExperience({
  variant = 'inline',
  status = 'CHECKING',
  latencyMs = null,
  error = null,
  targetUrl,
  onRetry,
  showConfigAction = true,
  className = '',
  title,
  subtitle,
}: SmartConnectionExperienceProps) {
  const currentTarget = targetUrl || getRawApiUrl();
  const [showConfig, setShowConfig] = useState(false);
  const [customInput, setCustomInput] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(CUSTOM_API_URL_KEY) || '';
    }
    return '';
  });
  const [configError, setConfigError] = useState<string | null>(null);

  const getStatusBadge = () => {
    switch (status) {
      case 'CHECKING':
      case 'CONNECTING':
        return {
          label: 'INITIALIZING LINK',
          cls: 'smart-badge-connecting',
          detail: 'Connecting to academic cloud…',
        };
      case 'SLOW':
        return {
          label: 'SLOW RESPONSE',
          cls: 'smart-badge-slow',
          detail: 'Server instance spinning up (Render cold start). Please wait…',
        };
      case 'CONNECTED':
        return {
          label: latencyMs ? `ACTIVE · ${latencyMs}ms` : 'ACTIVE',
          cls: 'smart-badge-connected',
          detail: 'Backend server operational and synchronized.',
        };
      case 'FAILED':
        return {
          label: 'LINK OFFLINE',
          cls: 'smart-badge-failed',
          detail: error || 'Unable to establish contact with backend endpoint.',
        };
      default:
        return {
          label: 'STANDBY',
          cls: 'smart-badge-connecting',
          detail: 'Standing by for requests…',
        };
    }
  };

  const badge = getStatusBadge();

  const handleSaveConfig = () => {
    setConfigError(null);
    const trimmed = customInput.trim();
    if (!trimmed) {
      setConfigError('Please enter a valid backend URL.');
      return;
    }
    if (typeof window !== 'undefined' && trimmed.includes(window.location.hostname)) {
      setConfigError('This is the Frontend domain. Please enter your Backend Render URL.');
      return;
    }
    setCustomApiUrl(trimmed);
    if (onRetry) {
      onRetry();
    } else if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const handleResetConfig = () => {
    setCustomApiUrl(null);
    setCustomInput('');
    if (onRetry) {
      onRetry();
    } else if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const renderGeometricOrbit = () => (
    <div className="smart-orbit-visual" aria-hidden="true">
      <div className="smart-orbit-ring smart-orbit-ring-outer" />
      <div className="smart-orbit-ring smart-orbit-ring-middle" />
      <div className="smart-orbit-ring smart-orbit-ring-inner" />
      <div className="smart-orbit-node smart-orbit-node-1" />
      <div className="smart-orbit-node smart-orbit-node-2" />
      <div className="smart-orbit-core" />
    </div>
  );

  return (
    <div
      className={`smart-connection-container smart-variant-${variant} ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="smart-connection-content">
        {/* Geometric Motion Centerpiece */}
        {renderGeometricOrbit()}

        {/* Text & Telemetry Content */}
        <div className="smart-connection-meta">
          <div className="smart-connection-header-row">
            <span className={`smart-status-badge ${badge.cls}`}>
              <span className="smart-badge-dot" />
              {badge.label}
            </span>
            <span className="smart-target-url" title={currentTarget}>
              {currentTarget.replace(/^https?:\/\//i, '').slice(0, 32)}
              {currentTarget.replace(/^https?:\/\//i, '').length > 32 ? '…' : ''}
            </span>
          </div>

          <h4 className="smart-connection-title">
            {title || (status === 'FAILED' ? 'Backend Connection Interrupted' : status === 'SLOW' ? 'Server Cold Start in Progress' : 'Academic Cloud Gateway')}
          </h4>

          <p className="smart-connection-subtitle">
            {subtitle || badge.detail}
          </p>

          {/* Action Row */}
          {(status === 'FAILED' || status === 'SLOW' || showConfig) && (
            <div className="smart-actions-row">
              {onRetry && (
                <button
                  type="button"
                  className="smart-action-btn smart-btn-primary"
                  onClick={onRetry}
                >
                  Retry Connection
                </button>
              )}
              {showConfigAction && (
                <button
                  type="button"
                  className="smart-action-btn smart-btn-secondary"
                  onClick={() => setShowConfig((prev) => !prev)}
                >
                  {showConfig ? 'Close Settings' : 'Configure Server URL'}
                </button>
              )}
            </div>
          )}

          {/* Config URL Drawer */}
          {showConfig && (
            <div className="smart-config-drawer">
              <label htmlFor="smart-url-input" className="smart-config-label">
                Backend Endpoint URL:
              </label>
              <div className="smart-config-input-row">
                <input
                  id="smart-url-input"
                  type="text"
                  placeholder="https://your-backend.onrender.com"
                  value={customInput}
                  onChange={(e) => {
                    setCustomInput(e.target.value);
                    setConfigError(null);
                  }}
                  className="smart-config-input"
                />
                <button
                  type="button"
                  className="smart-config-submit"
                  onClick={handleSaveConfig}
                >
                  Save & Connect
                </button>
                {typeof window !== 'undefined' && localStorage.getItem(CUSTOM_API_URL_KEY) && (
                  <button
                    type="button"
                    className="smart-config-reset"
                    onClick={handleResetConfig}
                  >
                    Reset
                  </button>
                )}
              </div>
              {configError && <span className="smart-config-error">{configError}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
