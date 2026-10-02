import { SocialAuthButtons } from './SocialAuthButtons';

export { SocialAuthButtons };

interface GoogleSignInButtonProps {
  onTokenReceived: (idToken: string) => void;
  isLoading?: boolean;
}

export function GoogleSignInButton({ onTokenReceived, isLoading }: GoogleSignInButtonProps) {
  return <SocialAuthButtons onGoogleToken={onTokenReceived} isLoading={Boolean(isLoading)} />;
}
