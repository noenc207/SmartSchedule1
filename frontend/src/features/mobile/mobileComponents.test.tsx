import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import {
  MobilePageHeader,
  MobileListItem,
  MobileSection,
  MobileSheet,
  MobileFormField,
  MobileEmptyState,
} from '../../components/mobile';

describe('SmartSchedule Mobile Component System & Design Tokens', () => {
  it('1. MobilePageHeader renders mobile header with title, subtitle, and accessible banner role', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <MobilePageHeader
          title="Thời khóa biểu"
          subtitle="Học kỳ Fall 2026"
          showBack
        />
      </MemoryRouter>
    );

    expect(html).toContain('mobile-header');
    expect(html).toContain('Thời khóa biểu');
    expect(html).toContain('Học kỳ Fall 2026');
    expect(html).toContain('Quay lại');
  });

  it('2. MobileListItem renders title, subtitle, meta, and touch target styling', () => {
    const html = renderToStaticMarkup(
      <MobileListItem
        title="PRN211 · C# .NET"
        subtitle="Slot 1 · Alpha 204"
        meta="GV: ThS. Nguyễn Văn A"
        showChevron
      />
    );

    expect(html).toContain('mobile-list-item');
    expect(html).toContain('PRN211 · C# .NET');
    expect(html).toContain('Slot 1 · Alpha 204');
    expect(html).toContain('GV: ThS. Nguyễn Văn A');
  });

  it('3. MobileSection renders semantic section with eyebrow and container card', () => {
    const html = renderToStaticMarkup(
      <MobileSection title="Tiết học hôm nay" eyebrow="FPT Quy Nhơn">
        <p>Nội dung tiết học</p>
      </MobileSection>
    );

    expect(html).toContain('FPT Quy Nhơn');
    expect(html).toContain('Tiết học hôm nay');
    expect(html).toContain('mobile-card');
    expect(html).toContain('Nội dung tiết học');
  });

  it('4. MobileSheet renders dialog role and grabber handle when open', () => {
    const html = renderToStaticMarkup(
      <MobileSheet isOpen={true} onClose={() => {}} title="Chi tiết môn học">
        <div>Nội dung trong sheet</div>
      </MobileSheet>
    );

    expect(html).toContain('mobile-sheet-content');
    expect(html).toContain('mobile-sheet-handle');
    expect(html).toContain('Chi tiết môn học');
    expect(html).toContain('Nội dung trong sheet');
  });

  it('5. MobileFormField renders input, label, and validation state', () => {
    const html = renderToStaticMarkup(
      <MobileFormField
        label="Tên bài tập"
        value="Lab 4 PRN211"
        error="Vui lòng nhập hạn chót"
        readOnly
      />
    );

    expect(html).toContain('Tên bài tập');
    expect(html).toContain('Lab 4 PRN211');
    expect(html).toContain('Vui lòng nhập hạn chót');
  });

  it('6. MobileEmptyState renders title, description, and action CTA', () => {
    const html = renderToStaticMarkup(
      <MobileEmptyState
        title="Không có lịch học"
        description="Bạn có thể nghỉ ngơi hoặc ôn thi tại thư viện."
        actionLabel="Thêm lịch mới"
        onAction={() => {}}
      />
    );

    expect(html).toContain('Không có lịch học');
    expect(html).toContain('Bạn có thể nghỉ ngơi hoặc ôn thi tại thư viện.');
    expect(html).toContain('Thêm lịch mới');
  });
});
