---
name: react-bits
description: >-
  Use this skill when searching, inspecting, installing, or configuring animated UI components,
  text effects, creative backgrounds, and interactive micro-interactions from the React Bits registry.
---

# React Bits Component Integration Skill

This skill guides the AI coding agent in discovering, inspecting, installing, and customizing animated components from the **React Bits** component library (`https://reactbits.dev/`) into this project.

> [!NOTE]
> **Status**: Project-specific Integration Skill (Fallback).
> The official `@reactbits-starter/skill` requires a paid React Bits Pro license/registry token. This skill provides full, verified integration with the official public `@react-bits` registry (`https://reactbits.dev/r/{name}.json`) and the official `shadcn` MCP server.

---

## 1. Registry & Variant Conventions

The project is configured with the official React Bits registry in `components.json`:
- **Registry Key**: `@react-bits`
- **Endpoint**: `https://reactbits.dev/r/{name}.json`

### Component Variant Suffixes
React Bits distributes components in 4 flavor combinations:
1. **`-TS-TW` (Recommended & Default)**: TypeScript + Tailwind CSS. Matches this project's stack (React 19, TypeScript ~5.8, Tailwind CSS v4).
2. **`-TS-CSS`**: TypeScript + Pure CSS modules.
3. **`-JS-TW`**: JavaScript + Tailwind CSS.
4. **`-JS-CSS`**: JavaScript + Pure CSS.

*Always prioritize the `-TS-TW` variant unless specifically asked otherwise.*

---

## 2. Common React Bits Components

### A. Text Effects & Typography
- `SplitText-TS-TW`: Word/character staggered reveal animations (GSAP).
- `BlurText-TS-TW`: Smooth character/word blur-in animations (`motion/react`).
- `TrueFocus-TS-TW`: Dynamic focusing lens effect across words.
- `ShinyText-TS-TW`: Shimmering gradient light effect across text.
- `DecryptedText-TS-TW`: Matrix / cyberpunk text decryption unscramble.
- `CountUp-TS-TW`: High-performance smooth counter animation.
- `GradientText-TS-TW`: Flowing animated gradient fill.

### B. Creative Backgrounds
- `Aurora-TS-TW`: Vibrant flowing Northern Lights background canvas.
- `Dither-TS-TW`: Retro shader dither texture background.
- `Iridescence-TS-TW`: Liquid iridescent soap-bubble aesthetic shader.
- `GridMotion-TS-TW`: Dynamic 3D perspective moving grid.
- `Waves-TS-TW`: Flowing interactive harmonic waves.
- `Particles-TS-TW`: Floating interconnected geometric particle network.

### C. Interactive Cards & UI Blocks
- `SpotlightCard-TS-TW`: Mouse-following radial highlight card.
- `TiltedCard-TS-TW`: 3D gyroscope/mouse parallax tilt card.
- `DecayCard-TS-TW`: Interactive draggable card with inertia & decay physics.
- `PixelCard-TS-TW`: Dynamic pixelated hover reveal card.
- `RollingGallery-TS-TW`: Circular 3D rotating cylinder showcase.
- `InfiniteScroll-TS-TW`: Smooth seamless marquee scroll container.

---

## 3. Workflow for AI Coding Agent

### Step 1: Discover & Inspect Before Installing
Before installing, inspect the component schema and dependencies:
```bash
npx shadcn@latest view @react-bits/<ComponentName>-TS-TW
```
Or directly query the registry endpoint:
```text
https://reactbits.dev/r/<ComponentName>-TS-TW.json
```
Verify:
1. What runtime dependencies are required (e.g. `motion`, `gsap`, `three`).
2. Does the project already have the dependency?
   - `framer-motion` / `motion`: Already in `frontend/package.json` (`^13.4.0`).
   - `three`, `@react-three/fiber`, `@react-three/drei`: Already in `frontend/package.json`.
   - `gsap`: If required by the component, install via `npm install gsap @gsap/react` inside `frontend/`.

### Step 2: Install Component
Use the shadcn CLI or place the component code into `frontend/src/components/react-bits/`:
```bash
cd frontend && npx shadcn@latest add @react-bits/<ComponentName>-TS-TW
```
Or when placing manually, follow the component structure from the registry JSON `files` array.

### Step 3: Integrate into UI
- Import the component cleanly:
  ```tsx
  import BlurText from '@/components/react-bits/BlurText';
  ```
- Configure props according to the component's TypeScript interface.

---

## 4. Engineering & Design Guidelines

1. **Accessibility (`prefers-reduced-motion`)**:
   - Always ensure animations gracefully degrade or disable when `prefers-reduced-motion: reduce` is active.
2. **Performance & Teardown**:
   - Never leave unthrottled `mousemove` or `scroll` event listeners.
   - Always clean up animations, animation frames (`cancelAnimationFrame`), and timers in `useEffect` return functions.
   - Canvas / WebGL shaders must correctly dispose of textures, materials, and geometries on unmount.
3. **Brand Consistency**:
   - Conform to SmartSchedule's design system: FPT University Orange (`#ea580c` / `#f97316`), slate typography (`#0f172a`), clean academic surfaces.
   - Do not override global styles or alter established page layouts without explicit user consent.
4. **Scope Control**:
   - Do NOT redesign entire pages when asked to add a specific component.
   - Do NOT modify backend APIs or authentication logic.
