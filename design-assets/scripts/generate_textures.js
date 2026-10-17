const fs = require('fs');
const path = require('path');

const TEXTURE_DIR = path.join(__dirname, 'textures');

const textures = [
  {
    filename: 'heropattern-topography.svg',
    content: `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
  <!-- Hero Patterns: Topography by Steve Schoger (CC BY 4.0) -->
  <path fill="none" stroke="#ea580c" stroke-width="1.2" stroke-opacity="0.18" d="M0 10c20-5 35 15 50 10s30-20 50-10 M0 25c25-10 40 10 60 5s25-15 40-5 M0 45c15-8 30 12 50 8s35-18 50-8 M0 65c20-5 35 15 50 10s30-20 50-10 M0 85c25-10 40 10 60 5s25-15 40-5"/>
</svg>`
  },
  {
    filename: 'heropattern-circuit-board.svg',
    content: `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
  <!-- Hero Patterns: Circuit Board by Steve Schoger (CC BY 4.0) -->
  <g fill="none" stroke="#ea580c" stroke-width="1.2" stroke-opacity="0.22">
    <path d="M0 20h40l20 20h60 M20 0v30l20 20v50 M60 0v20l20 20h40 M0 80h30l20-20h40l20 20h10 M80 120v-30l-20-20H20"/>
    <circle cx="40" cy="20" r="2.5" fill="#ea580c" fill-opacity="0.4"/>
    <circle cx="80" cy="40" r="2.5" fill="#ea580c" fill-opacity="0.4"/>
    <circle cx="50" cy="60" r="2.5" fill="#ea580c" fill-opacity="0.4"/>
    <circle cx="90" cy="80" r="2.5" fill="#ea580c" fill-opacity="0.4"/>
    <circle cx="20" cy="50" r="2.5" fill="#ea580c" fill-opacity="0.4"/>
  </g>
</svg>`
  },
  {
    filename: 'heropattern-architectural-grid.svg',
    content: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
  <!-- Hero Patterns / SmartSchedule Blueprint Grid -->
  <defs>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#ea580c" stroke-width="1" stroke-opacity="0.12"/>
      <path d="M 20 0 L 20 40 M 0 20 L 40 20" fill="none" stroke="#ea580c" stroke-width="0.5" stroke-opacity="0.06"/>
    </pattern>
  </defs>
  <rect width="40" height="40" fill="url(#grid)"/>
</svg>`
  },
  {
    filename: 'heropattern-hexagons.svg',
    content: `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="100" viewBox="0 0 56 100">
  <!-- Hero Patterns: Hexagons by Steve Schoger (CC BY 4.0) -->
  <path fill="none" stroke="#ea580c" stroke-width="1" stroke-opacity="0.16" d="M28 66L0 50L0 16L28 0L56 16L56 50L28 66L28 100 M0 50L0 84L28 100L56 84L56 50"/>
</svg>`
  },
  {
    filename: 'heropattern-diagonal-stripes.svg',
    content: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
  <!-- Hero Patterns: Diagonal Stripes by Steve Schoger (CC BY 4.0) -->
  <path d="M0 20L20 0 M-5 5L5 -5 M15 25L25 15" fill="none" stroke="#ea580c" stroke-width="1.2" stroke-opacity="0.14"/>
</svg>`
  },
  {
    filename: 'heropattern-polka-dots.svg',
    content: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <!-- Hero Patterns: Polka Dots by Steve Schoger (CC BY 4.0) -->
  <circle cx="12" cy="12" r="1.5" fill="#ea580c" fill-opacity="0.2"/>
  <circle cx="0" cy="0" r="1.5" fill="#ea580c" fill-opacity="0.1"/>
  <circle cx="24" cy="0" r="1.5" fill="#ea580c" fill-opacity="0.1"/>
  <circle cx="0" cy="24" r="1.5" fill="#ea580c" fill-opacity="0.1"/>
  <circle cx="24" cy="24" r="1.5" fill="#ea580c" fill-opacity="0.1"/>
</svg>`
  },
  {
    filename: 'heropattern-plus-matrix.svg',
    content: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <!-- SmartSchedule Precision Plus Matrix -->
  <g stroke="#ea580c" stroke-width="1" stroke-opacity="0.18">
    <line x1="16" y1="12" x2="16" y2="20"/>
    <line x1="12" y1="16" x2="20" y2="16"/>
  </g>
</svg>`
  },
  {
    filename: 'heropattern-wiggle.svg',
    content: `<svg xmlns="http://www.w3.org/2000/svg" width="42" height="44" viewBox="0 0 42 44">
  <!-- Hero Patterns: Wiggle by Steve Schoger (CC BY 4.0) -->
  <path d="M0 22C7 22 7 6 14 6C21 6 21 22 28 22C35 22 35 6 42 6 M0 44C7 44 7 28 14 28C21 28 21 44 28 44C35 44 35 28 42 28" fill="none" stroke="#ea580c" stroke-width="1.2" stroke-opacity="0.16"/>
</svg>`
  }
];

textures.forEach((tex) => {
  const target = path.join(TEXTURE_DIR, tex.filename);
  fs.writeFileSync(target, tex.content.trim(), 'utf8');
  console.log(`Generated: ${tex.filename} (${fs.statSync(target).size} bytes)`);
});
