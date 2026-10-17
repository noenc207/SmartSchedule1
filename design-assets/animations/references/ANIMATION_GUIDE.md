# SmartSchedule — Animation & GIF Visual Guide & Technical Reference

This guide provides technical specifications, animation parameters, format comparisons, and code integration patterns for the 15 curated animations in `design-assets/animations/`.

---

## 1. Quick Reference & Format Recommendation Matrix

| ID | Title & Category | Best Format for Web | Fallback Format | Duration / Loop | File Size | Suggested Use Case |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `anim-aurora-glow-loop` | **Aurora Glow Loop**<br>*(Abstract)* | **WebM** (`122 KB`) | GIF (`547 KB`) | 2.0s seamless | ~122 KB | Auth hero backdrop, dashboard glow |
| `anim-particle-wave-flow` | **Particle Wave Flow**<br>*(Abstract)* | **WebM** (`190 KB`) | GIF (`127 KB`) | 2.0s seamless | ~127 KB | Timetable solver canvas, telemetry header |
| `anim-geometric-pulse-core` | **Geometric Pulse Core**<br>*(Abstract)* | **Lottie / WebM** | GIF (`102 KB`) | 2.0s breathing | ~102 KB | AI engine active indicator, solver badge |
| `anim-light-sweep-beam` | **Light Sweep Beam**<br>*(Abstract)* | **WebM** (`81 KB`) | GIF (`290 KB`) | 2.0s sweep | ~81 KB | Feature card hover effect, premium badge |
| `anim-academic-calendar-flip` | **Calendar Flip**<br>*(Academic)* | **Lottie / WebM** | GIF (`47 KB`) | 2.0s flip | ~27 KB | Semester planning guide, timetable view |
| `anim-focus-study-clock` | **Focus Study Clock**<br>*(Academic)* | **Lottie / WebM** | GIF (`63 KB`) | 2.0s countdown | ~63 KB | Focus pacing widget, study timer |
| `anim-exam-milestone-path` | **Exam Milestone Path**<br>*(Academic)* | **Lottie / WebM** | GIF (`23 KB`) | 2.0s progress | ~13 KB | Curriculum milestone tracker, degree audit |
| `anim-campus-transit-route` | **Campus Transit Route**<br>*(Academic)* | **Lottie / WebM** | GIF (`42 KB`) | 2.0s pulse | ~42 KB | Campus routing drawer, transit estimate |
| `anim-schedule-solver-loading` | **Solver Spinner**<br>*(UI State)* | **Lottie** (`10 KB`) | GIF (`44 KB`) | 2.0s orbital | ~10 KB | Schedule auto-generation loading modal |
| `anim-schedule-optimized-success` | **Optimized Victory**<br>*(UI State)* | **Lottie** (`9 KB`) | GIF (`37 KB`) | 2.0s burst | ~9 KB | Schedule generation success modal |
| `anim-empty-schedule-zen` | **Empty Schedule Zen**<br>*(UI State)* | **Lottie** (`7 KB`) | GIF (`52 KB`) | 2.0s float | ~7 KB | Empty schedule view, semester break state |
| `anim-conflict-resolution-wave` | **Conflict Resolve Wave**<br>*(UI State)* | **Lottie** (`7 KB`) | GIF (`36 KB`) | 2.0s separation | ~7 KB | Conflict alert notification, reconcile view |
| `anim-3d-crystal-polyhedron` | **3D Crystal Polyhedron**<br>*(3D)* | **WebM** (`139 KB`) | GIF (`46 KB`) | 2.0s 360° | ~46 KB | Auth visual hero overlay, AI card |
| `anim-3d-floating-schedule-blocks` | **3D Schedule Blocks**<br>*(3D)* | **WebM** (`132 KB`) | GIF (`41 KB`) | 2.0s float | ~41 KB | Onboarding product showcase, hero tile |
| `anim-3d-sphere-wireframe-globe` | **3D Network Globe**<br>*(3D)* | **WebM** (`271 KB`) | GIF (`110 KB`) | 2.0s 360° | ~110 KB | Multi-campus selector, cloud sync modal |

---

## 2. Choosing the Right Format in Production

1. **For UI States & Icons (Loading, Success, Empty State, Routes):**  
   * **Use Lottie JSON (`animations/lottie/*.json`):** 100% vector, sharp at any DPI, lightweight (< 10 KB), styleable with CSS/SVG colors.
2. **For Complex Backgrounds & 3D Visuals (Aurora, Polyhedron, Globe):**  
   * **Use WebM (`animations/webm/*.webm`):** 60fps hardware accelerated, 4x–8x smaller than GIF, supports alpha transparency.
   * **Use GIF (`animations/gif/*.gif`) only as legacy fallback** where video autoplay is restricted.
3. **Always Include a Static Poster (`animations/thumbnails/*.png`):**  
   * Prevents layout shift (CLS) and provides graceful degradation if motion is reduced.

---

## 3. Production Code Integration Patterns

### Pattern A: Modern `<video>` Background Loop with Poster & Reduced Motion
```tsx
export function HeroAmbientGlow() {
  return (
    <div className="relative w-full h-64 overflow-hidden rounded-2xl bg-slate-950">
      <video
        autoPlay
        loop
        muted
        playsInline
        poster="/src/assets/ui/anim-aurora-glow-loop.png"
        className="w-full h-full object-cover motion-reduce:hidden"
      >
        <source src="/src/assets/ui/anim-aurora-glow-loop.webm" type="video/webm" />
        {/* GIF Fallback */}
        <img
          src="/src/assets/ui/anim-aurora-glow-loop.gif"
          alt="Ambient glow"
          className="w-full h-full object-cover"
        />
      </video>

      {/* Fallback for users preferring reduced motion */}
      <img
        src="/src/assets/ui/anim-aurora-glow-loop.png"
        alt="Ambient glow poster"
        className="hidden motion-reduce:block w-full h-full object-cover"
      />
    </div>
  );
}
```

### Pattern B: Lottie Vector Animation for Loading / UI State
```tsx
import lottieSolverLoading from '@/assets/ui/anim-schedule-solver-loading.json';

// Render using standard lottie player or lightweight canvas wrapper:
export function SolverLoadingModal() {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center">
      <lottie-player
        src={JSON.stringify(lottieSolverLoading)}
        background="transparent"
        speed="1"
        style={{ width: '120px', height: '120px' }}
        loop
        autoplay
      />
      <h4 className="text-sm font-semibold text-slate-800 mt-2">
        Reconciling Campus Timetables...
      </h4>
    </div>
  );
}
```
