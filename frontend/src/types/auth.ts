export type AuthStatus = 'INITIALIZING' | 'AUTHENTICATED' | 'UNAUTHENTICATED' | 'REFRESHING';

export type User = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  enabled: boolean;
  timezone: string;
  locale: string;
  createdAt: string;
  tier?: 'FREE' | 'PRO';
};

export type AuthResponse = {
  accessToken: string;
  expiresIn: number;
  user: User;
  refreshToken?: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = {
  displayName: string;
  email: string;
  password: string;
  activationKey: string;
};

export type SocialProvider = 'GOOGLE' | 'GITHUB' | 'FACEBOOK';

export type GoogleAuthInput = {
  idToken: string;
  registrationKey?: string;
};

export type GoogleAuthResponse = {
  status: 'AUTHENTICATED' | 'KEY_REQUIRED';
  accessToken?: string;
  expiresIn?: number;
  user?: User;
  refreshToken?: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
};

export type SocialAuthInput = {
  idToken?: string;
  code?: string;
  accessToken?: string;
  registrationKey?: string;
  provider?: SocialProvider;
};

export type SocialAuthResponse = {
  status: 'AUTHENTICATED' | 'KEY_REQUIRED';
  provider?: SocialProvider | string;
  accessToken?: string;
  expiresIn?: number;
  user?: User;
  refreshToken?: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
};

