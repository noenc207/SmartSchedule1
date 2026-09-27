import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Calendar, Plus, Sparkles, BarChart2 } from 'lucide-react';
import { motion } from 'framer-motion';

export function QuickActionsCard() {
  const navigate = useNavigate();

  const actions = [
    {
      id: 'a1',
      title: 'Tạo lịch học',
      icon: <Calendar size={16} className="text-orange" />,
      colorClass: 'action-orange',
      route: '/scheduling',
    },
    {
      id: 'a2',
      title: 'Thêm công việc',
      icon: <Plus size={16} className="text-blue" />,
      colorClass: 'action-blue',
      route: '/tasks',
    },
    {
      id: 'a3',
      title: 'Lên kế hoạch',
      icon: <Sparkles size={16} className="text-purple" />,
      colorClass: 'action-purple',
      route: '/rescheduling',
    },
    {
      id: 'a4',
      title: 'Xem báo cáo',
      icon: <BarChart2 size={16} className="text-green" />,
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
          <LayoutGrid size={16} className="mock-header-icon" />
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
              <span className="mock-tile-icon">{act.icon}</span>
              <span className="mock-tile-label">{act.title}</span>
            </div>
            <span className="mock-tile-check-box" />
          </button>
        ))}
      </div>
    </motion.div>
  );
}
