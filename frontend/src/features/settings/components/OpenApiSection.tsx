import React, { useState } from 'react';
import {
  Code,
  Key,
  Copy,
  Check,
  RefreshCw,
  Send,
  Download,
  GraduationCap,
  Briefcase,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import apiClient from '../../../services/apiClient';
import { generateOpenApiSpec } from '../../../services/openApiIntegration';
import { showToast } from '../../../components/Toast';

export function OpenApiSection() {
  const [apiKey, setApiKey] = useState('sk_live_smartschedule_fptu_academic_2026');
  const [copiedKey, setCopiedKey] = useState(false);
  const [isSimulatingLms, setIsSimulatingLms] = useState(false);
  const [isSimulatingHr, setIsSimulatingHr] = useState(false);

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    showToast('Đã sao chép API Key vào bộ nhớ tạm!', 'success');
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleRegenerateKey = () => {
    const newKey = `sk_live_smartschedule_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    setApiKey(newKey);
    showToast('Đã tạo API Key mới thành công!', 'info');
  };

  const handleSimulateCanvasLmsPush = async () => {
    setIsSimulatingLms(true);
    try {
      const now = new Date();
      const mockLmsPayload = [
        {
          id: 101,
          title: 'Hạn chót Đồ án Tốt nghiệp & Bảo vệ Poster',
          due_at: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 23, 59).toISOString(),
          context_name: 'Khóa luận Tốt nghiệp AI K15',
          points_possible: 100,
          location_name: 'Hội trường Trí tuệ Nhân tạo',
        },
        {
          id: 102,
          title: 'Thi Trắc nghiệm Thực hành: Deep Learning',
          start_at: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 8, 30).toISOString(),
          end_at: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 10, 30).toISOString(),
          context_name: 'Chuyên đề Deep Learning',
          location_name: 'Phòng Lab AI 1',
        },
      ];

      const res = await apiClient.post('/open/integrations/lms/sync', mockLmsPayload);
      if (res.data?.success) {
        showToast(`Đã đồng bộ thành công ${res.data.importedCount} lịch học từ Canvas LMS vào hệ thống!`, 'success');
      }
    } catch {
      showToast('Lỗi khi mô phỏng đẩy dữ liệu Canvas LMS.', 'error');
    } finally {
      setIsSimulatingLms(false);
    }
  };

  const handleSimulateHrShiftPush = async () => {
    setIsSimulatingHr(true);
    try {
      const now = new Date();
      const mockHrPayload = {
        shifts: [
          {
            shift_title: 'Ca thực tập dự án FPT Software: Generative AI',
            employee_id: 'FPT-NV-8842',
            department: 'Phòng Nghiên cứu AI',
            start_time: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 13, 30).toISOString(),
            end_time: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 17, 30).toISOString(),
            location_address: 'Tòa nhà FPT Software Quy Nhơn',
            notes: 'Họp bàn giao sprint và review code với mentor',
          },
        ],
      };

      const res = await apiClient.post('/open/integrations/hr/events', mockHrPayload);
      if (res.data?.success) {
        showToast(`Đã nạp thành công ${res.data.importedCount} ca làm việc từ phần mềm HR vào lịch trình!`, 'success');
      }
    } catch {
      showToast('Lỗi khi mô phỏng đẩy ca làm việc HR.', 'error');
    } finally {
      setIsSimulatingHr(false);
    }
  };

  const handleDownloadOpenApiSpec = () => {
    const spec = generateOpenApiSpec();
    const blob = new Blob([JSON.stringify(spec, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'smartschedule-openapi-v1.json');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Đã tải về tệp đặc tả OpenAPI 3.0 (Swagger JSON)!', 'success');
  };

  return (
    <section className="panel open-api-panel" style={{ marginTop: 20 }}>
      <div className="panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p className="eyebrow">API Mở & Tích Hợp Hệ Thống (Open API & Webhooks)</p>
          <h3 style={{ margin: '4px 0 2px' }}>Cổng Đẩy Dữ Liệu Tự Động (LMS & Doanh Nghiệp)</h3>
          <p className="muted" style={{ fontSize: 13, margin: 0 }}>
            Thay vì nhập tay từng sự kiện, hệ thống quản lý đào tạo (Canvas, Moodle, Blackboard) và phần mềm nhân sự HR có thể tự động đẩy lịch trình vào SmartSchedule thông qua REST API chuẩn hóa với cơ chế cô lập dữ liệu đa khách hàng (Multi-Tenancy).
          </p>
        </div>
        <button
          type="button"
          className="secondary-button"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}
          onClick={handleDownloadOpenApiSpec}
        >
          <Download size={14} />
          <span>Tải OpenAPI 3.0 (JSON)</span>
        </button>
      </div>

      {/* API Key Box */}
      <div
        style={{
          marginTop: 16,
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 14,
          padding: '16px 20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Key size={16} color="#2563eb" />
            <strong style={{ fontSize: 13.5, color: '#1e293b' }}>Khóa Truy Cập API (Production API Secret Key)</strong>
          </div>
          <span
            style={{
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 10,
              background: '#dcfce7',
              color: '#15803d',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <ShieldCheck size={12} />
            Đang hoạt động (Tenant Scoped)
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="password"
            readOnly
            value={apiKey}
            style={{
              flex: 1,
              fontFamily: 'monospace',
              fontSize: 13,
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              padding: '8px 12px',
              borderRadius: 8,
              letterSpacing: '0.05em',
            }}
          />
          <button
            type="button"
            className="secondary-button"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 12.5 }}
            onClick={handleCopyKey}
          >
            {copiedKey ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
            <span>{copiedKey ? 'Đã chép' : 'Sao chép'}</span>
          </button>
          <button
            type="button"
            className="icon-button"
            style={{ padding: 8 }}
            onClick={handleRegenerateKey}
            title="Tạo lại API Key mới"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Webhook Endpoints & Live Simulator */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 14,
          marginTop: 16,
        }}
      >
        {/* Canvas / Moodle Simulator */}
        <div
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #fff7ed 100%)',
            border: '1px solid #fed7aa',
            borderRadius: 14,
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: '#ea580c',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <GraduationCap size={18} />
              </div>
              <div>
                <strong style={{ fontSize: 13.5, color: '#9a3412', display: 'block' }}>
                  LMS Đại học (Canvas / Moodle / Edunext)
                </strong>
                <span style={{ fontSize: 11, color: '#c2410c' }}>POST /api/v1/open/integrations/lms/sync</span>
              </div>
            </div>
            <p className="muted" style={{ fontSize: 12, margin: '6px 0 14px', lineHeight: 1.45 }}>
              Tự động tiếp nhận lịch thi, đồ án tốt nghiệp, và thông báo thời khóa biểu từ hệ thống quản lý học tập của trường đại học vào không gian làm việc của sinh viên.
            </p>
          </div>

          <button
            type="button"
            className="secondary-button"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              fontSize: 12.5,
              borderColor: '#fdba74',
              color: '#c2410c',
              background: '#ffffff',
            }}
            onClick={() => void handleSimulateCanvasLmsPush()}
            disabled={isSimulatingLms}
          >
            <Send size={13} />
            <span>{isSimulatingLms ? 'Đang gửi payload...' : 'Mô phỏng Đẩy Lịch từ Canvas LMS'}</span>
          </button>
        </div>

        {/* Enterprise HR Shift Simulator */}
        <div
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%)',
            border: '1px solid #ddd6fe',
            borderRadius: 14,
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: '#7c3aed',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Briefcase size={18} />
              </div>
              <div>
                <strong style={{ fontSize: 13.5, color: '#5b21b6', display: 'block' }}>
                  HR Doanh nghiệp (Phân Ca & Lịch Họp)
                </strong>
                <span style={{ fontSize: 11, color: '#6d28d9' }}>POST /api/v1/open/integrations/hr/events</span>
              </div>
            </div>
            <p className="muted" style={{ fontSize: 12, margin: '6px 0 14px', lineHeight: 1.45 }}>
              Tự động nhận phân công ca làm việc, ca trực dự án từ phần mềm nhân sự công ty (Workday, Base, BambooHR), tự động phân tích tuyến đường đi và chèn vào lịch biểu.
            </p>
          </div>

          <button
            type="button"
            className="secondary-button"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              fontSize: 12.5,
              borderColor: '#c4b5fd',
              color: '#6d28d9',
              background: '#ffffff',
            }}
            onClick={() => void handleSimulateHrShiftPush()}
            disabled={isSimulatingHr}
          >
            <Send size={13} />
            <span>{isSimulatingHr ? 'Đang gửi payload...' : 'Mô phỏng Đẩy Ca Làm việc từ HR'}</span>
          </button>
        </div>
      </div>
    </section>
  );
}
