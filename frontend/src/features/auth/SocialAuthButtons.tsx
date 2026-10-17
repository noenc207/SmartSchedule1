import { useState, useEffect, useRef } from 'react';
import type { SocialProvider } from '../../types/auth';

export interface SocialAuthPayload {
  provider: SocialProvider;
  code?: string;
  accessToken?: string;
  idToken?: string;
}

export interface SocialAuthButtonsProps {
  onGoogleToken: (idToken: string) => void;
  onSocialAuth?: (auth: SocialAuthPayload) => void;
  isLoading: boolean;
  onNotice?: (message: string) => void;
  noIcons?: boolean;
}

/**
 * Validates whether a Google Client ID conforms to the official Google Cloud Platform format:
 * <project-number>-<alphanumeric-hash>.apps.googleusercontent.com
 */
export function isRealGoogleClientId(clientId?: string): boolean {
  if (!clientId) return false;
  const trimmed = clientId.trim();
  if (
    trimmed.length === 0 ||
    trimmed.includes('smartschedule-') ||
    trimmed.includes('your-google-client-id') ||
    trimmed.includes('replace-with')
  ) {
    return false;
  }
  return /^\d+-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(trimmed);
}

/**
 * Validates whether a Facebook App ID is a genuine Meta App ID (14-18 digits).
 */
export function isRealFacebookAppId(appId?: string): boolean {
  if (!appId) return false;
  const trimmed = appId.trim();
  if (
    trimmed.length === 0 ||
    trimmed === '123456789012345' ||
    trimmed.includes('replace-with') ||
    trimmed.includes('your-facebook-app-id')
  ) {
    return false;
  }
  return /^\d{12,20}$/.test(trimmed);
}

/**
 * Validates whether a GitHub Client ID is a genuine GitHub OAuth App Client ID (e.g., Ov23li... or 20 alphanumeric chars).
 */
export function isRealGithubClientId(clientId?: string): boolean {
  if (!clientId) return false;
  const trimmed = clientId.trim();
  if (
    trimmed.length === 0 ||
    trimmed === 'Ov23liGithubPreviewClientId' ||
    trimmed.includes('replace-with') ||
    trimmed.includes('your-github-client-id')
  ) {
    return false;
  }
  return /^[a-zA-Z0-9_]{16,30}$/.test(trimmed);
}

