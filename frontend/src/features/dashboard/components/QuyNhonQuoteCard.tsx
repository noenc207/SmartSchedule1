import React from 'react';
import { motion } from 'framer-motion';
import { Sun, MapPin, Navigation, Sparkles, Quote } from 'lucide-react';
import { useLiveWeather } from '../hooks/useLiveWeather';
import { usePreferenceStore } from '../../../stores/preferenceStore';

export function QuyNhonQuoteCard() {
  const { city, temp, icon, conditionText, isGps, loading, refresh } = useLiveWeather();
  const { quoteCardCustomUrl, heroBannerTheme } = usePreferenceStore();

  const landscapeImg = quoteCardCustomUrl || '/banner/3.png';

  let quoteAuthor = 'FPT University · Quy Nhơn AI Campus';
  if (heroBannerTheme === 'fpt-hanoi') quoteAuthor = 'FPT University · Hòa Lạc Campus';
  else if (heroBannerTheme === 'fpt-danang') quoteAuthor = 'FPT University · Đà Nẵng Campus';
  else if (heroBannerTheme === 'fpt-hcm') quoteAuthor = 'FPT University · TP.HCM Campus';
  else if (city && city !== 'Quy Nhơn') quoteAuthor = `FPT University · ${city}`;

  return (
    <motion.div
      className="mock-quynhon-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Top Image with Sun Badge & Live Campus Status */}
      <div className="mock-quynhon-img-container">
        <img
          src={landscapeImg}
          alt={`${city} Campus Landscape`}
          className="mock-quynhon-img"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/banner/3.png';
          }}
        />
        <div className="quynhon-img-overlay" />

        {/* Live Weather Floating Chip */}
        <div
          className="quynhon-weather-floating"
          title={`Thời tiết ${city}: ${temp}°C ${conditionText} ${isGps ? '(Định vị GPS)' : ''} · Bấm để làm mới`}
          onClick={refresh}
          role="button"
          tabIndex={0}
        >
          {isGps ? (
            <Navigation size={11} className="text-blue-500" />
          ) : (
            <MapPin size={11} className="text-orange-500" />
          )}
          <span className="weather-floating-city">{city}</span>
          <span className="weather-floating-temp">{loading ? '...' : `${temp}°C`}</span>
          <span className="weather-floating-icon">{icon}</span>
        </div>

        {/* Status Pill */}
        <div className="quynhon-live-pill">
          <span className="live-dot-green" />
          <span>Campus mở cửa</span>
        </div>
      </div>

      {/* Bottom Info: Inspirational Quote & Live Pulse */}
      <div className="mock-quynhon-body">
        <div className="campus-live-pulse-row">
          <span className="pulse-item">
            <span className="pulse-dot-orange" />
            <span>Thư viện mở đến 22:00</span>
          </span>
          <span className="pulse-sep">·</span>
          <span className="pulse-item" style={{ color: '#059669', fontWeight: 600 }}>
            <span>Atrium: Còn chỗ</span>
          </span>
        </div>

        <div className="quynhon-quote-wrap">
          <Quote size={13} className="quynhon-quote-icon" />
          <blockquote className="mock-quote-text">
            "Không có con đường nào là dễ dàng, nhưng luôn có một cách để bạn tiến lên."
          </blockquote>
        </div>
        <div className="mock-quote-author">— {quoteAuthor}</div>
      </div>
    </motion.div>
  );
}
