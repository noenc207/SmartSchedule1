# SmartSchedule Gamification Visual Assets Suite

Bộ tài nguyên đồ họa 3D cao cấp dành cho hệ thống Gamification của SmartSchedule (FPT University Quy Nhon AI Campus).

---

## 📁 Cấu trúc thư mục

```
frontend/logo/ranks/
├── tiers/
│   ├── bronze.png                 # Rank I: Đồng cam (Bronze metal)
│   ├── silver.png                 # Rank II: Bạc (Polished silver)
│   ├── gold.png                   # Rank III: Vàng kim (Golden royal)
│   ├── platinum.png               # Rank IV: Xanh băng (Ice crystal)
│   ├── diamond.png                # Rank V: Tím sapphire (Premium gemstone)
│   ├── master.png                 # Rank VI: Đỏ ruby (Royal red)
│   └── legendary.png              # Rank VII: Vàng hoàng kim (Legendary crown)
├── streak/
│   ├── streak-default.png         # TikTok-style Main Flame (Cam FPTU + Lõi sáng)
│   ├── streak-3.png               # Milestone 3 ngày: Tiny Flame
│   ├── streak-7.png               # Milestone 7 ngày: Rising Flame
│   ├── streak-14.png              # Milestone 14 ngày: Double Flame
│   ├── streak-30.png              # Milestone 30 ngày: Golden Flame
│   ├── streak-60.png              # Milestone 60 ngày: Royal Flame (Vương miện)
│   ├── streak-100.png             # Milestone 100 ngày: Phoenix Flame (Cánh phượng hoàng)
│   ├── streak-365.png             # Milestone 365 ngày: Eternal Flame (Vĩnh cửu)
│   ├── streak-freeze.png          # Đóng băng bảo vệ chuỗi (Pha lê cyan)
│   └── streak-broken.png          # Chuỗi bị gián đoạn (Dormant ember)
├── achievements/
│   ├── first-streak.png           # Huy hiệu: First Streak
│   ├── seven-day-consistency.png  # Huy hiệu: 7-Day Consistency
│   ├── thirty-day-discipline.png  # Huy hiệu: 30-Day Discipline
│   ├── hundred-day-dedication.png # Huy hiệu: 100-Day Dedication
│   ├── yearly-legend.png          # Huy hiệu: Yearly Legend
│   ├── weekly-top-three.png       # Huy hiệu: Weekly Top 3
│   ├── weekly-champion.png        # Huy hiệu: Weekly Champion
│   └── perfect-study-week.png     # Huy hiệu: Perfect Study Week
└── README.md                      # Tài liệu hướng dẫn sử dụng
```

---

## 🎨 Tiêu chuẩn kỹ thuật (Asset Specifications)

- **Định dạng**: PNG với kênh trong suốt Alpha thực thụ (`RGBA`).
- **Kích thước tiêu chuẩn**: `1024 × 1024 px`.
- **Phong cách visual**: 3D Isometric / Metallic / Crystalline Glossy với hiệu ứng ánh sáng nổi khối, đổ bóng mềm và viền phát sáng tự nhiên.
- **Không nhúng text/số vào ảnh**: Các ruy băng kim loại được inpainting mượt mà, sẵn sàng để React typography render linh hoạt theo ngôn ngữ (i18n) và độ phân giải.
- **Vite Public Mirror**: Bộ asset được đồng bộ tại `frontend/public/logo/ranks/` để trình duyệt tải trực tiếp với đường dẫn `/logo/ranks/...`.

---

## 💻 Hướng dẫn sử dụng trong React

Hệ thống đã được đóng gói sẵn thành các component React tái sử dụng tại `@/features/gamification`:

```tsx
import { RankBadge, StreakBadge, AchievementBadge } from '@/features/gamification';

// 1. Hiển thị Rank Badge
<RankBadge tier="gold" size="lg" showGlow showTitle />

// 2. Hiển thị Streak TikTok-Style
<StreakBadge days={14} size="md" showCounter counterPosition="right" />
<StreakBadge days={30} isFrozen size="lg" />

// 3. Hiển thị Huy hiệu Thành tựu
<AchievementBadge id="weekly-champion" unlocked={true} size="md" showName />
<AchievementBadge id="yearly-legend" unlocked={false} size="md" showName />
```
