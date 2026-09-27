import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Plus,
  Home,
  Briefcase,
  Coffee,
  GraduationCap,
  Dumbbell,
  Compass,
  Navigation,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  Sparkles,
  Route,
} from 'lucide-react';
import type { UserLocation, UserLocationCategory, TravelEstimate } from '../../../types/domain';
import { locationApi, type UserLocationInput } from '../../../services/locationApi';
import { computeDynamicRoute } from '../../calendar/mobility/campusRouting';
import { showToast } from '../../../components/Toast';

const CATEGORY_META: Record<
  UserLocationCategory,
  { label: string; icon: React.ReactNode; color: string; bg: string }
> = {
  HOME: { label: 'Nhà riêng', icon: <Home size={15} />, color: '#2563eb', bg: '#eff6ff' },
  OFFICE: { label: 'Tòa nhà công ty', icon: <Briefcase size={15} />, color: '#7c3aed', bg: '#f5f3ff' },
  CAFE: { label: 'Quán cafe quen', icon: <Coffee size={15} />, color: '#d97706', bg: '#fffbeb' },
  CAMPUS: { label: 'Cơ sở đào tạo', icon: <GraduationCap size={15} />, color: '#ea580c', bg: '#fff7ed' },
  GYM: { label: 'Phòng tập thể thao', icon: <Dumbbell size={15} />, color: '#16a34a', bg: '#f0fdf4' },
  ONLINE: { label: 'Trực tuyến (Online)', icon: <Compass size={15} />, color: '#0891b2', bg: '#ecfeff' },
  CUSTOM: { label: 'Tùy chỉnh khác', icon: <MapPin size={15} />, color: '#4b5563', bg: '#f3f4f6' },
  TBD: { label: 'Chưa xác định', icon: <MapPin size={15} />, color: '#9ca3af', bg: '#f9fafb' },
};

