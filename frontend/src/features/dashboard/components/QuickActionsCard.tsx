import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Calendar, Plus, Sparkles, BarChart2, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

export function QuickActionsCard() {
  const navigate = useNavigate();

  const actions = [
    {
      id: 'a1',
      title: 'Tạo lịch học',
      desc: 'Xếp lịch thông minh',
      icon: <Calendar size={17} className="text-orange-500" />,
      colorClass: 'action-orange',
      route: '/scheduling',
    },
    {
      id: 'a2',
      title: 'Thêm bài tập',
      desc: 'Quản lý hạn nộp',
      icon: <Plus size={17} className="text-blue-500" />,
      colorClass: 'action-blue',
      route: '/tasks',
    },
    {
      id: 'a3',
      title: 'Tối ưu AI',
      desc: 'Giải quyết xung đột',
      icon: <Sparkles size={17} className="text-purple-500" />,
      colorClass: 'action-purple',
      route: '/rescheduling',
    },
    {
      id: 'a4',
      title: 'Xem báo cáo',
      desc: 'Phân tích hiệu suất',
      icon: <BarChart2 size={17} className="text-emerald-500" />,
      colorClass: 'action-green',
      route: '/analytics',
    },
  ];

  return (
    <motion.div
      className="mock-card mock-quick-actions-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.23 }}
    >
      <div className="mock-card-header">
        <div className="mock-card-title-group">
          <LayoutGrid size={16} className="mock-header-icon text-indigo-500" />
          <h2 className="mock-card-title">Hành động nhanh</h2>
        </div>
      </div>

      <div className="mock-actions-grid">
        {actions.map((act) => (
          <button
            key={act.id}
            type="button"
            className={`mock-action-tile ${act.colorClass}`}
            onClick={() => navigate(act.route)}
          >
            <div className="mock-tile-left">
              <span className="mock-tile-icon-box">{act.icon}</span>
              <div className="mock-tile-text-col">
                <span className="mock-tile-label">{act.title}</span>
                <span className="mock-tile-desc">{act.desc}</span>
              </div>
            </div>
            <ChevronRight size={14} className="mock-tile-chevron" />
          </button>
        ))}
      </div>
    </motion.div>
  );
}

