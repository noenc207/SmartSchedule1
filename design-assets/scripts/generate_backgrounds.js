const fs = require('fs');
const path = require('path');

const BG_DIR = path.join(__dirname, 'backgrounds');

const backgrounds = [
  {
    filename: 'haikei-layered-waves-orange.svg',
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" preserveAspectRatio="none">
  <defs>
    <linearGradient id="wave-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ea580c" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#f97316" stop-opacity="0.04"/>
    </linearGradient>
    <linearGradient id="wave-grad-2" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ea580c" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#fb923c" stop-opacity="0.08"/>
    </linearGradient>
    <linearGradient id="wave-grad-3" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" stop-color="#ea580c" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#c2410c" stop-opacity="0.15"/>
    </linearGradient>
  </defs>
  <path fill="url(#wave-grad-1)" d="M0,192L48,208C96,224,192,256,288,245.3C384,235,480,181,576,170.7C672,160,768,192,864,208C960,224,1056,224,1152,197.3C1248,171,1344,117,1392,90.7L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"/>
  <path fill="url(#wave-grad-2)" d="M0,96L48,122.7C96,149,192,203,288,208C384,213,480,171,576,144C672,117,768,107,864,128C960,149,1056,203,1152,208C1248,213,1344,171,1392,149.3L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"/>
  <path fill="url(#wave-grad-3)" d="M0,256L48,240C96,224,192,192,288,181.3C384,171,480,181,576,197.3C672,213,768,235,864,229.3C960,224,1056,192,1152,181.3C1248,171,1344,181,1392,186.7L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"/>
</svg>`
  },
  {
    filename: 'haikei-layered-peaks-slate.svg',
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 400" preserveAspectRatio="none">
  <defs>
    <linearGradient id="peak-grad-bg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#1e293b" stop-opacity="1"/>
    </linearGradient>
    <linearGradient id="peak-grad-1" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#334155" stop-opacity="0.6"/>
      <stop offset="50%" stop-color="#ea580c" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#334155" stop-opacity="0.6"/>
    </linearGradient>
    <linearGradient id="peak-grad-2" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ea580c" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#1e293b" stop-opacity="0.9"/>
    </linearGradient>
  </defs>
  <rect width="1440" height="400" fill="url(#peak-grad-bg)"/>
  <polygon points="0,400 0,220 180,280 360,190 540,260 720,140 900,240 1080,170 1260,250 1440,160 1440,400" fill="url(#peak-grad-1)"/>
  <polygon points="0,400 0,310 240,240 480,320 720,210 960,300 1200,220 1440,290 1440,400" fill="url(#peak-grad-2)"/>
  <polyline points="0,220 180,280 360,190 720,140 1080,170 1440,160" fill="none" stroke="#ea580c" stroke-width="2" stroke-opacity="0.6"/>
</svg>`
  },
  {
    filename: 'haikei-blob-cluster-academic.svg',
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600" preserveAspectRatio="xMidYMid meet">
  <defs>
    <filter id="blur-filter" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="40"/>
    </filter>
    <linearGradient id="blob-orange" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ea580c" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#f97316" stop-opacity="0.2"/>
    </linearGradient>
    <linearGradient id="blob-amber" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#fed7aa" stop-opacity="0.15"/>
    </linearGradient>
    <linearGradient id="blob-navy" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284c7" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#0f172a" stop-opacity="0.05"/>
    </linearGradient>
  </defs>
  <g filter="url(#blur-filter)">
    <path fill="url(#blob-orange)" d="M421.5,315.5Q373,381,299.5,389.5Q226,398,162,354.5Q98,311,108.5,234Q119,157,185,110.5Q251,64,329.5,88Q408,112,439,181Q470,250,421.5,315.5Z"/>
    <path fill="url(#blob-amber)" d="M721,390Q662,480,560,466Q458,452,430,361Q402,270,457.5,198.5Q513,127,613.5,134.5Q714,142,747,221Q780,300,721,390Z"/>
    <path fill="url(#blob-navy)" d="M350,510Q280,560,200,520Q120,480,130,400Q140,320,220,310Q300,300,360,360Q420,420,350,510Z"/>
  </g>
</svg>`
  },
  {
    filename: 'haikei-polygon-scatter.svg',
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="poly-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ea580c" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#fb923c" stop-opacity="0.05"/>
    </linearGradient>
    <linearGradient id="poly-grad-2" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0284c7" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#0f172a" stop-opacity="0.02"/>
    </linearGradient>
  </defs>
  <g stroke="#ea580c" stroke-width="1" stroke-opacity="0.2" fill="url(#poly-grad-1)">
    <polygon points="120,80 220,130 180,240 70,210"/>
    <polygon points="450,110 570,70 620,180 500,220"/>
    <polygon points="850,90 980,140 930,270 810,210"/>
    <polygon points="260,350 390,310 420,440 290,480"/>
    <polygon points="700,340 840,320 870,450 730,470"/>
    <polygon points="1020,380 1150,420 1100,550 970,510"/>
    <polygon points="150,580 290,540 320,680 180,720"/>
    <polygon points="520,560 660,520 700,660 550,690"/>
    <polygon points="820,590 950,560 980,700 850,730"/>
  </g>
  <g fill="url(#poly-grad-2)" stroke="#0284c7" stroke-width="1" stroke-opacity="0.15">
    <polygon points="340,180 430,220 390,300 300,260"/>
    <polygon points="680,200 770,160 820,250 730,290"/>
    <polygon points="560,400 660,430 620,520 520,490"/>
  </g>
</svg>`
  },
  {
    filename: 'haikei-wave-flow-minimal.svg',
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 240" preserveAspectRatio="none">
  <defs>
    <linearGradient id="flow-minimal" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ea580c" stop-opacity="0.12"/>
      <stop offset="50%" stop-color="#f97316" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#c2410c" stop-opacity="0.08"/>
    </linearGradient>
  </defs>
  <path fill="url(#flow-minimal)" d="M0,64L80,85.3C160,107,320,149,480,154.7C640,160,800,128,960,117.3C1120,107,1280,117,1360,122.7L1440,128L1440,240L1360,240C1280,240,1120,240,960,240C800,240,640,240,480,240C320,240,160,240,80,240L0,240Z"/>
  <path fill="none" stroke="#ea580c" stroke-width="1.5" stroke-opacity="0.35" d="M0,64L80,85.3C160,107,320,149,480,154.7C640,160,800,128,960,117.3C1120,107,1280,117,1360,122.7L1440,128"/>
</svg>`
  },
  {
    filename: 'haikei-stacked-steps-orange.svg',
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 360" preserveAspectRatio="none">
  <defs>
    <linearGradient id="step-grad-1" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fff7ed" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#ffedd5" stop-opacity="0.5"/>
    </linearGradient>
    <linearGradient id="step-grad-2" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fed7aa" stop-opacity="0.75"/>
      <stop offset="100%" stop-color="#fdba74" stop-opacity="0.4"/>
    </linearGradient>
    <linearGradient id="step-grad-3" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fb923c" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#f97316" stop-opacity="0.4"/>
    </linearGradient>
    <linearGradient id="step-grad-4" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ea580c" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#c2410c" stop-opacity="0.95"/>
    </linearGradient>
  </defs>
  <path fill="url(#step-grad-1)" d="M0,120 L240,120 L240,160 L480,160 L480,200 L720,200 L720,240 L960,240 L960,280 L1200,280 L1200,320 L1440,320 L1440,360 L0,360 Z"/>
  <path fill="url(#step-grad-2)" d="M0,170 L280,170 L280,210 L560,210 L560,250 L840,250 L840,290 L1120,290 L1120,330 L1440,330 L1440,360 L0,360 Z"/>
  <path fill="url(#step-grad-3)" d="M0,230 L360,230 L360,270 L720,270 L720,310 L1080,310 L1080,340 L1440,340 L1440,360 L0,360 Z"/>
  <path fill="url(#step-grad-4)" d="M0,290 L480,290 L480,320 L960,320 L960,350 L1440,350 L1440,360 L0,360 Z"/>
</svg>`
  },
  {
    filename: 'haikei-smooth-mesh-amber.svg',
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 600" preserveAspectRatio="none">
  <defs>
    <radialGradient id="mesh-rg-1" cx="20%" cy="30%" r="60%">
      <stop offset="0%" stop-color="#fed7aa" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="mesh-rg-2" cx="80%" cy="40%" r="55%">
      <stop offset="0%" stop-color="#ea580c" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="mesh-rg-3" cx="50%" cy="85%" r="50%">
      <stop offset="0%" stop-color="#f97316" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="600" fill="#f8fafc"/>
  <rect width="1200" height="600" fill="url(#mesh-rg-1)"/>
  <rect width="1200" height="600" fill="url(#mesh-rg-2)"/>
  <rect width="1200" height="600" fill="url(#mesh-rg-3)"/>
</svg>`
  },
  {
    filename: 'haikei-circle-scatter-focus.svg',
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="circle-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ea580c" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#f97316" stop-opacity="0.05"/>
    </linearGradient>
  </defs>
  <!-- Concentric focus rings -->
  <circle cx="200" cy="300" r="140" fill="none" stroke="url(#circle-stroke)" stroke-width="1.5" stroke-dasharray="4 6"/>
  <circle cx="200" cy="300" r="90" fill="none" stroke="#ea580c" stroke-width="1" stroke-opacity="0.25"/>
  <circle cx="200" cy="300" r="40" fill="#ea580c" fill-opacity="0.06"/>
  
  <circle cx="750" cy="220" r="180" fill="none" stroke="url(#circle-stroke)" stroke-width="1.5"/>
  <circle cx="750" cy="220" r="120" fill="none" stroke="#f97316" stroke-width="1" stroke-opacity="0.2" stroke-dasharray="3 4"/>
  <circle cx="750" cy="220" r="60" fill="#ea580c" fill-opacity="0.05"/>

  <circle cx="500" cy="450" r="100" fill="none" stroke="url(#circle-stroke)" stroke-width="1"/>
  <circle cx="500" cy="450" r="50" fill="#ea580c" fill-opacity="0.04"/>

  <circle cx="850" cy="500" r="70" fill="none" stroke="#ea580c" stroke-width="1" stroke-opacity="0.2"/>
</svg>`
  },
  {
    filename: 'haikei-layered-waves-navy.svg',
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" preserveAspectRatio="none">
  <defs>
    <linearGradient id="navy-wave-1" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0b1120" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#1e293b" stop-opacity="0.85"/>
    </linearGradient>
    <linearGradient id="navy-wave-2" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0284c7" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#0f172a" stop-opacity="0.95"/>
    </linearGradient>
  </defs>
  <path fill="url(#navy-wave-2)" d="M0,160L60,176C120,192,240,224,360,224C480,224,600,192,720,170.7C840,149,960,139,1080,149.3C1200,160,1320,192,1380,208L1440,224L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"/>
  <path fill="url(#navy-wave-1)" d="M0,224L60,213.3C120,203,240,181,360,181.3C480,181,600,203,720,213.3C840,224,960,224,1080,208C1200,192,1320,160,1380,144L1440,128L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"/>
  <path fill="none" stroke="#ea580c" stroke-width="2" stroke-opacity="0.4" d="M0,224L60,213.3C120,203,240,181,360,181.3C480,181,600,203,720,213.3C840,224,960,224,1080,208C1200,192,1320,160,1380,144L1440,128"/>
</svg>`
  },
  {
    filename: 'haikei-geometric-stripes.svg',
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 400" preserveAspectRatio="none">
  <defs>
    <linearGradient id="stripe-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ea580c" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#fed7aa" stop-opacity="0.02"/>
    </linearGradient>
  </defs>
  <g fill="url(#stripe-grad)" transform="skewX(-24)">
    <rect x="50" y="0" width="40" height="400"/>
    <rect x="130" y="0" width="80" height="400"/>
    <rect x="250" y="0" width="20" height="400"/>
    <rect x="310" y="0" width="120" height="400"/>
    <rect x="470" y="0" width="60" height="400"/>
    <rect x="570" y="0" width="160" height="400"/>
    <rect x="770" y="0" width="30" height="400"/>
    <rect x="840" y="0" width="100" height="400"/>
    <rect x="980" y="0" width="50" height="400"/>
  </g>
</svg>`
  },
  {
    filename: 'haikei-fluid-bubble-accent.svg',
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid meet">
  <defs>
    <linearGradient id="bubble-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ea580c" stop-opacity="0.3"/>
      <stop offset="50%" stop-color="#f97316" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#fed7aa" stop-opacity="0.04"/>
    </linearGradient>
  </defs>
  <path fill="url(#bubble-grad)" d="M680,240C720,340,640,430,520,450C400,470,240,420,160,340C80,260,80,150,170,90C260,30,440,20,550,70C660,120,640,140,680,240Z"/>
  <circle cx="280" cy="180" r="30" fill="#ea580c" fill-opacity="0.1"/>
  <circle cx="480" cy="320" r="45" fill="#f97316" fill-opacity="0.08"/>
</svg>`
  },
  {
    filename: 'haikei-subtle-aurora-glow.svg',
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 600" preserveAspectRatio="none">
  <defs>
    <filter id="aurora-blur" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="80"/>
    </filter>
    <linearGradient id="aurora-1" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ea580c" stop-opacity="0.25"/>
      <stop offset="50%" stop-color="#f97316" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#0284c7" stop-opacity="0.18"/>
    </linearGradient>
  </defs>
  <g filter="url(#aurora-blur)">
    <path fill="url(#aurora-1)" d="M-100,100 Q400,300 800,150 T1600,200 L1600,500 L-100,500 Z"/>
    <ellipse cx="720" cy="200" rx="500" ry="120" fill="#ea580c" fill-opacity="0.15"/>
  </g>
</svg>`
  }
];

backgrounds.forEach((bg) => {
  const target = path.join(BG_DIR, bg.filename);
  fs.writeFileSync(target, bg.content.trim(), 'utf8');
  console.log(`Generated: ${bg.filename} (${fs.statSync(target).size} bytes)`);
});
