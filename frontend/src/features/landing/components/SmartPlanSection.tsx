import React, { useState } from 'react';
import { AnimatedSection, StaggerContainer, AnimatePresence, motion } from './AnimatedSection';

export function SmartPlanSection() {
  const [selectedFactor, setSelectedFactor] = useState<number>(0);

  const factors = [
    {
      title: 'Phân tích khoảng trống (Gap Detection)',
      desc: 'Quét toàn bộ tuần học để tìm ra các khoảng trống khả dụng. Hệ thống tự động phân loại khoảng trống nhỏ (nghỉ ngơi/di chuyển) và khoảng trống lớn (học sâu).',
      detail: 'Tự động tính toán: 15p (nghỉ ngắn), 45p (ôn bài), 120p+ (làm đồ án chuyên sâu).',
    },
    {
      title: 'Tôn trọng lịch cố định (Hard Constraints)',
      desc: 'Lịch học chính khoá FPTU, lịch thi và các cuộc hẹn đã cam kết luôn là bất biến. Smart Plan chỉ xếp nhiệm vụ vào thời gian thực sự rảnh.',
      detail: 'Bảo toàn 100% các môn học tín chỉ không bị xê dịch hay gián đoạn.',
    },
    {
      title: 'Cân nhắc đệm di chuyển & Địa điểm',
      desc: 'Nếu hai sự kiện liên tiếp diễn ra ở hai toà nhà khác nhau, hệ thống tự động cộng thêm thời gian đi bộ trước khi đề xuất giờ bắt đầu.',
      detail: 'Tránh hoàn toàn tình trạng đặt lịch sát nút gây trễ giờ học.',
    },
    {
      title: 'Tối ưu hoá năng lượng học tập (Energy Fit)',
      desc: 'Ưu tiên xếp các môn toán, lập trình nặng vào buổi sáng hoặc đầu giờ chiều khi độ tập trung cao nhất, dành việc nhẹ cho cuối ngày.',
      detail: 'Giảm thiểu cảm giác kiệt sức và trì hoãn (procrastination).',
    },
  ];

  return (
    <section id="smart-plan" className="landing-section landing-smart-plan">
      <AnimatedSection variant="fadeUp">
        <div className="section-header text-center">
          <span className="section-pill">CÔNG NGHỆ CỐT LÕI</span>
          <h2 className="section-title">Smart Plan: Bộ điều phối đa ràng buộc</h2>
          <p className="section-subtitle">
            Không đoán mò, không ghi đè tự tiện. SmartSchedule tính toán đồng thời hạn chót, thời lượng, khoảng trống và khoảng cách để đề xuất phương án tối ưu nhất cho bạn.
          </p>
        </div>
      </AnimatedSection>

      {/* 3-Step Flow Diagram */}
      <AnimatedSection variant="fadeUp" delay={0.1}>
        <div className="smart-plan-pipeline">
          {/* Step 1: Input */}
          <div className="pipeline-col">
            <div className="pipeline-header">
              <span className="pipeline-step-num">BƯỚC 01</span>
              <h3 className="pipeline-col-title">Dữ liệu đầu vào</h3>
              <span className="pipeline-sub">Nhiệm vụ & Cam kết</span>
            </div>
            <div className="pipeline-cards-list">
              <div className="pipeline-mini-card">
                <span className="mini-card-tag badge-info">LỊCH CỐ ĐỊNH</span>
                <div className="mini-card-text">Lịch học kỳ FPT University Quy Nhơn</div>
              </div>
              <div className="pipeline-mini-card">
                <span className="mini-card-tag badge-warning">DEADLINE</span>
                <div className="mini-card-text">3 bài tập tuần + Đồ án nhóm AI</div>
              </div>
              <div className="pipeline-mini-card">
                <span className="mini-card-tag badge-neutral">ĐỊA ĐIỂM</span>
                <div className="mini-card-text">Campus Building A, Lab, Thư viện</div>
              </div>
            </div>
          </div>

          {/* Step Arrow */}
          <div className="pipeline-connector">
            <span className="connector-symbol">→</span>
            <span className="connector-text">Phân tích</span>
          </div>

          {/* Step 2: Engine */}
          <div className="pipeline-col engine-col">
            <div className="pipeline-header">
              <span className="pipeline-step-num">BƯỚC 02</span>
              <h3 className="pipeline-col-title">Bộ lọc Smart Plan</h3>
              <span className="pipeline-sub">Đánh giá đa tiêu chí</span>
            </div>
            <div className="engine-factors-interactive">
              {factors.map((f, idx) => (
                <div
                  key={idx}
                  className={`factor-item ${selectedFactor === idx ? 'active' : ''}`}
                  onClick={() => setSelectedFactor(idx)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="factor-title">
                    <span className="factor-bullet">{selectedFactor === idx ? '●' : '○'}</span>
                    {f.title}
                  </div>
                  <AnimatePresence>
                    {selectedFactor === idx && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div className="factor-body">
                          <p>{f.desc}</p>
                          <div className="factor-detail-tag">{f.detail}</div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>

          {/* Step Arrow */}
          <div className="pipeline-connector">
            <span className="connector-symbol">→</span>
            <span className="connector-text">Đề xuất</span>
          </div>

          {/* Step 3: Output */}
          <div className="pipeline-col">
            <div className="pipeline-header">
              <span className="pipeline-step-num">BƯỚC 03</span>
              <h3 className="pipeline-col-title">Phương án hoàn chỉnh</h3>
              <span className="pipeline-sub">Minh bạch & Kiểm duyệt</span>
            </div>
            <div className="pipeline-cards-list">
              <div className="pipeline-mini-card result-card">
                <span className="mini-card-tag badge-success">✓ KHÔNG XUNG ĐỘT</span>
                <div className="mini-card-text">Bảo toàn 100% lịch học trên lớp</div>
              </div>
              <div className="pipeline-mini-card result-card">
                <span className="mini-card-tag badge-success">✓ ĐỦ ĐỆM DI CHUYỂN</span>
                <div className="mini-card-text">Tự động chèn 15p đi bộ an toàn</div>
              </div>
              <div className="pipeline-mini-card result-card">
                <span className="mini-card-tag badge-success">✓ HOÀN THÀNH SỚM</span>
                <div className="mini-card-text">Nộp bài trước hạn chót ít nhất 4h</div>
              </div>
            </div>
            <div className="pipeline-action-note">
              <span className="user-control-badge">BẠN QUYẾT ĐỊNH</span>
              <p>Xem trước phương án trên Calendar, điều chỉnh nếu muốn rồi mới bấm Áp dụng.</p>
            </div>
          </div>
        </div>
      </AnimatedSection>
    </section>
  );
}
