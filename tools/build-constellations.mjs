// Genera public/data/constellations.json dalle linee di d3-celestial,
// agganciando ogni vertice alla stella HYG più vicina così che le linee
// abbiano vera profondità 3D (e si deformino cambiando punto di vista).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fetchCached, writeOutput, sig, OUT } from "./lib.mjs";

const LINES_URL = "https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/constellations.lines.json";
const NAMES_URL = "https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/constellations.json";

console.log("Costellazioni: d3-celestial…");
const lines = JSON.parse(await fetchCached(LINES_URL, "constellations.lines.json"));
const names = JSON.parse(await fetchCached(NAMES_URL, "constellations.json"));

// stelle già generate da build-stars.mjs, per il matching dei vertici
const stars = JSON.parse(readFileSync(join(OUT, "stars-bright.json"), "utf8"));

const DEG = Math.PI / 180;
function toUnitVec(raDeg, decDeg) {
  const a = raDeg * DEG, d = decDeg * DEG;
  return [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)];
}

// pre-calcola i versori delle stelle
const starVec = [];
for (let i = 0; i < stars.count; i++) starVec.push(toUnitVec(stars.ra[i], stars.dec[i]));

const MATCH_COS = Math.cos(1.2 * DEG); // tolleranza ~1.2°
const FALLBACK_DIST = 300;             // pc, per vertici senza stella corrispondente

function lookupVertex(lon, lat) {
  // d3-celestial usa longitudine -180..180 = RA
  const raDeg = lon < 0 ? lon + 360 : lon;
  const v = toUnitVec(raDeg, lat);
  let best = -1, bestDot = MATCH_COS;
  for (let i = 0; i < starVec.length; i++) {
    const s = starVec[i];
    const dot = v[0] * s[0] + v[1] * s[1] + v[2] * s[2];
    if (dot > bestDot) { bestDot = dot; best = i; }
  }
  if (best >= 0) return [sig(stars.ra[best], 7), sig(stars.dec[best], 7), stars.dist[best]];
  return [sig(raDeg, 7), sig(lat, 7), FALLBACK_DIST];
}

let matched = 0, total = 0;
const constellations = [];
for (const f of lines.features) {
  const segs = [];
  const coords = f.geometry.type === "MultiLineString" ? f.geometry.coordinates : [f.geometry.coordinates];
  for (const line of coords) {
    const pts = line.map(([lon, lat]) => {
      total++;
      const p = lookupVertex(lon, lat);
      if (p[2] !== FALLBACK_DIST) matched++;
      return p;
    });
    segs.push(pts);
  }
  constellations.push({ id: f.id, lines: segs });
}

const labels = names.features.map((f) => ({
  id: f.id,
  name: f.properties.name,
  ra: sig(f.geometry.coordinates[0] < 0 ? f.geometry.coordinates[0] + 360 : f.geometry.coordinates[0], 6),
  dec: sig(f.geometry.coordinates[1], 6),
}));

writeOutput("constellations.json", {
  generated: new Date().toISOString().slice(0, 10),
  source: "d3-celestial (BSD-3, Olaf Frohn), da dati Stellarium",
  constellations,
  labels,
});
console.log(`  ${constellations.length} costellazioni, vertici agganciati a stelle reali: ${matched}/${total}`);
