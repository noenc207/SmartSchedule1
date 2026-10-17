# SmartSchedule — Local Design Asset & Animation Catalog

A lightweight, curated visual asset repository designed for AI coding agents and frontend engineers to rapidly build high-aesthetic, consistent, and resource-efficient interfaces for SmartSchedule (Academic SaaS / FPT University Quy Nhơn).

> [!NOTE]
> **Total Assets:** 48 curated assets across 5 collections  
> **Total Footprint:** ~2.34 MB (Entire library with animations is strictly under 15 MB)  
> **Location:** `d:\SmartSchedul\design-assets\`  
> **Preview Interface:** Open [preview.html](file:///d:/SmartSchedul/design-assets/preview.html) directly in any web browser.

---

## 1. Directory Structure

```text
design-assets/
├── animations/          # 15 Curated animation loops & UI state motions
│   ├── gif/             # Looping GIF animations
│   ├── webp/            # Optimized animated WebP posters
│   ├── webm/            # Hardware-accelerated WebM video loops
│   ├── lottie/          # 8 Vector Lottie JSON animations
│   ├── thumbnails/      # Static PNG preview posters
│   └── references/      # Animation guide, format matrix, and license notes
├── backgrounds/         # 12 Scalable SVG backgrounds (waves, peaks, blobs, grids)
├── textures/            # 8 Seamless repeating SVG patterns (Hero Patterns)
├── illustrations/       # 8 Vector empty-state and student illustrations (Open Peeps)
├── photography/         # 5 Curated WebP photos for campus and focus (< 320 KB each)
├── thumbnails/          # Lightweight previews for rapid UI rendering
├── scripts/             # Deterministic asset generators & metadata compiler
├── catalog.json         # Machine-readable metadata catalog
├── ASSET_CATALOG.md     # This comprehensive catalog reference
├── LICENSES.md          # Complete license register & legal compliance
└── preview.html         # Interactive standalone offline catalog viewer
```

---

## 2. Backgrounds (`design-assets/backgrounds/`)

SVG vector files designed for hero sections, card backgrounds, section dividers, and modal headers.

| Preview File | Asset ID & Name | Dimensions / Size | Dominant Colors | Suggested UI Use | License |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `backgrounds/haikei-layered-waves-orange.svg` | `bg-layered-waves-orange`<br>**Layered Waves Orange** | 1440×320<br>`1.8 KB` | `#ea580c` `#f97316` `#ffffff` | Login hero header, page header, footer divider | Free Commercial (Haikei) |
| `backgrounds/haikei-layered-peaks-slate.svg` | `bg-layered-peaks-slate`<br>**Geometric Peaks Slate** | 1440×400<br>`1.3 KB` | `#0f172a` `#1e293b` `#ea580c` | Dashboard hero, dark telemetry header | Free Commercial (Haikei) |
| `backgrounds/haikei-blob-cluster-academic.svg` | `bg-blob-cluster-academic`<br>**Soft Blob Cluster** | 900×600<br>`1.4 KB` | `#ea580c` `#f59e0b` `#0284c7` | Modal backdrop, card ambient glow | Free Commercial (Haikei) |
| `backgrounds/haikei-polygon-scatter.svg` | `bg-polygon-scatter`<br>**Data Polygon Scatter** | 1200×800<br>`1.4 KB` | `#ea580c` `#fb923c` `#0284c7` | Timetable canvas, AI scheduler card | Free Commercial (Haikei) |
| `backgrounds/haikei-wave-flow-minimal.svg` | `bg-wave-flow-minimal`<br>**Minimal Wave Flow** | 1440×240<br>`845 B` | `#ea580c` `#f97316` `#ffffff` | Landing section divider, card separator | Free Commercial (Haikei) |
| `backgrounds/haikei-stacked-steps-orange.svg` | `bg-stacked-steps-orange`<br>**Progression Steps** | 1440×360<br>`1.6 KB` | `#ea580c` `#fb923c` `#fed7aa` | Milestones view, semester progress bar | Free Commercial (Haikei) |
| `backgrounds/haikei-smooth-mesh-amber.svg` | `bg-smooth-mesh-amber`<br>**Smooth Amber Mesh** | 1200×600<br>`994 B` | `#f8fafc` `#fed7aa` `#ea580c` | Dashboard canvas, settings page background | Free Commercial (Haikei) |
| `backgrounds/haikei-circle-scatter-focus.svg` | `bg-circle-scatter-focus`<br>**Focus Rings Scatter** | 1000×600<br>`1.3 KB` | `#ea580c` `#f97316` `#ffffff` | Exam countdown card, focus timer widget | Free Commercial (Haikei) |
| `backgrounds/haikei-layered-waves-navy.svg` | `bg-layered-waves-navy`<br>**Coastal Deep Navy Waves** | 1440×320<br>`1.4 KB` | `#0b1120` `#1e293b` `#ea580c` | Dark mode hero, footer background | Free Commercial (Haikei) |
| `backgrounds/haikei-geometric-stripes.svg` | `bg-geometric-stripes`<br>**Academic Speed Stripes** | 1000×400<br>`861 B` | `#ea580c` `#fed7aa` `#ffffff` | Optimization banner, speed metric card | Free Commercial (Haikei) |
| `backgrounds/haikei-fluid-bubble-accent.svg` | `bg-fluid-bubble-accent`<br>**Fluid Bubble Accent** | 800×500<br>`729 B` | `#ea580c` `#f97316` `#fed7aa` | Onboarding callout, tooltip backdrop | Free Commercial (Haikei) |
| `backgrounds/haikei-subtle-aurora-glow.svg` | `bg-subtle-aurora-glow`<br>**Aurora Glow Field** | 1440×600<br>`765 B` | `#ea580c` `#f97316` `#0284c7` | Page ambient background, subtle glow | Free Commercial (Haikei) |

