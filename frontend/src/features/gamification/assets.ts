/**
 * SmartSchedule Gamification Assets Hub
 * Complete 3D Badges, TikTok-style Streaks, and Achievement Visual Assets.
 */

export type RankTier =
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'diamond'
  | 'master'
  | 'legendary';

export interface RankMeta {
  tier: RankTier;
  title: string;
  color: string;
  glowColor: string;
  assetPath: string;
}

export const RANK_ASSETS: Record<RankTier, RankMeta> = {
  bronze: {
    tier: 'bronze',
    title: 'Đồng (Bronze)',
    color: '#cd7f32',
    glowColor: 'rgba(205, 127, 50, 0.4)',
    assetPath: '/logo/ranks/tiers/bronze.png',
  },
  silver: {
    tier: 'silver',
    title: 'Bạc (Silver)',
    color: '#c0c0c0',
    glowColor: 'rgba(192, 192, 192, 0.4)',
    assetPath: '/logo/ranks/tiers/silver.png',
  },
  gold: {
    tier: 'gold',
    title: 'Vàng (Gold)',
    color: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.45)',
    assetPath: '/logo/ranks/tiers/gold.png',
  },
  platinum: {
    tier: 'platinum',
    title: 'Bạch Kim (Platinum)',
    color: '#06b6d4',
    glowColor: 'rgba(6, 182, 212, 0.45)',
    assetPath: '/logo/ranks/tiers/platinum.png',
  },
  diamond: {
    tier: 'diamond',
    title: 'Kim Cương (Diamond)',
    color: '#8b5cf6',
    glowColor: 'rgba(139, 92, 246, 0.45)',
    assetPath: '/logo/ranks/tiers/diamond.png',
  },
  master: {
    tier: 'master',
    title: 'Cao Thủ (Master)',
    color: '#ef4444',
    glowColor: 'rgba(239, 68, 68, 0.45)',
    assetPath: '/logo/ranks/tiers/master.png',
  },
  legendary: {
    tier: 'legendary',
    title: 'Huyền Thoại (Legendary)',
    color: '#eab308',
    glowColor: 'rgba(234, 179, 8, 0.55)',
    assetPath: '/logo/ranks/tiers/legendary.png',
  },
};

export const STREAK_ASSETS = {
  default: '/logo/ranks/streak/streak-default.png',
  milestones: {
    3: '/logo/ranks/streak/streak-3.png',
    7: '/logo/ranks/streak/streak-7.png',
    14: '/logo/ranks/streak/streak-14.png',
    30: '/logo/ranks/streak/streak-30.png',
    60: '/logo/ranks/streak/streak-60.png',
    100: '/logo/ranks/streak/streak-100.png',
    365: '/logo/ranks/streak/streak-365.png',
  },
  freeze: '/logo/ranks/streak/streak-freeze.png',
  broken: '/logo/ranks/streak/streak-broken.png',
} as const;

export type StreakMilestoneDay = 3 | 7 | 14 | 30 | 60 | 100 | 365;

export function getStreakAsset(days: number, isFrozen?: boolean, isBroken?: boolean): string {
  if (isBroken) return STREAK_ASSETS.broken;
  if (isFrozen) return STREAK_ASSETS.freeze;
  if (days >= 365) return STREAK_ASSETS.milestones[365];
  if (days >= 100) return STREAK_ASSETS.milestones[100];
  if (days >= 60) return STREAK_ASSETS.milestones[60];
  if (days >= 30) return STREAK_ASSETS.milestones[30];
  if (days >= 14) return STREAK_ASSETS.milestones[14];
  if (days >= 7) return STREAK_ASSETS.milestones[7];
  if (days >= 3) return STREAK_ASSETS.milestones[3];
  return STREAK_ASSETS.default;
}

export type AchievementId =
  | 'first-streak'
  | 'seven-day-consistency'
  | 'thirty-day-discipline'
  | 'hundred-day-dedication'
  | 'yearly-legend'
  | 'weekly-top-three'
  | 'weekly-champion'
  | 'perfect-study-week';

export interface AchievementMeta {
  id: AchievementId;
  name: string;
  description: string;
  assetPath: string;
}

export const ACHIEVEMENT_ASSETS: Record<AchievementId, AchievementMeta> = {
  'first-streak': {
    id: 'first-streak',
    name: 'Khởi Đầu Chuỗi',
    description: 'Thắp sáng ngọn lửa học tập đầu tiên',
    assetPath: '/logo/ranks/achievements/first-streak.png',
  },
  'seven-day-consistency': {
    id: 'seven-day-consistency',
    name: '7 Ngày Bền Bỉ',
    description: 'Duy trì chuỗi học liên tục suốt 1 tuần lễ',
    assetPath: '/logo/ranks/achievements/seven-day-consistency.png',
  },
  'thirty-day-discipline': {
    id: 'thirty-day-discipline',
    name: 'Kỷ Luật Thép (30 Ngày)',
    description: 'Hoàn thành trọn vẹn 30 ngày tập trung cao độ',
    assetPath: '/logo/ranks/achievements/thirty-day-discipline.png',
  },
  'hundred-day-dedication': {
    id: 'hundred-day-dedication',
    name: '100 Ngày Tận Hiến',
    description: 'Chinh phục cột mốc 100 ngày kiên trì học tập',
    assetPath: '/logo/ranks/achievements/hundred-day-dedication.png',
  },
  'yearly-legend': {
    id: 'yearly-legend',
    name: 'Huyền Thoại 365 Ngày',
    description: 'Đạt ngọn lửa vĩnh cửu một năm rực sáng',
    assetPath: '/logo/ranks/achievements/yearly-legend.png',
  },
  'weekly-top-three': {
    id: 'weekly-top-three',
    name: 'Top 3 Tuần',
    description: 'Lọt vào top 3 sinh viên chăm chỉ nhất bảng xếp hạng',
    assetPath: '/logo/ranks/achievements/weekly-top-three.png',
  },
  'weekly-champion': {
    id: 'weekly-champion',
    name: 'Quán Quân Tuần',
    description: 'Dẫn đầu toàn trường về thời gian & hiệu suất học tập',
    assetPath: '/logo/ranks/achievements/weekly-champion.png',
  },
  'perfect-study-week': {
    id: 'perfect-study-week',
    name: 'Tuần Học Hoàn Hảo',
    description: '100% mục tiêu học tập và deadline được giải quyết đúng hạn',
    assetPath: '/logo/ranks/achievements/perfect-study-week.png',
  },
};
