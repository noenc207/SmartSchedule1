# SmartSchedule — Asset Manifest

This document catalogs all binary, media, and 3D assets in the SmartSchedule repository.

---

## 1. 3D Model Assets

| Asset | Path | Size | Format | Purpose | License | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| PBR Mascot Model | `frontend/public/models/base_basic_pbr.glb` | 15.05 MB | GLB (glTF Binary) | Primary 3D mascot with PBR materials for landing page hero scene and closing scene | Needs confirmation | Higher fidelity model with physically-based rendering materials |
| Shaded Mascot Model | `frontend/public/models/base_basic_shaded.glb` | 8.11 MB | GLB (glTF Binary) | Fallback/lighter 3D mascot for WebGL-constrained environments | Needs confirmation | Simplified shading, smaller file size for performance |
| Emissive Texture | `frontend/public/models/texture_emissive.png` | 2.09 MB | PNG | Emissive/glow texture map applied to 3D mascot model | Needs confirmation | Used for glowing accent effects on mascot |

---

## 2. Banner & Hero Images

| Asset | Path | Size | Purpose |
| :--- | :--- | :--- | :--- |
| Campus Banner 1 | `frontend/public/banner/1.png` | 2.66 MB | Full-width campus hero background image |
| Campus Banner 2 | `frontend/public/banner/2.png` | 2.69 MB | Alternative campus banner / sidebar scenery |
| Campus Banner 3 | `frontend/public/banner/3.png` | 2.71 MB | Alternative campus banner variant |
| Campus Beach View | `frontend/public/banner/campus_beach_view.png` | 47.3 KB | Compact campus landscape scenic image |
| Hero Banner 2x | `frontend/public/banner/hero_banner_2x.png` | 624 KB | High-DPI hero banner background |
| Hero Banner Perfect | `frontend/public/banner/hero_banner_perfect.png` | 216 KB | Optimized hero banner |
| Hero BG Landscape | `frontend/public/banner/hero_bg_landscape.png` | 159 KB | Landscape-oriented hero background |
| Hero Mockup Reference | `frontend/public/banner/hero_mockup_ref.png` | 213 KB | Design reference mockup |

---

## 3. Mascot 2D Images

| Asset | Path | Size | Purpose |
| :--- | :--- | :--- | :--- |
| Mascot Full | `frontend/public/banner/mascot.png` | 2.24 MB | Full mascot character illustration |
| Mascot Animation | `frontend/public/banner/mascot_animation.png` | 2.18 MB | Animated mascot sprite/frame |
| Mascot Card | `frontend/public/banner/mascot_card.png` | 168 KB | Small mascot for card UI elements |
| Mascot Thumbs Up | `frontend/public/banner/mascot_thumbsup.png` | 157 KB | Mascot with thumbs-up gesture |
| Mascot Wave Small | `frontend/public/banner/mascot_wave_small.png` | 145 KB | Compact mascot waving illustration |
| Mascot Waving | `frontend/public/banner/mascot_waving.png` | 580 KB | Larger mascot waving illustration |

---

## 4. UI & Brand Images

| Asset | Path | Size | Purpose |
| :--- | :--- | :--- | :--- |
| FPT Logo | `frontend/public/fpt-logo.png` | 12.5 KB | FPT University brand logo |
| FPT Icon | `frontend/public/fpt-icon.png` | 7.0 KB | FPT University compact icon |
| Avatar Nhi | `frontend/public/avatar-nhi.png` | 2.9 KB | Default user avatar image |
| Quote Card 2x | `frontend/public/banner/quote_card_2x.png` | 207 KB | High-DPI inspirational quote card |
| Quote Card Full | `frontend/public/banner/quote_card_full.png` | 74.4 KB | Full-size quote card graphic |
| Quote Card Perfect | `frontend/public/banner/quote_card_perfect.png` | 70.5 KB | Optimized quote card |
| Quote Card Photo | `frontend/public/banner/quote_card_photo.png` | 44.2 KB | Photo-based quote card |

---

## 5. Loading & Performance Notes

- **3D GLB models** are loaded lazily via `React.Suspense` in `MascotModel.tsx` and `HeroScene.tsx`.
- A `GeometricMascotFallback` component provides a lightweight Three.js geometric fallback while GLB assets load or when WebGL is unavailable.
- **Total 3D asset size**: ~25.25 MB (combined GLB + texture). Consider Git LFS for repositories where binary size is a concern.
- **Total banner image size**: ~14.33 MB. These are served as static assets through Nginx with 30-day cache headers.

---

## 6. Redistribution & Licensing

> **Important**: The licensing and redistribution status of the following assets requires confirmation before public distribution:
> - All GLB 3D model files (`base_basic_pbr.glb`, `base_basic_shaded.glb`)
> - Emissive texture map (`texture_emissive.png`)
> - FPT University brand assets (`fpt-logo.png`, `fpt-icon.png`)
> - Mascot character illustrations
>
> Before publishing this repository publicly, verify that all assets are either:
> 1. Originally created for this project, or
> 2. Licensed under terms that permit redistribution.
