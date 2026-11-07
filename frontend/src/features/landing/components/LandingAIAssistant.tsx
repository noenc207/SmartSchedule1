import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Sparkles,
  CheckCircle2,
  Clock,
  MapPin,
  Send,
  CalendarPlus,
  Flame,
} from 'lucide-react';
import { BorderBeam } from '../../../components/ui/border-beam';

interface ChatScenario {
  id: string;
  badge: string;
  label: string;
  prompt: string;
  response: string;
  actionTag: string;
  timeEstimate: string;
  slotBooked: string;
}

const AI_SCENARIOS: ChatScenario[] = [
  {
    id: 'exam-prep',
    badge: 'Luyện thi FE / Vấn đáp',
    label: 'Ôn tập trước ca thi vấn đáp MAS291',
    prompt:
      'Cóc AI ơi, chiều nay mình có ca thi vấn đáp MAS291 lúc 13:30. Hãy xếp cho mình 1 slot tự học sâu sáng nay nhé!',
    response:
      'Đã phân tích lịch FAP của bạn: Bạn có Slot 1 (PRN211) từ 07:30 – 09:00 tại Tòa Alpha. Khung giờ Slot 2 (09:15 – 11:15) hoàn toàn trống! Mình đã đặt phiên "Ôn tập sâu MAS291 (120p)" tại Thư viện Tầng 2 và chèn sẵn 30 phút nghỉ trưa trước khi vào phòng thi.',
    actionTag: 'Đã chèn: Deep Work 120 phút',
    timeEstimate: '09:15 – 11:15 · Thư viện Alpha',
    slotBooked: 'Slot 2 · Thư viện Tòa Alpha',
  },
  {
    id: 'sprint-deadline',
    badge: 'Đồ án SWP391 / Capstone',
    label: 'Chia nhỏ Sprint đồ án không thức khuya',
    prompt:
      'Tuần này nhóm mình phải nộp Sprint 2 SWP391 (cần khoảng 6 tiếng code) và 2 bài Lab C#. Phân bổ sao để không bị thức trắng đêm?',
    response:
      'Để bảo vệ nhịp sinh học, mình đã dùng bộ giải OR-Tools chia 6 tiếng SWP391 thành 4 phiên (90 phút/phiên) vào các Slot 3 trống ngày Thứ Ba, Tư, Năm, Sáu tại Atrium. 2 bài Lab C# được xếp vào sáng Thứ Bảy. Bạn sẽ hoàn thành toàn bộ trước hạn 24 giờ!',
    actionTag: 'Pacing tự động: 4 phiên × 90p',
    timeEstimate: 'Hoàn thành sớm 24h trước hạn LMS',
    slotBooked: 'Slot 3 · Thứ 3 → Thứ 6 · Atrium',
  },
  {
    id: 'campus-transit',
    badge: 'Định tuyến Quy Nhơn Campus',
    label: 'Kiểm tra đệm chuyển tòa Alpha sang Beta',
    prompt:
      'Thứ Năm mình học Slot 1 ở Tòa Alpha, ngay sau đó Slot 2 học Thực hành AI ở Tòa Beta. Có bị trễ giờ điểm danh không Cóc?',
    response:
      'Khoảng cách đi bộ từ phòng A.304 (Alpha) sang Lab B.208 (Beta) là 280m (~4.2 phút đi bộ). Mình đã tự động bật nhãn "Ưu tiên rời lớp đúng 09:00" và cài báo thức nhắc chuyển tòa lúc 08:58 để bạn có trọn vẹn 15 phút đệm thư thả!',
    actionTag: 'Đã bật: Đệm an toàn 15 phút',
    timeEstimate: '280m · 4.2 phút đi bộ',
    slotBooked: '09:00 – 09:15 · Lộ trình Alpha → Beta',
  },
  {
    id: 'atrium-group',
    badge: 'Họp nhóm Đồ án',
    label: 'Tìm slot trống chung cho 4 thành viên nhóm',
    prompt:
      'Tìm giúp nhóm Capstone 4 người tụi mình 1 ca trống chung 90 phút trong tuần này tại khu tự học Atrium nhé!',
    response:
      'Đã đối chiếu lịch 6 slot của cả 4 thành viên! Khung giờ duy nhất cả 4 bạn cùng rảnh và đạt độ tập trung cao (94% Focus Score) là Thứ Tư · Slot 5 (14:30 – 16:00). Mình đã tạo lịch họp nhóm kèm link tài liệu Sprint Review.',
    actionTag: '0 Xung đột · 4/4 thành viên rảnh',
    timeEstimate: 'Thứ Tư · 14:30 – 16:00',
    slotBooked: 'Slot 5 · Khu tự học Atrium',
  },
];