---

## 3. Textures & Patterns (`design-assets/textures/`)

Repeating SVG patterns based on Hero Patterns (Steve Schoger, CC BY 4.0), customized with FPT Orange (#ea580c) and subtle opacity.

| File Path | Asset ID & Name | Dimensions / Size | Dominant Colors | Suggested UI Use |
| :--- | :--- | :--- | :--- | :--- |
| `textures/heropattern-topography.svg` | `tex-heropattern-topography`<br>**Topography Contour** | 100×100 repeat<br>`415 B` | `#ea580c` `#ffffff` | Card subtle pattern, campus routing map |
| `textures/heropattern-circuit-board.svg` | `tex-heropattern-circuit-board`<br>**Circuit Board Intelligence** | 120×120 repeat<br>`725 B` | `#ea580c` `#ffffff` | AI scheduling banner, tech badge |
| `textures/heropattern-architectural-grid.svg` | `tex-heropattern-architectural-grid`<br>**Architectural Blueprint Grid** | 40×40 repeat<br>`530 B` | `#ea580c` `#ffffff` | Calendar timetable background, time-block canvas |
| `textures/heropattern-hexagons.svg` | `tex-heropattern-hexagons`<br>**Hexagonal Lattice** | 56×100 repeat<br>`315 B` | `#ea580c` `#ffffff` | Course cluster card, module tree background |
| `textures/heropattern-diagonal-stripes.svg` | `tex-heropattern-diagonal-stripes`<br>**Micro Diagonal Hatching** | 20×20 repeat<br>`281 B` | `#ea580c` `#ffffff` | Calendar break periods, non-working hours |
| `textures/heropattern-polka-dots.svg` | `tex-heropattern-polka-dots`<br>**Academic Dot Matrix** | 24×24 repeat<br>`502 B` | `#ea580c` `#ffffff` | Hero surface background, side panel texture |
| `textures/heropattern-plus-matrix.svg` | `tex-heropattern-plus-matrix`<br>**Precision Plus Matrix** | 32×32 repeat<br>`294 B` | `#ea580c` `#ffffff` | Solver constraint view, telemetry graph backdrop |
| `textures/heropattern-wiggle.svg` | `tex-heropattern-wiggle`<br>**Playful Wiggle Pattern** | 42×44 repeat<br>`347 B` | `#ea580c` `#ffffff` | Activity card, break reminder modal |

---

## 4. Illustrations (`design-assets/illustrations/`)

Vector illustrations in the Open Peeps hand-drawn academic style (Pablo Stanley, CC0 1.0 Universal).

| File Path | Asset ID & Name | Dimensions / Size | Dominant Colors | Suggested UI Use |
| :--- | :--- | :--- | :--- | :--- |
| `illustrations/openpeeps-student-laptop.svg` | `ill-openpeeps-student-laptop`<br>**Student with Laptop** | 400×400<br>`2.3 KB` | `#0f172a` `#ea580c` `#fed7aa` | Dashboard study widget, task automation card |
| `illustrations/openpeeps-student-reading.svg` | `ill-openpeeps-student-reading`<br>**Student Reviewing Timetable** | 400×400<br>`2.0 KB` | `#0f172a` `#ea580c` `#fcd34d` | Syllabus import guide, exam schedule overview |
| `illustrations/openpeeps-empty-calendar.svg` | `ill-openpeeps-empty-calendar`<br>**Clean Empty Calendar State** | 400×400<br>`1.4 KB` | `#ffffff` `#ea580c` `#0f172a` | Empty state: no classes scheduled for the day |
| `illustrations/openpeeps-success-celebration.svg` | `ill-openpeeps-success-celebration`<br>**Schedule Optimized Celebration** | 400×400<br>`1.7 KB` | `#0f172a` `#ea580c` `#10b981` | Schedule generation modal, exam pass congrats |
| `illustrations/openpeeps-search-no-results.svg` | `ill-openpeeps-search-no-results`<br>**Search No Results State** | 400×400<br>`1.1 KB` | `#ea580c` `#0f172a` `#fed7aa` | Command palette no matches, course search empty |
| `illustrations/openpeeps-campus-walking.svg` | `ill-openpeeps-campus-walking`<br>**Student Walking Across Campus** | 400×400<br>`1.4 KB` | `#0f172a` `#ea580c` `#cbd5e1` | Campus mobility & routing drawer, walking times |
| `illustrations/openpeeps-conflict-alert.svg` | `ill-openpeeps-conflict-alert`<br>**Timetable Conflict Alert** | 400×400<br>`1.7 KB` | `#dc2626` `#ea580c` `#0f172a` | Schedule clash notification, auto-reconciliation |
| `illustrations/openpeeps-welcome-onboarding.svg` | `ill-openpeeps-welcome-onboarding`<br>**Welcome to SmartSchedule** | 400×400<br>`1.7 KB` | `#0f172a` `#ea580c` `#fed7aa` | First-time onboarding modal, account confirmation |

---

## 5. Photography (`design-assets/photography/`)

Curated, high-resolution WebP photographs under Unsplash License. Optimized to strictly stay under 350 KB per asset.

| File Path | Asset ID & Name | Dimensions / Size | Author & License | Suggested UI Use |
| :--- | :--- | :--- | :--- | :--- |
| `photography/photo-campus-modern-library.webp` | `photo-campus-modern-library`<br>**Modern University Library** | 1200×800<br>`314.2 KB` | Giammarco Boscaro<br>Unsplash License | Study spaces section, library booking, hero card |
| `photography/photo-students-collaborative-study.webp` | `photo-students-collaborative-study`<br>**Students Collaborating** | 1200×800<br>`136.1 KB` | Annie Spratt<br>Unsplash License | Group study session banner, project collaboration |
| `photography/photo-focus-desk-laptop.webp` | `photo-focus-desk-laptop`<br>**Focused Desk with Laptop** | 1200×800<br>`99.2 KB` | Christopher Gower<br>Unsplash License | Focus mode header, personal timetable workspace |
| `photography/photo-coastal-horizon-sunrise.webp` | `photo-coastal-horizon-sunrise`<br>**Coastal Horizon & Sunrise** | 1200×800<br>`135.7 KB` | Sean Oulashin<br>Unsplash License | Campus weather banner, Quy Nhơn AI campus mood |
| `photography/photo-futuristic-lecture-hall.webp` | `photo-futuristic-lecture-hall`<br>**Modern Lecture & Workshop Hall** | 1200×800<br>`98.1 KB` | Headway<br>Unsplash License | Classroom booking modal, lecture schedule |

---

## 6. Animations & GIFs (`design-assets/animations/`)

15 curated, seamless animations distributed in multiple formats (GIF, WebM, WebP, Lottie JSON, and static poster thumbnail).

### A. Premium Abstract Visuals
| Asset ID & Title | Formats Available | Loop Type | Sizes | Suggested UI Use |
| :--- | :--- | :--- | :--- | :--- |
| `anim-aurora-glow-loop`<br>**Aurora Ambient Glow Loop** | WebM, GIF, WebP, Poster | 2.0s seamless | WebM: `122 KB`<br>GIF: `534 KB` | Auth hero ambient backdrop, dashboard header glow |
| `anim-particle-wave-flow`<br>**Particle Wave Matrix Flow** | WebM, GIF, WebP, Poster | 2.0s seamless | WebM: `190 KB`<br>GIF: `124 KB` | Timetable solver canvas, telemetry header |
| `anim-geometric-pulse-core`<br>**Geometric AI Pulse Core** | Lottie, WebM, GIF, WebP, Poster | 2.0s breathing | Lottie: `10 KB`<br>GIF: `99 KB` | AI scheduling status indicator, active solver badge |
| `anim-light-sweep-beam`<br>**Cinematic Light Sweep Beam** | WebM, GIF, WebP, Poster | 2.0s sweep | WebM: `81 KB`<br>GIF: `284 KB` | Feature card hover effect, premium badge highlight |

### B. Education & Academic
| Asset ID & Title | Formats Available | Loop Type | Sizes | Suggested UI Use |
| :--- | :--- | :--- | :--- | :--- |
| `anim-academic-calendar-flip`<br>**Academic Calendar Flip** | Lottie, WebM, GIF, WebP, Poster | 2.0s flip | Lottie: `8 KB`<br>GIF: `46 KB` | Semester planning guide, timetable import view |
| `anim-focus-study-clock`<br>**Focus Study Pomodoro Clock** | Lottie, WebM, GIF, WebP, Poster | 2.0s countdown | Lottie: `9 KB`<br>GIF: `62 KB` | Focus pacing widget, study timer session |
| `anim-exam-milestone-path`<br>**Exam Milestone Progression Path** | Lottie, WebM, GIF, WebP, Poster | 2.0s progress | Lottie: `9 KB`<br>GIF: `22 KB` | Curriculum progress tracker, degree audit view |
| `anim-campus-transit-route`<br>**Campus Mobility Transit Route** | Lottie, WebM, GIF, WebP, Poster | 2.0s pulse | Lottie: `10 KB`<br>GIF: `41 KB` | Campus routing drawer, transit estimate |

### C. UI States
| Asset ID & Title | Formats Available | Loop Type | Sizes | Suggested UI Use |
| :--- | :--- | :--- | :--- | :--- |
| `anim-schedule-solver-loading`<br>**Schedule Solver Orbital Spinner** | Lottie, WebM, GIF, WebP, Poster | 2.0s orbital | Lottie: `10 KB`<br>GIF: `43 KB` | Schedule auto-generation loading modal |
| `anim-schedule-optimized-success`<br>**Schedule Optimized Victory Burst** | Lottie, WebM, GIF, WebP, Poster | 2.0s burst | Lottie: `9 KB`<br>GIF: `37 KB` | Schedule generation success modal, activation complete |
| `anim-empty-schedule-zen`<br>**Empty Schedule Zen Day** | Lottie, WebM, GIF, WebP, Poster | 2.0s float | Lottie: `7 KB`<br>GIF: `51 KB` | Empty calendar day state, semester break screen |
| `anim-conflict-resolution-wave`<br>**Conflict Resolution Wave** | Lottie, WebM, GIF, WebP, Poster | 2.0s separation | Lottie: `8 KB`<br>GIF: `36 KB` | Conflict alert notification, auto-reconcile preview |

### D. 3D Animation & Glassmorphism
| Asset ID & Title | Formats Available | Loop Type | Sizes | Suggested UI Use |
| :--- | :--- | :--- | :--- | :--- |
| `anim-3d-crystal-polyhedron`<br>**3D Crystal Polyhedron Rotation** | WebM, GIF, WebP, Poster | 2.0s 360° | WebM: `139 KB`<br>GIF: `46 KB` | Auth visual hero overlay, AI engine card |
| `anim-3d-floating-schedule-blocks`<br>**3D Floating Schedule Blocks** | WebM, GIF, WebP, Poster | 2.0s float | WebM: `132 KB`<br>GIF: `41 KB` | Onboarding feature showcase, landing product demo |
| `anim-3d-sphere-wireframe-globe`<br>**3D Network Wireframe Globe** | WebM, GIF, WebP, Poster | 2.0s 360° | WebM: `271 KB`<br>GIF: `108 KB` | Campus selector header, sync status modal |

---

## 7. How to Integrate Animations into SmartSchedule

### Step 1: Copy Only When Needed
Never import the entire `design-assets/` directory. Copy the single animation file needed into `frontend/src/assets/ui/`:
```bash
# Example: Copying solver loading animation
cp "d:/SmartSchedul/design-assets/animations/webm/anim-schedule-solver-loading.webm" "d:/SmartSchedul/frontend/src/assets/ui/"
cp "d:/SmartSchedul/design-assets/animations/thumbnails/anim-schedule-solver-loading.png" "d:/SmartSchedul/frontend/src/assets/ui/"
```

### Step 2: Use in React 19 Component with Fallback & Reduced Motion
```tsx
export function SolverLoadingModal() {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center">
      <video
        autoPlay
        loop
        muted
        playsInline
        poster="/src/assets/ui/anim-schedule-solver-loading.png"
        className="w-24 h-24 object-contain motion-reduce:hidden"
      >
        <source src="/src/assets/ui/anim-schedule-solver-loading.webm" type="video/webm" />
        <img src="/src/assets/ui/anim-schedule-solver-loading.gif" alt="Solving constraints" />
      </video>

      {/* Reduced motion static fallback */}
      <img
        src="/src/assets/ui/anim-schedule-solver-loading.png"
        alt="Solving constraints"
        className="hidden motion-reduce:block w-24 h-24 object-contain"
      />
      <p className="text-sm font-semibold text-slate-800 mt-2">
        Reconciling Timetable Conflicts...
      </p>
    </div>
  );
}
```

---

## 3D Models Category (Interactive WebGL / R3F)

| Asset File | Format | Size | Description | Suggested Use |
|------------|--------|------|-------------|---------------|
| `3d/academic-knowledge-core.glb` | Binary GLB | 183.7 KB | Geometric academic crystal core with orbiting planetary rings and floating course nodes in FPTU Orange (#ea580c), Amber (#fbbf24), and Ivory (#fff7ed) | Primary interactive 3D hero for login/register with mouse parallax & lighting |

### 3D Integration Example (React Three Fiber / Three.js)
```tsx
import { Canvas } from '@react-three/fiber';
import { useGLTF, Float } from '@react-three/drei';

export function AcademicCoreScene() {
  const { scene } = useGLTF('/models/academic-knowledge-core.glb');
  return (
    <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 8, 5]} intensity={1.5} color="#ea580c" />
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.8}>
        <primitive object={scene} />
      </Float>
    </Canvas>
  );
}
```
