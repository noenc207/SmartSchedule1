import React from 'react';
import { motion } from 'framer-motion';
import { Sun, MapPin, Navigation, RefreshCw } from 'lucide-react';
import { useLiveWeather } from '../hooks/useLiveWeather';
import { usePreferenceStore } from '../../../stores/preferenceStore';

export function QuyNhonQuoteCard() {
  const { city, temp, icon, conditionText, isGps, loading, refresh } = useLiveWeather();
  const { quoteCardCustomUrl, heroBannerTheme } = usePreferenceStore();

  const landscapeImg = quoteCardCustomUrl || '/banner/3.png';

  // Customize author according to active theme or city
  let quoteAuthor = '— FPT Quy Nhơn';
  if (heroBannerTheme === 'fpt-hanoi') quoteAuthor = '— FPT Hòa Lạc';
  else if (heroBannerTheme === 'fpt-danang') quoteAuthor = '— FPT Đà Nẵng';
  else if (heroBannerTheme === 'fpt-hcm') quoteAuthor = '— FPT TP.HCM';
  else if (city && city !== 'Quy Nhơn') quoteAuthor = `— FPT University · ${city}`;

  return (
    <motion.div
      className="mock-quynhon-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Top Image with Sun Badge */}
      <div className="mock-quynhon-img-container">
        <img
          src={landscapeImg}
          alt={`${city} Campus Landscape`}
          className="mock-quynhon-img"
          onError={(e) => {
            // fallback if custom URL fails
            (e.target as HTMLImageElement).src = '/banner/3.png';
          }}
        />
        <div
          className="mock-sun-badge"
          title={`Thời tiết ${city}: ${temp}°C ${conditionText} ${isGps ? '(Định vị GPS)' : ''}`}
          onClick={refresh}
          role="button"
          tabIndex={0}
        >
          <Sun size={17} className="mock-sun-icon" />
        </div>
      </div>

      {/* Bottom Info: Weather & Inspirational Quote */}
      <div className="mock-quynhon-body">
        <div
          className="mock-weather-pill"
          title={isGps ? 'Thời tiết tự động cập nhật theo định vị máy' : 'Thời tiết theo vị trí đã chọn'}
          onClick={refresh}
          style={{ cursor: 'pointer' }}
        >
          {isGps ? (
            <Navigation size={12} className="mock-pin-icon text-blue" />
          ) : (
            <MapPin size={13} className="mock-pin-icon" />
          )}
          <span className="mock-weather-city">{city}</span>
          <span className="mock-weather-temp">{loading ? '...' : `${temp}°C`}</span>
          <span className="mock-weather-icon">{icon}</span>
        </div>

        <blockquote className="mock-quote-text">
          "Không có con đường nào là dễ dàng, nhưng luôn có một cách để bạn tiến lên."
        </blockquote>
        <div className="mock-quote-author">{quoteAuthor}</div>
      </div>
    </motion.div>
  );
}