export function LandingAIAssistant() {
  const [activeScenario, setActiveScenario] = useState<ChatScenario>(AI_SCENARIOS[0]);
  const [appliedIds, setAppliedIds] = useState<Record<string, boolean>>({});

  const isApplied = !!appliedIds[activeScenario.id];

  const handleApply = () => {
    setAppliedIds((prev) => ({ ...prev, [activeScenario.id]: !prev[activeScenario.id] }));
  };

  return (
    <section id="ai-assistant" className="landing-ai-section" aria-labelledby="ai-heading">
      <div className="landing-container">
        {/* Section Header */}
        <div className="landing-section-header">
          <div className="landing-pill-badge">
            <span className="landing-pill-dot" aria-hidden="true" />
            TRỢ LÝ HỌC VỤ CÓC AI 24/7
          </div>

          <h2 id="ai-heading" className="landing-section-title">
            Trò chuyện tự nhiên,{' '}
            <span className="landing-hero-headline-highlight">
              xếp lịch tức thì
            </span>{' '}
            cùng Cóc Trợ Lý AI
          </h2>

          <p className="landing-section-subtitle">
            Không cần tự kéo thả từng ô lịch. Chỉ cần nói mục tiêu học tập của bạn bằng tiếng Việt, Cóc AI sẽ phân tích thời khóa biểu FAP và đề xuất phương án tối ưu nhất.
          </p>
        </div>

        {/* Main 2-Column Interactive Studio */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: 26,
            alignItems: 'stretch',
          }}
        >
          {/* Left Column: 4 Real Student Scenarios + Mascot Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: '#64748b',
                  marginBottom: 2,
                }}
              >
                Chọn tình huống thực tế của sinh viên FPTU:
              </span>

              {AI_SCENARIOS.map((scenario, idx) => {
                const isSelected = activeScenario.id === scenario.id;
                return (
                  <motion.button
                    key={scenario.id}
                    type="button"
                    onClick={() => setActiveScenario(scenario)}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.99 }}
                    style={{
                      appearance: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      padding: '16px 18px',
                      borderRadius: 18,
                      background: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                      border: isSelected ? '2px solid #ea580c' : '1px solid #e2e8f0',
                      boxShadow: isSelected
                        ? '0 14px 32px -10px rgba(234, 88, 12, 0.2)'
                        : '0 4px 12px rgba(15, 23, 42, 0.03)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 14,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: 999,
                            background: isSelected ? 'rgba(234, 88, 12, 0.12)' : '#f1f5f9',
                            color: isSelected ? '#ea580c' : '#64748b',
                          }}
                        >
                          0{idx + 1} · {scenario.badge}
                        </span>
                        {appliedIds[scenario.id] && (
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              color: '#059669',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                            }}
                          >
                            <CheckCircle2 size={12} /> Đã áp dụng
                          </span>
                        )}
                      </div>
                      <strong
                        style={{
                          fontSize: '0.98rem',
                          fontWeight: 800,
                          color: isSelected ? '#0f172a' : '#334155',
                          display: 'block',
                        }}
                      >
                        {scenario.label}
                      </strong>
                    </div>

                    <span
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        background: isSelected ? '#ea580c' : '#f1f5f9',
                        color: isSelected ? '#ffffff' : '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        flexShrink: 0,
                      }}
                    >
                      →
                    </span>
                  </motion.button>
                );
              })}
            </div>

            {/* Mascot Companion Highlight Strip */}
            <div
              style={{
                padding: '16px 20px',
                borderRadius: 20,
                background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
                border: '1px solid #fed7aa',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <img
                src="/banner/mascot_thumbsup.png"
                alt="Cóc AI Thumbs Up"
                style={{
                  width: 64,
                  height: 64,
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 8px 16px rgba(234, 88, 12, 0.25))',
                  flexShrink: 0,
                }}
              />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <Flame size={14} color="#ea580c" />
                  <strong style={{ fontSize: '0.88rem', color: '#9a3412' }}>
                    Cóc AI hiểu rõ từng mã môn FPTU
                  </strong>
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#7c2d12', lineHeight: 1.45 }}>
                  Từ MAS291, PRN211, SWP391 đến đồ án tốt nghiệp — trợ lý tự động ước lượng độ khó và gợi ý khung giờ học hiệu quả nhất.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Live Interactive AI Chat Terminal */}
          <div
            style={{
              position: 'relative',
              borderRadius: 26,
              background: '#0f172a',
              border: '1px solid rgba(148, 163, 184, 0.22)',
              boxShadow: '0 28px 60px -15px rgba(15, 23, 42, 0.28)',
              padding: '24px 26px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 20,
              overflow: 'hidden',
              color: '#f8fafc',
            }}
          >
            <BorderBeam size={240} duration={10} colorFrom="#f97316" colorTo="#38bdf8" />

            {/* Terminal Top Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: 16,
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    background: 'rgba(249, 115, 22, 0.18)',
                    border: '1px solid rgba(249, 115, 22, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src="/mascot-chat.png"
                    alt="Cóc AI Avatar"
                    style={{ width: 36, height: 36, objectFit: 'contain' }}
                  />
                </div>
                <div>
                  <strong style={{ fontSize: '0.96rem', color: '#ffffff', display: 'block' }}>
                    Cóc AI Academic Copilot
                  </strong>
                  <span style={{ fontSize: '0.76rem', color: '#34d399', fontWeight: 700 }}>
                    ● Đang kết nối OR-Tools Engine · Phản hồi 0.2s
                  </span>
                </div>
              </div>

              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#cbd5e1',
                }}
              >
                FPTU AI Campus
              </span>
            </div>

            {/* Chat Conversation Stream */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeScenario.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.24 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
              >
                {/* Student Message Bubble */}
                <div style={{ alignSelf: 'flex-end', maxWidth: '88%' }}>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      color: '#94a3b8',
                      textAlign: 'right',
                      marginBottom: 4,
                      fontWeight: 600,
                    }}
                  >
                    Sinh viên K17 · Quy Nhơn AI Campus
                  </div>
                  <div
                    style={{
                      padding: '13px 16px',
                      borderRadius: '18px 18px 4px 18px',
                      background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                      color: '#ffffff',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      lineHeight: 1.55,
                      boxShadow: '0 10px 24px -6px rgba(234, 88, 12, 0.4)',
                    }}
                  >
                    “{activeScenario.prompt}”
                  </div>
                </div>

                {/* Cóc AI Response Bubble */}
                <div style={{ alignSelf: 'flex-start', maxWidth: '94%' }}>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      color: '#fdba74',
                      marginBottom: 4,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <Sparkles size={12} /> Cóc AI đã phân tích 6 Slot & Ràng buộc
                  </div>
                  <div
                    style={{
                      padding: '16px 18px',
                      borderRadius: '18px 18px 18px 4px',
                      background: 'rgba(30, 41, 59, 0.92)',
                      border: '1px solid rgba(148, 163, 184, 0.22)',
                      color: '#f1f5f9',
                      fontSize: '0.9rem',
                      lineHeight: 1.6,
                    }}
                  >
                    <p style={{ margin: '0 0 12px' }}>{activeScenario.response}</p>

                    {/* Action Result Pill Inside Bubble */}
                    <div
                      style={{
                        padding: '10px 14px',
                        borderRadius: 12,
                        background: 'rgba(15, 23, 42, 0.75)',
                        border: '1px solid rgba(56, 189, 248, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 8,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CheckCircle2 size={15} color="#34d399" />
                        <strong style={{ fontSize: '0.82rem', color: '#6ee7b7' }}>
                          {activeScenario.actionTag}
                        </strong>
                      </div>
                      <span
                        style={{
                          fontSize: '0.78rem',
                          color: '#93c5fd',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                      >
                        <Clock size={12} /> {activeScenario.timeEstimate}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Interactive Bottom Action Bar */}
            <div
              style={{
                paddingTop: 14,
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: '#cbd5e1' }}>
                <MapPin size={14} color="#38bdf8" />
                <span>Đề xuất: <strong style={{ color: '#ffffff' }}>{activeScenario.slotBooked}</strong></span>
              </div>

              <motion.button
                type="button"
                onClick={handleApply}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  appearance: 'none',
                  cursor: 'pointer',
                  padding: '9px 16px',
                  borderRadius: 12,
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  background: isApplied
                    ? 'rgba(16, 185, 129, 0.2)'
                    : 'linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)',
                  color: isApplied ? '#6ee7b7' : '#ffffff',
                  border: isApplied ? '1px solid rgba(16, 185, 129, 0.45)' : 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {isApplied ? (
                  <>
                    <CheckCircle2 size={14} />
                    <span>Đã thêm vào Thời khóa biểu mẫu!</span>
                  </>
                ) : (
                  <>
                    <CalendarPlus size={14} />
                    <span>Áp dụng thử vào lịch (1-Chạm)</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
