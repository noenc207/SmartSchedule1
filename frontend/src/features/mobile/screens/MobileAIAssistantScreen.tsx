import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Sparkles,
  Bot,
  User,
  CheckCircle,
  Calendar,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { MobilePageHeader } from '../../../components/mobile';
import { showToast } from '../../../components/Toast';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  action?: {
    label: string;
    description: string;
  };
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: 'msg-1',
    sender: 'ai',
    text: 'Chào bạn! Cóc Trợ Lý AI của FPT University Quy Nhơn đã sẵn sàng. Mình có thể giúp bạn tối ưu lịch học, giải quyết xung đột môn học, hoặc xếp giờ ôn tập cho kỳ thi sắp tới.',
  },
  {
    id: 'msg-2',
    sender: 'ai',
    text: 'Hôm nay bạn có khoảng trống 2 tiếng (10:00 - 12:00) sau tiết PRN211. Bạn có muốn mình xếp lịch ôn bài Lab 4 tại Thư viện Atrium không?',
    action: {
      label: 'Xếp lịch tự học vào 10:00 - 12:00',
      description: 'Phòng tự học Alpha Atrium · Ưu tiên ôn tập Lab 4',
    },
  },
];

const SUGGESTIONS = [
  'Tối ưu lịch tuần này',
  'Tìm phòng tự học trống',
  'Lịch thi môn PRN211 khi nào?',
  'Kiểm tra xung đột môn',
];

export function MobileAIAssistantScreen() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState('');
  const [appliedAction, setAppliedAction] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (textToSend?: string) => {
    const text = textToSend || inputValue;
    if (!text.trim()) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: text.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');

    // Simulate AI intelligent response
    setTimeout(() => {
      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: `Cóc Trợ Lý đã phân tích yêu cầu "${text}". Lịch học của bạn đã được kiểm tra: không phát hiện xung đột giảng viên hay phòng học. Bạn đã sẵn sàng cho buổi học tiếp theo!`,
      };
      setMessages((prev) => [...prev, aiMsg]);
    }, 600);
  };

  const handleApplyAction = (msgId: string) => {
    setAppliedAction(msgId);
    showToast('Đã áp dụng đề xuất vào thời khóa biểu của bạn!', 'success');
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-var(--m-nav-height))]">
      <MobilePageHeader
        title="Cóc Trợ Lý AI"
        subtitle="Hỗ trợ xếp lịch học tập FPTU"
        leftAction={
          <div className="w-8 h-8 rounded-full bg-[var(--m-brand-soft)] border border-[var(--m-brand-primary)] flex items-center justify-center text-[var(--m-brand-primary)] mr-1 shadow-xs">
            <Sparkles size={16} />
          </div>
        }
      />

      {/* Chat Messages Flow */}
      <main className="mobile-view-container flex-1 flex flex-col gap-3.5 pb-4">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            {msg.sender === 'ai' ? (
              <div className="flex items-start gap-2 max-w-[90%]">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-xs">
                  <Sparkles size={13} />
                </div>
                <div className="flex flex-col gap-2 flex-1">
                  <div
                    className="mobile-card p-3.5 rounded-2xl rounded-tl-xs text-xs text-[var(--m-text-primary)] leading-relaxed shadow-xs"
                    style={{
                      background: 'var(--m-surface)',
                      border: '1px solid var(--m-border)',
                    }}
                  >
                    {msg.text}
                  </div>

                  {/* Optional AI Action Proposal */}
                  {msg.action && (
                    <div
                      className="p-3 rounded-xl border flex flex-col gap-2 shadow-xs"
                      style={{
                        background: 'var(--m-brand-soft)',
                        borderColor: 'var(--m-brand-subtle)',
                      }}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--m-brand-deep)]">
                        <Calendar size={14} />
                        <span>Đề xuất xếp lịch</span>
                      </div>
                      <p className="text-[11px] text-[var(--m-text-secondary)]">{msg.action.description}</p>
                      <button
                        type="button"
                        onClick={() => handleApplyAction(msg.id)}
                        disabled={appliedAction === msg.id}
                        className={`mobile-touch-target px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                          appliedAction === msg.id
                            ? 'bg-emerald-600 text-white'
                            : 'bg-[var(--m-brand-primary)] text-white active:scale-95'
                        }`}
                      >
                        {appliedAction === msg.id ? '✓ Đã xếp vào lịch' : msg.action.label}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div
                className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-tr-xs text-xs text-white leading-relaxed font-medium shadow-xs"
                style={{
                  background: 'var(--m-brand-primary)',
                }}
              >
                {msg.text}
              </div>
            )}
          </motion.div>
        ))}

        {/* Suggestion Chips */}
        <div className="flex flex-col gap-1.5 mt-2 pt-2 border-t border-[var(--m-border-faint)]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--m-text-muted)] px-1">
            Gợi ý nhanh
          </span>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((sug) => (
              <button
                key={sug}
                type="button"
                onClick={() => handleSend(sug)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--m-surface)] border border-[var(--m-border)] text-[var(--m-text-secondary)] hover:border-[var(--m-brand-primary)] hover:text-[var(--m-brand-primary)] active:scale-95 transition-all shadow-2xs"
              >
                {sug}
              </button>
            ))}
          </div>
        </div>

        <div ref={messagesEndRef} />
      </main>

      {/* Floating Bottom Chat Input Bar */}
      <div
        className="sticky bottom-0 left-0 right-0 p-3 z-30"
        style={{
          background: 'var(--m-surface-glass)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid var(--m-border)',
        }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="max-w-[600px] mx-auto flex items-center gap-2"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Hỏi Cóc AI về lịch học, bài tập..."
            className="flex-1 h-11 px-4 rounded-full border border-[var(--m-border)] bg-[var(--m-surface)] text-[var(--m-text-primary)] text-xs outline-none focus:border-[var(--m-brand-primary)] focus:ring-2 focus:ring-[var(--m-brand-soft)] shadow-xs"
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="w-11 h-11 rounded-full text-white flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-sm transition-transform"
            style={{
              background: 'var(--m-brand-primary)',
            }}
            aria-label="Gửi tin nhắn"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
