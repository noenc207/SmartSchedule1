import React, { useState, useEffect, useRef } from 'react';
import {
  type SchedulingRule,
  type RuleContradiction,
  detectRuleContradictions,
} from '../utils/constraintRules';

interface AdvancedConstraintsModalProps {
  isOpen: boolean;
  rules: SchedulingRule[];
  onClose: () => void;
  onSaveRules: (updatedRules: SchedulingRule[]) => void;
}

export function AdvancedConstraintsModal({
  isOpen,
  rules,
  onClose,
  onSaveRules,
}: AdvancedConstraintsModalProps) {
  const [localRules, setLocalRules] = useState<SchedulingRule[]>(() => [...rules]);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalRules([...rules]);
  }, [rules, isOpen]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const contradictions = detectRuleContradictions(localRules);

  const handleToggleRule = (id: string) => {
    setLocalRules((curr) =>
      curr.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const handleToggleType = (id: string) => {
    setLocalRules((curr) =>
      curr.map((r) =>
        r.id === id
          ? { ...r, type: r.type === 'HARD' ? 'SOFT' : 'HARD' }
          : r
      )
    );
  };

  const handleResolveContradiction = (contradiction: RuleContradiction, option: string) => {
    if (option === 'Keep as soft preference') {
      setLocalRules((curr) =>
        curr.map((r) =>
          r.id === contradiction.rule1.id ? { ...r, type: 'SOFT' } : r
        )
      );
    } else if (option === 'Adjust preference') {
      setLocalRules((curr) =>
        curr.map((r) =>
          r.id === contradiction.rule2.id ? { ...r, enabled: false } : r
        )
      );
    }
  };

  const handleSave = () => {
    onSaveRules(localRules);
    onClose();
  };

  const hardCount = localRules.filter((r) => r.enabled && r.type === 'HARD').length;
  const softCount = localRules.filter((r) => r.enabled && r.type === 'SOFT').length;

  return (
    <div className="advanced-constraints-backdrop" onClick={onClose}>
      <div
        ref={modalRef}
        className="advanced-constraints-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Advanced Scheduling Constraints"
      >
        <div className="advanced-constraints-header">
          <div>
            <div className="constraints-eyebrow">
              <span>[Động cơ ràng buộc thông minh]</span>
            </div>
            <h3>Quy tắc xếp lịch nâng cao</h3>
            <p className="muted" style={{ fontSize: 12, margin: 0 }}>
              Cấu hình các ràng buộc cứng (bắt buộc tuân thủ) và ưu tiên mềm để cá nhân hóa lịch trình tối ưu.
            </p>
          </div>
          <button type="button" className="text-button compact-btn" onClick={onClose} aria-label="Đóng bảng quy tắc">
            Đóng
          </button>
        </div>

        {/* Contradiction Alert Banner */}
        {contradictions.length > 0 && (
          <div className="constraint-contradiction-banner" role="alert">
            <div className="contradiction-content">
              <strong>[CẢNH BÁO XUNG ĐỘT QUY TẮC]</strong>
              <p>{contradictions[0].message}</p>
              <div className="contradiction-actions">
                <button
                  type="button"
                  className="secondary-button compact-btn"
                  onClick={() => handleResolveContradiction(contradictions[0], 'Keep as soft preference')}
                >
                  Chuyển sang ưu tiên mềm
                </button>
                <button
                  type="button"
                  className="secondary-button compact-btn"
                  onClick={() => handleResolveContradiction(contradictions[0], 'Adjust preference')}
                >
                  Tắt quy tắc gây xung đột
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="constraints-meta-bar">
          <div className="rule-counts">
            <span className="badge-pill hard">
              {hardCount} Ràng buộc cứng (Bắt buộc theo)
            </span>
            <span className="badge-pill soft">
              {softCount} Ưu tiên mềm (Khuyến khích)
            </span>
          </div>
        </div>

        <div className="advanced-rules-list">
          {localRules.map((rule) => (
            <div
              key={rule.id}
              className={`rule-card ${rule.enabled ? 'is-enabled' : 'is-disabled'} ${rule.type === 'HARD' ? 'is-hard' : 'is-soft'}`}
            >
              <div className="rule-card-left">
                <label className="rule-checkbox-wrap">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={() => handleToggleRule(rule.id)}
                    aria-label={`Bật quy tắc: ${rule.label}`}
                  />
                  <span className="rule-label-group">
                    <strong>{rule.label}</strong>
                    <small>{rule.description}</small>
                  </span>
                </label>
              </div>

              <div className="rule-card-right">
                <button
                  type="button"
                  className={`rule-type-toggle-btn ${rule.type === 'HARD' ? 'hard' : 'soft'}`}
                  onClick={() => handleToggleType(rule.id)}
                  title={`Nhấn để chuyển đổi giữa Ràng buộc cứng và Ưu tiên mềm`}
                >
                  {rule.type === 'HARD' ? (
                    <span>[Bắt buộc]</span>
                  ) : (
                    <span>[Ưu tiên]</span>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="advanced-constraints-footer">
          <button type="button" className="secondary-button" onClick={onClose}>
            Hủy
          </button>
          <button type="button" className="primary-button" onClick={handleSave}>
            <span>Áp dụng {hardCount + softCount} quy tắc</span>
          </button>
        </div>
      </div>
    </div>
  );
}
