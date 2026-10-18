import React, { useState } from 'react';
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
    text: 'Chào Nhi! Cóc Trợ Lý AI của FPT University Quy Nhơn đã sẵn sàng. Mình có thể giúp bạn tối ưu lịch học, giải quyết xung đột môn học, hoặc xếp giờ ôn tập cho kỳ thi sắp tới.',
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
    <div className="mobile-app-shell">
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
      <main className="mobile-view-container flex flex-col gap-3 pb-28">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] p-3.5 rounded-2xl text-[0.9375rem] leading-relaxed shadow-sm ${
                msg.sender === 'user'
                  ? 'bg-[var(--m-brand-primary)] text-white rounded-tr-xs'
                  : 'bg-[var(--m-surface)] text-[var(--m-text-primary)] border border-[var(--m-border)] rounded-tl-xs'
              }`}
            >
              {msg.text}
            </div>

            {/* Optional AI Action Proposal */}
            {msg.action && (
              <div className="mt-2 w-[85%] p-3 rounded-xl bg-[var(--m-brand-soft)] border border-[var(--m-brand-subtle)] flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--m-brand-deep)]">
                  <Calendar size={14} />
                  <span>Đề xuất xếp lịch</span>
                </div>
                <p className="text-xs text-[var(--m-text-secondary)]">{msg.action.description}</p>
                <button
                  type="button"
                  onClick={() => handleApplyAction(msg.id)}
                  disabled={appliedAction === msg.id}
                  className={`mobile-touch-target px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    appliedAction === msg.id
                      ? 'bg-[var(--m-campus-green)] text-white'
                      : 'bg-[var(--m-brand-primary)] text-white active:scale-95'
                  }`}
                >
                  {appliedAction === msg.id ? '✓ Đã xếp vào lịch' : msg.action.label}
                </button>
              </div>
            )}
          </motion.div>
        ))}

        {/* Suggestion Chips */}
        <div className="flex flex-col gap-1.5 mt-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--m-text-muted)]">
            Gợi ý nhanh
          </span>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((sug) => (
              <button
                key={sug}
                type="button"
                onClick={() => handleSend(sug)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--m-surface)] border border-[var(--m-border)] text-[var(--m-text-secondary)] hover:border-[var(--m-brand-primary)] active:scale-95 transition-all"
              >
                {sug}
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Floating Chat Input Bar */}
      <div className="fixed bottom-[calc(var(--m-nav-height)+var(--m-safe-bottom))] left-0 right-0 p-3 bg-[var(--m-surface-glass)] backdrop-blur-md border-t border-[var(--m-border)] z-30">
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
            className="flex-1 h-[44px] px-4 rounded-full border border-[var(--m-border)] bg-[var(--m-surface)] text-[var(--m-text-primary)] text-sm outline-none focus:border-[var(--m-brand-primary)] focus:ring-2 focus:ring-[var(--m-brand-soft)] shadow-xs"
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="w-11 h-11 rounded-full bg-[var(--m-brand-primary)] text-white flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-sm transition-transform"
            aria-label="Gửi tin nhắn"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
