import React from 'react';
import { Calendar, Clock, AlertCircle, Sparkles, Zap } from 'lucide-react';

interface AIQuickActionsProps {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

export function AIQuickActions({ onSelect, disabled = false }: AIQuickActionsProps) {
  const actions = [
    {
      label: 'Tối ưu ngày hôm nay',
      prompt: 'Hãy tối ưu ngày hôm nay cho tôi: phân tích lịch học, deadline và gợi ý các khoảng thời gian học tập & nghỉ ngơi tốt nhất.',
      icon: Zap,
    },
    {
      label: 'Lịch học hôm nay',
      prompt: 'Hôm nay tôi có những lớp học hay sự kiện gì?',
      icon: Calendar,
    },
    {
      label: 'Tìm giờ rảnh hôm nay',
      prompt: 'Hôm nay tôi có những khoảng thời gian trống nào?',
      icon: Clock,
    },
    {
      label: 'Hạn chót sắp tới',
      prompt: 'Tôi có những nhiệm vụ hay deadline nào sắp đến hạn?',
      icon: AlertCircle,
    },
    {
      label: 'Gợi ý kế hoạch học',
      prompt: 'Dựa vào lịch học và giờ rảnh, hãy gợi ý kế hoạch ôn tập thông minh cho tôi.',
      icon: Sparkles,
    },
  ];

  return (
    <div className="ai-quick-actions-bar">
      <div className="ai-quick-actions-scroll">
        {actions.map((act, index) => {
          const Icon = act.icon;
          return (
            <button
              key={index}
              type="button"
              className="ai-quick-action-chip"
              onClick={() => onSelect(act.prompt)}
              disabled={disabled}
              title={act.prompt}
            >
              <Icon size={13} className="chip-icon" />
              <span>{act.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
