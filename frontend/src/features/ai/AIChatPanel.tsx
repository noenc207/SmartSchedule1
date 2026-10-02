import React, { useEffect } from 'react';
import { X, RotateCcw, AlertTriangle, Sparkles } from 'lucide-react';
import { useAiChatStore } from '../../stores/aiChatStore';
import { AIMascot } from './AIMascot';
import { AIChatMessages } from './AIChatMessages';
import { AIQuickActions } from './AIQuickActions';
import { AIChatInput } from './AIChatInput';

export function AIChatPanel() {
  const isOpen = useAiChatStore((s) => s.isOpen);
  const messages = useAiChatStore((s) => s.messages);
  const isThinking = useAiChatStore((s) => s.isThinking);
  const isStreaming = useAiChatStore((s) => s.isStreaming);
  const error = useAiChatStore((s) => s.error);
  const mascotState = useAiChatStore((s) => s.mascotState);
  const setOpen = useAiChatStore((s) => s.setOpen);
  const sendMessage = useAiChatStore((s) => s.sendMessage);
  const newConversation = useAiChatStore((s) => s.newConversation);
  const clearError = useAiChatStore((s) => s.clearError);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setOpen]);

  if (!isOpen) return null;

  const isBusy = isThinking || isStreaming;

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="ai-chat-mobile-backdrop"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <div
        className="ai-chat-panel-container"
        role="dialog"
        aria-labelledby="ai-chat-title"
        aria-modal="true"
      >
        {/* Header */}
        <div className="ai-chat-header">
          <div className="ai-chat-header-info">
            <div className="ai-chat-header-mascot">
              <AIMascot state={mascotState} size={36} />
              <span className="ai-status-pulse" title="Gemini AI Đang hoạt động" />
            </div>
            <div className="ai-chat-header-text">
              <div className="ai-chat-title-row">
                <h2 id="ai-chat-title" className="ai-chat-title">
                  SmartSchedule AI
                </h2>
                <span className="ai-gemini-tag">Gemini</span>
              </div>
              <p className="ai-chat-subtitle">Trợ lý học thuật thông minh</p>
            </div>
          </div>

          <div className="ai-chat-header-actions">
            <button
              type="button"
              className="ai-header-btn"
              onClick={newConversation}
              disabled={isBusy}
              title="Bắt đầu cuộc trò chuyện mới"
              aria-label="Cuộc trò chuyện mới"
            >
              <RotateCcw size={15} />
            </button>
            <button
              type="button"
              className="ai-header-btn ai-header-close"
              onClick={() => setOpen(false)}
              title="Đóng / Thu nhỏ"
              aria-label="Đóng"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Error notification banner */}
        {error && (
          <div className="ai-chat-error-banner" role="alert">
            <AlertTriangle size={15} className="error-icon" />
            <span className="error-text">{error}</span>
            <button
              type="button"
              className="error-dismiss-btn"
              onClick={clearError}
              aria-label="Bỏ qua lỗi"
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* Message body */}
        <div className="ai-chat-body">
          <AIChatMessages
            messages={messages}
            isThinking={isThinking}
            onQuickAction={(prompt) => void sendMessage(prompt)}
          />
        </div>

        {/* Footer with quick actions + input */}
        <div className="ai-chat-footer">
          <AIQuickActions
            onSelect={(prompt) => void sendMessage(prompt)}
            disabled={isBusy}
          />
          <AIChatInput
            onSend={(text) => void sendMessage(text)}
            disabled={isBusy}
          />
        </div>
      </div>
    </>
  );
}
