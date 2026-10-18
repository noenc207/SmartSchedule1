# Task routing

Names refer to optional sibling skills when installed. Read only the specialist instructions needed by the user's request. If a companion is absent, consult official documentation directly.

| Request | Start with | Optional companions |
| --- | --- | --- |
| Complete 3D experience | threejs-web | scene, html, accessibility, testing |
| Viewer or configurator | threejs-product-viewer | assets, materials, interaction |
| Camera, transforms, resize | threejs-scene | geometry, spatial-data |
| Procedural meshes and repeated objects | threejs-geometry | particles, performance |
| PBR, glass, texture color | threejs-materials | lighting, postprocessing |
| Studio setup and shadows | threejs-lighting | materials, debugging |
| Models, compression, loading | threejs-assets | performance, deployment |
| Clips, transitions, scroll motion | threejs-animation | html, accessibility |
| Picking, dragging, controls | threejs-interaction | accessibility, r3f |
| GLSL and custom shader effects | threejs-shaders | materials, debugging |
| WebGPU, TSL, compute | threejs-webgpu | particles, postprocessing |
| Bloom, AO, antialiasing | threejs-postprocessing | lighting, performance |
| React Canvas, Drei, Suspense | threejs-r3f | html, assets |
| Collisions and rigid bodies | threejs-physics | animation, interaction |
| Particles and point clouds | threejs-particles | geometry, webgpu |
| SSR, overlays, scrolling, multiple views | threejs-html | scene, accessibility |
| Keyboard, screen readers, motion | threejs-accessibility | interaction, testing |
| Slow frames and memory growth | threejs-performance | assets, debugging |
| Blank scene, flicker, failed rendering | threejs-debugging | the affected feature skill |
| Regression and visual evidence | threejs-testing | performance when measuring targets |
| Build paths, hosting, decoder delivery | threejs-deployment | assets, debugging |
| VR/AR and controller input | threejs-xr | performance, interaction |
| Positional sound | threejs-audio | xr when session audio matters |
| IFC, GIS, clipping, measurement | threejs-spatial-data | assets, interaction |

Expand companion names with `threejs-`. An ordinary CSS change near a canvas does not require renderer work.

For a complete project, record the requested subject/interactions, framework/backend/version, assets, and target viewports. Capture rendering, resizing, input, load failure, relevant accessibility, route cleanup, build status, and browser evidence. Include timing and memory claims only when measured. Mark unavailable devices or assets explicitly.
