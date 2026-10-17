---
name: ui-assets
description: >-
  Use this skill when looking for, selecting, inspecting, copying, and integrating visual design assets
  (backgrounds, textures, empty-state illustrations, academic photography) from the local SmartSchedule
  asset library into frontend components.
---

# SmartSchedule Local Visual Asset Integration Skill

This skill guides the AI coding agent in discovering, selecting, verifying, and integrating visual design assets from the project's local design repository (`d:\SmartSchedul\design-assets\`) into SmartSchedule's React 19 / Tailwind CSS v4 frontend.

---

## 1. Core Principles & Strict Rules

1. **Check Local Library First:**  
   Always inspect `d:\SmartSchedul\design-assets\catalog.json` or `d:\SmartSchedul\design-assets\ASSET_CATALOG.md` before attempting to search online or generate placeholders.
2. **Reuse Existing Assets:**  
   Favor existing, curated visual assets over creating duplicate or ad-hoc SVGs and uncompressed images.
3. **Reference Isolation (DO NOT Bundle All Assets):**  
   The `design-assets/` directory is an isolated reference catalog. **NEVER** import directly from `design-assets/` in frontend code, and **NEVER** configure Vite to bundle the whole folder.
4. **On-Demand Production Copying:**  
   Only copy an asset into `frontend/src/assets/ui/` when a specific UI component actually renders it.
5. **Brand Consistency (Academic SaaS & FPT Orange):**  
   Prioritize assets featuring or harmonizing with FPT University Orange (`#ea580c` / `#f97316`) and deep slate/cool gray tones (`#0f172a`, `#1e293b`, `#f8fafc`).
6. **Cohesive Design Language:**  
   Maintain consistent styling across pages (e.g. use Open Peeps illustrations for empty states/modals, Hero Patterns for technical schedules/timetables, Haikei waves for headers/footers). Do not mix conflicting artistic styles arbitrarily.
7. **License Compliance & Attribution:**  
   Read `design-assets/LICENSES.md` before copying. If using Hero Patterns (CC BY 4.0), include the one-line attribution comment in the CSS or component.

---

## 2. Quick Asset Lookup by Use Case

| UI Requirement / Scenario | Recommended Category | Best Asset Candidates | File Path in Library |
| :--- | :--- | :--- | :--- |
| **Login / Register Hero Header** | Backgrounds | `haikei-layered-waves-orange.svg`<br>`haikei-subtle-aurora-glow.svg` | `design-assets/backgrounds/` |
| **Dashboard Ambient Backdrop** | Backgrounds / Textures | `haikei-smooth-mesh-amber.svg`<br>`heropattern-polka-dots.svg` | `design-assets/backgrounds/`<br>`design-assets/textures/` |
| **Calendar Timetable Canvas** | Textures | `heropattern-architectural-grid.svg`<br>`heropattern-plus-matrix.svg` | `design-assets/textures/` |
| **Empty State: No Classes/Events** | Illustrations | `openpeeps-empty-calendar.svg` | `design-assets/illustrations/` |
| **Empty State: No Search Matches** | Illustrations | `openpeeps-search-no-results.svg` | `design-assets/illustrations/` |
| **Schedule Conflict Alert** | Illustrations | `openpeeps-conflict-alert.svg` | `design-assets/illustrations/` |
| **Optimization Success Modal** | Illustrations | `openpeeps-success-celebration.svg` | `design-assets/illustrations/` |
| **Campus Routing / Walking** | Illustrations | `openpeeps-campus-walking.svg` | `design-assets/illustrations/` |
| **First-Time User Onboarding** | Illustrations | `openpeeps-welcome-onboarding.svg` | `design-assets/illustrations/` |
| **Personal Workspace Hero** | Photography | `photo-focus-desk-laptop.webp` | `design-assets/photography/` |
| **Study Groups & Collaboration** | Photography | `photo-students-collaborative-study.webp` | `design-assets/photography/` |
| **Campus Room Booking Modal** | Photography | `photo-futuristic-lecture-hall.webp` | `design-assets/photography/` |

---

## 3. Step-by-Step AI Agent Integration Workflow

### Step 1: Query the Catalog
Read `d:\SmartSchedul\design-assets\catalog.json` to verify the asset ID, format, file path, dimensions, and suggested use:
```bash
# Example node snippet or direct JSON view
node -e "const c=require('./design-assets/catalog.json'); console.log(c.assets.filter(a=>a.tags.includes('calendar')));"
```

