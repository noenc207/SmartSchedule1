import React, { useState, useRef, useEffect } from 'react';
import { Send, CornerDownLeft } from 'lucide-react';

interface AIChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function AIChatInput({
  onSend,
  disabled = false,
  placeholder = 'Hỏi SmartSchedule AI về lịch trình, giờ rảnh...',
}: AIChatInputProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // Auto-expand textarea up to 120px
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  useEffect(() => {
    if (!disabled && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  return (
    <div className="ai-chat-input-wrapper">
      <div className="ai-chat-input-box">
        <textarea
          ref={textareaRef}
          className="ai-chat-textarea"
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          maxLength={2000}
        />
        <button
          type="button"
          className="ai-chat-send-btn"
          onClick={handleSubmit}
          disabled={!text.trim() || disabled}
          aria-label="Gửi tin nhắn"
          title="Gửi (Enter)"
        >
          <Send size={15} strokeWidth={2.4} />
        </button>
      </div>
      <div className="ai-chat-input-hints">
        <span>Nhấn <kbd>Enter</kbd> để gửi, <kbd>Shift + Enter</kbd> xuống dòng</span>
      </div>
    </div>
  );
}
