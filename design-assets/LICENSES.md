# SmartSchedule Local Visual Asset Library — License Register & Legal Compliance

This document records the exact licenses, copyright notices, author attribution, and usage terms for all visual design assets contained in this local design repository (`d:\SmartSchedul\design-assets\`).

---

## 1. Summary of Included Sources & Licenses

| Source | Category in Library | License | Attribution Required? | Commercial Use Permitted? | Original URL |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Haikei** | Backgrounds (12 SVG files) | Free for personal & commercial use | No (Attribution appreciated) | Yes | [haikei.app](https://haikei.app/) |
| **Hero Patterns** (Steve Schoger) | Textures (8 SVG patterns) | **Creative Commons Attribution 4.0 International (CC BY 4.0)** | **Yes** (See Section 3) | Yes | [heropatterns.com](https://heropatterns.com/) |
| **Open Peeps** (Pablo Stanley) | Illustrations (8 SVG files) | **CC0 1.0 Universal (Public Domain Dedication)** | No (Free dedicated to public domain) | Yes | [openpeeps.com](https://www.openpeeps.com/) |
| **Unsplash** (Various Photographers) | Photography (5 WebP photos) | **Unsplash License** | No (Attribution appreciated & recorded) | Yes | [unsplash.com](https://unsplash.com/) |
| **SmartSchedule Engineering** | Animations (15 GIF/WebM/Lottie) | **MIT License** | No mandatory attribution (Internal Project Asset) | Yes | [smartschedule.fpt.edu.vn](https://smartschedule.fpt.edu.vn) |

---

## 2. CC0 1.0 Universal (Public Domain Dedication)

### Applicable Assets:
* `illustrations/openpeeps-student-laptop.svg`
* `illustrations/openpeeps-student-reading.svg`
* `illustrations/openpeeps-empty-calendar.svg`
* `illustrations/openpeeps-success-celebration.svg`
* `illustrations/openpeeps-search-no-results.svg`
* `illustrations/openpeeps-campus-walking.svg`
* `illustrations/openpeeps-conflict-alert.svg`
* `illustrations/openpeeps-welcome-onboarding.svg`

### Creator:
* **Pablo Stanley** ([openpeeps.com](https://www.openpeeps.com/))

### License Terms:
> The person who associated a work with this deed has dedicated the work to the public domain by waiving all of his or her rights to the work worldwide under copyright law, including all related and neighboring rights, to the extent allowed by law.
> You can copy, modify, distribute and perform the work, even for commercial purposes, all without asking permission.

---

## 3. Creative Commons Attribution 4.0 International (CC BY 4.0)

### Applicable Assets:
* `textures/heropattern-topography.svg`
* `textures/heropattern-circuit-board.svg`
* `textures/heropattern-architectural-grid.svg`
* `textures/heropattern-hexagons.svg`
* `textures/heropattern-diagonal-stripes.svg`
* `textures/heropattern-polka-dots.svg`
* `textures/heropattern-plus-matrix.svg`
* `textures/heropattern-wiggle.svg`

### Creator:
* **Steve Schoger** ([heropatterns.com](https://heropatterns.com/))

### Mandatory Attribution Notice:
Whenever Hero Patterns assets are embedded into public client-facing code, retain the following attribution in the CSS or component header:
```css
/* Hero Patterns by Steve Schoger (https://heropatterns.com) — Licensed under CC BY 4.0 */
```

### License Summary:
* **Share**: Copy and redistribute the material in any medium or format.
* **Adapt**: Remix, transform, and build upon the material for any purpose, even commercially.
* **Attribution**: You must give appropriate credit, provide a link to the license, and indicate if changes were made.

---

## 4. Unsplash License

### Applicable Assets:
* `photography/photo-campus-modern-library.webp` (by Giammarco Boscaro — `@giammarcobs`)
* `photography/photo-students-collaborative-study.webp` (by Annie Spratt — `@anniespratt`)
* `photography/photo-focus-desk-laptop.webp` (by Christopher Gower — `@cgower`)
* `photography/photo-coastal-horizon-sunrise.webp` (by Sean Oulashin — `@oulashin`)
* `photography/photo-futuristic-lecture-hall.webp` (by Headway — `@headwayio`)

### License Terms:
> All photos published on Unsplash can be used for free. You can use them for commercial and noncommercial purposes. You do not need to ask permission from or provide credit to the photographer or Unsplash, although it is appreciated when possible.
>
> **What is not permitted:**
> - Photos cannot be sold without significant modification.
> - Compiling photos from Unsplash to replicate a similar or competing service.

---

## 5. Haikei Terms

### Applicable Assets:
* All 12 SVG files in `backgrounds/haikei-*.svg`

### Terms Summary:
> SVGs generated via Haikei are 100% free for use in personal and commercial projects without royalties, attribution requirements, or usage limits.

---

## 6. MIT License (SmartSchedule Animation Suite)

### Applicable Assets:
* All 15 animated assets in `animations/gif/`, `animations/webm/`, `animations/webp/`, `animations/lottie/`, and `animations/thumbnails/`.

### Terms Summary:
> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software.
>
> The animations are freely licensed for all SmartSchedule SaaS interfaces, dashboards, visual heroes, and student portals.

---

## 7. Strict Development & AI Guidelines (Do's & Don'ts)

### DO:
1. **Reference Only:** Treat `d:\SmartSchedul\design-assets\` as a local development reference library.
2. **Selective Import:** Only copy an asset to `frontend/src/assets/ui/` when a component specifically needs it.
3. **Preserve Metadata:** Keep author and license information in `catalog.json` and this document.
4. **Optimize on Usage:** If an image is imported for production, ensure it is sized appropriately for the UI target (e.g. max 250–350 KB for hero, WebP/AVIF).

### DO NOT:
1. **DO NOT** bundle the entire `design-assets/` directory into Vite's production build.
2. **DO NOT** scrape or bulk-download from stock photography sites.
3. **DO NOT** use these assets to train or fine-tune machine learning models.
4. **DO NOT** strip author attribution comments from CC BY 4.0 assets.
