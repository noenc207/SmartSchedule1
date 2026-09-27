import React from 'react';
import { AnimatedSection, StaggerContainer } from './AnimatedSection';

export function ProblemSection() {
  const problems = [
    {
      badge: 'ÁP LỰC HẠN CHÓT',
      badgeClass: 'badge-danger',
      title: 'Deadlines dồn dập & Bị động',
      description:
        'Bài tập lớn, đồ án và tiểu luận thường kết thúc cùng một khung giờ nửa đêm (23:59). Khi không có kế hoạch chia nhỏ, sinh viên rơi vào bẫy thức khuya dồn việc vào phút chót.',
      impact: 'Hiệu suất giảm sút · Quá tải nhận thức',
    },
    {
      badge: 'VẬT LÝ THỰC TẾ',
      badgeClass: 'badge-warning',
      title: 'Khoảng cách di chuyển bị lãng quên',
      description:
        'Lịch biểu truyền thống coi việc chuyển từ Campus Building A sang Campus Lab là tức thời (0 phút). Thực tế, 9 phút đi bộ giữa các toà nhà biến giờ giải lao thành cuộc chạy đua vội vã.',
      impact: 'Trễ giờ học lab · Mất tập trung đầu buổi',
    },
    {
      badge: 'THỜI GIAN VỤN VỠ',
      badgeClass: 'badge-info',
      title: 'Khoảng trống vô ích rải rác',
      description:
        'Những khoảng trống 15–25 phút giữa các ca học không đủ để bắt đầu một bài tập phức tạp, nhưng lại làm lãng phí hàng giờ mỗi tuần nếu không được gom nhóm một cách thông minh.',
      impact: 'Năng suất phân mảnh · Cảm giác bận rộn vô cớ',
    },
  ];

  return (
    <section id="problem" className="landing-section landing-problem">
      <AnimatedSection variant="fadeUp">
        <div className="section-header text-center">
          <span className="section-pill">THÁCH THỨC ĐIỂN HÌNH</span>
          <h2 className="section-title">Khi bài tập, deadline và khoảng cách thực tế va chạm</h2>
          <p className="section-subtitle">
            Lịch học của bạn không chỉ là những ô màu tĩnh trên màn hình. Trong thực tế, việc sắp xếp thời gian là một bài toán đa ràng buộc phức tạp.
          </p>
        </div>
      </AnimatedSection>

      <StaggerContainer className="problem-grid" staggerDelay={0.15}>
        {problems.map((p, idx) => (
          <div key={idx} className="problem-card">
            <div className="problem-card-top">
              <span className={`status-badge ${p.badgeClass}`}>{p.badge}</span>
              <span className="problem-number">0{idx + 1}</span>
            </div>
            <h3 className="problem-card-title">{p.title}</h3>
            <p className="problem-card-desc">{p.description}</p>
            <div className="problem-card-footer">
              <span className="impact-label">Hệ quả:</span>
              <span className="impact-text">{p.impact}</span>
            </div>
          </div>
        ))}
      </StaggerContainer>
    </section>
  );
}
