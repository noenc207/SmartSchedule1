import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';

const FAQS = [
  {
    q: 'SmartSchedule có miễn phí cho sinh viên FPT University không?',
    a: 'Hoàn toàn miễn phí! Sinh viên FPT University Quy Nhơn (từ K15 đến K19) được sử dụng đầy đủ tính năng xếp lịch tự động OR-Tools CP-SAT, trợ lý Cóc AI và quản lý đồ án mà không giới hạn.',
  },
  {
    q: 'Khi giảng viên đổi lịch học hoặc thêm ca học bù trên FAP thì sao?',
    a: 'Bạn chỉ cần cập nhật ca học mới, hệ thống Lá chắn Xung đột của SmartSchedule sẽ tự động phát hiện các phiên tự học bị đè giờ và chuyển chúng sang slot trống gần nhất trong tuần chỉ với 1 cú nhấp chuột.',
  },
  {
    q: 'Hệ thống tính đệm di chuyển giữa Tòa Alpha và Beta như thế nào?',
    a: 'Thuật toán định tuyến nội khu tính sẵn khoảng cách đi bộ thực tế (280m ~ 4.2 phút đi bộ giữa Alpha và Beta) và tự động giữ trống 15 phút chuyển tiếp giữa hai ca học liên tiếp để bạn không bao giờ bị trễ điểm danh.',
  },
  {
    q: 'Mình có thể dùng chung lịch để tìm giờ họp nhóm Đồ án SWP391 / Capstone không?',
    a: 'Có! Cóc AI hỗ trợ đối chiếu các slot trống giữa các thành viên trong nhóm để gợi ý khung giờ họp nhóm tối ưu nhất tại khu tự học Atrium hoặc phòng thảo luận thư viện.',
  },
];

export function LandingFAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section id="faq" className="landing-section" aria-labelledby="faq-heading">
      <div className="landing-container" style={{ maxWidth: 880 }}>
        <div className="landing-section-header">
          <div className="landing-pill-badge">
            <span className="landing-pill-dot" aria-hidden="true" />
            GIẢI ĐÁP THẮC MẮC NHANH
          </div>

          <h2 id="faq-heading" className="landing-section-title">
            Câu hỏi thường gặp từ{' '}
            <span className="landing-hero-headline-highlight">
              sinh viên FPTU
            </span>
          </h2>

          <p className="landing-section-desc">
            Mọi điều bạn cần biết trước khi bắt đầu tối ưu hóa kỳ học của mình cùng SmartSchedule.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {FAQS.map((item, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={item.q}
                style={{
                  background: '#ffffff',
                  borderRadius: 20,
                  border: isOpen ? '1.5px solid #ea580c' : '1px solid #e2e8f0',
                  boxShadow: isOpen
                    ? '0 14px 32px -12px rgba(234, 88, 12, 0.14)'
                    : '0 4px 14px rgba(15, 23, 42, 0.03)',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  style={{
                    width: '100%',
                    appearance: 'none',
                    border: 'none',
                    background: 'transparent',
                    padding: '20px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <HelpCircle size={18} color={isOpen ? '#ea580c' : '#64748b'} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '1.02rem', fontWeight: 800, color: '#0f172a' }}>
                      {item.q}
                    </span>
                  </div>
                  <ChevronDown
                    size={18}
                    color={isOpen ? '#ea580c' : '#64748b'}
                    style={{
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                      flexShrink: 0,
                    }}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22 }}
                    >
                      <div
                        style={{
                          padding: '0 24px 20px 54px',
                          fontSize: '0.94rem',
                          color: '#475569',
                          lineHeight: 1.65,
                        }}
                      >
                        {item.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
