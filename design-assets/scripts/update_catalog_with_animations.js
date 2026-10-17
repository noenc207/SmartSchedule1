const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const existingCatalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog.json'), 'utf8'));

// Filter out old animations if any, keep backgrounds, textures, illustrations, photography
const baseAssets = existingCatalog.assets.filter(a => a.category !== 'animations');

const animationMeta = [
  // Abstract
  {
    id: 'anim-aurora-glow-loop',
    name: 'Aurora Ambient Glow Loop',
    tags: ['hero', 'abstract', 'aurora', 'ambient', 'glow', 'background', 'loop'],
    suggestedUse: 'auth visual hero backdrop, dashboard header glow',
    dominantColors: ['#0b1120', '#ea580c', '#f97316', '#0284c7'],
    hasLottie: false
  },
  {
    id: 'anim-particle-wave-flow',
    name: 'Particle Wave Matrix Flow',
    tags: ['abstract', 'particles', 'wave', 'flow', 'subtle-motion', 'timeline', 'hero'],
    suggestedUse: 'timetable solver canvas, telemetry header banner',
    dominantColors: ['#0f172a', '#ea580c', '#fb923c'],
    hasLottie: false
  },
  {
    id: 'anim-geometric-pulse-core',
    name: 'Geometric AI Pulse Core',
    tags: ['abstract', 'geometric', 'pulse', 'ai', 'subtle-motion', 'loading'],
    suggestedUse: 'AI scheduling status indicator, active solver badge',
    dominantColors: ['#ea580c', '#f97316', '#0f172a'],
    hasLottie: true
  },
  {
    id: 'anim-light-sweep-beam',
    name: 'Cinematic Light Sweep Beam',
    tags: ['abstract', 'light-sweep', 'shimmer', 'accent', 'card', 'subtle-motion'],
    suggestedUse: 'feature card hover effect, premium badge highlight',
    dominantColors: ['#1e293b', '#ea580c', '#fb923c'],
    hasLottie: false
  },

  // Education
  {
    id: 'anim-academic-calendar-flip',
    name: 'Academic Calendar Flip',
    tags: ['education', 'academic', 'calendar', 'schedule', 'timetable'],
    suggestedUse: 'semester planning guide, timetable import view',
    dominantColors: ['#ffffff', '#ea580c', '#0f172a'],
    hasLottie: true
  },
  {
    id: 'anim-focus-study-clock',
    name: 'Focus Study Pomodoro Clock',
    tags: ['education', 'focus', 'timer', 'clock', 'pomodoro', 'study'],
    suggestedUse: 'focus pacing widget, study timer session',
    dominantColors: ['#f1f5f9', '#ea580c', '#0f172a'],
    hasLottie: true
  },
  {
    id: 'anim-exam-milestone-path',
    name: 'Exam Milestone Progression Path',
    tags: ['education', 'milestone', 'curriculum', 'progress', 'academic'],
    suggestedUse: 'curriculum progress tracker, degree audit view',
    dominantColors: ['#e2e8f0', '#ea580c', '#10b981'],
    hasLottie: true
  },
  {
    id: 'anim-campus-transit-route',
    name: 'Campus Mobility Transit Route',
    tags: ['education', 'campus', 'transit', 'mobility', 'routing', 'quynhon'],
    suggestedUse: 'campus routing drawer, inter-building transit estimate',
    dominantColors: ['#0f172a', '#ea580c', '#f97316'],
    hasLottie: true
  },

  // UI States
  {
    id: 'anim-schedule-solver-loading',
    name: 'Schedule Solver Orbital Spinner',
    tags: ['loading', 'processing', 'solver', 'spinner', 'ui-state'],
    suggestedUse: 'schedule auto-generation loading modal, compute overlay',
    dominantColors: ['#ea580c', '#f97316', '#fb923c'],
    hasLottie: true
  },
  {
    id: 'anim-schedule-optimized-success',
    name: 'Schedule Optimized Victory Burst',
    tags: ['success', 'feedback', 'optimized', 'victory', 'ui-state'],
    suggestedUse: 'schedule generation success modal, activation complete',
    dominantColors: ['#ea580c', '#ffffff', '#ffedd5'],
    hasLottie: true
  },
  {
    id: 'anim-empty-schedule-zen',
    name: 'Empty Schedule Zen Day',
    tags: ['empty-state', 'zen', 'day-off', 'relax', 'ui-state'],
    suggestedUse: 'empty calendar day state, semester break screen',
    dominantColors: ['#fed7aa', '#ea580c', '#ffffff'],
    hasLottie: true
  },
  {
    id: 'anim-conflict-resolution-wave',
    name: 'Conflict Resolution Wave',
    tags: ['ui-state', 'conflict', 'reconcile', 'resolve', 'solver'],
    suggestedUse: 'conflict alert notification banner, auto-reconcile preview',
    dominantColors: ['#ea580c', '#0284c7', '#ffffff'],
    hasLottie: true
  },

  // 3D
  {
    id: 'anim-3d-crystal-polyhedron',
    name: '3D Crystal Polyhedron Rotation',
    tags: ['3d', 'crystal', 'polyhedron', 'glass', 'hero', 'loop'],
    suggestedUse: 'auth visual hero overlay, AI engine card',
    dominantColors: ['#ea580c', '#fed7aa', '#0f172a'],
    hasLottie: false
  },
  {
    id: 'anim-3d-floating-schedule-blocks',
    name: '3D Floating Isometric Schedule Blocks',
    tags: ['3d', 'blocks', 'isometric', 'glassmorphism', 'hero', 'onboarding'],
    suggestedUse: 'onboarding feature showcase, landing product demonstration',
    dominantColors: ['#ea580c', '#f97316', '#0284c7'],
    hasLottie: false
  },
  {
    id: 'anim-3d-sphere-wireframe-globe',
    name: '3D Network Campus Wireframe Globe',
    tags: ['3d', 'globe', 'network', 'sync', 'multi-campus'],
    suggestedUse: 'campus selector header, sync status modal',
    dominantColors: ['#ea580c', '#fed7aa', '#0f172a'],
    hasLottie: false
  }
];

