import { describe, it, expect } from 'vitest';
import {
  toVnDateDisplay,
  formatVietnameseDate,
  calculateDurationMinutes,
  formatDurationText,
  shiftEndTime,
  clampEndTime,
  DURATION_PRESETS,
} from './EventForm';

describe('EventForm Time & Duration Logic', () => {
  it('1. Chiều xuôi: Tự động tính thời lượng khi nhập Bắt đầu và Kết thúc (09:30 đến 10:30 -> 1 giờ)', () => {
    const mins = calculateDurationMinutes('2026-10-02', '09', '30', '2026-10-02', '10', '30');
    expect(mins).toBe(60);
    expect(formatDurationText(mins, '09', '10', '30', '30')).toBe('1 giờ');
  });

  it('1. Chiều ngược: Cộng nhanh +1h từ 09:30 tự động tính ra giờ kết thúc 10:30', () => {
    const result = shiftEndTime('2026-10-02', '09', '30', 60);
    expect(result.endHour).toBe('10');
    expect(result.endMinute).toBe('30');
    expect(result.isMultiDay).toBe(false);
  });

  it('2. Time Shifting: Khi sửa Bắt đầu thành 14:00, tự động đẩy Kết thúc thành 15:00 với thời lượng 1 tiếng', () => {
    const currentDuration = 60; // 1 giờ
    const result = shiftEndTime('2026-10-02', '14', '00', currentDuration);
    expect(result.endHour).toBe('15');
    expect(result.endMinute).toBe('00');
    expect(result.endsAt).toBe('2026-10-02T15:00');
  });

  it('3. Anti-Time Travel: Ngăn chặn lỗi chọn giờ kết thúc nhỏ hơn giờ bắt đầu trên cùng ngày', () => {
    // Start là 10:00, người dùng vô tình chọn End là 09:00
    const clamped = clampEndTime(false, '2026-10-02', '2026-10-02', '10', '00', '09', '00');
    expect(clamped.hour).toBe('10');
    expect(clamped.minute).toBe('00');

    // Start là 10:30, người dùng vô tình chọn End là 10:15
    const clampedMin = clampEndTime(false, '2026-10-02', '2026-10-02', '10', '30', '10', '15');
    expect(clampedMin.hour).toBe('10');
    expect(clampedMin.minute).toBe('30');
  });

  it('3. Anti-Time Travel: Cho phép giờ kết thúc nhỏ hơn nếu bật Nhiều ngày (qua đêm)', () => {
    // Start là 23:00 ngày 02/10, End là 01:00 ngày 03/10
    const allowMultiDay = clampEndTime(true, '2026-10-02', '2026-10-03', '23', '00', '01', '00');
    expect(allowMultiDay.hour).toBe('01');
    expect(allowMultiDay.minute).toBe('00');
  });
});

describe('Production Redesign UX & Vietnamese Formatting', () => {
  it('A. Chuẩn hóa định dạng ngày Việt Nam DD/MM/YYYY: loại bỏ mâu thuẫn 10/02/2026', () => {
    // Khi ngày ISO là 2026-10-02 (ngày 2 tháng 10 năm 2026)
    const formattedDate = toVnDateDisplay('2026-10-02');
    expect(formattedDate).toBe('02/10/2026');
    expect(formattedDate).not.toBe('10/02/2026');

    // Nhãn thứ trong tuần cũng đồng bộ chính xác
    const fullWeekdayStr = formatVietnameseDate('2026-10-02');
    expect(fullWeekdayStr).toBe('Thứ Sáu, 02/10/2026');
  });

  it('B & C. Đồng bộ date display khi chuyển sang Hôm nay và Ngày mai', () => {
    const today = new Date();
    const y1 = today.getFullYear();
    const m1 = String(today.getMonth() + 1).padStart(2, '0');
    const d1 = String(today.getDate()).padStart(2, '0');
    const todayIso = `${y1}-${m1}-${d1}`;

    expect(toVnDateDisplay(todayIso)).toBe(`${d1}/${m1}/${y1}`);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const y2 = tomorrow.getFullYear();
    const m2 = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const d2 = String(tomorrow.getDate()).padStart(2, '0');
    const tomorrowIso = `${y2}-${m2}-${d2}`;

    expect(toVnDateDisplay(tomorrowIso)).toBe(`${d2}/${m2}/${y2}`);
  });

  it('H. Kiểm tra tính năng cộng nhanh các mốc: +15p, +30p, +45p, +1h, +1h30, +2h, +3h', () => {
    // Start là 01:22
    const startHour = '01';
    const startMinute = '22';

    // +15p -> 01:37
    const p15 = shiftEndTime('2026-10-02', startHour, startMinute, 15);
    expect(p15.endsAt).toBe('2026-10-02T01:37');

    // +30p -> 01:52
    const p30 = shiftEndTime('2026-10-02', startHour, startMinute, 30);
    expect(p30.endsAt).toBe('2026-10-02T01:52');

    // +45p -> 02:07
    const p45 = shiftEndTime('2026-10-02', startHour, startMinute, 45);
    expect(p45.endsAt).toBe('2026-10-02T02:07');

    // +1h -> 02:22
    const p60 = shiftEndTime('2026-10-02', startHour, startMinute, 60);
    expect(p60.endsAt).toBe('2026-10-02T02:22');
    expect(calculateDurationMinutes('2026-10-02', '01', '22', '2026-10-02', '02', '22')).toBe(60);
    expect(formatDurationText(60, '01', '02', '22', '22')).toBe('1 giờ');

    // +1h30 -> 02:52
    const p90 = shiftEndTime('2026-10-02', startHour, startMinute, 90);
    expect(p90.endsAt).toBe('2026-10-02T02:52');
    expect(formatDurationText(90, '01', '02', '22', '52')).toBe('1 giờ 30 phút');

    // +2h -> 03:22
    const p120 = shiftEndTime('2026-10-02', startHour, startMinute, 120);
    expect(p120.endsAt).toBe('2026-10-02T03:22');
    expect(formatDurationText(120, '01', '03', '22', '22')).toBe('2 giờ');

    // +3h -> 04:22
    const p180 = shiftEndTime('2026-10-02', startHour, startMinute, 180);
    expect(p180.endsAt).toBe('2026-10-02T04:22');
    expect(formatDurationText(180, '01', '04', '22', '22')).toBe('3 giờ');
  });

  it('G. Validation: Kết thúc trước bắt đầu trên cùng ngày trả về invalid và text chưa hợp lệ', () => {
    // Start là 01:22, End là 01:10
    const mins = calculateDurationMinutes('2026-10-02', '01', '22', '2026-10-02', '01', '10');
    expect(mins).toBe(0);
    expect(formatDurationText(0, '01', '01', '22', '10')).toBe('Chưa hợp lệ (cần sau giờ bắt đầu)');
  });

  it('E. Hỗ trợ sự kiện nhiều ngày / qua nửa đêm', () => {
    // Start là 23:30 ngày 02/10, End là 01:30 ngày 03/10 (2 tiếng = 120 phút)
    const mins = calculateDurationMinutes('2026-10-02', '23', '30', '2026-10-03', '01', '30');
    expect(mins).toBe(120);
    expect(formatDurationText(mins, '23', '01', '30', '30')).toBe('2 giờ');
  });

  it('Presets danh sách chứa đủ 7 nút nhanh theo yêu cầu', () => {
    expect(DURATION_PRESETS.map((p) => p.label)).toEqual([
      '+15p',
      '+30p',
      '+45p',
      '+1h',
      '+1h30',
      '+2h',
      '+3h',
    ]);
  });
});
