# IfacGalaxy 🪐

**Interactive 3D exoplanet simulator** — the galactic heir of [SistemaSolare](https://github.com/manzolo/SistemaSolare).

[Versione italiana](README.md)

**Live demo:** [manzolo.github.io/IfacGalaxy](https://manzolo.github.io/IfacGalaxy/)

Fly in 3D through real exoplanetary systems from the NASA catalog, from the
orbits of the Solar System out to Kepler-90, 2,767 light-years away. Every star,
distance and orbit is at its real value: you move through a **continuous world**
where 1 unit = 1 Astronomical Unit and the zoom spans from a planet's radius to
the whole local bubble of the Galaxy.

## ✨ Features

- **Real catalog**: ~100 curated systems with hand-written context cards
  (TRAPPIST-1, Proxima, 51 Peg, Kepler-90…) plus the entire NASA Exoplanet
  Archive (4,700 systems, 6,300 planets) loadable with one toggle.
- **A true 3D sky**: ~9,000 naked-eye stars (HYG catalog) at their real
  distances — as you travel between systems, perspective, brightness and the
  **constellations deform in a physically correct way**.
- **Keplerian orbits**: Kepler's equation solved in real time, orbital elements
  from the catalog, orbital planes oriented by the measured inclination. The
  Solar System uses JPL ephemerides (verified by tests).
- **View from a planet** 👁: stand on TRAPPIST-1 e and watch the other planets
  loom as large as moons, or look for the Sun: a barely visible mag 5.3 spark.
  From Earth, the sky matches the real one.
- **Info cards** for every star and planet: physical and orbital data, discovery
  method, habitable zone, size comparison with Earth, badges for estimated data.
- **Observatory controls**: time speed (hours to millennia per second),
  configurable date, size scale, orbit compression, brightness, global search,
  filters by discovery method and distance.
- **Bilingual** 🇮🇹/🇬🇧, mobile-friendly, shareable deep links
  (`?focus=trappist-1`).

## 🚀 Getting started

```bash
npm install
npm run dev        # development at http://localhost:5173
npm run build      # produces dist/index.html (single file) + dist/data/
npm run test       # unit tests (Kepler solver, coordinates, ephemerides)
npm run data:build # regenerate datasets from NASA/HYG/d3-celestial
```

The build is a **single HTML file** (~600 KB) plus the JSON datasets, deployable
on any static hosting (GitHub Pages included).

## 🔭 Architecture

| Aspect | Choice |
|---|---|
| Rendering | Three.js, log depth buffer, custom star shaders |
| Scales | Continuous world in AU, floating origin on the selected system |
| Data | Offline pipeline → static JSON (`tools/`), no runtime APIs |
| Coordinates | J2000 equatorial frame, conversions tested vs ephemerides |
| Orbits | Kepler solver (Newton-Raphson), stable up to e≈0.95 |

Stars recompute their apparent magnitude **from the camera position** in the
shader: approach a system and its neighborhood lights up while the Sun fades
behind you.

## 👥 Credits

From an idea by **Massimo Bianchini**, with the help of **Moreno Comelli**.
Technical implementation: **Andrea Manzi** ([manzolo](https://github.com/manzolo)).

## 📚 Data sources

- **Exoplanets and host stars**: [NASA Exoplanet Archive](https://exoplanetarchive.ipac.caltech.edu)
  (`pscomppars` table). *This research has made use of the NASA Exoplanet
  Archive, which is operated by the California Institute of Technology, under
  contract with the National Aeronautics and Space Administration under the
  Exoplanet Exploration Program.*
- **Background stars**: [HYG Database v4.1](https://github.com/astronexus/HYG-Database)
  by David Nash (CC BY 4.0).
- **Constellations**: [d3-celestial](https://github.com/ofrohn/d3-celestial) by
  Olaf Frohn (BSD-3), from [Stellarium](https://stellarium.org) project data.
- **Solar System planets**: approximate orbital elements from
  [NASA/JPL Solar System Dynamics](https://ssd.jpl.nasa.gov/planets/approx_pos.html).

The complete list with licenses is in [NOTICE.md](NOTICE.md).

## ⚠️ Disclaimer

An independent educational project: not affiliated with, endorsed by, or
sponsored by NASA, JPL, Caltech, ESA, IAU, or any mission mentioned. The
simulations are approximate and educational, **not scientific ephemerides**:
star and planet sizes are exaggerated for readability and, where eccentricity,
inclination, or orbital phase are not measured, the orbit is shown as estimated
and flagged on its card. No analytics, no ads, no first-party cookies: only the
selected language is stored in the browser.

## License

MIT — see [LICENSE](LICENSE).
