import { useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { AIChatBubble } from './AIChatBubble';
import { AIChatPanel } from './AIChatPanel';

export function AIChatWidget() {
  const { status } = useAuth();
  const location = useLocation();

  // SmartSchedule AI floating chat widget is exclusively available for authenticated users
  // and hidden when directly viewing the full-screen /ai mobile assistant page
  if (status !== 'AUTHENTICATED' || location.pathname === '/ai') {
    return null;
  }

  return (
    <aside className="ai-chat-global-widget" aria-label="SmartSchedule AI Chat Assistant">
      <AIChatPanel />
      <AIChatBubble />
    </aside>
  );
}
