const fs = require('fs');
const path = require('path');

const LOTTIE_DIR = path.join(__dirname, '..', 'animations', 'lottie');

// Helper to create basic Lottie shapes
function createCircleLayer(name, colorRgb, radius, cx, cy, startFrame, endFrame, rotateSpeed = 0, strokeWidth = 0, strokeRgb = null) {
  const shapes = [];

  // Ellipse shape
  shapes.push({
    ty: 'el',
    p: { a: 0, k: [0, 0] },
    s: { a: 0, k: [radius * 2, radius * 2] }
  });

  if (strokeWidth > 0 && strokeRgb) {
    shapes.push({
      ty: 'st',
      c: { a: 0, k: [strokeRgb[0] / 255, strokeRgb[1] / 255, strokeRgb[2] / 255, 1] },
      o: { a: 0, k: 100 },
      w: { a: 0, k: strokeWidth },
      lc: 2,
      lj: 2
    });
  }

  if (colorRgb) {
    shapes.push({
      ty: 'fl',
      c: { a: 0, k: [colorRgb[0] / 255, colorRgb[1] / 255, colorRgb[2] / 255, 1] },
      o: { a: 0, k: 100 },
      r: 1
    });
  }

  shapes.push({
    ty: 'tr',
    p: { a: 0, k: [0, 0] },
    a: { a: 0, k: [0, 0] },
    s: { a: 0, k: [100, 100] },
    r: { a: 0, k: 0 },
    o: { a: 0, k: 100 }
  });

  return {
    ddd: 0,
    ind: 1,
    ty: 4, // shape layer
    nm: name,
    sr: 1,
    ks: {
      o: { a: 0, k: 100 },
      r: rotateSpeed !== 0 ? {
        a: 1,
        k: [
          { t: startFrame, s: [0], e: [360 * rotateSpeed] },
          { t: endFrame, s: [360 * rotateSpeed] }
        ]
      } : { a: 0, k: 0 },
      p: { a: 0, k: [cx, cy, 0] },
      a: { a: 0, k: [0, 0, 0] },
      s: { a: 0, k: [100, 100, 100] }
    },
    ao: 0,
    shapes: [{ ty: 'gr', nm: 'Group', it: shapes }],
    ip: startFrame,
    op: endFrame,
    st: startFrame,
    bm: 0
  };
}

// 1. Schedule Solver Loading (Orbital tri-ring spinner)
const lottieSolverLoading = {
  v: '5.7.4',
  fr: 30,
  ip: 0,
  op: 60,
  w: 300,
  h: 300,
  nm: 'Schedule Solver Loading',
  ddd: 0,
  assets: [],
  layers: [
    createCircleLayer('Ring Outer', null, 70, 150, 150, 0, 60, 1, 4, [234, 88, 12]),
    createCircleLayer('Ring Mid', null, 48, 150, 150, 0, 60, -1, 3.5, [249, 115, 22]),
    createCircleLayer('Ring Inner', null, 26, 150, 150, 0, 60, 2, 3, [251, 146, 60]),
    createCircleLayer('Core Dot', [234, 88, 12], 9, 150, 150, 0, 60, 0)
  ]
};

// 2. Schedule Optimized Success (Bursting Checkmark)
const lottieOptimizedSuccess = {
  v: '5.7.4',
  fr: 30,
  ip: 0,
  op: 60,
  w: 300,
  h: 300,
  nm: 'Schedule Optimized Success',
  ddd: 0,
  assets: [],
  layers: [
    createCircleLayer('Success Glow', [255, 237, 213], 80, 150, 150, 0, 60, 0),
    createCircleLayer('Main Ring', null, 65, 150, 150, 0, 60, 0, 5, [234, 88, 12]),
    createCircleLayer('Center Badge', [234, 88, 12], 50, 150, 150, 0, 60, 0),
    createCircleLayer('Check Accent', [255, 255, 255], 16, 150, 150, 0, 60, 0)
  ]
};

// 3. Academic Focus Clock (Pomodoro Focus Ring)
const lottieFocusClock = {
  v: '5.7.4',
  fr: 30,
  ip: 0,
  op: 60,
  w: 300,
  h: 300,
  nm: 'Academic Focus Study Clock',
  ddd: 0,
  assets: [],
  layers: [
    createCircleLayer('Base Track', null, 75, 150, 150, 0, 60, 0, 6, [241, 245, 249]),
    createCircleLayer('Progress Arc', null, 75, 150, 150, 0, 60, 1, 6, [234, 88, 12]),
    createCircleLayer('Center Core', [255, 247, 237], 45, 150, 150, 0, 60, 0),
    createCircleLayer('Center Pivot', [15, 23, 42], 8, 150, 150, 0, 60, 0)
  ]
};

// 4. Academic Calendar Flip
const lottieCalendarFlip = {
  v: '5.7.4',
  fr: 30,
  ip: 0,
  op: 60,
  w: 300,
  h: 300,
  nm: 'Academic Calendar Flip',
  ddd: 0,
  assets: [],
  layers: [
    createCircleLayer('Backdrop Glow', [255, 247, 237], 90, 150, 150, 0, 60, 0),
    createCircleLayer('Calendar Base', [255, 255, 255], 65, 150, 150, 0, 60, 0, 3, [226, 232, 240]),
    createCircleLayer('Calendar Accent Ring', null, 40, 150, 150, 0, 60, 0.5, 4, [234, 88, 12])
  ]
};

