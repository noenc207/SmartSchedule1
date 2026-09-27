import React, { useState } from 'react';
import { AnimatedSection, motion } from './AnimatedSection';

export function MobilitySection() {
  const [activeScenario, setActiveScenario] = useState<'tight' | 'safe'>('tight');

  return (
    <section id="mobility" className="landing-section landing-mobility">
      <AnimatedSection variant="fadeUp">
        <div className="section-header text-center">
          <span className="section-pill">CÔNG NGHỆ BẢN ĐỊA HOÁ</span>
          <h2 className="section-title">Nhận thức di chuyển: Không để bạn kẹt giữa hai tiết học</h2>
          <p className="section-subtitle">
            Khuôn viên FPT University Quy Nhơn có các toà nhà học thuật, phòng lab và thư viện với khoảng cách thực tế. SmartSchedule âm thầm bảo vệ bạn khỏi những khoảng chuyển tiếp bất khả thi.
          </p>
        </div>
      </AnimatedSection>

      {/* 3 Core Rules Banner */}
      <AnimatedSection variant="fadeUp" delay={0.1}>
        <div className="mobility-rules-banner">
          <div className="mobility-rule-item">
            <span className="rule-badge badge-neutral">100% TUỲ CHỌN</span>
            <div className="rule-title">Địa điểm không bắt buộc</div>
            <p className="rule-text">Sự kiện online, tự học ở nhà hoặc không nhập vị trí sẽ không bị can thiệp hay đòi hỏi thông tin.</p>
          </div>
          <div className="mobility-rule-item">
            <span className="rule-badge badge-info">CỤC BỘ & NHẸ NHÀNG</span>
            <div className="rule-title">Không cần API ngoài</div>
            <p className="rule-text">Đồ thị khoảng cách khuôn viên được tính toán trực tiếp, bảo mật quyền riêng tư và hoạt động siêu tốc.</p>
          </div>
          <div className="mobility-rule-item">
            <span className="rule-badge badge-success">CẢNH BÁO TỐI THIỂU</span>
            <div className="rule-title">Chỉ thông báo khi cần</div>
            <p className="rule-text">Hệ thống giữ im lặng tuyệt đối trừ khi phát hiện bạn chắc chắn sẽ không kịp giờ di chuyển.</p>
          </div>
        </div>
      </AnimatedSection>

      {/* Visual Campus Mobility Demo */}
      <AnimatedSection variant="scaleIn" delay={0.2}>
        <div className="mobility-interactive-demo">
          <div className="demo-toggle-row">
            <span className="demo-toggle-label">Thử nghiệm kịch bản:</span>
            <button
              type="button"
              className={`demo-tab-btn ${activeScenario === 'tight' ? 'active' : ''}`}
              onClick={() => setActiveScenario('tight')}
            >
              Ca học sát nút (11:05)
            </button>
            <button
              type="button"
              className={`demo-tab-btn ${activeScenario === 'safe' ? 'active' : ''}`}
              onClick={() => setActiveScenario('safe')}
            >
              Đề xuất tối ưu (11:20)
            </button>
          </div>

          <div className="campus-transition-card">
            {/* Origin Node */}
            <div className="campus-node node-origin">
              <div className="node-time">09:00 – 11:00</div>
              <div className="node-title">Cơ sở dữ liệu</div>
              <div className="node-location">📍 Campus Building A</div>
            </div>

            {/* Travel Segment Path */}
            <div className="campus-travel-path">
              <div className="travel-line">
                <span className="travel-marker">🚶</span>
                <span className="travel-distance-label">9 phút đi bộ khuôn viên (khoảng 650m)</span>
              </div>
              {activeScenario === 'tight' ? (
                <div className="travel-warning-box">
                  <span className="warning-pill badge-danger">CẢNH BÁO: CHỈ CÓ 5 PHÚT NGHỈ</span>
                  <span className="warning-text">
                    Không đủ thời gian đi bộ 9 phút sang toà Lab. Nguy cơ trễ tiết học thực hành!
                  </span>
                </div>
              ) : (
                <div className="travel-safe-box">
                  <span className="safe-pill badge-success">✓ AN TOÀN: CÓ 20 PHÚT ĐỆM</span>
                  <span className="safe-text">
                    Thoải mái đi bộ 9 phút, còn dư 11 phút thư thả chuẩn bị chỗ ngồi trong lab.
                  </span>
                </div>
              )}
            </div>

            {/* Destination Node */}
            <div className={`campus-node node-destination ${activeScenario === 'tight' ? 'is-tight' : 'is-safe'}`}>
              <div className="node-time">
                {activeScenario === 'tight' ? '11:05 – 12:35' : '11:20 – 12:50'}
              </div>
              <div className="node-title">Machine Learning (Lab)</div>
              <div className="node-location">📍 Campus Lab</div>
              <div className="node-status-sub">
                {activeScenario === 'tight' ? (
                  <span className="status-text-danger">⚠️ Nguy cơ trễ 4 phút</span>
                ) : (
                  <span className="status-text-success">✓ Khả thi 100%</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </AnimatedSection>
    </section>
  );
}
