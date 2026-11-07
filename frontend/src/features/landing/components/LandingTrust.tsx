import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Lock, Award, Users } from 'lucide-react';

const TRUST_ITEMS = [
  {
    icon: ShieldCheck,
    color: '#059669',
    bg: 'rgba(5, 150, 105, 0.1)',
    title: 'Xác thực OAuth 2.0 & JWT Chuẩn Học Vụ',
    desc: 'Hỗ trợ đăng nhập an toàn bằng tài khoản Google @fpt.edu.vn với cơ chế mã hóa phiên học tập đa lớp.',
  },
  {
    icon: Award,
    color: '#ea580c',
    bg: 'rgba(234, 88, 12, 0.1)',
    title: 'Tối ưu riêng cho Quy Nhơn AI Campus',
    desc: 'Dữ liệu khoảng cách tòa nhà Alpha, Beta, Thư viện và khu tự học Atrium được đo đạc thực tế tại Khu đô thị An Phú Thịnh.',
  },
  {
    icon: Lock,
    color: '#2563eb',
    bg: 'rgba(37, 99, 235, 0.1)',
    title: 'Quyền riêng tư Lịch cá nhân tuyệt đối',
    desc: 'Mọi kế hoạch học tập, ghi chú đồ án và điểm số mục tiêu của bạn được bảo mật riêng tư trong từng Workspace độc lập.',
  },
  {
    icon: Users,
    color: '#7c3aed',
    bg: 'rgba(124, 58, 237, 0.1)',
    title: 'Cộng đồng 2,400+ Sinh viên K15–K19',
    desc: 'Được tin dùng bởi các nhóm đồ án Kỹ thuật Phần mềm, Trí tuệ Nhân tạo và An toàn Thông tin tại FPTU Quy Nhơn.',
  },
];

export function LandingTrust() {
  return (
    <section className="landing-section landing-section-alt" aria-labelledby="trust-heading">
      <div className="landing-container">
        <div className="landing-section-header">
          <div className="landing-pill-badge">
            <span className="landing-pill-dot" aria-hidden="true" />
            BẢO MẬT & ĐỘ TIN CẬY HỌC THUẬT
          </div>

          <h2 id="trust-heading" className="landing-section-title">
            Nền tảng vững chắc cho{' '}
            <span className="landing-hero-headline-highlight">
              hành trình đại học
            </span>{' '}
            của bạn
          </h2>

          <p className="landing-section-desc">
            Xây dựng trên kiến trúc Spring Boot 3, PostgreSQL và Google OR-Tools CP-SAT đạt chuẩn hiệu năng doanh nghiệp.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 20,
          }}
        >
          {TRUST_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                whileHover={{ y: -4 }}
                style={{
                  background: '#ffffff',
                  borderRadius: 22,
                  padding: '24px 22px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 10px 28px -12px rgba(15, 23, 42, 0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: item.bg,
                    color: item.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={22} />
                </div>
                <h3 style={{ fontSize: '1.08rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.6, margin: 0 }}>
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
