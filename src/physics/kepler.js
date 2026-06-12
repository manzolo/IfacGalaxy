// Meccanica orbitale kepleriana: modulo puro, testato in test/kepler.test.js.
const TWO_PI = Math.PI * 2;

// Risolve l'equazione di Keplero M = E - e·sin(E) con Newton-Raphson.
// M in radianti, ritorna l'anomalia eccentrica E in radianti.
export function solveKepler(M, e) {
  M = ((M % TWO_PI) + TWO_PI) % TWO_PI;
  if (e < 1e-9) return M;
  // guess iniziale robusto anche per e alta (Danby)
  let E = M + 0.85 * e * Math.sign(Math.sin(M)) || M + e;
  for (let i = 0; i < 30; i++) {
    const f = E - e * Math.sin(E) - M;
    const dE = f / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-12) break;
  }
  return E;
}

// Posizione sul piano orbitale (perifocale): X verso il periastro.
// a in unità qualsiasi, M anomalia media in radianti.
export function perifocalPosition(a, e, M) {
  const E = solveKepler(M, e);
  return {
    x: a * (Math.cos(E) - e),
    y: a * Math.sqrt(1 - e * e) * Math.sin(E),
  };
}

// Elementi orbitali → posizione 3D nel frame di riferimento del sistema.
// elements: { a, e, periodDays, M0 (rad, a t=0), inclDeg, nodeDeg, periDeg }
// tDays: tempo dall'epoca. Ritorna {x,y,z} con il piano orbitale di base = piano XZ
// della scena (Y = normale orbitale per i=0), così le orbite "piatte" giacciono
// orizzontali nella vista di sistema.
export function orbitalPosition(elements, tDays, out = {}) {
  const { a, e = 0, periodDays, M0 = 0, inclDeg = 0, nodeDeg = 0, periDeg = 0 } = elements;
  const n = TWO_PI / periodDays; // moto medio rad/giorno
  const M = M0 + n * tDays;
  const p = perifocalPosition(a, e, M);

  const ci = Math.cos(inclDeg * (Math.PI / 180)), si = Math.sin(inclDeg * (Math.PI / 180));
  const cO = Math.cos(nodeDeg * (Math.PI / 180)), sO = Math.sin(nodeDeg * (Math.PI / 180));
  const cw = Math.cos(periDeg * (Math.PI / 180)), sw = Math.sin(periDeg * (Math.PI / 180));

  // rotazione perifocale → riferimento (sequenza classica ω, i, Ω) su piano "orizzontale"
  const x1 = cw * p.x - sw * p.y;
  const y1 = sw * p.x + cw * p.y;
  const x2 = x1;
  const z2 = y1 * ci;       // componente nel piano
  const h2 = y1 * si;       // componente fuori dal piano
  out.x = cO * x2 - sO * z2;
  out.z = sO * x2 + cO * z2;
  out.y = h2;
  return out;
}

// Campiona l'orbita completa in n punti (per disegnare la linea orbitale).
export function orbitPoints(elements, n = 128) {
  const pts = [];
  const period = elements.periodDays;
  for (let i = 0; i <= n; i++) {
    pts.push(orbitalPosition(elements, (i / n) * period - (elements.M0 ?? 0) * period / TWO_PI, {}));
  }
  return pts;
}

// Giorno giuliano da Date UTC (valido per il calendario gregoriano)
export function julianDay(date) {
  return date.getTime() / 86400000 + 2440587.5;
}
export const J2000 = 2451545.0;

export function dateFromJulian(jd) {
  return new Date((jd - 2440587.5) * 86400000);
}
