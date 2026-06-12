// Scarica il catalogo esopianeti dal NASA Exoplanet Archive (tabella pscomppars)
// e genera public/data/systems-curated.json + systems-full.json.
import { fetchCached, writeOutput, sig } from "./lib.mjs";
import { DESCRIPTIONS } from "./descriptions.mjs";

const FIELDS = [
  "pl_name", "hostname", "ra", "dec", "sy_dist",
  "pl_orbsmax", "pl_orbper", "pl_orbeccen", "pl_orbincl", "pl_orblper",
  "pl_rade", "pl_bmasse", "pl_eqt",
  "discoverymethod", "disc_year",
  "st_teff", "st_rad", "st_mass", "st_spectype",
  "sy_snum", "sy_pnum",
];

const TAP = "https://exoplanetarchive.ipac.caltech.edu/TAP/sync";
const url = `${TAP}?query=${encodeURIComponent(`select ${FIELDS.join(",")} from pscomppars`)}&format=json`;

console.log("Esopianeti: query pscomppars…");
const rows = JSON.parse(await fetchCached(url, "pscomppars.json"));
console.log(`  ${rows.length} pianeti ricevuti`);

// --- raggruppa per stella ospite -------------------------------------------
const byHost = new Map();
for (const r of rows) {
  if (r.ra == null || r.dec == null) continue;
  if (!byHost.has(r.hostname)) byHost.set(r.hostname, []);
  byHost.get(r.hostname).push(r);
}

const METHODS = [...new Set(rows.map((r) => r.discoverymethod).filter(Boolean))].sort();
const methodIdx = new Map(METHODS.map((m, i) => [m, i]));

// stima del raggio dalla massa (relazione massa-raggio semplificata, unità terrestri)
function radiusFromMass(mE) {
  if (mE == null) return null;
  if (mE < 8) return Math.pow(mE, 0.28);          // rocciosi / super-Terre
  if (mE < 120) return Math.pow(mE, 0.59) / 2.0;  // nettuniani
  return 12;                                       // giganti: raggio ~ costante
}

function planetRecord(r) {
  // [nome, a(UA), periodo(gg), e, incl, raggio(R⊕), massa(M⊕), Teq, metodo, anno, flags]
  // flags bit0 = raggio stimato, bit1 = eccentricità mancante (orbita assunta circolare)
  let flags = 0;
  let rade = r.pl_rade;
  if (rade == null) { rade = radiusFromMass(r.pl_bmasse); if (rade != null) flags |= 1; }
  if (r.pl_orbeccen == null) flags |= 2;
  return [
    r.pl_name,
    sig(r.pl_orbsmax, 4),
    sig(r.pl_orbper, 6),
    sig(r.pl_orbeccen ?? 0, 3),
    sig(r.pl_orbincl, 4),
    sig(rade, 3),
    sig(r.pl_bmasse, 3),
    r.pl_eqt != null ? Math.round(r.pl_eqt) : null,
    methodIdx.get(r.discoverymethod) ?? null,
    r.disc_year ?? null,
    flags,
  ];
}

function systemRecord(host, planets) {
  const s = planets[0];
  // [host, ra, dec, dist(pc), Teff, spettro, st_rad, st_mass, n_stelle, [pianeti]]
  return [
    host,
    sig(s.ra, 7),
    sig(s.dec, 7),
    sig(s.sy_dist, 5),
    s.st_teff != null ? Math.round(s.st_teff) : null,
    s.st_spectype ? s.st_spectype.trim() : null,
    sig(s.st_rad, 3),
    sig(s.st_mass, 3),
    s.sy_snum ?? 1,
    planets
      .slice()
      .sort((a, b) => (a.pl_orbsmax ?? a.pl_orbper ?? 9e9) - (b.pl_orbsmax ?? b.pl_orbper ?? 9e9))
      .map(planetRecord),
  ];
}

// --- catalogo completo ------------------------------------------------------
const fullSystems = [...byHost.entries()]
  .filter(([, pl]) => pl[0].sy_dist != null)
  .map(([host, pl]) => systemRecord(host, pl));

writeOutput("systems-full.json", {
  generated: new Date().toISOString().slice(0, 10),
  source: "NASA Exoplanet Archive (pscomppars)",
  methods: METHODS,
  fields: {
    system: ["name", "ra", "dec", "dist_pc", "teff", "spectype", "st_rad", "st_mass", "n_stars", "planets"],
    planet: ["name", "a_au", "per_days", "ecc", "incl_deg", "r_earth", "m_earth", "teq_k", "method", "year", "flags"],
  },
  systems: fullSystems,
});

// --- catalogo curato --------------------------------------------------------
const curatedNames = new Set(Object.keys(DESCRIPTIONS));

// vicini: i 40 sistemi più prossimi
const sorted = fullSystems.slice().sort((a, b) => a[3] - b[3]);
for (const s of sorted.slice(0, 40)) curatedNames.add(s[0]);
// ricchi: tutti i sistemi con 5+ pianeti
for (const s of fullSystems) if (s[9].length >= 5) curatedNames.add(s[0]);

const missing = [...Object.keys(DESCRIPTIONS)].filter((n) => !byHost.has(n));
if (missing.length) console.warn(`  ATTENZIONE: host descritti non trovati nel catalogo: ${missing.join(", ")}`);

const curated = fullSystems
  .filter((s) => curatedNames.has(s[0]))
  .map((s) => {
    const d = DESCRIPTIONS[s[0]];
    return d ? [...s, { it: d.it, en: d.en, ...(d.label ? { label: d.label } : {}) }] : s;
  });

writeOutput("systems-curated.json", {
  generated: new Date().toISOString().slice(0, 10),
  source: "NASA Exoplanet Archive (pscomppars)",
  methods: METHODS,
  systems: curated,
});
console.log(`  ${fullSystems.length} sistemi totali, ${curated.length} curati`);
