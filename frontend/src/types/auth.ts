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
