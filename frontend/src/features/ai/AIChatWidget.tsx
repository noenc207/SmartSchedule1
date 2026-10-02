import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { AIChatBubble } from './AIChatBubble';
import { AIChatPanel } from './AIChatPanel';

export function AIChatWidget() {
  const { status } = useAuth();

  // SmartSchedule AI floating chat widget is exclusively available for authenticated users
  if (status !== 'AUTHENTICATED') {
    return null;
  }

  return (
    <aside className="ai-chat-global-widget" aria-label="SmartSchedule AI Chat Assistant">
      <AIChatPanel />
      <AIChatBubble />
    </aside>
  );
}