const newAnimAssets = animationMeta.map(meta => {
  const gifRel = `animations/gif/${meta.id}.gif`;
  const webmRel = `animations/webm/${meta.id}.webm`;
  const webpRel = `animations/webp/${meta.id}.webp`;
  const thumbRel = `animations/thumbnails/${meta.id}.png`;
  const lottieRel = `animations/lottie/${meta.id}.json`;

  const gifPath = path.join(ROOT, gifRel);
  const gifSize = fs.existsSync(gifPath) ? fs.statSync(gifPath).size : 0;

  const formatsAvailable = ['gif', 'webm', 'webp', 'poster'];
  if (meta.hasLottie && fs.existsSync(path.join(ROOT, lottieRel))) {
    formatsAvailable.push('lottie');
  }

  return {
    id: meta.id,
    name: meta.name,
    category: 'animations',
    file: gifRel,
    thumbnail: thumbRel,
    format: 'gif',
    dimensions: '320x320',
    duration: '2.0s seamless loop (24 frames)',
    sizeBytes: gifSize,
    sizeFormatted: gifSize >= 1024 * 1024 ? `${(gifSize / (1024 * 1024)).toFixed(2)} MB` : `${(gifSize / 1024).toFixed(1)} KB`,
    dominantColors: meta.dominantColors,
    tags: meta.tags,
    suggestedUse: meta.suggestedUse,
    source: 'SmartSchedule Project (Native Algorithmic Render)',
    sourceUrl: 'https://smartschedule.fpt.edu.vn',
    author: 'SmartSchedule Design Engineering',
    license: 'MIT License (Free commercial & personal SaaS use)',
    attributionRequired: false,
    formatsAvailable,
    optimizedWebm: webmRel,
    optimizedWebp: webpRel,
    lottieJson: meta.hasLottie ? lottieRel : null
  };
});

const allAssets = [...baseAssets, ...newAnimAssets];

const catalog = {
  version: '1.1.0',
  updatedAt: new Date().toISOString(),
  projectName: 'SmartSchedule Design Asset Library (with Animations)',
  summary: {
    totalAssets: allAssets.length,
    totalSizeBytes: allAssets.reduce((sum, a) => sum + a.sizeBytes, 0),
    totalSizeFormatted: `${(allAssets.reduce((sum, a) => sum + a.sizeBytes, 0) / (1024 * 1024)).toFixed(2)} MB`,
    categories: {
      backgrounds: allAssets.filter(a => a.category === 'backgrounds').length,
      textures: allAssets.filter(a => a.category === 'textures').length,
      illustrations: allAssets.filter(a => a.category === 'illustrations').length,
      photography: allAssets.filter(a => a.category === 'photography').length,
      animations: allAssets.filter(a => a.category === 'animations').length
    }
  },
  assets: allAssets
};

fs.writeFileSync(path.join(ROOT, 'catalog.json'), JSON.stringify(catalog, null, 2), 'utf8');
console.log(`Updated catalog.json successfully!`);
console.log(`Total Assets:`, catalog.summary.totalAssets);
console.log(`Summary:`, catalog.summary);
