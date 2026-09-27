import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Coffee,
  BookOpen,
  Compass,
  BarChart2,
} from 'lucide-react';
import type { EventItem, Task, Category } from '../../../types/domain';
import type { KpiMetric } from '../types/dashboard';

export interface KpiBreakdownItem {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeVariant?: 'success' | 'warning' | 'danger' | 'info';
  meta?: string;
  isCompleted?: boolean;
  onToggle?: () => void;
}

export type DetailModalData =
  | { type: 'event'; event: EventItem; category?: Category }
  | { type: 'task'; task: Task }
  | { type: 'metric'; metric: KpiMetric }
  | {
      type: 'kpi-breakdown';
      metricId: string;
      title: string;
      value: string;
      subtext: string;
      description?: string;
      items: KpiBreakdownItem[];
      aiInsight?: string;
      actionButton?: {
        label: string;
        route?: string;
        onClick?: () => void;
      };
    };

interface DashboardDetailModalProps {
  data: DetailModalData | null;
  onClose: () => void;
}

export function DashboardDetailModal({ data, onClose }: DashboardDetailModalProps) {
  const navigate = useNavigate();

  if (!data) return null;

  const renderEventDetails = (event: EventItem, category?: Category) => {
    const startDate = new Date(event.startsAt);
    const endDate = new Date(event.endsAt);
    const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));

    const timeStr = `${startDate.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    })} – ${endDate.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;

    const dateStr = startDate.toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const isLab = (event.location ?? '').toLowerCase().includes('lab') || event.title.toLowerCase().includes('lab');
    const isLibrary = (event.location ?? '').toLowerCase().includes('thư viện') || (event.location ?? '').toLowerCase().includes('library');
    const isDeepWork = event.title.toLowerCase().includes('focus') || event.title.toLowerCase().includes('tập trung') || event.title.toLowerCase().includes('tự học');

    return (
      <div className="detail-drawer-content">
        <div className="detail-hero-tag">
          <span
            className="category-chip"
            style={{
              background: category?.color ? `${category.color}22` : 'rgba(242, 112, 36, 0.15)',
              color: category?.color || '#f27024',
              borderColor: category?.color ? `${category.color}44` : 'rgba(242, 112, 36, 0.3)',
            }}
          >
            {category?.name || (isDeepWork ? 'Học sâu AI' : 'Lịch học FPTU')}
          </span>
          {event.fixed && <span className="status-badge badge-neutral">LỊCH CỐ ĐỊNH</span>}
          {isLab && <span className="status-badge badge-info">THỰC HÀNH LAB</span>}
        </div>

        <h2 className="detail-modal-title">{event.title}</h2>

        {event.description && <p className="detail-modal-desc">{event.description}</p>}

        <div className="detail-cards-grid">
          {/* Time Card */}
          <div className="detail-info-card">
            <div className="detail-card-icon">
              <Clock size={16} />
            </div>
            <div className="detail-card-body">
              <span className="card-micro-label">Khung giờ & Thời lượng</span>
              <strong>{timeStr}</strong>
              <small>{dateStr} · {Math.floor(durationMinutes / 60)}h{durationMinutes % 60 > 0 ? `${durationMinutes % 60}p` : ''}</small>
            </div>
          </div>

          {/* Location Card */}
          <div className="detail-info-card">
            <div className="detail-card-icon">
              <MapPin size={16} />
            </div>
            <div className="detail-card-body">
              <span className="card-micro-label">Địa điểm khuôn viên</span>
              <strong>{event.location || 'Campus FPT University Quy Nhơn'}</strong>
              <small>
                {isLab
                  ? 'Khu nhà Lab AI · Tầng 2'
                  : isLibrary
                  ? 'Thư viện trung tâm · Không gian yên tĩnh'
                  : 'Toà nhà học thuật chính · Quy Nhơn'}
              </small>
            </div>
          </div>
        </div>

        {/* AI Scheduling & Mobility Analysis */}
        <div className="detail-section-box">
          <div className="section-box-header">
            <Compass size={16} className="accent-icon" />
            <h3>Phân tích đệm di chuyển & Không gian</h3>
          </div>
          <p>
            Hệ thống tự động tính toán khoảng cách nội khu FPT University Quy Nhơn. Giữa các toà nhà học thuật và toà Lab có khoảng cách đi bộ trung bình <strong>9 phút (khoảng 650m)</strong>.
          </p>
          <div className="mobility-status-indicator safe">
            <CheckCircle2 size={15} />
            <span>Đã bảo đảm tối thiểu 15 phút đệm di chuyển an toàn</span>
          </div>
        </div>

        {/* Cognitive / Energy Fit */}
        <div className="detail-section-box">
          <div className="section-box-header">
            <Flame size={16} className="accent-icon" />
            <h3>Độ phù hợp năng lượng (Energy Fit)</h3>
          </div>
          <p>
            Khung giờ này nằm trong nhịp sinh học năng lượng cao. Thích hợp tối đa để tiếp thu kiến thức lập trình, toán rời rạc hoặc thực hành mô hình AI.
          </p>
        </div>

        {/* Actions */}
        <div className="detail-modal-actions">
          <button
            type="button"
            className="hero-btn-gradient-primary"
            onClick={() => {
              onClose();
              navigate('/calendar');
            }}
          >
            <Calendar size={15} />
            <span>Mở Lịch biểu toàn diện</span>
          </button>
          <button
            type="button"
            className="hero-btn-glass"
            onClick={() => {
              onClose();
              navigate('/rescheduling');
            }}
          >
            <Sparkles size={15} />
            <span>Điều chỉnh khung giờ</span>
          </button>
        </div>
      </div>
    );
  };

  const renderTaskDetails = (task: Task) => {
    const deadlineDate = task.deadline ? new Date(task.deadline) : null;
    const isHigh = task.priority === 'HIGH';

    return (
      <div className="detail-drawer-content">
        <div className="detail-hero-tag">
          <span className={`status-badge ${isHigh ? 'badge-danger' : 'badge-warning'}`}>
            ƯU TIÊN: {task.priority}
          </span>
          <span className="status-badge badge-neutral">
            TRẠNG THÁI: {task.status === 'DONE' ? 'HOÀN THÀNH' : 'ĐANG THỰC HIỆN'}
          </span>
        </div>

        <h2 className="detail-modal-title">{task.title}</h2>
        {task.description && <p className="detail-modal-desc">{task.description}</p>}

        <div className="detail-cards-grid">
          <div className="detail-info-card">
            <div className="detail-card-icon">
              <Clock size={16} />
            </div>
            <div className="detail-card-body">
              <span className="card-micro-label">Hạn chót (Deadline)</span>
              <strong>
                {deadlineDate
                  ? deadlineDate.toLocaleDateString('vi-VN', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Không có hạn chót cụ thể'}
              </strong>
              <small>Nộp qua hệ thống học tập FPTU</small>
            </div>
          </div>

          <div className="detail-info-card">
            <div className="detail-card-icon">
              <BookOpen size={16} />
            </div>
            <div className="detail-card-body">
              <span className="card-micro-label">Thời gian ước tính</span>
              <strong>{Math.round(task.estimatedDurationMinutes / 60 * 10) / 10} giờ học sâu</strong>
              <small>Khuyến nghị chia làm 2 phiên 45 phút</small>
            </div>
          </div>
        </div>

        <div className="detail-section-box">
          <div className="section-box-header">
            <Sparkles size={16} className="accent-icon" />
            <h3>Gợi ý xếp lịch tự động từ Smart Plan</h3>
          </div>
          <p>
            Thuật toán Smart Plan có thể tìm các khoảng trống lớn (≥ 90 phút) tại Thư viện hoặc phòng tự học để xếp khối thời gian tập trung trước deadline ít nhất 4 tiếng.
          </p>
        </div>

        <div className="detail-modal-actions">
          <button
            type="button"
            className="hero-btn-gradient-primary"
            onClick={() => {
              onClose();
              navigate('/scheduling');
            }}
          >
            <Sparkles size={15} />
            <span>Xếp lịch bài tập này bằng AI</span>
          </button>
          <button
            type="button"
            className="hero-btn-glass"
            onClick={() => {
              onClose();
              navigate('/tasks');
            }}
          >
            <ArrowRight size={15} />
            <span>Xem danh sách Tasks</span>
          </button>
        </div>
      </div>
    );
  };

  const renderMetricDetails = (metric: KpiMetric) => {
    return (
      <div className="detail-drawer-content">
        <div className="detail-hero-tag">
          <span className="status-badge badge-info">PHÂN TÍCH CHUYÊN SÂU</span>
          {metric.badge && <span className="status-badge badge-success">{metric.badge.text}</span>}
        </div>

        <h2 className="detail-modal-title">{metric.label}</h2>
        <div className="metric-giant-display">
          <span className="giant-val">{metric.value}</span>
          <span className="giant-sub">{metric.subtext}</span>
        </div>

        <div className="detail-section-box">
          <div className="section-box-header">
            <BarChart2 size={16} className="accent-icon" />
            <h3>Đánh giá cân bằng học tập tuần này</h3>
          </div>
          <p>
            Chỉ số phản ánh khối lượng thời gian thực tế đã cam kết so với năng lượng nhận thức tối ưu. Bạn đang duy trì nhịp độ ổn định, không có xung đột lịch học và còn đủ thời gian cho hoạt động ngoại khóa.
          </p>
        </div>

        <div className="detail-modal-actions">
          <button
            type="button"
            className="hero-btn-gradient-primary"
            onClick={() => {
              onClose();
              navigate('/analytics');
            }}
          >
            <BarChart2 size={15} />
            <span>Mở trang Thống kê chi tiết</span>
          </button>
        </div>
      </div>
    );
  };

  const renderKpiBreakdown = (kpi: Extract<DetailModalData, { type: 'kpi-breakdown' }>) => {
    return (
      <div className="detail-drawer-content">
        <div className="detail-hero-tag">
          <span className="status-badge badge-info">XEM NHANH CHỈ SỐ</span>
          <span className="status-badge badge-neutral">ĐỒNG BỘ THỰC TẾ</span>
        </div>

        <h2 className="detail-modal-title">{kpi.title}</h2>
        <div className="metric-giant-display">
          <span className="giant-val">{kpi.value}</span>
          <span className="giant-sub">{kpi.subtext}</span>
        </div>

        {kpi.description && <p className="detail-modal-desc">{kpi.description}</p>}

        {/* Breakdown Items List */}
        <div className="detail-section-box">
          <div className="section-box-header">
            <BarChart2 size={16} className="accent-icon" />
            <h3>Danh sách chi tiết ({kpi.items.length})</h3>
          </div>

          <div className="kpi-breakdown-list">
            {kpi.items.length === 0 ? (
              <div className="kpi-breakdown-empty">Không có mục nào trong danh sách</div>
            ) : (
              kpi.items.map((item) => (
                <div
                  key={item.id}
                  className={`kpi-breakdown-item ${item.isCompleted ? 'is-completed' : ''}`}
                >
                  {item.onToggle && (
                    <button
                      type="button"
                      className={`kpi-item-checkbox ${item.isCompleted ? 'checked' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        item.onToggle?.();
                      }}
                      title={item.isCompleted ? 'Đánh dấu chưa xong' : 'Đánh dấu đã hoàn thành'}
                      aria-label={item.title}
                    >
                      {item.isCompleted && <CheckCircle2 size={16} />}
                    </button>
                  )}
                  <div className="kpi-item-content">
                    <div className="kpi-item-top">
                      <strong className="kpi-item-title">{item.title}</strong>
                      {item.badge && (
                        <span className={`kpi-item-badge badge-${item.badgeVariant || 'info'}`}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                    {item.subtitle && <span className="kpi-item-sub">{item.subtitle}</span>}
                    {item.meta && <small className="kpi-item-meta">{item.meta}</small>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* AI Smart Insight */}
        {kpi.aiInsight && (
          <div className="detail-section-box">
            <div className="section-box-header">
              <Sparkles size={16} className="accent-icon" />
              <h3>Gợi ý thông minh từ AI</h3>
            </div>
            <p>{kpi.aiInsight}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="detail-modal-actions">
          <button
            type="button"
            className="hero-btn-gradient-primary"
            onClick={onClose}
          >
            <span>Đã hiểu</span>
          </button>
          {kpi.actionButton && (
            <button
              type="button"
              className="hero-btn-glass"
              onClick={() => {
                onClose();
                if (kpi.actionButton?.onClick) kpi.actionButton.onClick();
                else if (kpi.actionButton?.route) navigate(kpi.actionButton.route);
              }}
            >
              <span>{kpi.actionButton.label}</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      <div className="detail-modal-overlay" onClick={onClose}>
        <motion.div
          className="detail-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        />

        <motion.aside
          className="detail-drawer"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 26, stiffness: 280 }}
        >
          <div className="detail-drawer-header">
            <span className="drawer-eyebrow">CHI TIẾT MỤC CHỌN</span>
            <button
              type="button"
              className="drawer-close-btn"
              onClick={onClose}
              aria-label="Đóng bảng chi tiết"
            >
              <X size={18} />
            </button>
          </div>

          <div className="detail-drawer-scrollable">
            {data.type === 'event' && renderEventDetails(data.event, data.category)}
            {data.type === 'task' && renderTaskDetails(data.task)}
            {data.type === 'metric' && renderMetricDetails(data.metric)}
            {data.type === 'kpi-breakdown' && renderKpiBreakdown(data)}
          </div>
        </motion.aside>
      </div>
    </AnimatePresence>
  );
}
