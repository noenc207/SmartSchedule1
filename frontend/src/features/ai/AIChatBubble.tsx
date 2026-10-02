import React from 'react';
import { Sparkles } from 'lucide-react';
import { useAiChatStore } from '../../stores/aiChatStore';
import { AIMascot } from './AIMascot';

export function AIChatBubble() {
  const isOpen = useAiChatStore((s) => s.isOpen);
  const mascotState = useAiChatStore((s) => s.mascotState);
  const unreadCount = useAiChatStore((s) => s.unreadCount);
  const toggleOpen = useAiChatStore((s) => s.toggleOpen);
  const setMascotHover = useAiChatStore((s) => s.setMascotHover);

  return (
    <div className={`ai-chat-bubble-container ${isOpen ? 'is-open' : ''}`}>
      <button
        type="button"
        className={`ai-chat-bubble-btn ${mascotState.toLowerCase()}`}
        onClick={toggleOpen}
        onMouseEnter={() => setMascotHover(true)}
        onMouseLeave={() => setMascotHover(false)}
        aria-label={isOpen ? 'Đóng trợ lý SmartSchedule AI' : 'Mở trợ lý SmartSchedule AI'}
        title={isOpen ? 'Thu nhỏ AI' : 'Hỏi SmartSchedule AI'}
      >
        <AIMascot state={mascotState} size={54} />

        {/* Sparkle badge */}
        <span className="ai-sparkle-badge" aria-hidden="true">
          <Sparkles size={13} strokeWidth={2.4} />
        </span>

        {/* Unread badge */}
        {unreadCount > 0 && !isOpen && (
          <span className="ai-unread-badge" aria-label={`${unreadCount} tin nhắn mới`}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
