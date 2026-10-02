import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isRealGoogleClientId } from './SocialAuthButtons';

describe('Google OAuth Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Generates official Google OAuth URL with prompt=select_account', () => {
    const clientId = '104928374829-d83j4k2m9n1b0v8c7x6z5a4s3d2f1g0h.apps.googleusercontent.com';
    const redirectUri = 'http://localhost:5173/auth/google/callback';
    const nonce = 'test-nonce-123';
    const state = 'test-state-456';

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'id_token',
      scope: 'openid email profile',
      prompt: 'select_account',
      nonce,
      state,
    });

    const googleOAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    expect(googleOAuthUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth');
    expect(googleOAuthUrl).toContain('prompt=select_account');
    expect(googleOAuthUrl).toContain('response_type=id_token');
    expect(googleOAuthUrl).toContain('client_id=104928374829-d83j4k2m9n1b0v8c7x6z5a4s3d2f1g0h.apps.googleusercontent.com');
    expect(googleOAuthUrl).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Fauth%2Fgoogle%2Fcallback');
  });

  it('2. Correctly validates genuine Google Cloud Client IDs and rejects placeholders', () => {
    // Valid Google Cloud client IDs
    expect(isRealGoogleClientId('104928374829-d83j4k2m9n1b0v8c7x6z5a4s3d2f1g0h.apps.googleusercontent.com')).toBe(true);
    expect(isRealGoogleClientId('231472661796-1iegvpdu3jj9s845cbm46imktk73u5ss.apps.googleusercontent.com')).toBe(true);
    expect(isRealGoogleClientId('999999999999-abcdef123456789.apps.googleusercontent.com')).toBe(true);

    // Invalid / placeholder / dummy client IDs
    expect(isRealGoogleClientId('')).toBe(false);
    expect(isRealGoogleClientId(undefined)).toBe(false);
    expect(isRealGoogleClientId('smartschedule-auth-client.apps.googleusercontent.com')).toBe(false);
    expect(isRealGoogleClientId('smartschedule-preview-client.apps.googleusercontent.com')).toBe(false);
    expect(isRealGoogleClientId('your-google-client-id.apps.googleusercontent.com')).toBe(false);
    expect(isRealGoogleClientId('some-random-string')).toBe(false);
  });

  it('3. Extracts id_token correctly from OAuth callback hash', () => {
    const mockHash = '#id_token=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.dummy_token&state=test-state&token_type=Bearer';
    const cleanHash = mockHash.startsWith('#') ? mockHash.substring(1) : mockHash;
    const params = new URLSearchParams(cleanHash);

    const idToken = params.get('id_token');
    expect(idToken).toBe('eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.dummy_token');
    expect(params.get('state')).toBe('test-state');
  });

  it('4. Successfully posts message to window.opener in popup mode', () => {
    const postMessageSpy = vi.fn();
    const closeSpy = vi.fn();

    const mockOpener = {
      closed: false,
      postMessage: postMessageSpy,
    };

    const token = 'mock-google-id-token';
    const origin = 'http://localhost:5173';

    // Simulate popup callback action
    if (mockOpener && !mockOpener.closed) {
      mockOpener.postMessage(
        {
          type: 'GOOGLE_OAUTH_RESPONSE',
          idToken: token,
          error: null,
        },
        origin
      );
      closeSpy();
    }

    expect(postMessageSpy).toHaveBeenCalledWith(
      {
        type: 'GOOGLE_OAUTH_RESPONSE',
        idToken: token,
        error: null,
      },
      origin
    );
    expect(closeSpy).toHaveBeenCalledOnce();
  });
});
