const fs = require('fs');
const path = require('path');

const ILLUST_DIR = path.join(__dirname, 'illustrations');

const illustrations = [
  {
    filename: 'openpeeps-student-laptop.svg',
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <!-- Open Peeps Style: Student with Laptop (CC0 - Pablo Stanley) -->
  <defs>
    <linearGradient id="laptop-glow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ea580c" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#ffedd5" stop-opacity="0.6"/>
    </linearGradient>
  </defs>
  <!-- Background circle -->
  <circle cx="200" cy="200" r="160" fill="url(#laptop-glow)"/>
  <circle cx="200" cy="200" r="150" fill="none" stroke="#ea580c" stroke-width="1.5" stroke-dasharray="4 6" stroke-opacity="0.3"/>
  <!-- Desk surface -->
  <line x1="60" y1="320" x2="340" y2="320" stroke="#0f172a" stroke-width="3" stroke-linecap="round"/>
  <!-- Character Body -->
  <path d="M140 320 C140 250 160 220 200 220 C240 220 260 250 260 320" fill="#0f172a"/>
  <!-- FPT Orange Hoodie Collar -->
  <path d="M175 220 L200 250 L225 220 Z" fill="#ea580c"/>
  <!-- Head & Hair -->
  <ellipse cx="200" cy="165" rx="36" ry="42" fill="#fed7aa"/>
  <!-- Curly Hair -->
  <path d="M160 160 C155 130 175 110 200 110 C225 110 245 130 240 160 C235 135 220 125 200 125 C180 125 165 135 160 160 Z" fill="#0f172a"/>
  <!-- Eyeglasses -->
  <rect x="175" y="152" width="20" height="15" rx="4" fill="none" stroke="#0f172a" stroke-width="2.5"/>
  <rect x="205" y="152" width="20" height="15" rx="4" fill="none" stroke="#0f172a" stroke-width="2.5"/>
  <line x1="195" y1="160" x2="205" y2="160" stroke="#0f172a" stroke-width="2.5"/>
  <!-- Smile -->
  <path d="M192 185 Q200 192 208 185" fill="none" stroke="#0f172a" stroke-width="2" stroke-linecap="round"/>
  <!-- Laptop Base & Screen -->
  <polygon points="150,315 250,315 240,265 160,265" fill="#f8fafc" stroke="#0f172a" stroke-width="2.5"/>
  <rect x="170" y="275" width="60" height="32" rx="2" fill="#ea580c" fill-opacity="0.1"/>
  <line x1="180" y1="285" x2="220" y2="285" stroke="#ea580c" stroke-width="2" stroke-linecap="round"/>
  <line x1="180" y1="293" x2="210" y2="293" stroke="#ea580c" stroke-width="2" stroke-linecap="round"/>
  <!-- Coffee Mug -->
  <rect x="280" y="295" width="22" height="25" rx="3" fill="#ea580c"/>
  <path d="M302 300 Q310 307 302 315" fill="none" stroke="#ea580c" stroke-width="2.5"/>
</svg>`
  },
  {
    filename: 'openpeeps-student-reading.svg',
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <!-- Open Peeps Style: Student Reviewing Schedule (CC0 - Pablo Stanley) -->
  <defs>
    <linearGradient id="reading-bg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fff7ed" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#ffedd5" stop-opacity="0.2"/>
    </linearGradient>
  </defs>
  <rect x="50" y="40" width="300" height="320" rx="24" fill="url(#reading-bg)"/>
  <!-- Student Body -->
  <path d="M150 360 C150 280 170 240 200 240 C230 240 250 280 250 360" fill="#0f172a"/>
  <!-- Head -->
  <circle cx="200" cy="175" r="38" fill="#fcd34d"/>
  <!-- Beanie Cap (FPT Orange) -->
  <path d="M165 165 C165 130 180 120 200 120 C220 120 235 130 235 165 Z" fill="#ea580c"/>
  <rect x="162" y="160" width="76" height="12" rx="4" fill="#c2410c"/>
  <!-- Face details -->
  <circle cx="188" cy="175" r="3" fill="#0f172a"/>
  <circle cx="212" cy="175" r="3" fill="#0f172a"/>
  <path d="M194 190 Q200 196 206 190" fill="none" stroke="#0f172a" stroke-width="2" stroke-linecap="round"/>
  <!-- Holding Open Schedule Book -->
  <path d="M140 290 L195 305 L195 245 L140 235 Z" fill="#ffffff" stroke="#0f172a" stroke-width="2.5"/>
  <path d="M260 290 L205 305 L205 245 L260 235 Z" fill="#ffffff" stroke="#0f172a" stroke-width="2.5"/>
  <!-- Timetable Lines on Book -->
  <line x1="150" y1="250" x2="185" y2="258" stroke="#ea580c" stroke-width="2" stroke-linecap="round"/>
  <line x1="150" y1="265" x2="185" y2="273" stroke="#64748b" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="150" y1="280" x2="180" y2="288" stroke="#64748b" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="215" y1="258" x2="250" y2="250" stroke="#ea580c" stroke-width="2" stroke-linecap="round"/>
  <line x1="215" y1="273" x2="250" y2="265" stroke="#64748b" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="215" y1="288" x2="245" y2="280" stroke="#64748b" stroke-width="1.5" stroke-linecap="round"/>
</svg>`
  },
  {
    filename: 'openpeeps-empty-calendar.svg',
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <!-- Open Peeps Style: Empty Calendar State (CC0 - Pablo Stanley) -->
  <defs>
    <linearGradient id="empty-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fff7ed"/>
      <stop offset="100%" stop-color="#f8fafc"/>
    </linearGradient>
  </defs>
  <!-- Background Card -->
  <rect x="40" y="40" width="320" height="320" rx="20" fill="url(#empty-grad)" stroke="#e2e8f0" stroke-width="2"/>
  <!-- Calendar Body -->
  <rect x="100" y="100" width="200" height="190" rx="14" fill="#ffffff" stroke="#0f172a" stroke-width="3"/>
  <!-- Header Bar -->
  <path d="M100 114 C100 106 106 100 114 100 L286 100 C294 100 300 106 300 114 L300 145 L100 145 Z" fill="#ea580c"/>
  <!-- Calendar Rings -->
  <rect x="140" y="85" width="12" height="28" rx="6" fill="#0f172a"/>
  <rect x="248" y="85" width="12" height="28" rx="6" fill="#0f172a"/>
  <!-- Big Clean Sun / Clear Mark -->
  <circle cx="200" cy="210" r="36" fill="#fff7ed" stroke="#ea580c" stroke-width="2.5" stroke-dasharray="4 4"/>
  <path d="M185 210 L195 220 L218 198" fill="none" stroke="#ea580c" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Bottom Text Lines -->
  <line x1="140" y1="265" x2="260" y2="265" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round"/>
</svg>`
  },
  {
    filename: 'openpeeps-success-celebration.svg',
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <!-- Open Peeps Style: Success & Optimization Completed (CC0 - Pablo Stanley) -->
  <defs>
    <radialGradient id="celebrate-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ea580c" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="200" cy="200" r="150" fill="url(#celebrate-glow)"/>
  <!-- Confetti Elements -->
  <rect x="90" y="90" width="10" height="10" rx="2" fill="#ea580c" transform="rotate(25 90 90)"/>
  <rect x="290" y="80" width="12" height="8" rx="2" fill="#f59e0b" transform="rotate(-15 290 80)"/>
  <circle cx="110" cy="170" r="5" fill="#0284c7"/>
  <circle cx="310" cy="150" r="6" fill="#ea580c"/>
  <polygon points="130,120 140,110 145,125" fill="#f97316"/>
  <polygon points="270,110 280,125 265,125" fill="#10b981"/>
  <!-- Character Body -->
  <path d="M140 370 C140 280 160 230 200 230 C240 230 260 280 260 370" fill="#0f172a"/>
  <!-- Cheerful Head -->
  <circle cx="200" cy="170" r="36" fill="#fed7aa"/>
  <!-- Big Happy Smile -->
  <path d="M188 180 Q200 196 212 180 Z" fill="#0f172a"/>
  <!-- Cheerful Eyes (Arcs) -->
  <path d="M184 165 Q190 158 196 165" fill="none" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M204 165 Q210 158 216 165" fill="none" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round"/>
  <!-- FPT Cap -->
  <path d="M165 155 C165 130 180 120 200 120 C220 120 235 130 235 155 Z" fill="#ea580c"/>
  <!-- Raised Cheerful Arms -->
  <path d="M145 250 L90 180 L105 165 L160 230" fill="#0f172a"/>
  <path d="M255 250 L310 180 L295 165 L240 230" fill="#0f172a"/>
</svg>`
  },
  {
    filename: 'openpeeps-search-no-results.svg',
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <!-- Open Peeps Style: No Results Found (CC0 - Pablo Stanley) -->
  <circle cx="200" cy="200" r="140" fill="#f8fafc" stroke="#e2e8f0" stroke-width="2"/>
  <!-- Character Head looking confused/searching -->
  <circle cx="170" cy="200" r="40" fill="#fed7aa"/>
  <!-- Hair -->
  <path d="M130 190 C130 155 155 150 185 150 C210 150 215 170 215 190 C200 165 160 165 130 190 Z" fill="#0f172a"/>
  <!-- Looking Eye -->
  <circle cx="160" cy="200" r="4" fill="#0f172a"/>
  <path d="M152 215 Q162 210 172 215" fill="none" stroke="#0f172a" stroke-width="2" stroke-linecap="round"/>
  <!-- Giant Magnifying Glass with Orange Ring -->
  <circle cx="240" cy="180" r="48" fill="#ffffff" fill-opacity="0.8" stroke="#ea580c" stroke-width="5"/>
  <line x1="274" y1="214" x2="320" y2="260" stroke="#0f172a" stroke-width="7" stroke-linecap="round"/>
  <!-- Question mark inside lens -->
  <text x="232" y="196" font-family="system-ui, sans-serif" font-size="42" font-weight="bold" fill="#ea580c">?</text>
</svg>`
  },
  {
    filename: 'openpeeps-campus-walking.svg',
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <!-- Open Peeps Style: Student Walking Across Campus (CC0 - Pablo Stanley) -->
  <path d="M50 340 L350 340" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="6 6"/>
  <!-- Character Striding -->
  <!-- Back leg -->
  <path d="M190 280 L160 340" stroke="#0f172a" stroke-width="12" stroke-linecap="round"/>
  <!-- Front leg -->
  <path d="M210 280 L240 340" stroke="#0f172a" stroke-width="12" stroke-linecap="round"/>
  <!-- Body / Coat -->
  <path d="M165 300 C165 220 185 190 205 190 C225 190 240 220 235 300 Z" fill="#0f172a"/>
  <!-- Backpack (FPT Orange) -->
  <rect x="150" y="200" width="24" height="50" rx="8" fill="#ea580c"/>
  <!-- Head & Scarf -->
  <circle cx="205" cy="145" r="32" fill="#fed7aa"/>
  <path d="M185 170 C195 180 215 180 225 170 L230 200 L180 200 Z" fill="#f97316"/>
  <!-- Hair & Profile -->
  <path d="M180 140 C175 110 205 110 225 115 C240 120 240 135 235 145 Z" fill="#0f172a"/>
  <circle cx="218" cy="142" r="3" fill="#0f172a"/>
  <!-- Small map/schedule in hand -->
  <rect x="235" y="220" width="22" height="30" rx="3" fill="#ffffff" stroke="#ea580c" stroke-width="2"/>
  <line x1="240" y1="228" x2="252" y2="228" stroke="#ea580c" stroke-width="1.5"/>
  <line x1="240" y1="236" x2="250" y2="236" stroke="#ea580c" stroke-width="1.5"/>
</svg>`
  },
  {
    filename: 'openpeeps-conflict-alert.svg',
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <!-- Open Peeps Style: Timetable Conflict Warning (CC0 - Pablo Stanley) -->
  <defs>
    <linearGradient id="alert-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef2f2"/>
      <stop offset="100%" stop-color="#fff7ed"/>
    </linearGradient>
  </defs>
  <rect x="40" y="40" width="320" height="320" rx="20" fill="url(#alert-grad)" stroke="#fecaca" stroke-width="2"/>
  <!-- Overlapping Timetable Cards -->
  <!-- Card A: Class 1 -->
  <rect x="80" y="110" width="150" height="100" rx="10" fill="#ffffff" stroke="#ea580c" stroke-width="2.5"/>
  <rect x="80" y="110" width="150" height="24" rx="8" fill="#ea580c"/>
  <line x1="95" y1="150" x2="160" y2="150" stroke="#0f172a" stroke-width="2"/>
  <line x1="95" y1="165" x2="190" y2="165" stroke="#94a3b8" stroke-width="2"/>
  <!-- Card B: Overlapping Class 2 -->
  <rect x="170" y="160" width="150" height="100" rx="10" fill="#ffffff" stroke="#dc2626" stroke-width="2.5"/>
  <rect x="170" y="160" width="150" height="24" rx="8" fill="#dc2626"/>
  <line x1="185" y1="200" x2="250" y2="200" stroke="#0f172a" stroke-width="2"/>
  <line x1="185" y1="215" x2="280" y2="215" stroke="#94a3b8" stroke-width="2"/>
  <!-- Conflict Warning Badge in Center -->
  <circle cx="180" cy="190" r="24" fill="#dc2626"/>
  <text x="174" y="200" font-family="system-ui, sans-serif" font-size="24" font-weight="bold" fill="#ffffff">!</text>
  <!-- Reconcile Suggestion Line -->
  <line x1="100" y1="300" x2="300" y2="300" stroke="#ea580c" stroke-width="2" stroke-linecap="round" stroke-dasharray="4 6"/>
</svg>`
  },
  {
    filename: 'openpeeps-welcome-onboarding.svg',
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <!-- Open Peeps Style: Welcome to SmartSchedule (CC0 - Pablo Stanley) -->
  <defs>
    <radialGradient id="welcome-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffedd5" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="200" cy="200" r="160" fill="url(#welcome-glow)"/>
  <!-- Body -->
  <path d="M140 360 C140 270 160 220 200 220 C240 220 260 270 260 360" fill="#0f172a"/>
  <!-- FPT Orange Lanyard / Student ID Card -->
  <path d="M185 220 L200 270 L215 220" fill="none" stroke="#ea580c" stroke-width="2.5"/>
  <rect x="190" y="270" width="20" height="26" rx="2" fill="#ffffff" stroke="#ea580c" stroke-width="1.5"/>
  <circle cx="200" cy="278" r="4" fill="#ea580c"/>
  <!-- Head -->
  <circle cx="200" cy="165" r="38" fill="#fed7aa"/>
  <!-- Hair Style -->
  <path d="M162 165 C160 120 185 110 200 110 C215 110 240 120 238 165 C230 135 210 125 200 125 C190 125 170 135 162 165 Z" fill="#0f172a"/>
  <!-- Smiling Face -->
  <circle cx="188" cy="162" r="3" fill="#0f172a"/>
  <circle cx="212" cy="162" r="3" fill="#0f172a"/>
  <path d="M192 180 Q200 190 208 180" fill="none" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round"/>
  <!-- Waving Right Hand -->
  <path d="M255 240 L295 170 L280 160 L240 225" fill="#0f172a"/>
  <circle cx="300" cy="160" r="14" fill="#fed7aa"/>
  <!-- Sparkles around hand -->
  <polygon points="325,140 330,148 338,150 330,152 325,160 320,152 312,150 320,148" fill="#ea580c"/>
  <polygon points="285,120 288,125 293,126 288,127 285,132 282,127 277,126 282,125" fill="#f59e0b"/>
</svg>`
  }
];

illustrations.forEach((ill) => {
  const target = path.join(ILLUST_DIR, ill.filename);
  fs.writeFileSync(target, ill.content.trim(), 'utf8');
  console.log(`Generated: ${ill.filename} (${fs.statSync(target).size} bytes)`);
});