// 5. Exam Milestone Path
const lottieMilestonePath = {
  v: '5.7.4',
  fr: 30,
  ip: 0,
  op: 60,
  w: 300,
  h: 300,
  nm: 'Exam Milestone Progression Path',
  ddd: 0,
  assets: [],
  layers: [
    createCircleLayer('Node 1', [234, 88, 12], 22, 70, 150, 0, 60, 0),
    createCircleLayer('Node 2', [249, 115, 22], 22, 150, 150, 0, 60, 0),
    createCircleLayer('Node 3', [16, 185, 129], 22, 230, 150, 0, 60, 0),
    createCircleLayer('Connecting Track', null, 85, 150, 150, 0, 60, 0.5, 3, [226, 232, 240])
  ]
};

// 6. Campus Transit Route
const lottieCampusTransit = {
  v: '5.7.4',
  fr: 30,
  ip: 0,
  op: 60,
  w: 300,
  h: 300,
  nm: 'Campus Mobility Transit Route',
  ddd: 0,
  assets: [],
  layers: [
    createCircleLayer('Campus Radar Pulse', null, 85, 150, 150, 0, 60, 0.75, 2, [234, 88, 12]),
    createCircleLayer('Origin Building', [15, 23, 42], 18, 90, 180, 0, 60, 0),
    createCircleLayer('Destination Hall', [234, 88, 12], 22, 210, 120, 0, 60, 0),
    createCircleLayer('Transit Wave', null, 40, 150, 150, 0, 60, -1, 3, [249, 115, 22])
  ]
};

// 7. Empty Schedule Zen
const lottieEmptyZen = {
  v: '5.7.4',
  fr: 30,
  ip: 0,
  op: 60,
  w: 300,
  h: 300,
  nm: 'Empty Schedule Zen Day',
  ddd: 0,
  assets: [],
  layers: [
    createCircleLayer('Sun Ray Ambient', [255, 237, 213], 90, 150, 150, 0, 60, 0.25),
    createCircleLayer('Zen Circle Ring', null, 60, 150, 150, 0, 60, 0, 3, [234, 88, 12]),
    createCircleLayer('Inner Balance', [255, 255, 255], 35, 150, 150, 0, 60, 0)
  ]
};

// 8. Conflict Resolution Wave
const lottieConflictResolve = {
  v: '5.7.4',
  fr: 30,
  ip: 0,
  op: 60,
  w: 300,
  h: 300,
  nm: 'Timetable Conflict Resolution Wave',
  ddd: 0,
  assets: [],
  layers: [
    createCircleLayer('Alert Pulse', null, 80, 150, 150, 0, 60, 0.5, 3, [220, 38, 38]),
    createCircleLayer('Resolve Core', [234, 88, 12], 45, 150, 150, 0, 60, 0),
    createCircleLayer('Harmonic Wave', null, 30, 150, 150, 0, 60, -1, 4, [16, 185, 129])
  ]
};

// 9. Geometric Pulse Core
const lottieGeometricPulse = {
  v: '5.7.4',
  fr: 30,
  ip: 0,
  op: 60,
  w: 300,
  h: 300,
  nm: 'Geometric AI Pulse Core',
  ddd: 0,
  assets: [],
  layers: [
    createCircleLayer('Outer Hex Glow', null, 80, 150, 150, 0, 60, 0.5, 2, [234, 88, 12]),
    createCircleLayer('Mid Pulse Ring', null, 55, 150, 150, 0, 60, -0.5, 3, [249, 115, 22]),
    createCircleLayer('Inner Poly Ring', null, 30, 150, 150, 0, 60, 1, 3.5, [251, 146, 60]),
    createCircleLayer('Center AI Core', [234, 88, 12], 12, 150, 150, 0, 60, 0)
  ]
};

const items = [
  { name: 'anim-schedule-solver-loading.json', data: lottieSolverLoading },
  { name: 'anim-schedule-optimized-success.json', data: lottieOptimizedSuccess },
  { name: 'anim-focus-study-clock.json', data: lottieFocusClock },
  { name: 'anim-academic-calendar-flip.json', data: lottieCalendarFlip },
  { name: 'anim-exam-milestone-path.json', data: lottieMilestonePath },
  { name: 'anim-campus-transit-route.json', data: lottieCampusTransit },
  { name: 'anim-empty-schedule-zen.json', data: lottieEmptyZen },
  { name: 'anim-conflict-resolution-wave.json', data: lottieConflictResolve },
  { name: 'anim-geometric-pulse-core.json', data: lottieGeometricPulse }
];

items.forEach(item => {
  const target = path.join(LOTTIE_DIR, item.name);
  fs.writeFileSync(target, JSON.stringify(item.data, null, 2), 'utf8');
  console.log(`Generated Lottie: ${item.name} (${fs.statSync(target).size} bytes)`);
});
