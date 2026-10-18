import React from 'react';
import { motion } from 'framer-motion';
import { ScrollWordRevealText, ShimmerSweepBadge } from '../../../components/effects/AnimateText';

const TRUST_POINTS = [
  {
    badge: 'BẢO MẬT TÀI KHOẢN',
    title: 'Xác thực Google Workspace @fpt.edu.vn',
    desc: 'Đăng nhập an toàn bằng tài khoản sinh viên FPT University thông qua Google OAuth. Không lưu trữ mật khẩu thuần, phiên đăng nhập được mã hóa theo tiêu chuẩn công nghiệp.',
  },
  {
    badge: 'THIẾT KẾ CHO CAMPUS',
    title: 'Tối ưu cho FPTU AI Campus Quy Nhơn',
    desc: 'Bản đồ di chuyển và đệm thời gian được hiệu chỉnh theo khoảng cách thực tế giữa Tòa Alpha, Beta, Thư viện và KTX, giúp sinh viên không bị trễ điểm danh.',
  },
  {
    badge: 'MINH BẠCH & RIÊNG TƯ',
    title: '100% Không quảng cáo & Không chia sẻ dữ liệu',
    desc: 'Toàn bộ thời khóa biểu, danh sách bài tập và đồ án cá nhân của bạn được bảo mật tuyệt đối. Ứng dụng tập trung duy nhất vào việc nâng cao kết quả học tập của bạn.',
  },
];

export function LandingTrust() {
  return (
    <section id="trust" className="landing-section" aria-labelledby="trust-heading">
      <div className="landing-container">
        <motion.div
          className="landing-section-header"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <ShimmerSweepBadge delay={0.05} duration={0.8} className="inline-block">
            <span className="landing-section-pill">AN TÂM SỬ DỤNG</span>
          </ShimmerSweepBadge>

          <h2 id="trust-heading" className="landing-section-title">
            <ScrollWordRevealText
              text="Bảo mật, riêng tư và gắn liền với môi trường học đường"
              as="span"
              delay={0.12}
            />
          </h2>
          <motion.p
            className="landing-section-desc"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            Chúng tôi hiểu rằng lịch học và thông tin đồ án là dữ liệu học vụ cá nhân quan trọng. SmartSchedule cam kết giữ mọi thứ an toàn và minh bạch.
          </motion.p>
        </motion.div>

        <div className="landing-trust-grid">
          {TRUST_POINTS.map((point, idx) => (
            <motion.div
              key={point.badge}
              className="landing-trust-card"
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{
                duration: 0.55,
                delay: 0.1 + idx * 0.14,
                ease: [0.22, 1, 0.36, 1],
              }}
              whileHover={{
                y: -5,
                borderColor: 'rgba(56, 189, 248, 0.4)',
                boxShadow: '0 12px 28px rgba(0, 0, 0, 0.35)',
                transition: { type: 'spring', stiffness: 350, damping: 22 },
              }}
            >
              <span className="landing-trust-badge">{point.badge}</span>
              <h3 className="landing-trust-title">{point.title}</h3>
              <p className="landing-trust-desc">{point.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
