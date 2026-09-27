import React, { useState } from 'react';
import { AnimatedSection } from './AnimatedSection';

export function WhatIfSection() {
  // Slider step index: 0 = 11:05, 1 = 11:10, 2 = 11:15, 3 = 11:20, 4 = 11:30
  const [sliderIndex, setSliderIndex] = useState<number>(3); // default 11:20

  const timeSlots = [
    {
      timeStr: '11:05',
      bufferMins: 5,
      walkMins: 9,
      status: 'XUNG ĐỘT',
      statusClass: 'badge-danger',
      headline: 'Không khả thi — Thiếu 4 phút',
      explanation:
        'Chỉ có 5 phút giữa hai tiết học, trong khi cần ít nhất 9 phút để đi từ Campus Building A sang Campus Lab. Bạn chắc chắn sẽ vào lớp muộn.',
      recommendation: 'SmartSchedule khuyến nghị dời lịch sang tối thiểu 11:15.',
    },
    {
      timeStr: '11:10',
      bufferMins: 10,
      walkMins: 9,
      status: 'SÁT NÚT',
      statusClass: 'badge-warning',
      headline: 'Vừa khít — Dư đúng 1 phút đệm',
      explanation:
        'Thời gian đi bộ 9 phút trên tổng 10 phút giải lao. Nếu giảng viên kéo dài vài chục giây hoặc phải chờ thang máy, bạn sẽ trễ giờ.',
      recommendation: 'Khả thi nhưng có áp lực. Nên cân nhắc thêm 5–10 phút đệm.',
    },
    {
      timeStr: '11:15',
      bufferMins: 15,
      walkMins: 9,
      status: 'KHẢ THI',
      statusClass: 'badge-info',
      headline: 'Khả thi — Dư 6 phút thư giãn',
      explanation:
        'Bạn có 9 phút đi bộ thư thái trong khuôn viên và 6 phút để uống nước, chuẩn bị tài liệu trước khi bắt đầu tiết học tiếp theo.',
      recommendation: 'Một lựa chọn cân bằng và an toàn.',
    },
    {
      timeStr: '11:20',
      bufferMins: 20,
      walkMins: 9,
      status: 'TỐI ƯU',
      statusClass: 'badge-success',
      headline: 'Tối ưu nhất — Đề xuất mặc định của Smart Plan',
      explanation:
        'Khoảng đệm 20 phút đem lại sự thảnh thơi tối đa, tâm lý thoải mái và sẵn sàng tập trung cao độ cho buổi thực hành Machine Learning.',
      recommendation: 'Phương án được thuật toán khuyến nghị cao nhất.',
    },
    {
      timeStr: '11:30',
      bufferMins: 30,
      walkMins: 9,
      status: 'DƯ DẢ',
      statusClass: 'badge-neutral',
      headline: 'Rộng rãi — Có thời gian tự ôn tập',
      explanation:
        'Khoảng nghỉ 30 phút đủ để bạn ngồi tại sảnh thư viện duyệt lại tài liệu buổi học trước hoặc trao đổi nhanh với bạn cùng nhóm.',
      recommendation: 'Thích hợp nếu bạn muốn có thời gian thảo luận trước giờ học.',
    },
  ];

  const current = timeSlots[sliderIndex];

  return (
    <section id="what-if" className="landing-section landing-what-if">
      <AnimatedSection variant="fadeUp">
        <div className="section-header text-center">
          <span className="section-pill">TRẢI NGHIỆM TƯƠNG TÁC</span>
          <h2 className="section-title">Mô phỏng What-if: Thử nghiệm không rủi ro</h2>
          <p className="section-subtitle">
            Kéo thanh trượt bên dưới để xem cách hệ thống phân tích va chạm thời gian thực. Hoàn toàn diễn ra trên trình duyệt của bạn, không làm xáo trộn dữ liệu thực.
          </p>
        </div>
      </AnimatedSection>

      <AnimatedSection variant="scaleIn" delay={0.15}>
        <div className="what-if-simulator-card">
          <div className="simulator-controls">
            <div className="controls-header">
              <span className="controls-label">Điều chỉnh giờ bắt đầu tiết học tại Campus Lab:</span>
              <span className="controls-value-badge">{current.timeStr}</span>
            </div>

            <div className="slider-wrapper">
              <input
                type="range"
                min="0"
                max="4"
                step="1"
                value={sliderIndex}
                onChange={(e) => setSliderIndex(parseInt(e.target.value, 10))}
                className="what-if-range-slider"
                aria-label="Chọn giờ bắt đầu tiết học tiếp theo"
              />
              <div className="slider-ticks">
                {timeSlots.map((slot, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`tick-mark ${sliderIndex === idx ? 'active' : ''}`}
                    onClick={() => setSliderIndex(idx)}
                  >
                    {slot.timeStr}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Realtime Feedback Card */}
          <div className="simulator-feedback">
            <div className="feedback-top-row">
              <span className={`status-badge ${current.statusClass}`}>{current.status}</span>
              <div className="buffer-metric">
                Khoảng nghỉ: <strong>{current.bufferMins} phút</strong> · Yêu cầu di chuyển: <strong>{current.walkMins} phút</strong>
              </div>
            </div>

            <h3 className="feedback-headline" style={{ transition: 'all 0.3s ease' }}>{current.headline}</h3>
            <p className="feedback-explanation" style={{ transition: 'all 0.3s ease' }}>{current.explanation}</p>

            <div className="feedback-recommendation-box">
              <span className="rec-label">Gợi ý từ SmartSchedule:</span>
              <span className="rec-text">{current.recommendation}</span>
            </div>
          </div>
        </div>
      </AnimatedSection>
    </section>
  );
}
