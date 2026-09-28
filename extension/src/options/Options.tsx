import React, { useEffect, useState } from 'react';
import type { ExtractionRule } from '../rules/types';
import { getActiveExtractionRules, refreshRulesFromRemote } from '../storage/ruleCache';
import { DEFAULT_SMARTSCHEDULE_API_URL } from '../shared/constants';
import { Calendar, RefreshCw, CheckCircle, ShieldCheck } from 'lucide-react';

export const Options: React.FC = () => {
  const [apiUrl, setApiUrl] = useState<string>(DEFAULT_SMARTSCHEDULE_API_URL);
  const [rules, setRules] = useState<ExtractionRule[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    const list = await getActiveExtractionRules();
    setRules(list);
  };

  const handleRefreshRules = async () => {
    setRefreshing(true);
    try {
      const refreshed = await refreshRulesFromRemote(apiUrl);
      setRules(refreshed);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div>
      <header className="app-header">
        <div className="brand-wrapper">
          <div className="brand-logo" style={{ background: '#f27123', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={16} color="#fff" />
          </div>
          <div>
            <div className="brand-title">SmartSchedule Importer</div>
          </div>
        </div>
        <span className="brand-badge">Cài đặt</span>
      </header>

      <div className="options-container">
        {/* Backend Configuration */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Cấu hình máy chủ SmartSchedule</h3>
          <p style={{ color: 'var(--slate-600)', fontSize: 13, marginBottom: 14 }}>
            Địa chỉ API SmartSchedule dùng để đồng bộ lịch và cập nhật quy tắc trích xuất.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid var(--slate-200)',
                fontSize: 13,
              }}
            />
            <button className="btn btn-primary" style={{ width: 'auto' }} onClick={handleRefreshRules} disabled={refreshing}>
              <RefreshCw size={14} className={refreshing ? 'spinner' : ''} /> {refreshing ? 'Đang tải...' : 'Lưu & Làm mới'}
            </button>
          </div>
          {savedSuccess && (
            <div style={{ color: 'var(--green)', fontSize: 12, marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle size={14} /> Đã cập nhật quy tắc thành công.
            </div>
          )}
        </div>

        {/* Active Rules List */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Quy tắc trích xuất đang hoạt động ({rules.length})</h3>
          <p style={{ color: 'var(--slate-600)', fontSize: 13, marginBottom: 14 }}>
            Danh sách các cổng đào tạo đại học được hỗ trợ tự động:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rules.map((rule) => (
              <div
                key={rule.id}
                style={{
                  padding: '12px 14px',
                  background: 'var(--slate-50)',
                  border: '1px solid var(--slate-200)',
                  borderRadius: 8,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <strong>{rule.name}</strong>
                  <span className="rule-badge">v{rule.version}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--slate-500)', marginBottom: 6 }}>
                  Nhà cung cấp: <strong>{rule.provider}</strong> • Độ ưu tiên: {rule.priority}
                </div>
                <div style={{ fontSize: 11, color: 'var(--slate-600)' }}>
                  Tên miền: {rule.domains.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Security & Privacy Commitment */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <ShieldCheck size={20} color="var(--primary)" />
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Cam kết bảo mật & quyền riêng tư</h3>
          </div>
          <ul style={{ paddingLeft: 20, color: 'var(--slate-600)', fontSize: 12, lineHeight: 1.6 }}>
            <li>Tiện ích <strong>không bao giờ</strong> đọc mật khẩu, trường biểu mẫu nhạy cảm hoặc cookie đăng nhập.</li>
            <li>Chỉ trích xuất các ô thời khóa biểu hiển thị trên màn hình theo quy tắc được phê duyệt.</li>
            <li>Dữ liệu lịch học chỉ được gửi về SmartSchedule khi người dùng bấm xác nhận "Đồng bộ".</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
