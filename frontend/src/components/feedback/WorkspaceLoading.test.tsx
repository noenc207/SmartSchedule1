import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { WorkspaceLoading } from './WorkspaceLoading';

describe('WorkspaceLoading — Session Initialization & Zero-Icon Verification', () => {
  it('1. Renders campus branding, workspace title, and geometric orbit', () => {
    const html = renderToStaticMarkup(
      <WorkspaceLoading
        title="Đang khởi tạo không gian làm việc"
        defaultSubtitle="Đang kiểm tra chứng chỉ bảo mật và đồng bộ phiên đăng nhập…"
      />
    );

    expect(html).toContain('FPT University Quy Nhơn · AI Campus');
    expect(html).toContain('SmartSchedule Workspace');
    expect(html).toContain('Đang khởi tạo không gian làm việc');
    expect(html).toContain('smart-variant-fullscreen');
    expect(html).toContain('smart-orbit-visual');
  });

  it('2. Enforces ZERO-ICON COMPLIANCE during workspace initialization', () => {
    const html = renderToStaticMarkup(<WorkspaceLoading />);

    expect(html).not.toContain('<svg');
    expect(html).not.toContain('lucide');
  });
});
