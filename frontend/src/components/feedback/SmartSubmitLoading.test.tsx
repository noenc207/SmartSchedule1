import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SmartSubmitLoading } from './SmartSubmitLoading';

describe('SmartSubmitLoading — Multi-stage loading & Zero-Icon Verification', () => {
  it('1. Returns empty when isSubmitting is false', () => {
    const html = renderToStaticMarkup(<SmartSubmitLoading isSubmitting={false} />);
    expect(html).toBe('');
  });

  it('2. Renders Phase 1 message for login mode', () => {
    const html = renderToStaticMarkup(<SmartSubmitLoading isSubmitting={true} mode="login" />);

    expect(html).toContain('Đang gửi yêu cầu đăng nhập…');
    expect(html).toContain('SENDING');
    expect(html).toContain('0s');
    expect(html).toContain('smart-submit-loading-card');
  });

  it('3. Renders Phase 1 message for register mode', () => {
    const html = renderToStaticMarkup(<SmartSubmitLoading isSubmitting={true} mode="register" />);

    expect(html).toContain('Đang gửi hồ sơ đăng ký tài khoản…');
    expect(html).toContain('SENDING');
  });

  it('4. Renders Phase 1 message for oauth mode', () => {
    const html = renderToStaticMarkup(<SmartSubmitLoading isSubmitting={true} mode="oauth" />);

    expect(html).toContain('Đang gửi thông tin xác thực mạng xã hội…');
    expect(html).toContain('SENDING');
  });

  it('5. Strictly satisfies ZERO-ICON COMPLIANCE (no SVG elements, CSS sweep line)', () => {
    const html = renderToStaticMarkup(<SmartSubmitLoading isSubmitting={true} mode="login" />);

    expect(html).not.toContain('<svg');
    expect(html).not.toContain('lucide');
    expect(html).toContain('smart-sweep');
  });
});
