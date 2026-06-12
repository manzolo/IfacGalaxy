# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (native Node)
npm install
npm run dev        # Vite dev server at http://localhost:5173
npm run build      # Single-file HTML build → dist/index.html + dist/data/
npm run preview    # Preview the production build
npm test           # Vitest unit tests (Kepler solver, coordinates, ephemerides)

# Data pipeline (regenerate static datasets from NASA/HYG/d3-celestial)
npm run data:build          # runs all three steps below
npm run data:exoplanets     # fetches NASA Exoplanet Archive → public/data/systems-*.json
npm run data:stars          # builds HYG star catalog → public/data/stars-bright.json
npm run data:constellations # builds constellation lines → public/data/constellations.json

# Docker alternative (no local Node required)
make dev    # Vite dev server via Docker at http://localhost:5173
make build  # build via Docker
make test   # tests via Docker
make serve  # build + nginx at http://localhost:8080
```

To run a single test file: `npx vitest run test/kepler.test.js`

Smoke test (requires a running build and Chromium): `node tools/smoke.mjs [url] [screenshot.png] [waitMs]`

## Architecture

### Coordinate system and scale

The scene uses a **continuous world** where **1 Three.js unit = 1 Astronomical Unit (AU)**. There is no LOD switching or separate coordinate spaces — the same world handles zoom from planetary radius to galactic scale (~6.5 million AU). A **floating origin** is applied via `worldGroup.position` when the camera moves to a new system (`reorigin()` in `main.js`), keeping numerical precision near the camera.

The coordinate frame is **equatorial J2000**: RA 0/Dec 0 → +X, Dec 90° → +Y. Ecliptic coordinates (used by Solar System elements) are converted at the boundary via `eclipticToScene()`.

### Module structure

| Directory | Responsibility |
|---|---|
| `src/physics/` | Pure math: Kepler solver (`kepler.js`), coordinate transforms (`coords.js`), simulation clock (`time.js`). No Three.js dependencies — fully unit-tested. |
| `src/data/` | Data loading from pre-built JSON: `catalog.js` loads exoplanet/star catalogs; `solarsystem.js` has hardcoded JPL orbital elements for Solar System planets. |
| `src/scene/` | Three.js scene objects: `systemview.js` builds a planetary system with procedural planet textures and Keplerian orbits; `starfield.js` manages the ~9,000 background stars with a custom shader that recomputes apparent magnitude from camera position; `galaxypoints.js` renders all systems as points in galactic view; `constellations.js` draws constellation lines. |
| `src/camera/` | `rig.js`: OrbitControls wrapper with animated fly-to transitions, PoV (surface) mode, and world-shift for floating origin. |
| `src/ui/` | HUD: `infocard.js` (star/planet info panels), `labels.js` (2D overlays), `search.js` (global search), `picking.js` (raycasting), `i18n.js` (IT/EN translations). |

### Data flow

The app has **no runtime API calls**. All data is pre-built offline:
1. `tools/` scripts fetch from NASA Exoplanet Archive, HYG Database, and d3-celestial, then write to `public/data/*.json`.
2. At runtime, `catalog.js` fetches these static JSON files.
3. Tools cache raw downloads in `tools/cache/` to avoid re-fetching.

### Build output

`vite-plugin-singlefile` inlines all JS/CSS into `dist/index.html` (~600 KB). The `public/data/*.json` datasets remain as separate files loaded at runtime — they are not inlined.

### Rendering notes

- Stars use a custom Three.js shader (`starfield.js`) that computes apparent magnitude from the camera's current world position — stars brighten as you approach their system.
- Planet textures are **procedural** (generated on a Canvas at runtime), so there are no texture asset files.
- The logarithmic depth buffer (`logarithmicDepthBuffer: true`) is required for the extreme zoom range.
- Orbital planes for exoplanets are oriented using measured orbital inclination so transiting systems appear edge-on from Earth's viewpoint.

### Deep-link / URL state

Selecting a system updates the URL to `?focus=<slug>` via `history.replaceState`. On load, `main.js` reads this parameter to restore the focused system.
