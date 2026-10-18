import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollWordRevealText, ShimmerSweepBadge } from '../../../components/effects/AnimateText';

const FAQS = [
  {
    q: 'SmartSchedule có hoàn toàn miễn phí cho sinh viên không?',
    a: 'Có. Tất cả sinh viên FPT University đều có thể đăng ký và sử dụng toàn bộ tính năng quản lý lịch học, xếp slot tự học, phát hiện xung đột và trợ lý học vụ AI hoàn toàn miễn phí.',
  },
  {
    q: 'Làm thế nào để tôi nhập thời khóa biểu kỳ mới vào ứng dụng?',
    a: 'Bạn có thể nhập danh sách các môn và mã lớp theo kỳ từ cổng FAP. Hệ thống được lập trình sẵn chuẩn 6 slot của trường nên các môn học sẽ lập tức vào đúng phòng và giờ tương ứng.',
  },
  {
    q: 'Đệm di chuyển (Transit Buffer) giữa các tòa nhà hoạt động ra sao?',
    a: 'Nếu bạn có Slot 1 tại Tòa Alpha và Slot 2 tại Tòa Beta, SmartSchedule sẽ tính toán khoảng đệm 15 phút nghỉ ngơi và di chuyển, đồng thời ngăn việc xếp lịch tự học xen ngang vào quãng thời gian này.',
  },
  {
    q: 'Nếu có lịch thi hoặc buổi họp đồ án đột xuất thì giải quyết thế nào?',
    a: 'Chỉ cần thêm sự kiện mới hoặc bật tính năng "Giải quyết xung đột", hệ thống sẽ tự động quét các khung giờ trống còn lại trong tuần và dời các khối tự học sang vị trí mới tối ưu nhất.',
  },
  {
    q: 'Ứng dụng có hỗ trợ giao diện điện thoại di động không?',
    a: 'Có! Toàn bộ giao diện SmartSchedule được thiết kế theo chuẩn responsive mobile-first, hiển thị sắc nét trên cả điện thoại, máy tính bảng và màn hình máy tính để bàn.',
  },
];

export function LandingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex((curr) => (curr === idx ? null : idx));
  };

  return (
    <section id="faq" className="landing-section landing-section-alt" aria-labelledby="faq-heading">
      <div className="landing-container">
        <motion.div
          className="landing-section-header"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <ShimmerSweepBadge delay={0.05} duration={0.8} className="inline-block">
            <span className="landing-section-pill">GIẢI ĐÁP THẮC MẮC</span>
          </ShimmerSweepBadge>

          <h2 id="faq-heading" className="landing-section-title">
            <ScrollWordRevealText
              text="Câu hỏi thường gặp của sinh viên"
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
            Những thông tin cần biết để bạn bắt đầu tối ưu hóa thời gian học tập hiệu quả nhất.
          </motion.p>
        </motion.div>

        <div className="landing-faq-container">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <motion.div
                key={faq.q}
                className="landing-faq-item"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45, delay: 0.08 + idx * 0.08, ease: [0.22, 1, 0.36, 1] }}
              >
                <button
                  type="button"
                  className="landing-faq-question"
                  onClick={() => toggle(idx)}
                  aria-expanded={isOpen}
                >
                  <span>{faq.q}</span>
                  <span className={`landing-faq-icon ${isOpen ? 'expanded' : ''}`} aria-hidden="true">
                    +
                  </span>
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      className="landing-faq-answer"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      style={{ overflow: 'hidden' }}
                    >
                      {faq.a}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
