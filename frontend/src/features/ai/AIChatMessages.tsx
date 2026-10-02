import React, { useEffect, useRef } from 'react';
import type { ChatMessageDto } from '../../services/aiApi';
import { AIMascot } from './AIMascot';
import { Sparkles, User as UserIcon } from 'lucide-react';

interface AIChatMessagesProps {
  messages: ChatMessageDto[];
  isThinking: boolean;
  onQuickAction?: (prompt: string) => void;
}

export function AIChatMessages({ messages, isThinking, onQuickAction }: AIChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Basic markdown-like rendering for bold text, lists, and line breaks
  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      // Bold text formatting **text**
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      const renderedLine = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pIdx}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      if (line.trim().startsWith('• ') || line.trim().startsWith('- ')) {
        return (
          <div key={idx} className="ai-msg-list-item">
            <span className="bullet">▪</span>
            <span>{renderedLine}</span>
          </div>
        );
      }

      if (line.trim().startsWith('===') && line.trim().endsWith('===')) {
        return (
          <div key={idx} className="ai-msg-section-header">
            {line.replace(/===/g, '').trim()}
          </div>
        );
      }

      return (
        <div key={idx} className="ai-msg-line">
          {renderedLine}
        </div>
      );
    });
  };

  if (messages.length === 0 && !isThinking) {
    return (
      <div className="ai-chat-empty-state">
        <div className="ai-empty-mascot-box">
          <AIMascot state="IDLE" size={76} />
        </div>
        <h3>Xin chào! Tôi là SmartSchedule AI</h3>
        <p>
          Trợ lý học thuật thông minh của bạn tại FPT University Quy Nhơn. Tôi có thể đọc thời khóa biểu,
          tìm giờ rảnh và nhắc nhở hạn chót của bạn ngay hôm nay.
        </p>

        {onQuickAction && (
          <div className="ai-empty-suggestions">
            <button
              type="button"
              className="ai-suggestion-card"
              onClick={() => onQuickAction('Hôm nay tôi rảnh lúc nào?')}
            >
              <Sparkles size={14} className="card-icon" />
              <span>Hôm nay tôi rảnh lúc nào?</span>
            </button>
            <button
              type="button"
              className="ai-suggestion-card"
              onClick={() => onQuickAction('Lịch học và sự kiện hôm nay thế nào?')}
            >
              <Sparkles size={14} className="card-icon" />
              <span>Lịch học và sự kiện hôm nay thế nào?</span>
            </button>
            <button
              type="button"
              className="ai-suggestion-card"
              onClick={() => onQuickAction('Tôi có những bài tập/hạn chót nào sắp tới?')}
            >
              <Sparkles size={14} className="card-icon" />
              <span>Tôi có những deadline nào sắp tới?</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="ai-chat-messages-list">
      {messages.map((msg, index) => {
        const isUser = msg.role === 'user';
        return (
          <div
            key={msg.id || index}
            className={`ai-message-row ${isUser ? 'is-user' : 'is-model'}`}
          >
            {!isUser && (
              <div className="ai-message-avatar">
                <AIMascot state="IDLE" size={30} />
              </div>
            )}

            <div className="ai-message-bubble">
              <div className="ai-message-header">
                <span className="ai-message-author">
                  {isUser ? 'Bạn' : 'SmartSchedule AI'}
                </span>
              </div>
              <div className="ai-message-content">
                {msg.content ? (
                  renderFormattedContent(msg.content)
                ) : (
                  <span className="ai-typing-placeholder">
                    <span className="ai-typing-dot" />
                    <span className="ai-typing-dot" />
                    <span className="ai-typing-dot" />
                  </span>
                )}
              </div>
            </div>

            {isUser && (
              <div className="ai-message-avatar user-avatar">
                <UserIcon size={16} />
              </div>
            )}
          </div>
        );
      })}

      {isThinking && (
        <div className="ai-message-row is-model is-thinking">
          <div className="ai-message-avatar">
            <AIMascot state="THINKING" size={30} />
          </div>
          <div className="ai-message-bubble thinking-bubble">
            <div className="ai-thinking-indicator">
              <span className="ai-thinking-text">Đang phân tích thời khóa biểu của bạn…</span>
              <span className="ai-thinking-spinner" />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} style={{ height: 1 }} />
    </div>
  );
}