export function UserLocationsSection() {
  const [locations, setLocations] = useState<UserLocation[]>([]);
  const [loading, setLoading] = useState(true);

  // Add / Edit Dialog State
  const [isAdding, setIsAdding] = useState(false);
  const [editingLoc, setEditingLoc] = useState<UserLocation | null>(null);

  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<UserLocationCategory>('HOME');
  const [formAddress, setFormAddress] = useState('');
  const [formLat, setFormLat] = useState('13.7820');
  const [formLng, setFormLng] = useState('109.2190');
  const [formBuilding, setFormBuilding] = useState('');
  const [formRoom, setFormRoom] = useState('');
  const [formFavorite, setFormFavorite] = useState(true);

  // Address search query & search results
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ lat: number; lng: number; displayName: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Route calculator test tool
  const [testFromId, setTestFromId] = useState('');
  const [testToId, setTestToId] = useState('');
  const [testResult, setTestResult] = useState<TravelEstimate | null>(null);

  const loadLocations = async () => {
    try {
      setLoading(true);
      const data = await locationApi.list();
      setLocations(data);
      if (data.length >= 2) {
        setTestFromId(data[0].id);
        setTestToId(data[1].id);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLocations();
  }, []);

  const resetForm = () => {
    setFormName('');
    setFormCategory('HOME');
    setFormAddress('');
    setFormLat('13.7820');
    setFormLng('109.2190');
    setFormBuilding('');
    setFormRoom('');
    setFormFavorite(false);
    setIsAdding(false);
    setEditingLoc(null);
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleStartEdit = (loc: UserLocation) => {
    setEditingLoc(loc);
    setFormName(loc.name);
    setFormCategory(loc.category);
    setFormAddress(loc.address || '');
    setFormLat(String(loc.latitude));
    setFormLng(String(loc.longitude));
    setFormBuilding(loc.building || '');
    setFormRoom(loc.room || '');
    setFormFavorite(Boolean(loc.isFavorite));
    setIsAdding(true);
  };

  const handleGetDeviceGps = () => {
    if (!navigator.geolocation) {
      showToast('Trình duyệt không hỗ trợ Geolocation GPS.', 'warning');
      return;
    }
    showToast('Đang lấy tọa độ GPS từ thiết bị...', 'info');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormLat(pos.coords.latitude.toFixed(6));
        setFormLng(pos.coords.longitude.toFixed(6));
        showToast('Đã lấy tọa độ GPS thực tế thành công!', 'success');
      },
      (err) => {
        showToast(`Không thể lấy GPS: ${err.message}`, 'error');
      },
      { timeout: 8000 }
    );
  };

  const handleSearchAddress = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    const results = await locationApi.geocodeAddress(searchQuery.trim());
    setSearchResults(results);
    setIsSearching(false);
    if (results.length === 0) {
      showToast('Không tìm thấy địa chỉ phù hợp.', 'info');
    }
  };

  const handleSelectSearchResult = (res: { lat: number; lng: number; displayName: string }) => {
    setFormLat(res.lat.toFixed(6));
    setFormLng(res.lng.toFixed(6));
    setFormAddress(res.displayName);
    if (!formName) {
      setFormName(res.displayName.split(',')[0]);
    }
    setSearchResults([]);
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const input: UserLocationInput = {
      name: formName.trim(),
      category: formCategory,
      address: formAddress.trim() || null,
      latitude: parseFloat(formLat) || 13.7589,
      longitude: parseFloat(formLng) || 109.2185,
      radiusMeters: 50,
      building: formBuilding.trim() || null,
      room: formRoom.trim() || null,
      isFavorite: formFavorite,
    };

    try {
      if (editingLoc) {
        const updated = await locationApi.update(editingLoc.id, input);
        setLocations((curr) => curr.map((l) => (l.id === updated.id ? updated : l)));
        showToast(`Đã cập nhật địa điểm "${updated.name}"`, 'success');
      } else {
        const created = await locationApi.create(input);
        setLocations((curr) => [...curr, created]);
        showToast(`Đã thêm địa điểm "${created.name}"`, 'success');
      }
      resetForm();
    } catch {
      showToast('Lỗi khi lưu địa điểm.', 'error');
    }
  };

  const handleDeleteLocation = async (id: string, name: string) => {
    try {
      await locationApi.remove(id);
      setLocations((curr) => curr.filter((l) => l.id !== id));
      showToast(`Đã xóa địa điểm "${name}"`, 'info');
    } catch {
      showToast('Lỗi khi xóa địa điểm.', 'error');
    }
  };

  const handleTestRoute = () => {
    const from = locations.find((l) => l.id === testFromId);
    const to = locations.find((l) => l.id === testToId);
    if (!from || !to) return;
    const est = computeDynamicRoute(from as any, to as any);
    setTestResult(est);
  };

  return (
    <section className="panel user-locations-panel" style={{ marginTop: 20 }}>
      <div className="panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p className="eyebrow">Hệ Thống Bản Đồ Động (Dynamic Location Engine)</p>
          <h3 style={{ margin: '4px 0 2px' }}>Địa Điểm Tự Định Nghĩa (Custom POI)</h3>
          <p className="muted" style={{ fontSize: 13, margin: 0 }}>
            Tự do thả ghim tọa độ GPS và lưu các địa điểm quen thuộc (Nhà riêng, Tòa nhà công ty, Quán cafe quen). Hệ thống sẽ tự động tính toán khoảng cách và thời gian di chuyển bằng thuật toán Haversine/OSRM ở bất kỳ đâu.
          </p>
        </div>
        <button
          type="button"
          className="hero-btn-gradient-primary"
          style={{ padding: '8px 16px', fontSize: 13, gap: 6, display: 'flex', alignItems: 'center' }}
          onClick={() => {
            resetForm();
            setIsAdding(true);
          }}
        >
          <Plus size={15} />
          <span>Thêm địa điểm</span>
        </button>
      </div>

      {/* Location Cards Grid */}
      <div
        className="locations-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 14,
          marginTop: 18,
        }}
      >
        {locations.map((loc) => {
          const meta = CATEGORY_META[loc.category] || CATEGORY_META.CUSTOM;
          return (
            <div
              key={loc.id}
              className="location-card"
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 14,
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                position: 'relative',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '3px 8px',
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 600,
                      background: meta.bg,
                      color: meta.color,
                    }}
                  >
                    {meta.icon}
                    <span>{meta.label}</span>
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => handleStartEdit(loc)}
                      className="icon-button"
                      style={{ padding: 4, color: '#64748b' }}
                      title="Chỉnh sửa"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteLocation(loc.id, loc.name)}
                      className="icon-button danger"
                      style={{ padding: 4 }}
                      title="Xóa địa điểm"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <strong style={{ fontSize: 14.5, color: '#1e293b', display: 'block', marginBottom: 4 }}>
                  {loc.name}
                </strong>
                {loc.address && (
                  <p className="muted" style={{ fontSize: 12, margin: '2px 0 6px', lineHeight: 1.4 }}>
                    📍 {loc.address}
                  </p>
                )}
                {loc.building && (
                  <p className="muted" style={{ fontSize: 11.5, margin: '2px 0 6px' }}>
                    🏢 {loc.building} {loc.room ? `· Phòng ${loc.room}` : ''}
                  </p>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 10,
                  paddingTop: 8,
                  borderTop: '1px dashed #f1f5f9',
                  fontSize: 11,
                  color: '#94a3b8',
                }}
              >
                <span>
                  GPS: {loc.latitude != null ? loc.latitude.toFixed(4) : '—'}, {loc.longitude != null ? loc.longitude.toFixed(4) : '—'}
                </span>
                {loc.isFavorite && <span style={{ color: '#eab308' }}>★ Yêu thích</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Location Modal */}
      {isAdding && (
        <div className="dialog-backdrop" onClick={resetForm}>
          <div
            className="confirm-dialog"
            style={{ maxWidth: 520, width: '100%' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>{editingLoc ? 'Chỉnh sửa địa điểm' : 'Thêm địa điểm cá nhân (Custom POI)'}</h3>
              <button type="button" className="icon-button" onClick={resetForm}>
                <X size={16} />
              </button>
            </div>

            {/* Address Search Helper */}
            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>
                🔍 Tìm kiếm địa chỉ tự động (OpenStreetMap Geocoding):
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  placeholder="Ví dụ: 123 Nguyễn Huệ, TP. Quy Nhơn..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleSearchAddress();
                    }
                  }}
                  style={{ flex: 1, padding: '6px 10px', fontSize: 12.5 }}
                />
                <button
                  type="button"
                  className="secondary-button"
                  style={{ padding: '6px 12px', fontSize: 12, whiteSpace: 'nowrap' }}
                  onClick={() => void handleSearchAddress()}
                  disabled={isSearching}
                >
                  {isSearching ? 'Đang tìm...' : 'Tìm tọa độ'}
                </button>
              </div>

              {searchResults.length > 0 && (
                <div style={{ marginTop: 8, background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', maxHeight: 140, overflowY: 'auto' }}>
                  {searchResults.map((res, i) => (
                    <div
                      key={i}
                      onClick={() => handleSelectSearchResult(res)}
                      style={{
                        padding: '6px 10px',
                        fontSize: 11.5,
                        cursor: 'pointer',
                        borderBottom: i < searchResults.length - 1 ? '1px solid #f1f5f9' : 'none',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                    >
                      {res.displayName}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={handleSaveLocation} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label className="field">
                <span>Tên địa điểm *</span>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nhà riêng, Tòa nhà công ty, Quán Cafe The Alley..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label className="field">
                  <span>Phân loại</span>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as UserLocationCategory)}
                  >
                    <option value="HOME">Nhà riêng</option>
                    <option value="OFFICE">Tòa nhà công ty</option>
                    <option value="CAFE">Quán cafe quen</option>
                    <option value="CAMPUS">Cơ sở đào tạo (Campus)</option>
                    <option value="GYM">Phòng tập thể thao</option>
                    <option value="CUSTOM">Khác (Tùy biến)</option>
                  </select>
                </label>

                <label className="field">
                  <span>Địa chỉ hiển thị</span>
                  <input
                    type="text"
                    placeholder="Đường, Phường, Thành phố"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'flex-end' }}>
                <label className="field" style={{ margin: 0 }}>
                  <span>Vĩ độ (Latitude) *</span>
                  <input
                    type="text"
                    required
                    value={formLat}
                    onChange={(e) => setFormLat(e.target.value)}
                  />
                </label>
                <label className="field" style={{ margin: 0 }}>
                  <span>Kinh độ (Longitude) *</span>
                  <input
                    type="text"
                    required
                    value={formLng}
                    onChange={(e) => setFormLng(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="secondary-button"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, height: 38, fontSize: 12 }}
                  onClick={handleGetDeviceGps}
                  title="Lấy tọa độ vị trí hiện tại của thiết bị qua GPS"
                >
                  <Navigation size={13} color="#2563eb" />
                  <span>Lấy GPS</span>
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label className="field">
                  <span>Tòa nhà / Khu vực (tùy chọn)</span>
                  <input
                    type="text"
                    placeholder="Tòa F-Town, Block B..."
                    value={formBuilding}
                    onChange={(e) => setFormBuilding(e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Phòng / Tầng (tùy chọn)</span>
                  <input
                    type="text"
                    placeholder="Phòng 402, Tầng 3..."
                    value={formRoom}
                    onChange={(e) => setFormRoom(e.target.value)}
                  />
                </label>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formFavorite}
                  onChange={(e) => setFormFavorite(e.target.checked)}
                />
                <span>Đánh dấu là địa điểm yêu thích / thường đến</span>
              </label>

              <div className="drawer-actions" style={{ marginTop: 8 }}>
                <button type="button" className="secondary-button" onClick={resetForm}>
                  Hủy
                </button>
                <button type="submit" className="primary-button">
                  {editingLoc ? 'Lưu thay đổi' : 'Tạo địa điểm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interactive Dynamic Route Tester */}
      <div
        style={{
          marginTop: 20,
          background: 'linear-gradient(135deg, #f8fafc 0%, #edf5fe 100%)',
          border: '1px solid #e2e8f0',
          borderRadius: 14,
          padding: '14px 18px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Route size={16} color="#2563eb" />
          <strong style={{ fontSize: 13.5, color: '#1e293b' }}>
            Công Cụ Thử Nghiệm Thuật Toán Định Tuyến (Routing Engine Simulator)
          </strong>
        </div>
        <p className="muted" style={{ fontSize: 12.5, margin: '0 0 12px' }}>
          Kiểm tra khoảng cách hình học và thời gian di chuyển nội suy giữa 2 địa điểm bất kỳ do người dùng định nghĩa:
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <select
            value={testFromId}
            onChange={(e) => setTestFromId(e.target.value)}
            style={{ padding: '6px 12px', fontSize: 12.5, borderRadius: 8, border: '1px solid #cbd5e1' }}
          >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                Từ: {l.name}
              </option>
            ))}
          </select>

          <span style={{ color: '#94a3b8', fontSize: 13 }}>➔</span>

          <select
            value={testToId}
            onChange={(e) => setTestToId(e.target.value)}
            style={{ padding: '6px 12px', fontSize: 12.5, borderRadius: 8, border: '1px solid #cbd5e1' }}
          >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                Đến: {l.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="secondary-button"
            style={{ padding: '6px 14px', fontSize: 12.5 }}
            onClick={handleTestRoute}
          >
            Tính đường đi
          </button>

          {testResult && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#ffffff',
                padding: '6px 14px',
                borderRadius: 8,
                border: '1px solid #bfdbfe',
                fontSize: 12.5,
                fontWeight: 600,
                color: '#1d4ed8',
              }}
            >
              <span>
                {testResult.mode === 'WALK' ? '🚶 Đi bộ:' : '🚗 Đi xe:'} {testResult.durationMinutes} phút
              </span>
              <span style={{ color: '#64748b', fontWeight: 400 }}>
                ({(testResult.distanceMeters || 0) < 1000 ? `${testResult.distanceMeters}m` : `${((testResult.distanceMeters || 0) / 1000).toFixed(1)}km`})
              </span>
              <span style={{ fontSize: 11, background: '#eff6ff', padding: '2px 6px', borderRadius: 4 }}>
                {testResult.source}
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
