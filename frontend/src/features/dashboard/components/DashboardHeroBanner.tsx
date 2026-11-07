import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Bot, Calendar as CalendarIcon, Flame, Sparkles, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { usePreferenceStore } from '../../../stores/preferenceStore';

export function DashboardHeroBanner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { heroBannerTheme, heroBannerCustomUrl, customCampusTag } = usePreferenceStore();

  const displayName = user?.displayName || 'SmartUser';
  const avatarUrl = user?.avatarUrl || '/avatar-nhi.png';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Chào buổi sáng,' : hour < 18 ? 'Chào buổi chiều,' : 'Chào buổi tối,';

  let campusTag = customCampusTag || 'FPT University · Quy Nhơn AI Campus';
  let sloganBrand = 'FPT Quy Nhơn';
  let sloganSub = 'Where AI Meets Your Future';

  if (!customCampusTag) {
    if (heroBannerTheme === 'fpt-hanoi') {
      campusTag = 'FPT University · Hòa Lạc Campus';
      sloganBrand = 'FPT Hòa Lạc';
      sloganSub = 'Khát vọng Tiên phong';
    } else if (heroBannerTheme === 'fpt-danang') {
      campusTag = 'FPT University · Đà Nẵng Campus';
      sloganBrand = 'FPT Đà Nẵng';
      sloganSub = 'Trải nghiệm để Trưởng thành';
    } else if (heroBannerTheme === 'fpt-hcm') {
      campusTag = 'FPT University · TP. Hồ Chí Minh Campus';
      sloganBrand = 'FPT TP.HCM';
      sloganSub = 'Năng động & Sáng tạo';
    }
  }

  const handleOpenAiAssistant = () => {
    const widgetBtn = document.querySelector('.ai-floating-trigger') as HTMLButtonElement | null;
    if (widgetBtn) {
      widgetBtn.click();
    } else {
      navigate('/ai');
    }
  };

  const bannerImgUrl = heroBannerCustomUrl || '/banner/1.png';

  return (
    <motion.div
      className="mock-hero-banner"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{
        backgroundColor: '#ffffff',
        backgroundImage: `linear-gradient(90deg, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0.82) 40%, rgba(255, 255, 255, 0.18) 72%, transparent 100%), url('${bannerImgUrl}')`,
        backgroundRepeat: 'no-repeat, no-repeat',
        backgroundSize: 'cover, cover',
        backgroundPosition: 'center, center',
        borderRadius: 20,
        border: '1px solid var(--border-color, #e2e8f0)',
        boxShadow: '0 8px 24px -6px rgba(0, 0, 0, 0.05), 0 2px 6px rgba(0, 0, 0, 0.02)',
        padding: '22px 28px',
        position: 'relative',
        overflow: 'hidden',
        minHeight: 185,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 20,
      }}
    >
      {/* Left Content Area */}
      <div className="mock-hero-content" style={{ position: 'relative', zIndex: 2, flex: 1, maxWidth: 640 }}>
        {/* Top Tag & Action Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(6px)',
              padding: '4px 10px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              color: '#ea580c',
              border: '1px solid rgba(249, 115, 22, 0.25)',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.2)',
              }}
            />
            <MapPin size={12} color="#ea580c" />
            <span>{campusTag}</span>
          </div>

          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: 999,
              background: 'rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(6px)',
              color: '#ea580c',
              border: '1px solid rgba(249, 115, 22, 0.25)',
            }}
          >
            Kỳ Fall 2026
          </span>

          <button
            type="button"
            onClick={() => navigate('/settings')}
            title="Tùy chỉnh ảnh bìa & chủ đề campus trong Cài đặt"
            style={{
              background: 'rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(6px)',
              border: '1px solid rgba(226, 232, 240, 0.9)',
              borderRadius: 999,
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 600,
              color: '#475569',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              transition: 'all 0.15s ease',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
            }}
          >
            <ImageIcon size={12} />
            <span>Đổi ảnh bìa</span>
          </button>
        </div>

        {/* User Greeting with Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <img
              src={avatarUrl}
              alt={displayName}
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2.5px solid #f97316',
                boxShadow: '0 4px 12px rgba(249, 115, 22, 0.25)',
                backgroundColor: '#ffffff',
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/avatar-nhi.png';
              }}
            />
            <span
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: '#10b981',
                border: '2px solid #ffffff',
              }}
              title="Đang hoạt động"
            />
          </div>

          <div>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 800,
                margin: 0,
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
                color: '#0f172a',
              }}
            >
              {greeting} <span style={{ color: '#0284c7' }}>{displayName}!</span>
            </h1>
            <p style={{ margin: '3px 0 0 0', fontSize: 13, color: '#475569' }}>
              Hôm nay là một ngày tuyệt vời để bạn chinh phục các mục tiêu học tập và đồ án cá nhân. ☀️
            </p>
          </div>
        </div>

        {/* AI Briefing Strip */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.88)',
            backdropFilter: 'blur(8px)',
            borderRadius: 12,
            padding: '8px 14px',
            marginBottom: 14,
            border: '1px solid rgba(226, 232, 240, 0.9)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            maxWidth: 620,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
          }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: '#ffffff',
            }}
          >
            <Bot size={15} />
          </div>
          <p style={{ margin: 0, fontSize: 12, color: '#1e293b', lineHeight: 1.45 }}>
            <strong>Cóc AI Briefing:</strong> Hôm nay bạn có <strong>11h thời gian tự do (08:00 – 19:00)</strong>. Cóc AI đã phát hiện cơ hội vàng tại Atrium để hoàn thành bài tập và đồ án!
          </p>
        </div>

        {/* Quick Command Action Dock */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => navigate('/calendar')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '8px 16px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(249, 115, 22, 0.3)',
              transition: 'all 0.15s ease',
            }}
          >
            <CalendarIcon size={14} />
            <span>Mở Thời khóa biểu</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/scheduling')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '8px 14px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              border: '1px solid #cbd5e1',
              background: 'rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(6px)',
              color: '#0f172a',
            }}
          >
            <Sparkles size={14} color="#ea580c" />
            <span>Xếp lịch thông minh</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAiAssistant}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '8px 14px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              border: '1px solid #cbd5e1',
              background: 'rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(6px)',
              color: '#0f172a',
            }}
          >
            <Bot size={14} color="#ea580c" />
            <span>Hỏi Cóc AI</span>
          </button>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '7px 12px',
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 700,
              background: 'rgba(255, 241, 242, 0.92)',
              backdropFilter: 'blur(6px)',
              color: '#e11d48',
              border: '1px solid rgba(225, 29, 72, 0.25)',
            }}
          >
            <Flame size={14} color="#e11d48" />
            <span>Chuỗi 5 ngày học tập</span>
          </div>
        </div>
      </div>

      {/* Right Artwork: Floating 3D Mascot & Campus Slogan */}
      <div
        className="mock-hero-mascot-area"
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          flexShrink: 0,
        }}
      >
        {/* Mascot Robot waving */}
        <motion.div
          className="mock-hero-mascot-img-wrap"
          animate={{ y: [0, -7, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: 135,
            height: 155,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          <img
            src="/banner/mascot_waving.png"
            alt="FPT Mascot AI"
            className="mock-hero-mascot-img"
            style={{
              maxHeight: '100%',
              maxWidth: '100%',
              objectFit: 'contain',
              filter: 'drop-shadow(0 6px 16px rgba(0, 0, 0, 0.12))',
            }}
          />
        </motion.div>

        {/* Slogan Badge */}
        <div
          className="mock-hero-slogan-wrap"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            background: 'rgba(255, 255, 255, 0.88)',
            backdropFilter: 'blur(8px)',
            padding: '8px 14px',
            borderRadius: 14,
            border: '1px solid rgba(255, 255, 255, 0.95)',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)',
            textAlign: 'right',
          }}
        >
          <span
            className="mock-hero-slogan-brand"
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: '#ea580c',
              letterSpacing: '-0.01em',
            }}
          >
            {sloganBrand}
          </span>
          <span
            className="mock-hero-slogan-sub"
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#475569',
              marginTop: 2,
            }}
          >
            {sloganSub}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