export function SocialAuthButtons({
  onGoogleToken,
  onSocialAuth,
  isLoading,
  onNotice,
  noIcons = false,
}: SocialAuthButtonsProps) {
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const popupRef = useRef<Window | null>(null);
  const pollTimerRef = useRef<number | null>(null);

  // Single canonical source for Google Client ID with official project fallback
  const rawClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const googleClientId = (rawClientId && rawClientId.trim().length > 0)
    ? rawClientId.trim()
    : '231472661796-1iegvpdu3jj9s845cbm46imktk73u5ss.apps.googleusercontent.com';

  const rawGithubClientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
  const githubClientId = (rawGithubClientId && rawGithubClientId.trim().length > 0)
    ? rawGithubClientId.trim()
    : 'Ov23liGithubPreviewClientId';

  const rawFacebookAppId = import.meta.env.VITE_FACEBOOK_APP_ID;
  const facebookAppId = (rawFacebookAppId && rawFacebookAppId.trim().length > 0)
    ? rawFacebookAppId.trim()
    : '123456789012345';

  useEffect(() => {
    // Listen for postMessage from the popup window callback
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin || '';
      const isTrusted =
        origin === window.location.origin ||
        origin.endsWith('.vercel.app') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1');

      if (!isTrusted) return;

      if (event.data?.type === 'SOCIAL_OAUTH_RESPONSE' || event.data?.type === 'GOOGLE_OAUTH_RESPONSE') {
        if (pollTimerRef.current) {
          window.clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
        setSocialLoading(null);

        const provider: SocialProvider = (event.data.provider ||
          (event.data.type === 'GOOGLE_OAUTH_RESPONSE' ? 'GOOGLE' : 'GOOGLE')) as SocialProvider;

        if (event.data.error) {
          if (onNotice) {
            onNotice(`${provider} sign-in was cancelled or encountered an error.`);
          }
          return;
        }

        if (provider === 'GOOGLE' && event.data.idToken) {
          onGoogleToken(event.data.idToken);
          if (onSocialAuth) {
            onSocialAuth({ provider: 'GOOGLE', idToken: event.data.idToken });
          }
        } else if (provider === 'GITHUB') {
          if (onSocialAuth) {
            onSocialAuth({
              provider: 'GITHUB',
              code: event.data.code,
              accessToken: event.data.accessToken,
            });
          }
        } else if (provider === 'FACEBOOK') {
          if (onSocialAuth) {
            onSocialAuth({
              provider: 'FACEBOOK',
              accessToken: event.data.accessToken,
              code: event.data.code,
            });
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
      }
    };
  }, [onGoogleToken, onSocialAuth, onNotice]);

  const openOAuthWindow = (url: string, targetName: string, width = 500, height = 650) => {
    // On mobile devices, redirect directly in current window
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 640;
    if (isMobile) {
      window.location.href = url;
      return;
    }

    const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
    const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));

    const popup = window.open(
      url,
      targetName,
      `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no,location=yes,resizable=yes`
    );

    popupRef.current = popup;

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      window.location.href = url;
      return;
    }

    popup.focus();

    if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
    pollTimerRef.current = window.setInterval(() => {
      if (popup.closed) {
        if (pollTimerRef.current) {
          window.clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
        setSocialLoading(null);
      }
    }, 600);
  };

  const handleGoogleClick = () => {
    if (isLoading || socialLoading) return;

    if (!googleClientId || !isRealGoogleClientId(googleClientId)) {
      if (onNotice) {
        onNotice(
          'Google OAuth Client ID chưa được cấu hình. Vui lòng thiết lập VITE_GOOGLE_CLIENT_ID (dạng <project-number>-<hash>.apps.googleusercontent.com) trong frontend/.env từ Google Cloud Console.'
        );
      }
      return;
    }

    setSocialLoading('google');
    if (onNotice) onNotice('');

    const rawRedirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI;
    const redirectUri = (rawRedirectUri && rawRedirectUri.trim().length > 0)
      ? rawRedirectUri.trim()
      : `${window.location.origin}/auth/google/callback`;
    const nonce = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const state = Math.random().toString(36).substring(2);

    try {
      sessionStorage.setItem('smartschedule_google_nonce', nonce);
      sessionStorage.setItem('smartschedule_google_state', state);
    } catch {
      /* ignore storage errors */
    }

    const params = new URLSearchParams({
      client_id: googleClientId,
      redirect_uri: redirectUri,
      response_type: 'id_token',
      scope: 'openid email profile',
      prompt: 'select_account',
      nonce,
      state,
    });

    const googleOAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    openOAuthWindow(googleOAuthUrl, 'google_account_chooser', 500, 620);
  };

  const handleGithubClick = () => {
    if (isLoading || socialLoading) return;

    if (!githubClientId || !isRealGithubClientId(githubClientId)) {
      if (onNotice) {
        onNotice(
          'GitHub Client ID chưa được cấu hình. Vui lòng tạo OAuth App trên GitHub (Settings > Developer settings > OAuth Apps) và thiết lập biến môi trường VITE_GITHUB_CLIENT_ID.'
        );
      }
      return;
    }

    setSocialLoading('github');
    if (onNotice) onNotice('');

    const rawRedirectUri = import.meta.env.VITE_GITHUB_REDIRECT_URI;
    const redirectUri = (rawRedirectUri && rawRedirectUri.trim().length > 0)
      ? rawRedirectUri.trim()
      : `${window.location.origin}/auth/github/callback`;
    const state = Math.random().toString(36).substring(2);

    try {
      sessionStorage.setItem('smartschedule_github_state', state);
    } catch {
      /* ignore storage errors */
    }

    const params = new URLSearchParams({
      client_id: githubClientId,
      redirect_uri: redirectUri,
      scope: 'read:user user:email',
      state,
    });

    const githubOAuthUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
    openOAuthWindow(githubOAuthUrl, 'github_oauth_popup', 520, 650);
  };

  const handleFacebookClick = () => {
    if (isLoading || socialLoading) return;

    if (!facebookAppId || !isRealFacebookAppId(facebookAppId)) {
      if (onNotice) {
        onNotice(
          'Facebook App ID chưa được cấu hình. Vui lòng tạo ứng dụng trên Meta for Developers (developers.facebook.com) và thiết lập biến môi trường VITE_FACEBOOK_APP_ID.'
        );
      }
      return;
    }

    setSocialLoading('facebook');
    if (onNotice) onNotice('');

    const rawRedirectUri = import.meta.env.VITE_FACEBOOK_REDIRECT_URI;
    const redirectUri = (rawRedirectUri && rawRedirectUri.trim().length > 0)
      ? rawRedirectUri.trim()
      : `${window.location.origin}/auth/facebook/callback`;
    const state = Math.random().toString(36).substring(2);

    try {
      sessionStorage.setItem('smartschedule_facebook_state', state);
    } catch {
      /* ignore storage errors */
    }

    const params = new URLSearchParams({
      client_id: facebookAppId,
      redirect_uri: redirectUri,
      response_type: 'token',
      scope: 'email,public_profile',
      state,
    });

    const facebookOAuthUrl = `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
    openOAuthWindow(facebookOAuthUrl, 'facebook_oauth_popup', 540, 650);
  };

  const isBusy = isLoading || Boolean(socialLoading);

  return (
    <div className="login-social-grid" role="group" aria-label="Social authentication options">
      <button
        type="button"
        className="login-social-btn"
        onClick={handleGoogleClick}
        disabled={isBusy}
        aria-label="Continue with Google"
      >
        <span>
          {socialLoading === 'google' ? 'Connecting…' : 'Google'}
        </span>
      </button>

      <button
        type="button"
        className="login-social-btn"
        onClick={handleGithubClick}
        disabled={isBusy}
        aria-label="Continue with GitHub"
      >
        <span>
          {socialLoading === 'github' ? 'Connecting…' : 'GitHub'}
        </span>
      </button>

      <button
        type="button"
        className="login-social-btn"
        onClick={handleFacebookClick}
        disabled={isBusy}
        aria-label="Continue with Facebook"
      >
        <span>
          {socialLoading === 'facebook' ? 'Connecting…' : 'Facebook'}
        </span>
      </button>
    </div>
  );
}
