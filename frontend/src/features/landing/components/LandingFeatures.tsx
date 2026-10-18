import React from 'react';
import { motion } from 'framer-motion';
import { ScrollWordRevealText, ShimmerSweepBadge } from '../../../components/effects/AnimateText';

const FEATURES = [
  {
    id: 'fptu-slots',
    badge: 'CHUẨN HÓA LỊCH FPTU',
    title: 'Khớp chính xác 6 Slot học đặc thù tại FPT University',
    desc: 'Không hiển thị theo lịch tuần chung chung. SmartSchedule được thiết kế riêng theo khung giờ 6 slot học của FPTU (07:30 đến 18:30), hỗ trợ đầy đủ ca học lý thuyết, ca thực hành lab và các buổi bảo vệ đồ án.',
    snippet: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 600 }}>
          <span style={{ color: '#f8faff' }}>Slot 1: 07:30 - 09:00</span>
          <span style={{ color: '#38bdf8' }}>Lý thuyết chuyên ngành</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 600 }}>
          <span style={{ color: '#f8faff' }}>Slot 2: 09:15 - 10:45</span>
          <span style={{ color: '#ff7a32' }}>Thực hành Lab máy</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 600 }}>
          <span style={{ color: '#f8faff' }}>Slot 4: 13:30 - 15:00</span>
          <span style={{ color: '#34d399' }}>Hội thảo & Workshop</span>
        </div>
      </div>
    ),
  },
  {
    id: 'conflict-detection',
    badge: 'THUẬT TOÁN THÔNG MINH',
    title: 'Tự động phát hiện và hóa giải xung đột lịch trình',
    desc: 'Khi bạn có lịch thi đột xuất, buổi họp nhóm đồ án hoặc sự kiện CLB trùng vào giờ tự học, thuật toán Constraint Satisfaction sẽ lập tức cảnh báo và tính toán phương án dời lịch sang khung giờ trống phù hợp nhất.',
    snippet: (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(234, 88, 12, 0.16)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255, 122, 50, 0.35)' }}>
        <div>
          <strong style={{ fontSize: '0.85rem', color: '#ffc46b', display: 'block' }}>Phát hiện trùng giờ Slot 3</strong>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Đã tự động chuyển khối ôn tập sang Slot 5 rảnh</span>
        </div>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 8px', background: '#059669', color: '#ffffff', borderRadius: '6px' }}>
          Đã giải quyết
        </span>
      </div>
    ),
  },
  {
    id: 'deadline-management',
    badge: 'CHỐNG NƯỚC RÚT',
    title: 'Phân bổ bài tập và đồ án lớn theo khối lượng giờ',
    desc: 'Nhập deadline đồ án (SWP391, Capstone, Assigment môn học), SmartSchedule sẽ chia nhỏ thành các phiên tập trung 90 phút và trải đều vào các slot trống trước hạn nộp, giúp bạn không bao giờ phải thức trắng đêm.',
    snippet: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
          <span style={{ color: '#f8faff' }}>Đồ án SWP391: Sprint 2</span>
          <strong style={{ color: '#ff7a32' }}>Cần 6h (4 slot học)</strong>
        </div>
        <div style={{ height: '6px', width: '100%', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ width: '75%', height: '100%', background: '#ea580c' }} />
        </div>
        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Đã tự động xếp 3 slot trong tuần · Còn 1 slot trước Thứ Sáu</span>
      </div>
    ),
  },
  {
    id: 'ai-assistant',
    badge: 'TRỢ LÝ HỌC VỤ AI',
    title: 'AI Companion chuyên sâu cho sinh viên AI Campus',
    desc: 'Đặt câu hỏi bằng tiếng Việt tự nhiên: "Hôm nay mình học phòng nào?", "Sắp xếp cho mình 4 tiếng ôn thi môn PRN211 trước thứ Bảy". AI hiểu ngữ cảnh thời khóa biểu của bạn và đưa ra câu trả lời chính xác trong tích tắc.',
    snippet: (
      <div style={{ background: 'rgba(17, 26, 58, 0.8)', border: '1px solid rgba(157, 231, 255, 0.16)', borderRadius: '8px', padding: '10px 12px' }}>
        <p style={{ margin: '0 0 6px', fontSize: '0.8rem', color: '#94a3b8' }}>
          💬 <em>"Hôm nay mình có slot nào trống để họp nhóm không?"</em>
        </p>
        <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: '#f8faff' }}>
          🤖 "Bạn rảnh Slot 3 (11:00 - 12:30) và Slot 5 (15:15 - 16:45) tại Tòa Beta."
        </p>
      </div>
    ),
  },
];

export function LandingFeatures() {
  return (
    <section id="features" className="landing-section landing-section-alt" aria-labelledby="features-heading">
      <div className="landing-container">
        <motion.div
          className="landing-section-header"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <ShimmerSweepBadge delay={0.05} duration={0.8} className="inline-block">
            <span className="landing-section-pill">TÍNH NĂNG NỔI BẬT</span>
          </ShimmerSweepBadge>

          <h2 id="features-heading" className="landing-section-title">
            <ScrollWordRevealText
              text="Được xây dựng cho nhịp sống học tập thực tế của sinh viên"
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
            Không chỉ là một ứng dụng lịch thông thường. SmartSchedule là hệ thống điều phối học tập thông minh giúp sinh viên tối ưu hóa từng giờ trong kỳ học.
          </motion.p>
        </motion.div>

        {/* 4 Feature Cards with Staggered Entrance and Smooth Hover Response */}
        <div className="landing-features-grid">
          {FEATURES.map((feature, idx) => (
            <motion.article
              key={feature.id}
              className="landing-feature-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{
                duration: 0.6,
                delay: 0.08 + idx * 0.12,
                ease: [0.22, 1, 0.36, 1],
              }}
              whileHover={{
                y: -6,
                borderColor: 'rgba(234, 88, 12, 0.45)',
                boxShadow: '0 16px 36px rgba(0, 0, 0, 0.4)',
                transition: { type: 'spring', stiffness: 350, damping: 22 },
              }}
            >
              <div>
                <div className="landing-feature-top">
                  <motion.span
                    className="landing-feature-icon-badge"
                    aria-hidden="true"
                    whileHover={{ scale: 1.15, rotate: 5 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    {idx + 1}
                  </motion.span>
                  <span className="landing-feature-tag">{feature.badge}</span>
                </div>
                <h3 className="landing-feature-title">{feature.title}</h3>
                <p className="landing-feature-desc">{feature.desc}</p>
              </div>

              <div className="landing-feature-snippet">{feature.snippet}</div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
