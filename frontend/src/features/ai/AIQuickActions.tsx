import React from 'react';
import { Calendar, Clock, AlertCircle, Sparkles, Zap, CheckSquare, Dumbbell, Coffee, BookOpen } from 'lucide-react';
import { useAiChatStore } from '../../stores/aiChatStore';

interface AIQuickActionsProps {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

export function AIQuickActions({ onSelect, disabled = false }: AIQuickActionsProps) {
  const activeContextMode = useAiChatStore((s) => s.activeContextMode);
  const preferredLanguage = useAiChatStore((s) => s.preferredLanguage);
  const isEn = preferredLanguage === 'en';

  const getActions = () => {
    switch (activeContextMode) {
      case 'WORK':
        return isEn
          ? [
              { label: 'Priority tasks today', prompt: 'What tasks and deliverables do I need to finish today?', icon: CheckSquare },
              { label: 'Project deadlines', prompt: 'What project deadlines or team milestones are due soon?', icon: AlertCircle },
              { label: 'Prioritize backlog', prompt: 'Help me prioritize and sequence my pending tasks intelligently.', icon: Sparkles },
              { label: 'Optimize workday', prompt: 'Optimize my workday schedule to avoid burnout and hit deadlines.', icon: Zap },
            ]
          : [
              { label: 'Task cần làm hôm nay', prompt: 'Hôm nay tôi có những công việc hay nhiệm vụ gì cần hoàn thành?', icon: CheckSquare },
              { label: 'Hạn chót dự án', prompt: 'Các deadline dự án hoặc bài tập nhóm nào sắp đến hạn?', icon: AlertCircle },
              { label: 'Sắp xếp việc ưu tiên', prompt: 'Phân tích và sắp xếp thứ tự ưu tiên các công việc tồn đọng cho tôi.', icon: Sparkles },
              { label: 'Tối ưu ngày làm việc', prompt: 'Tối ưu kế hoạch công việc hôm nay để làm việc hiệu quả nhất.', icon: Zap },
            ];

      case 'PERSONAL':
        return isEn
          ? [
              { label: 'Free time today', prompt: 'What free time slots do I have available today?', icon: Clock },
              { label: 'Healthy balance', prompt: 'Analyze my schedule and suggest healthy study-life balance and rest breaks.', icon: Coffee },
              { label: 'Workout slot', prompt: 'Suggest a good 45-minute slot for workout or exercise today.', icon: Dumbbell },
              { label: 'Day relaxation plan', prompt: 'Review my timetable and help me allocate evening downtime.', icon: Sparkles },
            ]
          : [
              { label: 'Giờ rảnh hôm nay', prompt: 'Hôm nay tôi có những khoảng trống thời gian rảnh nào?', icon: Clock },
              { label: 'Cân bằng sinh hoạt', prompt: 'Phân tích lịch trình và gợi ý khoảng nghỉ ngơi hợp lý để tránh quá tải.', icon: Coffee },
              { label: 'Lên lịch tập thể dục', prompt: 'Gợi ý khung giờ tập thể dục hoặc vận động thể chất phù hợp hôm nay.', icon: Dumbbell },
              { label: 'Khoảng nghỉ tối nay', prompt: 'Xem lịch tối nay và bố trí thời gian nghỉ ngơi, thư giãn cho tôi.', icon: Sparkles },
            ];

      case 'GENERAL':
        return isEn
          ? [
              { label: 'Optimize today', prompt: 'Optimize my entire day: classes, deadlines, and free time slots.', icon: Zap },
              { label: "Today's agenda", prompt: 'Give me a comprehensive overview of today: classes, tasks, and free slots.', icon: Calendar },
              { label: 'Upcoming deadlines', prompt: 'What are my most urgent academic and personal deadlines?', icon: AlertCircle },
              { label: 'Free slots', prompt: 'When am I completely free today?', icon: Clock },
            ]
          : [
              { label: 'Tối ưu tổng thể ngày', prompt: 'Hãy tối ưu toàn bộ ngày hôm nay: lịch học, deadline và giờ rảnh.', icon: Zap },
              { label: 'Tổng quan hôm nay', prompt: 'Cho tôi tổng quan ngày hôm nay: có lớp nào, việc cần làm và giờ rảnh.', icon: Calendar },
              { label: 'Hạn chót quan trọng', prompt: 'Các deadline quan trọng nhất sắp tới là gì?', icon: AlertCircle },
              { label: 'Tìm giờ rảnh', prompt: 'Hôm nay tôi có những khoảng thời gian trống nào?', icon: Clock },
            ];

      default: // ACADEMIC
        return isEn
          ? [
              { label: "Today's classes", prompt: 'What classes or lectures do I have scheduled today?', icon: Calendar },
              { label: 'Next lecture slot', prompt: 'When is my next class and which room is it in?', icon: Clock },
              { label: 'Homework & exams', prompt: 'Do I have any assignment deadlines or exams coming up?', icon: AlertCircle },
              { label: 'Optimize study day', prompt: 'Optimize today: balance class attendance and study sessions.', icon: Zap },
              { label: 'Exam study plan', prompt: 'Suggest a smart study plan based on my timetable and syllabus.', icon: Sparkles },
            ]
          : [
              { label: 'Lịch học hôm nay', prompt: 'Hôm nay tôi có những lớp học hay sự kiện gì?', icon: Calendar },
              { label: 'Tiết học tiếp theo', prompt: 'Tiết học tiếp theo của tôi bắt đầu lúc mấy giờ và ở phòng nào?', icon: Clock },
              { label: 'Hạn chót bài tập', prompt: 'Tôi có những bài tập hoặc deadline học phần nào sắp đến hạn?', icon: AlertCircle },
              { label: 'Tối ưu ngày học', prompt: 'Hãy tối ưu ngày hôm nay cho tôi: phân tích lịch học và gợi ý giờ tự học tốt nhất.', icon: Zap },
              { label: 'Gợi ý kế hoạch học', prompt: 'Dựa vào lịch học và giờ rảnh, hãy gợi ý kế hoạch ôn tập thông minh cho tôi.', icon: Sparkles },
            ];
    }
  };

  const actions = getActions();

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
