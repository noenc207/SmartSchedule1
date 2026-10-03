import React, { useEffect } from 'react';
import { X, RotateCcw, AlertTriangle, Sparkles, GraduationCap, Briefcase, Heart, Globe, Languages } from 'lucide-react';
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
  const sendVisionFile = useAiChatStore((s) => s.sendVisionFile);
  const newConversation = useAiChatStore((s) => s.newConversation);
  const clearError = useAiChatStore((s) => s.clearError);

  const activeContextMode = useAiChatStore((s) => s.activeContextMode);
  const setContextMode = useAiChatStore((s) => s.setContextMode);
  const preferredLanguage = useAiChatStore((s) => s.preferredLanguage);
  const setPreferredLanguage = useAiChatStore((s) => s.setPreferredLanguage);

  const bubblePosition = useAiChatStore((s) => s.bubblePosition);

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

  // Compute dynamic desktop positioning adjacent to the bubble
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 640;
  let panelInlineStyle: React.CSSProperties | undefined = undefined;

  if (!isMobile && bubblePosition) {
    const panelWidth = 395;
    const panelHeight = Math.min(590, window.innerHeight - 32);
    const bubbleSize = 64;
    const margin = 12;

    let left: number;
    if (bubblePosition.x > window.innerWidth / 2) {
      left = Math.max(16, bubblePosition.x + bubbleSize - panelWidth);
    } else {
      left = Math.min(window.innerWidth - panelWidth - 16, Math.max(16, bubblePosition.x));
    }

    let top: number;
    if (bubblePosition.y > window.innerHeight / 2) {
      top = Math.max(16, bubblePosition.y - panelHeight - margin);
    } else {
      top = Math.min(window.innerHeight - panelHeight - 16, bubblePosition.y + bubbleSize + margin);
    }

    panelInlineStyle = {
      position: 'fixed',
      left: `${left}px`,
      top: `${top}px`,
      right: 'auto',
      bottom: 'auto',
    };
  }

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
        style={panelInlineStyle}
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
              <p className="ai-chat-subtitle">
                {preferredLanguage === 'en' ? 'Autonomous Academic Copilot' : 'Trợ lý học thuật thông minh'}
              </p>
            </div>
          </div>

          <div className="ai-chat-header-actions">
            <button
              type="button"
              className="ai-header-btn ai-lang-toggle"
              onClick={() => setPreferredLanguage(preferredLanguage === 'vi' ? 'en' : 'vi')}
              title={preferredLanguage === 'vi' ? 'Chuyển sang tiếng Anh (Switch to English)' : 'Switch to Vietnamese (Chuyển sang tiếng Việt)'}
              aria-label="Toggle Language"
            >
              <Languages size={13} />
              <span className="ai-lang-label">{preferredLanguage.toUpperCase()}</span>
            </button>
            <button
              type="button"
              className="ai-header-btn"
              onClick={newConversation}
              disabled={isBusy}
              title={preferredLanguage === 'en' ? 'New conversation' : 'Bắt đầu cuộc trò chuyện mới'}
              aria-label="Cuộc trò chuyện mới"
            >
              <RotateCcw size={15} />
            </button>
            <button
              type="button"
              className="ai-header-btn ai-header-close"
              onClick={() => setOpen(false)}
              title={preferredLanguage === 'en' ? 'Close' : 'Đóng / Thu nhỏ'}
              aria-label="Đóng"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Multi-Context Mode Bar */}
        <div className="ai-context-modes-bar" role="tablist" aria-label="Context Mode">
          <button
            type="button"
            role="tab"
            aria-selected={activeContextMode === 'ACADEMIC'}
            className={`ai-context-mode-btn ${activeContextMode === 'ACADEMIC' ? 'active' : ''}`}
            onClick={() => setContextMode('ACADEMIC')}
            title={preferredLanguage === 'en' ? 'Study & Lectures Focus' : 'Ngữ cảnh Học tập & Thi cử'}
          >
            <GraduationCap size={13} />
            <span>{preferredLanguage === 'en' ? 'Study' : 'Học tập'}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeContextMode === 'WORK'}
            className={`ai-context-mode-btn ${activeContextMode === 'WORK' ? 'active' : ''}`}
            onClick={() => setContextMode('WORK')}
            title={preferredLanguage === 'en' ? 'Projects & Tasks Focus' : 'Ngữ cảnh Dự án & Công việc'}
          >
            <Briefcase size={13} />
            <span>{preferredLanguage === 'en' ? 'Work' : 'Công việc'}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeContextMode === 'PERSONAL'}
            className={`ai-context-mode-btn ${activeContextMode === 'PERSONAL' ? 'active' : ''}`}
            onClick={() => setContextMode('PERSONAL')}
            title={preferredLanguage === 'en' ? 'Personal & Wellness Focus' : 'Ngữ cảnh Cá nhân & Nghỉ ngơi'}
          >
            <Heart size={13} />
            <span>{preferredLanguage === 'en' ? 'Life' : 'Cá nhân'}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeContextMode === 'GENERAL'}
            className={`ai-context-mode-btn ${activeContextMode === 'GENERAL' ? 'active' : ''}`}
            onClick={() => setContextMode('GENERAL')}
            title={preferredLanguage === 'en' ? 'Balanced All Focus' : 'Ngữ cảnh Tổng hợp Đa nhiệm'}
          >
            <Globe size={13} />
            <span>{preferredLanguage === 'en' ? 'All' : 'Tổng hợp'}</span>
          </button>
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
            onSendFile={(file, mode, instruction) => void sendVisionFile(file, mode, instruction)}
            disabled={isBusy}
          />
        </div>
      </div>
    </>
  );
}
