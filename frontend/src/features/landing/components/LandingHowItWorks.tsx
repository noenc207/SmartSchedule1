import React from 'react';
import { motion } from 'framer-motion';
import { CalendarCheck, FileSpreadsheet, Cpu, Sparkles } from 'lucide-react';

const STEPS = [
  {
    step: '01',
    icon: CalendarCheck,
    color: '#2563eb',
    bg: 'rgba(37, 99, 235, 0.1)',
    title: 'Đồng bộ Thời khóa biểu FAP',
    desc: 'Đăng nhập bằng tài khoản sinh viên FPTU và nhập nhanh các ca học theo 6 slot chuẩn từ cổng FAP chỉ trong 30 giây.',
  },
  {
    step: '02',
    icon: FileSpreadsheet,
    color: '#ea580c',
    bg: 'rgba(234, 88, 12, 0.1)',
    title: 'Khai báo Đồ án & Hạn chót LMS',
    desc: 'Thêm các cột mốc đồ án SWP391, bài Lab hàng tuần và thời lượng ước tính bạn cần để hoàn thành từng học phần.',
  },
  {
    step: '03',
    icon: Cpu,
    color: '#059669',
    bg: 'rgba(5, 150, 105, 0.1)',
    title: 'OR-Tools CP-SAT Tối ưu 6 Slot',
    desc: 'Thuật toán tự động tính đệm di chuyển 15 phút giữa Tòa Alpha – Beta và xếp các phiên học sâu 90 phút vào khung giờ vàng.',
  },
  {
    step: '04',
    icon: Sparkles,
    color: '#7c3aed',
    bg: 'rgba(124, 58, 237, 0.1)',
    title: 'Bám sát Tiến độ cùng Cóc AI',
    desc: 'Nhận thông báo nhắc chuyển tòa, theo dõi chuỗi ngày học tập (Streak) và 1-chạm dời lịch khi có sự kiện đột xuất.',
  },
];

export function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="landing-section" aria-labelledby="how-it-works-heading">
      <div className="landing-container">
        <div className="landing-section-header">
          <div className="landing-pill-badge">
            <span className="landing-pill-dot" aria-hidden="true" />
            QUY TRÌNH 4 BƯỚC TINH GỌN
          </div>

          <h2 id="how-it-works-heading" className="landing-section-title">
            Chỉ 2 phút thiết lập để{' '}
            <span className="landing-hero-headline-highlight">
              làm chủ trọn kỳ học
            </span>{' '}
            10 tuần tại FPTU
          </h2>

          <p className="landing-section-desc">
            Không cần kẻ bảng thủ công trên Notion hay Excel. SmartSchedule tự động hóa toàn bộ quy trình điều phối thời gian học thuật.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 22,
          }}
        >
          {STEPS.map((item) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.step}
                whileHover={{ y: -6 }}
                transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                style={{
                  background: '#ffffff',
                  borderRadius: 24,
                  padding: '28px 24px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 12px 32px -12px rgba(15, 23, 42, 0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      background: item.bg,
                      color: item.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={22} />
                  </div>
                  <span
                    style={{
                      fontSize: '1.65rem',
                      fontWeight: 900,
                      color: '#cbd5e1',
                      letterSpacing: '-0.04em',
                    }}
                  >
                    {item.step}
                  </span>
                </div>

                <h3
                  style={{
                    fontSize: '1.16rem',
                    fontWeight: 800,
                    color: '#0f172a',
                    margin: 0,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {item.title}
                </h3>

                <p
                  style={{
                    fontSize: '0.92rem',
                    color: '#475569',
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {item.desc}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
