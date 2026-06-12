// Genera public/data/stars-bright.json dal database HYG (stelle visibili a occhio nudo).
import { fetchCached, writeOutput, parseCSV, sig } from "./lib.mjs";

const URL = "https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/CURRENT/hygdata_v41.csv";
const MAG_LIMIT = 6.5;       // limite di visibilità a occhio nudo
const UNKNOWN_DIST = 2000;   // pc convenzionali per parallassi inaffidabili

console.log("Stelle: database HYG…");
const csv = await fetchCached(URL, "hygdata_v41.csv");
const rows = parseCSV(csv);
const header = rows[0];
const col = Object.fromEntries(header.map((h, i) => [h, i]));
for (const k of ["ra", "dec", "dist", "mag", "ci", "hip", "proper"]) {
  if (col[k] == null) throw new Error(`colonna HYG mancante: ${k}`);
}

const ra = [], dec = [], dist = [], mag = [], ci = [], hip = [];
const names = {};
let n = 0;
for (let i = 1; i < rows.length; i++) {
  const r = rows[i];
  if (r.length < header.length) continue;
  const m = parseFloat(r[col.mag]);
  if (!isFinite(m) || m > MAG_LIMIT) continue;
  const d = parseFloat(r[col.dist]);
  if (r[col.proper] === "Sol") continue; // il Sole è gestito dall'app
  ra.push(sig(parseFloat(r[col.ra]) * 15, 7));            // ore → gradi
  dec.push(sig(parseFloat(r[col.dec]), 7));
  dist.push(!isFinite(d) || d <= 0 || d >= 99999 ? UNKNOWN_DIST : sig(d, 5));
  mag.push(sig(m, 3));
  ci.push(sig(parseFloat(r[col.ci]) || 0, 3));
  hip.push(parseInt(r[col.hip]) || 0);
  if (r[col.proper]) names[n] = r[col.proper];
  n++;
}

writeOutput("stars-bright.json", {
  generated: new Date().toISOString().slice(0, 10),
  source: `HYG v4.1 (CC BY 4.0, astronexus.com), mag <= ${MAG_LIMIT}`,
  count: n,
  ra, dec, dist, mag, ci, hip, names,
});
console.log(`  ${n} stelle (mag <= ${MAG_LIMIT})`);
