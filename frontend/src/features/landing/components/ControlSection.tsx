import React from 'react';
import { AnimatedSection, StaggerContainer } from './AnimatedSection';

export function ControlSection() {
  const steps = [
    {
      step: '01',
      badge: 'ĐỀ XUẤT',
      title: 'Hệ thống gợi ý giải pháp',
      desc: 'Smart Plan phân tích toàn diện lịch học, hạn chót và đệm di chuyển để tìm các vị trí xếp lịch tối ưu mà không tự ý lưu đè.',
    },
    {
      step: '02',
      badge: 'XEM XÉT',
      title: 'Kiểm tra trên Timeline trực quan',
      desc: 'Mọi thay đổi được đánh dấu màu nổi bật trên lịch biểu dạng bản nháp để bạn quan sát tổng thể trước khi quyết định.',
    },
    {
      step: '03',
      badge: 'GIẢI THÍCH',
      title: 'Minh bạch lý do thuật toán',
      desc: 'SmartSchedule luôn nêu rõ tại sao chọn khung giờ này: "Cách deadline 4 tiếng, đủ 15 phút đệm từ Campus Building A".',
    },
    {
      step: '04',
      badge: 'ĐIỀU CHỈNH',
      title: 'Tự do tuỳ biến theo ý bạn',
      desc: 'Nếu không hài lòng, bạn có thể kéo thả sang khung giờ khác, đổi thời lượng hoặc từ chối đề xuất bất kỳ lúc nào.',
    },
    {
      step: '05',
      badge: 'ÁP DỤNG',
      title: 'Chỉ ghi nhận khi bạn đồng ý',
      desc: 'Dữ liệu chỉ chính thức lưu vào lịch cá nhân khi bạn nhấn nút "Áp dụng vào lịch". Không có bất ngờ, không có ghi đè ngoài ý muốn.',
    },
  ];

  return (
    <section id="control" className="landing-section landing-control">
      <AnimatedSection variant="fadeUp">
        <div className="section-header text-center">
          <span className="section-pill">TRIẾT LÝ THIẾT KẾ</span>
          <h2 className="section-title">Bạn luôn là người làm chủ lịch trình</h2>
          <p className="section-subtitle">
            SmartSchedule được xây dựng với nguyên tắc AI hỗ trợ, con người quyết định. Không bao giờ tự động ghi đè, không gây xáo trộn bất ngờ.
          </p>
        </div>
      </AnimatedSection>

      <StaggerContainer className="control-steps-timeline" staggerDelay={0.1}>
        {steps.map((s, idx) => (
          <div key={idx} className="control-step-card">
            <div className="step-num-circle">{s.step}</div>
            <div className="step-content">
              <span className="status-badge badge-neutral">{s.badge}</span>
              <h3 className="step-title">{s.title}</h3>
              <p className="step-desc">{s.desc}</p>
            </div>
            {idx < steps.length - 1 && <div className="step-connector-line" />}
          </div>
        ))}
      </StaggerContainer>
    </section>
  );
}
