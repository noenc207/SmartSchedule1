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

export function SocialAuthButtons({
  onGoogleToken,
  onSocialAuth,
  isLoading,
  onNotice,
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
      if (typeof window !== 'undefined' && event.origin !== window.location.origin) return;

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
    <div className="social-auth-group">
      <button
        type="button"
        className="social-auth-btn social-google-btn"
        onClick={handleGoogleClick}
        disabled={isBusy}
        aria-label="Continue with Google"
      >
        {socialLoading === 'google' ? (
          <span className="social-spinner" />
        ) : (
          <svg className="social-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
        )}
        <span>{socialLoading === 'google' ? 'Đang mở Google Account Chooser…' : 'Continue with Google'}</span>
      </button>

      <button
        type="button"
        className="social-auth-btn social-facebook-btn"
        onClick={handleFacebookClick}
        disabled={isBusy}
        aria-label="Continue with Facebook"
      >
        {socialLoading === 'facebook' ? (
          <span className="social-spinner" />
        ) : (
          <svg className="social-icon" width="18" height="18" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        )}
        <span>{socialLoading === 'facebook' ? 'Đang mở Facebook Login…' : 'Continue with Facebook'}</span>
      </button>

      <button
        type="button"
        className="social-auth-btn social-github-btn"
        onClick={handleGithubClick}
        disabled={isBusy}
        aria-label="Continue with GitHub"
      >
        {socialLoading === 'github' ? (
          <span className="social-spinner" />
        ) : (
          <svg className="social-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
          </svg>
        )}
        <span>{socialLoading === 'github' ? 'Đang mở GitHub Login…' : 'Continue with GitHub'}</span>
      </button>
    </div>
  );
}
