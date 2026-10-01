import { describe, it, expect } from 'vitest';

function calculateDurationMinutes(startDate: string, startHour: string, startMinute: string, endDate: string, endHour: string, endMinute: string): number {
  try {
    const s = new Date(`${startDate}T${startHour}:${startMinute}:00`).getTime();
    const e = new Date(`${endDate}T${endHour}:${endMinute}:00`).getTime();
    if (isNaN(s) || isNaN(e) || e < s) return 0;
    return Math.round((e - s) / 60000);
  } catch {
    return 0;
  }
}

function formatDurationText(durationMinutes: number, startHour: string, endHour: string, startMinute: string, endMinute: string): string {
  if (durationMinutes <= 0) {
    if (startHour === endHour && startMinute === endMinute) return '0 phút';
    return 'Chưa hợp lệ (cần sau giờ bắt đầu)';
  }
  const h = Math.floor(durationMinutes / 60);
  const m = durationMinutes % 60;
  if (h > 0 && m > 0) return `${h} giờ ${m} phút`;
  if (h > 0) return `${h} giờ`;
  return `${m} phút`;
}

function shiftEndTime(startDate: string, startHour: string, startMinute: string, durationMinutes: number) {
  const newStartInstant = new Date(`${startDate}T${startHour}:${startMinute}:00`).getTime();
  const newEndInstant = new Date(newStartInstant + durationMinutes * 60000);

  const ey = newEndInstant.getFullYear();
  const em = String(newEndInstant.getMonth() + 1).padStart(2, '0');
  const ed = String(newEndInstant.getDate()).padStart(2, '0');
  const eh = String(newEndInstant.getHours()).padStart(2, '0');
  const emin = String(newEndInstant.getMinutes()).padStart(2, '0');

  return {
    endsAt: `${ey}-${em}-${ed}T${eh}:${emin}`,
    isMultiDay: `${ey}-${em}-${ed}` !== startDate,
    endHour: eh,
    endMinute: emin,
  };
}

function clampEndTime(
  multiDay: boolean,
  startDate: string,
  endDate: string,
  startHour: string,
  startMinute: string,
  targetEndHour: string,
  targetEndMinute: string
) {
  if (!multiDay || startDate === endDate) {
    const sH = parseInt(startHour, 10);
    const sM = parseInt(startMinute, 10);
    let eH = parseInt(targetEndHour, 10);
    let eM = parseInt(targetEndMinute, 10);

    if (eH < sH) {
      eH = sH;
      if (eM < sM) {
        eM = sM;
      }
    } else if (eH === sH && eM < sM) {
      eM = sM;
    }

    return {
      hour: String(eH).padStart(2, '0'),
      minute: String(eM).padStart(2, '0'),
    };
  }

  return {
    hour: targetEndHour,
    minute: targetEndMinute,
  };
}

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
