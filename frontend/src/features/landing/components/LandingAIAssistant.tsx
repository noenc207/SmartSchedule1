import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollWordRevealText, ShimmerSweepBadge } from '../../../components/effects/AnimateText';

interface ChatScenario {
  id: string;
  label: string;
  prompt: string;
  response: string;
  actionTag: string;
  timeEstimate: string;
}

const AI_SCENARIOS: ChatScenario[] = [
  {
    id: 'exam-prep',
    label: 'Ôn tập trước ca thi',
    prompt: 'Cóc AI ơi, chiều nay mình có ca thi vấn đáp MAS291 lúc 13:30. Hãy xếp cho mình 1 slot tự học sâu sáng nay nhé!',
    response: 'Đã phân tích lịch của bạn: Bạn có Slot 1 (PRN211) từ 07:30 - 09:00. Khung giờ 09:30 - 11:30 hoàn toàn trống! Mình đã xếp slot "Ôn tập sâu MAS291" tại Thư viện Tòa Alpha và chèn thêm 30 phút nghỉ trưa + đệm di chuyển đến phòng thi.',
    actionTag: 'Đã đặt: Deep Work 120 phút',
    timeEstimate: '09:30 - 11:30 · Thư viện Alpha',
  },
  {
    id: 'sprint-deadline',
    label: 'Cân đối deadline đồ án',
    prompt: 'Tuần sau mình phải nộp Sprint 2 SWP391 và 2 bài Lab C#. Phân bổ thời gian thế nào để không bị thức khuya?',
    response: 'Để tránh dồn vào Chủ Nhật, mình chia nhỏ tiến độ: 2 ca tự học 90 phút vào Thứ Tư & Thứ Sáu (Slot 5: 15:15) cho SWP391, và 1 ca sáng Thứ Bảy cho Lab C#. Bạn sẽ hoàn thành trước hạn 24 tiếng!',
    actionTag: 'Pacing tự động: 3 ca học tập',
    timeEstimate: 'Thứ 4, 6 & Thứ 7',
  },
  {
    id: 'campus-transit',
    label: 'Tránh trễ giờ chuyển tòa',
    prompt: 'Slot 1 học ở Alpha, Slot 2 học ở Beta chỉ cách nhau 15 phút. Có kịp không Cóc ơi?',
    response: 'Khoảng cách giữa Tòa Alpha và Beta là khoảng 600m (khoảng 8 phút đi bộ hoặc 3 phút xe bus nội khu). Mình đã đánh dấu cờ ưu tiên "Rời lớp đúng giờ" và nhắc nhở điện thoại trước 5 phút để bạn kịp sang lớp đúng giờ.',
    actionTag: 'Tự động tính đệm di chuyển 15p',
    timeEstimate: 'Đệm an toàn: Alpha → Beta',
  },
];

export function LandingAIAssistant() {
  const [activeScenario, setActiveScenario] = useState<ChatScenario>(AI_SCENARIOS[0]);

  return (
    <section id="ai-assistant" className="landing-ai-section" aria-labelledby="ai-heading">
      <div className="landing-container">
        <motion.div
          className="landing-section-header"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <ShimmerSweepBadge delay={0.05} duration={0.8} className="inline-block">
            <span className="landing-pill-badge">
              <span className="landing-pill-dot" aria-hidden="true" />
              AI COMPANION 24/7 · MÔ PHỎNG NỘI BỘ
            </span>
          </ShimmerSweepBadge>

          <h2 id="ai-heading" className="landing-section-title">
            <ScrollWordRevealText
              text="Trợ lý AI thông minh "
              as="span"
              delay={0.1}
            />
            <span className="landing-hero-headline-highlight">
              <ScrollWordRevealText
                text="thấu hiểu nhịp học FPTU"
                as="span"
                delay={0.25}
                highlight={true}
              />
            </span>
          </h2>
          <motion.p
            className="landing-section-subtitle"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            Không chỉ là bảng giờ tĩnh. Trợ lý AI chủ động nhận diện khoảng trống, gợi ý giờ ôn tập sâu và cảnh báo trước mọi nguy cơ trễ hạn.
          </motion.p>
        </motion.div>

        {/* Interactive Assistant Dialogue Showcase */}
        <div className="landing-ai-showcase-grid">
          {/* Left Column: Quick prompt buttons */}
          <motion.div
            className="landing-ai-scenarios-list"
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="landing-ai-scenarios-title">Tình huống thực tế của sinh viên:</span>
            {AI_SCENARIOS.map((scenario, idx) => {
              const isSelected = activeScenario.id === scenario.id;
              return (
                <motion.button
                  key={scenario.id}
                  type="button"
                  className={`landing-ai-scenario-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => setActiveScenario(scenario)}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: 0.1 + idx * 0.1 }}
                  whileHover={{ x: 4, transition: { duration: 0.15 } }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="landing-ai-btn-dot" />
                  <div className="landing-ai-btn-text">
                    <span className="landing-ai-btn-label">{scenario.label}</span>
                    <span className="landing-ai-btn-sub">{scenario.actionTag}</span>
                  </div>
                </motion.button>
              );
            })}

            <div style={{ marginTop: '14px', fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic' }}>
              ✦ Minh họa kịch bản giao diện thực tế (Không gọi API AI bên ngoài khi duyệt landing).
            </div>
          </motion.div>

          {/* Right Column: Live Chat Visual Mockup with Layered Reveal */}
          <motion.div
            className="landing-ai-chat-mockup"
            role="region"
            aria-label="Khung hội thoại với Trợ lý AI"
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            <header className="landing-ai-chat-header">
              <div className="landing-ai-avatar">
                <span>🐸</span>
              </div>
              <div className="landing-ai-chat-meta">
                <span className="landing-ai-chat-name">Cóc AI Assistant</span>
                <span className="landing-ai-chat-status">
                  <span className="landing-status-dot-green" /> Đang hoạt động · Sẵn sàng xếp lịch
                </span>
              </div>
              <span className="landing-ai-badge-academic">FPTU Engine v2.5</span>
            </header>

            <div className="landing-ai-chat-body">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeScenario.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
                >
                  {/* Student prompt */}
                  <motion.div
                    className="landing-chat-msg student-msg"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.05 }}
                  >
                    <div className="landing-chat-bubble student-bubble">
                      {activeScenario.prompt}
                    </div>
                    <span className="landing-chat-time">Sinh viên · Vừa xong</span>
                  </motion.div>

                  {/* AI response */}
                  <motion.div
                    className="landing-chat-msg ai-msg"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.45, delay: 0.18 }}
                  >
                    <div className="landing-chat-bubble ai-bubble">
                      <p>{activeScenario.response}</p>

                      <motion.div
                        className="landing-ai-action-card"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.35, delay: 0.3 }}
                      >
                        <div className="landing-ai-action-icon">✓</div>
                        <div className="landing-ai-action-info">
                          <span className="landing-ai-action-title">{activeScenario.actionTag}</span>
                          <span className="landing-ai-action-time">{activeScenario.timeEstimate}</span>
                        </div>
                      </motion.div>
                    </div>
                    <span className="landing-chat-time">Cóc AI Assistant · Đã tối ưu theo lịch cá nhân</span>
                  </motion.div>
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
