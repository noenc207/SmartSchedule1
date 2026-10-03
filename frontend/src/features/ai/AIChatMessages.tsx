import React, { useEffect, useRef } from 'react';
import type { ChatMessageDto } from '../../services/aiApi';
import { AIMascot } from './AIMascot';
import { AIActionCard } from './AIActionCard';
import { AIVisionReviewCard } from './AIVisionReviewCard';
import { useAiChatStore } from '../../stores/aiChatStore';
import { Sparkles, User as UserIcon } from 'lucide-react';

interface AIChatMessagesProps {
  messages: ChatMessageDto[];
  isThinking: boolean;
  onQuickAction?: (prompt: string) => void;
}

export function AIChatMessages({ messages, isThinking, onQuickAction }: AIChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const confirmAction = useAiChatStore((s) => s.confirmAction);
  const cancelAction = useAiChatStore((s) => s.cancelAction);
  const sendMessage = useAiChatStore((s) => s.sendMessage);

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
          tìm giờ rảnh, kiểm tra xung đột và giúp bạn tạo hoặc dời lịch thông minh.
        </p>

        {onQuickAction && (
          <div className="ai-empty-suggestions">
            <button
              type="button"
              className="ai-suggestion-card"
              onClick={() => onQuickAction('Tối ưu ngày hôm nay cho tôi')}
            >
              <Sparkles size={14} className="card-icon" />
              <span>Tối ưu ngày hôm nay cho tôi</span>
            </button>
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
              onClick={() => onQuickAction('Đồng bộ Google Calendar với SmartSchedule')}
            >
              <Sparkles size={14} className="card-icon" />
              <span>Đồng bộ Google Calendar với SmartSchedule</span>
            </button>
            <button
              type="button"
              className="ai-suggestion-card"
              onClick={() => onQuickAction('Đọc Google Sheet này và thêm lịch vào SmartSchedule https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit')}
            >
              <Sparkles size={14} className="card-icon" />
              <span>Đọc Google Sheet và thêm lịch vào SmartSchedule</span>
            </button>
            <button
              type="button"
              className="ai-suggestion-card"
              onClick={() => onQuickAction('Tôi có những deadline nào sắp tới?')}
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
                ) : !isUser && msg.proposedActions && msg.proposedActions.length > 0 ? (
                  <span className="ai-action-intro-text">
                    Tôi đã chuẩn bị thao tác lịch bên dưới cho bạn:
                  </span>
                ) : (
                  <span className="ai-typing-placeholder">
                    <span className="ai-typing-dot" />
                    <span className="ai-typing-dot" />
                    <span className="ai-typing-dot" />
                  </span>
                )}
              </div>

              {!isUser && msg.proposedActions && msg.proposedActions.length > 0 && (
                <div className="ai-message-actions-wrapper">
                  {msg.proposedActions.map((action) => (
                    <AIActionCard
                      key={action.id}
                      action={action}
                      onConfirm={confirmAction}
                      onCancel={cancelAction}
                      onFindAlternative={(title, date) => {
                        void sendMessage(
                          `Tìm giờ rảnh khác để xếp lịch "${title}"${date ? ` vào ngày ${date}` : ''}`
                        );
                      }}
                    />
                  ))}
                </div>
              )}

              {!isUser && msg.visionResult && (
                <div className="ai-message-actions-wrapper">
                  <AIVisionReviewCard
                    result={msg.visionResult}
                    onImportSelected={(selected) => {
                      const titles = selected.map((s) => s.title).join(', ');
                      void sendMessage(`Hãy nhập các môn học này vào thời khóa biểu của tôi: ${titles}`);
                    }}
                    onAskAi={(prompt) => void sendMessage(prompt)}
                  />
                </div>
              )}

              {/* Clarification Quick Option Chips */}
              {!isUser && index === messages.length - 1 && !isThinking && msg.content && (
                <>
                  {(msg.content.toLowerCase().includes('bao nhiêu phút') ||
                    msg.content.toLowerCase().includes('thời lượng') ||
                    msg.content.toLowerCase().includes('trong bao lâu') ||
                    msg.content.toLowerCase().includes('mấy tiếng') ||
                    msg.content.toLowerCase().includes('kết thúc lúc mấy giờ')) && (
                    <div className="ai-clarification-chips">
                      <div className="ai-clarification-label">Chọn nhanh thời lượng:</div>
                      <div className="ai-clarification-row">
                        {['30 phút', '45 phút', '60 phút', '90 phút', '120 phút'].map((dur) => (
                          <button
                            key={dur}
                            type="button"
                            className="ai-clarify-chip"
                            onClick={() => void sendMessage(dur)}
                          >
                            {dur}
                          </button>
                        ))}
                        <button
                          type="button"
                          className="ai-clarify-chip outline"
                          onClick={() => {
                            const input = document.querySelector('.ai-chat-textarea') as HTMLTextAreaElement | null;
                            input?.focus();
                          }}
                        >
                          Tự nhập
                        </button>
                      </div>
                    </div>
                  )}

                  {((msg.content.toLowerCase().includes('bắt đầu lúc mấy giờ') ||
                     msg.content.toLowerCase().includes('bắt đầu lúc') ||
                     msg.content.toLowerCase().includes('bắt đầu từ')) &&
                    !msg.content.toLowerCase().includes('bao nhiêu phút')) && (
                    <div className="ai-clarification-chips">
                      <div className="ai-clarification-label">Chọn nhanh giờ bắt đầu:</div>
                      <div className="ai-clarification-row">
                        {['07:00', '08:00', '09:00', '14:00', '19:00'].map((time) => (
                          <button
                            key={time}
                            type="button"
                            className="ai-clarify-chip"
                            onClick={() => void sendMessage(time)}
                          >
                            {time}
                          </button>
                        ))}
                        <button
                          type="button"
                          className="ai-clarify-chip outline"
                          onClick={() => {
                            const input = document.querySelector('.ai-chat-textarea') as HTMLTextAreaElement | null;
                            input?.focus();
                          }}
                        >
                          Chọn giờ khác
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
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
