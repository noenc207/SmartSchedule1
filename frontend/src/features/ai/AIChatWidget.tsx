import { useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useIsMobile } from '../../hooks/useIsMobile';
import { AIChatBubble } from './AIChatBubble';
import { AIChatPanel } from './AIChatPanel';

export function AIChatWidget() {
  const { status } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile(768);

  // SmartSchedule AI floating chat widget is exclusively available for authenticated users
  // and hidden on mobile viewports (< 768px) where users access AI via the dedicated bottom nav tab.
  if (status !== 'AUTHENTICATED' || location.pathname === '/ai' || isMobile) {
    return null;
  }

  return (
    <aside className="ai-chat-global-widget" aria-label="SmartSchedule AI Chat Assistant">
      <AIChatPanel />
      <AIChatBubble />
    </aside>
  );
}
