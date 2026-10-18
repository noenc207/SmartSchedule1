import React from 'react';
import { motion } from 'framer-motion';
import { ScrollWordRevealText, ShimmerSweepBadge } from '../../../components/effects/AnimateText';

const STEPS = [
  {
    step: '1',
    title: 'Đồng bộ thời khóa biểu',
    desc: 'Đăng nhập tài khoản trường và nhập các lớp học theo 6 slot chuẩn FPTU từ FAP chỉ trong một phút.',
  },
  {
    step: '2',
    title: 'Thêm đồ án & bài tập',
    desc: 'Nhập hạn nộp bài tập lớn, đồ án môn học và khối lượng thời gian bạn ước tính cần để hoàn thành.',
  },
  {
    step: '3',
    title: 'Động cơ AI tự động xếp lịch',
    desc: 'Thuật toán tính toán đệm di chuyển giữa các tòa nhà campus và xếp các buổi tự học vào các slot rảnh nhất.',
  },
  {
    step: '4',
    title: 'Theo dõi & linh hoạt điều chỉnh',
    desc: 'Nhận thông báo trước giờ học, theo dõi tiến độ tuần và 1-click dời lịch khi có kế hoạch đột xuất.',
  },
];

export function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="landing-section" aria-labelledby="how-it-works-heading">
      <div className="landing-container">
        <motion.div
          className="landing-section-header"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <ShimmerSweepBadge delay={0.05} duration={0.8} className="inline-block">
            <span className="landing-section-pill">QUY TRÌNH TINH GỌN</span>
          </ShimmerSweepBadge>

          <h2 id="how-it-works-heading" className="landing-section-title">
            <ScrollWordRevealText
              text="Chỉ 4 bước để có một tuần học tập không áp lực"
              as="span"
              delay={0.12}
            />
          </h2>
          <motion.p
            className="landing-section-desc"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.6, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            Không cần mất hàng giờ kẻ bảng Excel hay phân vân giờ nào học bài. SmartSchedule biến việc lập kế hoạch thành trải nghiệm tự động và chính xác.
          </motion.p>
        </motion.div>

        {/* Progress Flow Container with Animated Connecting Line */}
        <div style={{ position: 'relative' }}>
          {/* Subtle connecting progress bar that draws across steps */}
          <motion.div
            aria-hidden="true"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.85, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'absolute',
              top: '40px',
              left: '8%',
              right: '8%',
              height: '2px',
              background: 'linear-gradient(90deg, rgba(234, 88, 12, 0.2) 0%, rgba(255, 122, 50, 0.7) 50%, rgba(157, 231, 255, 0.4) 100%)',
              transformOrigin: 'left center',
              zIndex: 0,
              pointerEvents: 'none',
            }}
          />

          <div className="landing-steps-row" style={{ position: 'relative', zIndex: 1 }}>
            {STEPS.map((item, idx) => (
              <motion.div
                key={item.step}
                className="landing-step-card"
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{
                  duration: 0.55,
                  delay: 0.1 + idx * 0.14,
                  ease: [0.22, 1, 0.36, 1],
                }}
                whileHover={{
                  y: -5,
                  borderColor: 'rgba(234, 88, 12, 0.4)',
                  boxShadow: '0 12px 28px rgba(0, 0, 0, 0.35)',
                  transition: { type: 'spring', stiffness: 350, damping: 22 },
                }}
              >
                <motion.div
                  className="landing-step-marker"
                  aria-hidden="true"
                  whileHover={{ scale: 1.15, rotate: [0, -5, 5, 0] }}
                  transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                >
                  {item.step}
                </motion.div>
                <h3 className="landing-step-title">{item.title}</h3>
                <p className="landing-step-desc">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
