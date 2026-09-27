import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Tag, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { usePreferenceStore } from '../../../stores/preferenceStore';

export function DashboardHeroBanner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { heroBannerTheme, heroBannerCustomUrl, customCampusTag } = usePreferenceStore();

  const displayName = user?.displayName || 'Vũ Ngọc Nhi';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Chào buổi sáng,' : hour < 18 ? 'Chào buổi chiều,' : 'Chào buổi tối,';

  // Determine campus tag
  let campusTag = customCampusTag || 'FPT University - Quy Nhơn AI Campus';
  let sloganBrand = 'FPT\nQuy Nhơn ♡';
  let sloganSub = '"Where AI meets\nYour Future"';

  if (!customCampusTag) {
    if (heroBannerTheme === 'fpt-hanoi') {
      campusTag = 'FPT University - Hòa Lạc Campus';
      sloganBrand = 'FPT\nHòa Lạc ♡';
      sloganSub = '"Khát vọng\nTiên phong"';
    } else if (heroBannerTheme === 'fpt-danang') {
      campusTag = 'FPT University - Đà Nẵng Campus';
      sloganBrand = 'FPT\nĐà Nẵng ♡';
      sloganSub = '"Trải nghiệm để\nTrưởng thành"';
    } else if (heroBannerTheme === 'fpt-hcm') {
      campusTag = 'FPT University - TP. Hồ Chí Minh Campus';
      sloganBrand = 'FPT\nTP.HCM ♡';
      sloganSub = '"Năng động &\nSáng tạo"';
    }
  }

  const bgImage = heroBannerCustomUrl
    ? `linear-gradient(90deg, rgba(255, 255, 255, 0.88) 0%, rgba(255, 255, 255, 0.82) 35%, rgba(255, 255, 255, 0.18) 72%, transparent 100%), url('${heroBannerCustomUrl}')`
    : undefined;

  return (
    <motion.div
      className="mock-hero-banner"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={bgImage ? { backgroundImage: `${bgImage} !important` } : undefined}
    >
      <div className="mock-hero-content">
        {/* Campus Tag & Change Theme Shortcut */}
        <div className="mock-hero-tag-row" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="mock-hero-tag">
            <Tag size={13} className="mock-tag-icon" />
            <span>{campusTag}</span>
          </div>
          <button
            type="button"
            className="mock-change-banner-btn"
            onClick={() => navigate('/settings')}
            title="Tùy chỉnh ảnh bìa & chủ đề campus trong Cài đặt"
            style={{
              background: 'rgba(255, 255, 255, 0.75)',
              border: '1px solid rgba(226, 232, 240, 0.8)',
              borderRadius: '999px',
              padding: '3px 9px',
              fontSize: '11px',
              color: '#64748b',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              transition: 'all 0.15s ease',
            }}
          >
            <ImageIcon size={11} />
            <span>Đổi ảnh</span>
          </button>
        </div>

        {/* Big Greeting */}
        <h1 className="mock-hero-title">
          {greeting}<br />
          <span className="mock-hero-name">{displayName}!</span>
        </h1>

        {/* Subtitle */}
        <p className="mock-hero-subtitle">
          Hôm nay là một ngày tuyệt vời để bạn gần hơn với mục tiêu của mình! ☀️
        </p>
      </div>

      {/* Right Artwork: Mascot & Slogan */}
      <div className="mock-hero-mascot-area">
        <motion.div
          className="mock-hero-mascot-img-wrap"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <img
            src="/banner/mascot_waving.png"
            alt="FPT Mascot AI"
            className="mock-hero-mascot-img"
          />
        </motion.div>
        <div className="mock-hero-slogan-wrap">
          <span className="mock-hero-slogan-brand" style={{ whiteSpace: 'pre-line' }}>{sloganBrand}</span>
          <span className="mock-hero-slogan-sub" style={{ whiteSpace: 'pre-line' }}>{sloganSub}</span>
        </div>
      </div>
    </motion.div>
  );
}
