---
name: creative-motion
description: Orchestrates animations, 3D WebGL scenes, physics springs, text motion, and landing page micro-interactions across SmartSchedule skills and libraries without performance bottlenecks.
---

# SmartSchedule Creative Motion Toolkit — AI Orchestration Guide

This skill serves as the **central master coordinator** for all animation, 3D graphics, text effects, and micro-interactions in SmartSchedule. It provides AI agents with an unambiguous decision framework to select, combine, and verify motion tools while avoiding dependency bloat, conflicting runtimes, and frame drops.

---

## 1. The 10 Core Orchestration Rules

### Rule 1: Pre-Implementation Library & Dependency Audit
- **Always inspect existing dependencies before installing new packages.** Check `frontend/package.json` and active imports before running `npm install`.
- **Zero redundant packages:** SmartSchedule already has `motion` (12.x), `framer-motion` (13.x for backward compatibility), `three` (0.186.x), `@react-three/fiber`, and `@react-three/drei`.
- Do NOT install redundant animation engines (e.g., Anime.js, Velocity, GreenSock core) unless a specific effect (like complex SVG morphing or timeline scrub) strictly requires it.

### Rule 2: Dedicated Text Effects via `animate-text`
- For typography animations (headlines, subheadings, badges, stat counters, animated phrases), **always use the `animate-text` skill**.
- Consult the spec catalog: `soft-blur-in`, `shimmer-sweep`, `per-character-rise`, `typewriter`, `stagger-up`, or `fade-slide`.
- Execute `node .agents/skills/animate-text/scripts/get-spec.mjs <effect-name>` to retrieve precise durations, cubic-bezier curves, and stagger intervals.
- Do NOT hand-code ad-hoc keyframes or arbitrary CSS delays for text when an engineered spec exists.

### Rule 3: Motion Physics & Debugging via `ui-animation`
- For spring curves, gesture drags, scroll timelines, interruptibility, and motion audits, **consult the `ui-animation` skill**.
- Read `references/spring-animations.md` for realistic damping and stiffness parameters (e.g., Apple design standards: stiffness 300, damping 30 for snappy; stiffness 120, damping 20 for gentle floating).
- Use `references/debugging-symptoms.md` when an animation feels sluggish, robotic, jumpy, or misfires.
- Follow asymmetric timing: interactive feedback enters immediately (0–150ms) and exits smoothly (150–250ms).

### Rule 4: True 3D Scenes via Three.js Skills
- When rendering real 3D geometries, glTF/GLB models (e.g., SmartSchedule 3D Mascot), custom shaders, or particle fields, **activate the dedicated Three.js skill suite**:
  - `threejs-web`: High-level WebGL scene architecture and camera orchestration.
  - `threejs-r3f`: React Three Fiber declarative canvas, Suspense loaders, and Drei helpers.
  - `threejs-assets`: Geometry loading, texture compression, vertex optimization, and cleanup.
  - `threejs-particles`: GPU instanced particle systems, vortexes, and cosmic dust.
  - `threejs-lighting`: Studio rim lighting, orange key lights, ambient fill, and shadows.
  - `threejs-performance`: Draw call budgeting (< 50 calls), frustum culling, and canvas DPR clamping (`Math.min(window.devicePixelRatio, 1.5)`).
- Never use CSS 3D transforms (`transform: rotateY(...)`) as a substitute for true 3D assets.

### Rule 5: UI State & Gesture Animation via Motion (`motion/react`)
- For interactive React component transitions, layout changes, hover states, modals, drawers, and tabs, use `motion/react`.
- Leverage `layoutId` for shared-element morphing (e.g., active tab indicator, expanding cards).
- Use `whileHover={{ scale: 1.02 }}`, `whileTap={{ scale: 0.98 }}`, and `AnimatePresence` for exit animations.
- Ensure all transitions use spring physics or standard cubic-bezier curves (`[0.16, 1, 0.3, 1]`).

### Rule 6: Registry Lookup First (`@react-bits`, `@magicui`, `@aceternity`, `@motion-primitives`)
- Before writing complex visual components from scratch, inspect the configured component registries in `components.json`:
  - `@react-bits`: Creative text effects, creative backgrounds, magnetics (`https://reactbits.dev`).
  - `@magicui`: Interactive marketing elements, particles, borders, bento grids (`https://magicui.design`).
  - `@motion-primitives`: Elegant micro-interactions, magnetic buttons, sliding text (`https://motion-primitives.com`).
  - `@aceternity`: 3D parallax cards, spotlight reveals, glowing containers (`https://ui.aceternity.com`).
- Use the **shadcn MCP server** (`search_items_in_registries`, `view_items_in_registries`) to inspect source code and dependencies before integration.
- Check licenses: Use 100% free / MIT components; do not bypass paywalls or license keys for Pro components.

### Rule 7: Visual Verification via Playwright MCP & Browser Automation
- Always verify interactive motion and 3D scenes in real browser viewports:
  - Desktop: 1720×1080 (Hero composition, 3D mascot framing, particle density).
  - Laptop: 1366×768 (Vertical hierarchy, fold positioning).
  - Tablet: 768×1024 (Layout wrapping, canvas scaling).
  - Mobile: 390×844 & 360×780 (Single-column flow, touch targets, horizontal overflow prevention).
