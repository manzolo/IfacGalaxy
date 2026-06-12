// Caricamento e normalizzazione dei cataloghi (curato + completo).
// Ogni sistema diventa un oggetto con posizione mondo in UA nel frame scena.
import { raDecToVec3, AU_PER_PC } from "../physics/coords.js";
import { SOLAR_SYSTEM } from "./solarsystem.js";

const BASE = import.meta.env.BASE_URL + "data/";

export function slugify(name) {
  return name.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// hash deterministico del nome → fase orbitale iniziale stabile tra sessioni
function phaseFromName(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return (h % 3600) / 3600 * Math.PI * 2;
}

// zona abitabile conservativa (Kopparapu semplificato) in UA
export function habitableZone(teff, stRad) {
  if (!teff || !stRad) return null;
  const L = stRad * stRad * Math.pow(teff / 5772, 4);
  return { inner: Math.sqrt(L / 1.1), outer: Math.sqrt(L / 0.53) };
}

function normalizePlanet(rec, sys, methods) {
  const [name, a, per, e, incl, rade, masse, teq, methodIdx, year, flags] = rec;
  // periodo o semiasse possono mancare: stimiamo l'uno dall'altro con Keplero III
  let aAU = a, period = per;
  const mStar = sys.st_mass || 1;
  if (aAU == null && period != null) aAU = Math.cbrt(mStar * Math.pow(period / 365.25, 2));
  if (period == null && aAU != null) period = 365.25 * Math.sqrt(Math.pow(aAU, 3) / mStar);
  if (aAU == null) { aAU = 0.1; period = period || 30; }
  return {
    name,
    a: aAU,
    periodDays: Math.max(period || 30, 0.05),
    e: Math.min(e || 0, 0.95),
    inclDeg: incl,
    radiusE: rade || 1,
    massE: masse,
    teq,
    method: methods[methodIdx] ?? null,
    year,
    estRadius: !!(flags & 1),
    estOrbit: !!(flags & 2) || a == null,
    M0: phaseFromName(name),
    inHZ: sys.hz ? aAU >= sys.hz.inner && aAU <= sys.hz.outer : false,
  };
}

function normalizeSystem(rec, methods, curated) {
  const [name, ra, dec, dist, teff, spectype, stRad, stMass, nStars, planets, extra] = rec;
  const sys = {
    name,
    label: extra?.label || name,
    slug: slugify(extra?.label || name),
    ra, dec,
    distPc: dist,
    teff: teff || 5000,
    spectype,
    st_rad: stRad,
    st_mass: stMass,
    nStars: nStars || 1,
    desc: extra && (extra.it || extra.en) ? extra : null,
    curated,
    isSun: false,
  };
  sys.hz = habitableZone(sys.teff, stRad);
  sys.world = raDecToVec3(ra, dec, dist * AU_PER_PC);
  sys.planets = planets.map((p) => normalizePlanet(p, sys, methods));
  // i sistemi con un'etichetta famosa la usano anche nei nomi dei pianeti
  if (sys.label !== name) {
    for (const p of sys.planets) p.name = p.name.replace(name, sys.label);
  }
  sys.maxA = Math.max(...sys.planets.map((p) => p.a * (1 + p.e)), 0.05);
  return sys;
}

// il Sistema Solare nel formato comune del catalogo
function makeSolarSystem() {
  const sys = {
    name: SOLAR_SYSTEM.host,
    label: SOLAR_SYSTEM.host,
    slug: "sole",
    ra: 0, dec: 0, distPc: 0,
    teff: SOLAR_SYSTEM.teff,
    spectype: SOLAR_SYSTEM.spectype,
    st_rad: 1, st_mass: 1, nStars: 1,
    desc: {
      it: "Casa. Otto pianeti attorno a una nana gialla in un braccio a spirale della Via Lattea. Da qui parte ogni misura di distanza di questa mappa.",
      en: "Home. Eight planets around a yellow dwarf in a spiral arm of the Milky Way. Every distance in this map is measured from here.",
    },
    curated: true,
    isSun: true,
    world: { x: 0, y: 0, z: 0 },
  };
  sys.hz = habitableZone(sys.teff, 1);
  sys.planets = SOLAR_SYSTEM.planets.map((p) => ({
    name: p.name,
    nameEn: p.en,
    jpl: p, // elementi completi per il calcolo accurato
    a: p.a,
    periodDays: 36525 * 360 / p.Lrate,
    e: p.e,
    radiusE: p.radius,
    massE: p.mass,
    teq: null,
    method: null,
    year: null,
    estRadius: false,
    estOrbit: false,
    color: p.color,
    M0: 0,
    inHZ: sys.hz ? p.a >= sys.hz.inner && p.a <= sys.hz.outer : false,
  }));
  sys.maxA = 31;
  return sys;
}

export async function loadCurated() {
  const res = await fetch(BASE + "systems-curated.json");
  const data = await res.json();
  const systems = [makeSolarSystem()];
  for (const rec of data.systems) systems.push(normalizeSystem(rec, data.methods, true));
  return systems;
}

// catalogo completo: aggiunge i sistemi non già presenti tra i curati
export async function loadFull(existing) {
  const res = await fetch(BASE + "systems-full.json");
  const data = await res.json();
  const have = new Set(existing.map((s) => s.name));
  const extra = [];
  for (const rec of data.systems) {
    if (!have.has(rec[0])) extra.push(normalizeSystem(rec, data.methods, false));
  }
  return extra;
}

export async function loadStars() {
  return (await fetch(BASE + "stars-bright.json")).json();
}
export async function loadConstellations() {
  return (await fetch(BASE + "constellations.json")).json();
}