### Step 2: Copy Only the Specific Asset
Ensure the target directory exists (`frontend/src/assets/ui/`) and copy the single file:
```bash
mkdir -p frontend/src/assets/ui
cp design-assets/illustrations/openpeeps-empty-calendar.svg frontend/src/assets/ui/
```

### Step 3: Import in React 19 Component
Use clean Vite imports with the `@/*` alias:
```tsx
import emptyCalendarIllustration from '@/assets/ui/openpeeps-empty-calendar.svg';

export function EmptyTimetableNotice() {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
      <img
        src={emptyCalendarIllustration}
        alt="No classes scheduled today"
        className="w-48 h-48 mb-4 object-contain"
        loading="lazy"
        width="192"
        height="192"
      />
      <h3 className="text-base font-bold text-slate-900">No scheduled commitments today</h3>
      <p className="text-sm text-slate-500 max-w-sm mt-1">
        Enjoy your open study block or let SmartSchedule propose an optimal focus sprint.
      </p>
    </div>
  );
}
```

### Step 4: Repeating Textures in CSS / Tailwind v4
For background patterns (textures):
```css
/* Hero Patterns by Steve Schoger (heropatterns.com) — CC BY 4.0 */
.calendar-grid-surface {
  background-color: #fafbfc;
  background-image: url('@/assets/ui/heropattern-architectural-grid.svg');
  background-repeat: repeat;
  background-size: 40px 40px;
}
```

---

## 4. Performance & Responsive Image Optimization Rules

1. **Size Budgets:**
   - Vector SVGs: Typically < 5 KB.
   - UI raster photos: Must be WebP/AVIF format, resized to actual display dimensions.
   - Max file size budget for any single production photo: **250–350 KB**.
2. **Native Lazy Loading:**
   - Always add `loading="lazy"` on images below the fold.
3. **Explicit Dimensions:**
   - Always supply `width` and `height` attributes to prevent Cumulative Layout Shift (CLS).
4. **Dark Mode & Color Variables:**
   - SVGs in the library use currentColor or semantic hex values (`#ea580c`, `#0f172a`). When needed, modify stroke or fill via CSS variables (`stroke: var(--brand-primary)`).

---

## 5. Animation & GIF Integration Rules for AI Agents

1. **Check Local Animation Catalog First:**  
   Always consult `design-assets/catalog.json` (category `animations`) or `design-assets/animations/references/ANIMATION_GUIDE.md` before looking for animations or generating placeholders.
2. **Preview Before Selection:**  
   Review `design-assets/preview.html` (under `Animations & GIF` tab) to inspect the visual loop, duration, and color harmony.
3. **Format Decision Tree:**  
   - **For UI states, micro-interactions, spinners, and icons:** Prioritize **Lottie JSON** (`animations/lottie/*.json`). They are 100% vector, sharp at 4K, lightweight (< 10 KB), and have zero pixelation.
   - **For complex visuals, 3D loops, or ambient backgrounds:** Prioritize **WebM** (`animations/webm/*.webm`). They are 4x–8x smaller than GIF, 60fps smooth, and support transparency.
   - **Use GIF (`animations/gif/*.gif`) strictly as legacy fallback** for environments that disable video autoplay.
   - **Always provide a static poster image** (`animations/thumbnails/*.png`) as `poster` or `prefers-reduced-motion` fallback.
4. **CSS Animation First:**  
   Do NOT use GIF or video animations where simple CSS transitions or `@keyframes` (e.g. pulse, spin, fade, marquee) are sufficient. Reserve visual assets for complex fluid, 3D, or hand-drawn effects.
5. **Strict Accessibility & Performance Directives:**  
   - **Zero-Icon Rule on Auth:** Never use GIFs as icons or logos on authentication pages.
   - **Prefers-Reduced-Motion:** Always hide video/GIF or show the static poster when `prefers-reduced-motion: reduce` is active.
   - **No Sound:** Never add audio tracks to visual animations.
   - **No Flashing:** Ensure animations have gentle, harmonic loops without strobe or rapid contrast flashing.
   - **No Viewport Overload:** Never layer multiple heavy GIF loops simultaneously. Use one focal visual per view.
6. **Code Example: High-Performance `<video>` with GIF & Poster Fallback:**
   ```tsx
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
   <img
     src="/src/assets/ui/anim-schedule-solver-loading.png"
     alt="Solving constraints"
     className="hidden motion-reduce:block w-24 h-24 object-contain"
   />
   ```
