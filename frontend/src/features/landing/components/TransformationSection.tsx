import React, { useState } from 'react';
import { AnimatedSection, AnimatePresence, motion } from './AnimatedSection';

export function TransformationSection() {
  const [activeTab, setActiveTab] = useState<'comparison' | 'before' | 'after'>('comparison');

  return (
    <section id="transformation" className="landing-section landing-transformation">
      <AnimatedSection variant="fadeUp">
        <div className="section-header text-center">
          <span className="section-pill">SỰ KHÁC BIỆT CỐT LÕI</span>
          <h2 className="section-title">Từ lịch trình áp lực đến một ngày cân bằng</h2>
          <p className="section-subtitle">
            Chứng kiến sự chuyển dịch từ những ô lịch rời rạc sang một hệ thống thời gian tôn trọng nhịp sinh học và khoảng cách thực tế.
          </p>

          {/* View Toggle */}
          <div className="transformation-toggle-tabs">
            <button
              type="button"
              className={`toggle-tab ${activeTab === 'comparison' ? 'active' : ''}`}
              onClick={() => setActiveTab('comparison')}
            >
              Đối sánh song song
            </button>
            <button
              type="button"
              className={`toggle-tab ${activeTab === 'before' ? 'active' : ''}`}
              onClick={() => setActiveTab('before')}
            >
              Lịch thông thường
            </button>
            <button
              type="button"
              className={`toggle-tab ${activeTab === 'after' ? 'active' : ''}`}
              onClick={() => setActiveTab('after')}
            >
              Với SmartSchedule
            </button>
          </div>
        </div>
      </AnimatedSection>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className={`transformation-container view-${activeTab}`}
        >
          {/* BEFORE CARD */}
          {(activeTab === 'comparison' || activeTab === 'before') && (
            <div className="tf-timeline-card tf-card-before">
              <div className="tf-card-header">
                <span className="status-badge badge-danger">LỊCH TRÌNH CŨ: PHÂN MẢNH & RỦI RO</span>
                <span className="tf-summary-stat">3 điểm nghẽn áp lực</span>
              </div>

              <div className="tf-events-list">
                <div className="tf-event-item tf-item-normal">
                  <span className="tf-event-time">09:00 – 11:00</span>
                  <div className="tf-event-content">
                    <div className="tf-item-title">Cơ sở dữ liệu (Lý thuyết)</div>
                    <div className="tf-item-loc">Địa điểm: Campus Building A</div>
                  </div>
                </div>

                {/* Conflict gap: 5 mins between buildings */}
                <div className="tf-event-item tf-item-collision">
                  <span className="tf-collision-tag">⚠️ THIẾU 4 PHÚT DI CHUYỂN</span>
                  <div className="tf-collision-detail">
                    Khoảng nghỉ 5 phút không đủ để đi bộ 9 phút sang toà Lab.
                  </div>
                </div>

                <div className="tf-event-item tf-item-warning">
                  <span className="tf-event-time">11:05 – 12:35</span>
                  <div className="tf-event-content">
                    <div className="tf-item-title">Machine Learning (Thực hành)</div>
                    <div className="tf-item-loc">Địa điểm: Campus Lab</div>
                    <span className="item-sub-tag">Vào lớp trễ hoặc vội vã</span>
                  </div>
                </div>

                <div className="tf-event-item tf-item-fragmented">
                  <span className="tf-event-time">14:00 – 14:20</span>
                  <div className="tf-event-content">
                    <div className="tf-item-title">Khoảng trống 20 phút</div>
                    <div className="tf-item-loc">Không đủ để học sâu bài tập lớn</div>
                  </div>
                </div>

                <div className="tf-event-item tf-item-danger">
                  <span className="tf-event-time">23:50</span>
                  <div className="tf-event-content">
                    <div className="tf-item-title">Nộp Assignment 3 (Gấp gáp)</div>
                    <div className="tf-item-loc">Deadline sát nút, chất lượng chưa tối ưu</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AFTER CARD */}
          {(activeTab === 'comparison' || activeTab === 'after') && (
            <div className="tf-timeline-card tf-card-after">
              <div className="tf-card-header">
                <span className="status-badge badge-success">VỚI SMARTSCHEDULE: TỐI ƯU & KHẢ THI</span>
                <span className="tf-summary-stat">✓ 100% Khả thi thực tế</span>
              </div>

              <div className="tf-events-list">
                <div className="tf-event-item tf-item-normal">
                  <span className="tf-event-time">09:00 – 11:00</span>
                  <div className="tf-event-content">
                    <div className="tf-item-title">Cơ sở dữ liệu (Lý thuyết)</div>
                    <div className="tf-item-loc">Địa điểm: Campus Building A</div>
                  </div>
                </div>

                {/* Resolved buffer: 20 mins buffer */}
                <div className="tf-event-item tf-item-buffer">
                  <span className="tf-buffer-tag">🚶 15 PHÚT ĐỆM DI CHUYỂN AN TOÀN</span>
                  <div className="tf-buffer-detail">
                    Thoải mái đi bộ 9 phút giữa hai toà nhà + 6 phút chuẩn bị máy móc.
                  </div>
                </div>

                <div className="tf-event-item tf-item-success">
                  <span className="tf-event-time">11:20 – 12:50</span>
                  <div className="tf-event-content">
                    <div className="tf-item-title">Machine Learning (Thực hành)</div>
                    <div className="tf-item-loc">Địa điểm: Campus Lab</div>
                    <span className="item-sub-tag-success">Đến đúng giờ · Tâm thế sẵn sàng</span>
                  </div>
                </div>

                <div className="tf-event-item tf-item-focus">
                  <span className="tf-event-time">14:00 – 16:30</span>
                  <div className="tf-event-content">
                    <div className="tf-item-title">Smart Focus: Hoàn thành Assignment 3</div>
                    <div className="tf-item-loc">Địa điểm: Campus Library (Yên tĩnh)</div>
                    <span className="item-sub-tag-focus">Khối tập trung sâu 2.5 giờ liên tục</span>
                  </div>
                </div>

                <div className="tf-event-item tf-item-done">
                  <span className="tf-event-time">20:00</span>
                  <div className="tf-event-content">
                    <div className="tf-item-title">Assignment 3 đã nộp sớm</div>
                    <div className="tf-item-loc">Hoàn tất trước hạn 4 tiếng · Buổi tối thư giãn</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