- Check for zero horizontal overflow (`document.documentElement.scrollWidth <= window.innerWidth`).
- Monitor FPS and GPU usage; ensure no memory leaks on unmounting Three.js or canvas instances.

### Rule 8: Performance Hierarchy (CSS/WAAPI > Motion > WebGL)
- Always use the lightest technology capable of delivering the desired quality:
  1. **CSS Transitions & WAAPI**: Simple hover states, color changes, opacities, and standard tooltips. Zero JS overhead.
  2. **Motion (`motion/react`)**: Component mounts/unmounts, gesture dragging, spring-based UI states, and scroll triggers.
  3. **WebGL / Canvas 2D**: Dynamic particle clouds, real 3D models, complex visual shaders.
- Never spin up a `<Canvas>` or RequestAnimationFrame loop for an effect achievable with standard CSS.

### Rule 9: Anti-Stacking & Clean Transform Hierarchy
- **NEVER stack conflicting motion systems on the same DOM element.**
- Anti-patterns to avoid:
  - Do NOT wrap a `motion.div` that animates `scale` inside a CSS animation that also animates `transform`.
  - Do NOT apply an Aceternity 3D tilt card and a Framer Motion parallax transform to the same container.
  - Do NOT mix GSAP and Motion manipulating the same style properties simultaneously.
- If multiple layers of motion are needed (e.g., scroll parallax + hover tilt), separate them into parent-child containers:
  - Parent container: Handles scroll parallax or layout positioning.
  - Child container: Handles hover scale or tilt.
  - Inner content: Handles static layout and text.

### Rule 10: Accessibility & Performance Gates
- **Respect Reduced Motion:** Always provide fallback or disable non-essential animations when `prefers-reduced-motion: reduce` is detected.
  - In Motion: use `reducedMotion: "user"` or check `useReducedMotion()`.
  - In CSS: `@media (prefers-reduced-motion: reduce) { *, ::before, ::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }`.
  - In Three.js: Pause non-essential orbital rotations or heavy particle simulations.
- **Hardware Acceleration:** Only animate compositor-friendly properties: `transform` and `opacity`. Never animate `width`, `height`, `top`, `left`, `margin`, or `padding`.
- **Mobile Throttling:** On viewports < 768px, clamp Three.js pixel ratio to 1.0, reduce particle count by 50–70%, and disable heavy post-processing effects (bloom, chromatic aberration).

---

## 2. Decision Matrix: Which Tool to Choose?

| Scenario / UI Requirement | Recommended Skill / Tool | Implementation Approach | Key Caution |
| :--- | :--- | :--- | :--- |
| **Headline text entrance** | `animate-text` | `soft-blur-in` or `per-character-rise` using spec timings | Avoid long staggers (> 30ms/char) |
| **Interactive 3D mascot** | `threejs-web` + `threejs-r3f` | `@react-three/fiber` `<Canvas>`, GLTF loader, orbital lighting | Budget < 50 draw calls, clamp DPR |
| **Cosmic background particles** | `threejs-particles` or `@magicui/particles` | Instanced WebGL or Canvas 2D particle simulation | Pause when tab is inactive / out of view |
| **Card hover lift & glow** | `motion/react` + Tailwind | `whileHover={{ y: -4, transition: { type: "spring" } }}` | Animate `y` and `box-shadow` only |
| **3D Tilt / Parallax Card** | `@aceternity/3d-card` or `ui-animation` | Registry component integrated into `@/components/ui/` | Ensure touch fallback on mobile |
| **Feature section scroll reveal** | `ui-animation` + `motion/react` | `whileInView={{ opacity: 1, y: 0 }}` with `viewport={{ once: true }}` | Do NOT trigger multiple re-animates |
| **Tab indicator slide** | `motion/react` | `<motion.div layoutId="active-tab" />` | Requires shared `layoutId` within layout tree |
| **Button hover & click bounce** | CSS or `motion/react` | `transition: transform 150ms cubic-bezier(...)` or `whileTap={{ scale: 0.96 }}` | Keep tap immediate (0ms delay) |
| **Stat counter roll** | `animate-text` / `ui-animation` | WAAPI or motion spring driving numeric count | Format with tabular figures (`font-variant-numeric`) |

---

## 3. Standard Verification Checklist

Before finalizing any creative motion implementation:
1. [ ] **No Console Errors:** Zero Three.js WebGL warnings, React key warnings, or NaN transform values.
2. [ ] **60 FPS Target:** Smooth 60 FPS on desktop and 60/120 FPS on mobile. No jank during scroll.
3. [ ] **Responsive Visuals:** Verified via Playwright or browser at 1720px, 1366px, 768px, and 390px.
4. [ ] **Zero Horizontal Overflow:** Viewport width matches document width on all screen sizes.
5. [ ] **Reduced Motion Support:** Clean static appearance when `prefers-reduced-motion` is enabled.
6. [ ] **Clean Resource Disposal:** Canvas, geometries, textures, and event listeners clean up on unmount.
