---
"sanding-monitoring-web-app": minor
---

Upgrade @viamrobotics/motion-tools from 1.2.2 to 1.22.0. This pulls the snapshot
viewer onto the threlte/three.js rendering stack, so the build now requires
vite-plugin-glsl, HDR asset handling, and pinned three@0.183.2 (matching the
sibling sanding-webapp integration).
