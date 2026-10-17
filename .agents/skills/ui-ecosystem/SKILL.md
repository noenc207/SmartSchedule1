---
name: ui-ecosystem
description: >-
  Use this skill when searching, inspecting, previewing, installing, or customizing UI components,
  animations, text effects, backgrounds, 3D cards, and micro-interactions from React Bits, Magic UI,
  Motion Primitives, Aceternity UI, Animate UI, Animata, and 21st.dev.
---

# Multi-Source UI Component Ecosystem Guide

This skill equips the AI coding agent with the knowledge and procedures to search, inspect, install, and customize components from **7 leading UI component libraries**:

1. **React Bits** (`https://reactbits.dev`)
2. **Magic UI** (`https://magicui.design`)
3. **Motion Primitives** (`https://motion-primitives.com`)
4. **Aceternity UI** (`https://ui.aceternity.com`)
5. **Animate UI** (`https://animate-ui.com`)
6. **Animata** (`https://animata.design`)
7. **21st.dev** (`https://21st.dev`)

---

## 1. Configured Registries in `components.json`

The project has integrated all compatible registries into `components.json`:

| Library | Registry Prefix | Registry Endpoint Pattern | Integration Method | License / Cost |
| :--- | :--- | :--- | :--- | :--- |
| **React Bits** | `@react-bits` | `https://reactbits.dev/r/{name}.json` | Direct MCP & CLI (`npx shadcn@latest add @react-bits/...`) | Free / Open Source (Pro tier requires key) |
| **Magic UI** | `@magicui` | `https://magicui.design/r/{name}.json` | Direct MCP & CLI (`npx shadcn@latest add @magicui/...`) | Free / Open Source (Pro tier requires key) |
| **Motion Primitives** | `@motion-primitives` | `https://motion-primitives.com/c/{name}.json` | Direct MCP & CLI (`npx shadcn@latest add @motion-primitives/...`) | 100% Free / MIT |
| **Aceternity UI** | `@aceternity` | `https://ui.aceternity.com/registry/{name}.json` | Direct MCP & CLI (`npx shadcn@latest add @aceternity/...`) | Free / Open Source |
| **Animate UI** | `@animate-ui` | `https://animate-ui.com/r/{name}.json` | Direct MCP & CLI (`npx shadcn@latest add @animate-ui/...`) | 100% Free / MIT |
| **Animata** | *(N/A)* | Direct Code / GitHub (`codse/animata`) | On-demand component file integration into `@/components/animata/` | 100% Free / MIT |
| **21st.dev** | *(URL)* | `https://21st.dev/r/{author}/{component}` | Direct URL CLI (`npx shadcn@latest add "https://21st.dev/r/..."`) or MCP (with API key) | Free public components |

---

## 2. MCP Tools Workflow (shadcn MCP Server)

The official **shadcn MCP Server** is running and directly connected in Antigravity. Use the following tools:

1. **List / Check Registries**:
   - Tool: `get_project_registries`
   - Returns all active registries (`@react-bits`, `@magicui`, `@motion-primitives`, `@aceternity`, `@animate-ui`, `@shadcn`).
2. **Search Components Across Registries**:
   - Tool: `search_items_in_registries`
   - Example query: `{"query": "card", "registries": ["@react-bits", "@magicui", "@aceternity", "@motion-primitives"]}`
3. **View Component Details & Code**:
   - Tool: `view_items_in_registries`
   - Example: `{"items": ["@magicui/marquee", "@aceternity/3d-card", "@react-bits/BlurText-TS-TW"]}`
4. **Get CLI Add Command**:
   - Tool: `get_add_command_for_items`
   - Example: `{"items": ["@motion-primitives/magnetic"]}`

---

## 3. Installation & Dependency Rules

1. **Stack Compatibility**:
   - **React 19**: Components must use standard React hooks (`useEffect`, `useState`, `useRef`, `useMemo`).
   - **Tailwind CSS v4**: Theme tokens are in `frontend/src/styles.css`. Ensure classes like `bg-primary` map to project variables (`--brand-primary: #ea580c`).
   - **TypeScript**: Strict types, no `any`.
2. **Animation Libraries**:
   - The project already includes `framer-motion` (`^13.4.0`) and `three` (`^0.186.0`).
   - If a component specifies `motion`, `framer-motion` satisfies the motion engine. If `motion` package is strictly required, install via `npm i motion` inside `frontend/`.
   - If a component needs `gsap` (e.g., `SplitText-TS-TW`), install `gsap @gsap/react`.
3. **Path Aliases**:
   - `@/*` maps to `frontend/src/*` (configured in `tsconfig.json` & `vite.config.ts`).
   - `@/lib/utils` provides `cn(...)`.
4. **Accessibility & Safety**:
   - Always ensure animations respect `prefers-reduced-motion`.
   - Clean up event listeners and timers on unmount.
   - Do NOT modify login, dashboard, backend, routing, or existing design system without explicit user instructions.
