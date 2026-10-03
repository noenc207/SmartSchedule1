import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, Image as ImageIcon } from 'lucide-react';

interface AIChatInputProps {
  onSend: (text: string) => void;
  onSendFile?: (file: File, mode: string, instruction?: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function AIChatInput({
  onSend,
  onSendFile,
  disabled = false,
  placeholder = 'Hỏi SmartSchedule AI về lịch trình, giờ rảnh...',
}: AIChatInputProps) {
  const [text, setText] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<'TIMETABLE' | 'DOCUMENT' | 'DEADLINE' | 'SCREENSHOT'>('TIMETABLE');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Chỉ hỗ trợ tệp hình ảnh (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Dung lượng ảnh vượt quá 10MB cho phép.');
      return;
    }

    setAttachedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const clearAttachment = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setAttachedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = () => {
    const trimmed = text.trim();
    if ((!trimmed && !attachedFile) || disabled) return;

    if (attachedFile && onSendFile) {
      onSendFile(attachedFile, mode, trimmed || undefined);
      clearAttachment();
    } else if (trimmed) {
      onSend(trimmed);
    }

    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
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
      {/* File Preview and Mode Bar */}
      {attachedFile && previewUrl && (
        <div className="mb-2 flex flex-col gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/60 p-2 text-xs dark:border-indigo-900/50 dark:bg-indigo-950/30">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <img
                src={previewUrl}
                alt="Upload preview"
                className="h-10 w-10 shrink-0 rounded object-cover border border-indigo-200"
              />
              <div className="min-w-0 flex-1 truncate">
                <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {attachedFile.name}
                </p>
                <p className="text-[10px] text-slate-500">
                  {(attachedFile.size / 1024).toFixed(0)} KB • Vision Local Server
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={clearAttachment}
              className="rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800"
              title="Hủy đính kèm"
            >
              <X size={14} />
            </button>
          </div>

          {/* Mode Selection Pills */}
          <div className="flex items-center gap-1.5 pt-1 text-[10px]">
            <span className="font-medium text-slate-500">Chế độ:</span>
            {(['TIMETABLE', 'DOCUMENT', 'DEADLINE', 'SCREENSHOT'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded px-1.5 py-0.5 font-medium transition ${
                  mode === m
                    ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                    : 'bg-white text-slate-600 hover:bg-indigo-100 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {m === 'TIMETABLE'
                  ? 'Thời khóa biểu'
                  : m === 'DOCUMENT'
                  ? 'Tài liệu'
                  : m === 'DEADLINE'
                  ? 'Hạn nộp'
                  : 'Ảnh chụp'}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="ai-chat-input-box">
        {/* Attachment Button */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/png,image/jpeg,image/webp,image/bmp"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="mr-1 flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
          title="Đính kèm ảnh thời khóa biểu / tài liệu (PaddleOCR & Qwen-VL)"
          aria-label="Đính kèm ảnh"
        >
          <Paperclip size={16} />
        </button>

        <textarea
          ref={textareaRef}
          className="ai-chat-textarea"
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={
            attachedFile
              ? 'Thêm yêu cầu xử lý ảnh (hoặc Enter để quét)...'
              : placeholder
          }
          disabled={disabled}
          rows={1}
          maxLength={2000}
        />
        <button
          type="button"
          className="ai-chat-send-btn"
          onClick={handleSubmit}
          disabled={(!text.trim() && !attachedFile) || disabled}
          aria-label="Gửi tin nhắn"
          title="Gửi (Enter)"
        >
          <Send size={15} strokeWidth={2.4} />
        </button>
      </div>
      <div className="ai-chat-input-hints">
        <span>
          Nhấn <kbd>Enter</kbd> để gửi, <kbd>Shift + Enter</kbd> xuống dòng • Hỗ trợ tải ảnh thời khóa biểu
        </span>
      </div>
    </div>
  );
}
