import React, { useRef } from 'react';
import {
  Image,
  Upload,
  RotateCcw,
  MapPin,
  Navigation,
  Sun,
  Check,
  Sparkles,
} from 'lucide-react';
import {
  usePreferenceStore,
  type HeroBannerTheme,
  type WeatherLocationMode,
} from '../../../stores/preferenceStore';
import { useLiveWeather, KNOWN_CITIES } from '../../dashboard/hooks/useLiveWeather';
import { showToast } from '../../../components/Toast';

export function DashboardAppearanceSection() {
  const {
    heroBannerTheme,
    setHeroBannerTheme,
    heroBannerCustomUrl,
    setHeroBannerCustomUrl,
    quoteCardCustomUrl,
    setQuoteCardCustomUrl,
    customCampusTag,
    setCustomCampusTag,
    weatherLocationMode,
    setWeatherLocationMode,
    weatherManualCity,
    setWeatherManualCity,
  } = usePreferenceStore();

  const weather = useLiveWeather();
  const bannerFileRef = useRef<HTMLInputElement>(null);
  const quoteFileRef = useRef<HTMLInputElement>(null);

  const presets: Array<{
    id: HeroBannerTheme;
    name: string;
    tag: string;
    bannerImg: string;
    quoteImg: string;
    desc: string;
  }> = [
    {
      id: 'fpt-quynhon',
      name: 'FPT Quy Nhơn AI Campus',
      tag: 'FPT University - Quy Nhơn AI Campus',
      bannerImg: '/banner/1.png',
      quoteImg: '/banner/3.png',
      desc: 'Khuôn viên AI & Công nghệ ven biển Bình Định',
    },
    {
      id: 'fpt-hanoi',
      name: 'FPT Hòa Lạc (Hà Nội)',
      tag: 'FPT University - Hòa Lạc Campus',
      bannerImg: '/banner/1.png',
      quoteImg: '/banner/3.png',
      desc: 'Khuôn viên sinh thái & công nghệ cao Hòa Lạc',
    },
    {
      id: 'fpt-danang',
      name: 'FPT Đà Nẵng',
      tag: 'FPT University - Đà Nẵng Campus',
      bannerImg: '/banner/1.png',
      quoteImg: '/banner/3.png',
      desc: 'Thành phố công nghệ thông minh ven sông Hàn',
    },
    {
      id: 'fpt-hcm',
      name: 'FPT TP. Hồ Chí Minh',
      tag: 'FPT University - TP. Hồ Chí Minh Campus',
      bannerImg: '/banner/1.png',
      quoteImg: '/banner/3.png',
      desc: 'Khu Công nghệ cao Quận 9 năng động, sáng tạo',
    },
  ];

  const handleSelectPreset = (preset: (typeof presets)[0]) => {
    setHeroBannerTheme(preset.id);
    setHeroBannerCustomUrl(null);
    setQuoteCardCustomUrl(null);
    setCustomCampusTag(preset.tag);
    showToast(`Đã áp dụng chủ đề: ${preset.name}`, 'success');
  };

  const handleBannerFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('Kích thước ảnh không vượt quá 5MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setHeroBannerTheme('custom');
        setHeroBannerCustomUrl(result);
        showToast('Đã tải lên ảnh bìa mới thành công!', 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleQuoteFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('Kích thước ảnh không vượt quá 5MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setQuoteCardCustomUrl(result);
        showToast('Đã cập nhật ảnh phong cảnh thẻ trích dẫn!', 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetDefaults = () => {
    setHeroBannerTheme('fpt-quynhon');
    setHeroBannerCustomUrl(null);
    setQuoteCardCustomUrl(null);
    setCustomCampusTag(null);
    setWeatherLocationMode('auto');
    setWeatherManualCity('Quy Nhơn');
    showToast('Đã đặt lại giao diện mặc định FPT Quy Nhơn', 'info');
  };

  return (
    <section className="panel settings-customization-section" style={{ marginBottom: 24 }}>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Tùy biến giao diện</p>
          <h3>Hình nền & Thời tiết Dashboard</h3>
        </div>
        <button
          type="button"
          className="text-button"
          onClick={handleResetDefaults}
          title="Đặt lại cài đặt mặc định"
        >
          <RotateCcw size={13} />
          <span>Đặt lại mặc định</span>
        </button>
      </div>

      <p className="muted" style={{ fontSize: 13, marginBottom: 20 }}>
        Cá nhân hóa ảnh bìa trường học, chủ đề hiển thị và hệ thống định vị thời tiết thực tế theo vị trí của bạn.
      </p>

      {/* 1. Theme Presets Selection */}
      <div style={{ marginBottom: 24 }}>
        <strong style={{ fontSize: 14, display: 'block', marginBottom: 10 }}>
          1. Chủ đề khuôn viên & trường học
        </strong>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 12,
          }}
        >
          {presets.map((p) => {
            const isSelected = heroBannerTheme === p.id && !heroBannerCustomUrl;
            return (
              <div
                key={p.id}
                onClick={() => handleSelectPreset(p)}
                style={{
                  border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  background: isSelected ? '#eff6ff' : '#ffffff',
                  borderRadius: 12,
                  padding: '12px 14px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <strong style={{ fontSize: 13, color: isSelected ? '#1e40af' : '#0f172a' }}>
                    {p.name}
                  </strong>
                  {isSelected && (
                    <span
                      style={{
                        background: '#2563eb',
                        color: '#fff',
                        borderRadius: '50%',
                        width: 18,
                        height: 18,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Check size={11} />
                    </span>
                  )}
                </div>
                <p className="muted" style={{ fontSize: 11.5, margin: 0, lineHeight: 1.4 }}>
                  {p.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Custom Upload Section */}
      <div
        style={{
          border: '1px dashed #cbd5e1',
          borderRadius: 14,
          padding: 16,
          background: '#fafcff',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Sparkles size={16} className="text-purple" />
          <strong style={{ fontSize: 13.5 }}>2. Thay đổi ảnh tùy chỉnh cá nhân (Dành cho đa đối tượng)</strong>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {/* Hero Banner Upload */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>
              Ảnh bìa Hero Banner lớn:
            </label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="file"
                ref={bannerFileRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleBannerFileUpload}
              />
              <button
                type="button"
                className="secondary-button"
                onClick={() => bannerFileRef.current?.click()}
                style={{ fontSize: 12 }}
              >
                <Upload size={13} />
                <span>Tải ảnh từ máy tính</span>
              </button>
              {heroBannerCustomUrl && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setHeroBannerCustomUrl(null);
                    showToast('Đã xóa ảnh bìa tùy chỉnh', 'info');
                  }}
                  style={{ fontSize: 12, color: '#ef4444' }}
                >
                  Xóa ảnh
                </button>
              )}
            </div>
            {heroBannerCustomUrl && (
              <span style={{ fontSize: 11, color: '#16a34a', display: 'block', marginTop: 4 }}>
                ✓ Đang áp dụng ảnh bìa tùy chỉnh
              </span>
            )}
          </div>

          {/* Quote Card Landscape Upload */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>
              Ảnh phong cảnh thẻ Trích dẫn:
            </label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="file"
                ref={quoteFileRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleQuoteFileUpload}
              />
              <button
                type="button"
                className="secondary-button"
                onClick={() => quoteFileRef.current?.click()}
                style={{ fontSize: 12 }}
              >
                <Upload size={13} />
                <span>Tải ảnh phong cảnh</span>
              </button>
              {quoteCardCustomUrl && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setQuoteCardCustomUrl(null);
                    showToast('Đã xóa ảnh phong cảnh tùy chỉnh', 'info');
                  }}
                  style={{ fontSize: 12, color: '#ef4444' }}
                >
                  Xóa ảnh
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Custom Campus Tag Input */}
        <div style={{ marginTop: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
            Tên cơ sở / trường học hiển thị:
          </label>
          <input
            type="text"
            placeholder="Ví dụ: FPT University - Quy Nhơn AI Campus, ĐH Bách Khoa..."
            value={customCampusTag || ''}
            onChange={(e) => setCustomCampusTag(e.target.value.trim() ? e.target.value : null)}
            style={{
              width: '100%',
              maxWidth: 420,
              padding: '6px 12px',
              fontSize: 12.5,
              borderRadius: 8,
              border: '1px solid #cbd5e1',
            }}
          />
        </div>
      </div>

      {/* 3. Real-World Weather Settings */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <strong style={{ fontSize: 14 }}>
            3. Thời tiết thực tế ngoài đời theo vị trí
          </strong>
          {/* Live Preview Pill */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              padding: '4px 10px',
              borderRadius: 999,
              fontSize: 12,
              color: '#1d4ed8',
              fontWeight: 600,
            }}
            title="Thời tiết thực tế đang hoạt động"
          >
            {weather.isGps ? <Navigation size={12} /> : <MapPin size={12} />}
            <span>{weather.city}:</span>
            <span>{weather.temp}°C</span>
            <span>{weather.icon}</span>
            <span style={{ fontWeight: 400, color: '#64748b' }}>({weather.conditionText})</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
          {/* Mode Switcher */}
          <div className="segmented-control" role="radiogroup" aria-label="Chế độ định vị thời tiết">
            <button
              type="button"
              className={`segmented-btn ${weatherLocationMode === 'auto' ? 'active' : ''}`}
              onClick={() => {
                setWeatherLocationMode('auto');
                weather.refresh();
                showToast('Chế độ: Tự động theo định vị GPS của máy', 'success');
              }}
            >
              <Navigation size={13} style={{ display: 'inline', marginRight: 4 }} />
              Tự động theo GPS máy
            </button>
            <button
              type="button"
              className={`segmented-btn ${weatherLocationMode === 'manual' ? 'active' : ''}`}
              onClick={() => {
                setWeatherLocationMode('manual');
                showToast('Chế độ: Chọn thành phố thủ công', 'info');
              }}
            >
              <MapPin size={13} style={{ display: 'inline', marginRight: 4 }} />
              Chọn vị trí thủ công
            </button>
          </div>

          {/* City Dropdown for Manual Mode */}
          {weatherLocationMode === 'manual' && (
            <select
              value={weatherManualCity}
              onChange={(e) => {
                setWeatherManualCity(e.target.value);
                showToast(`Đã chuyển thời tiết sang: ${e.target.value}`, 'success');
              }}
              style={{
                padding: '6px 12px',
                fontSize: 12.5,
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                fontWeight: 500,
              }}
            >
              {Object.keys(KNOWN_CITIES).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    </section>
  );
}
