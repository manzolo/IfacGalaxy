// Conversioni di coordinate astronomiche → coordinate scena Three.js.
// Convenzione unica per tutta l'app:
//   frame equatoriale J2000, scena Y-up con il polo nord celeste = +Y,
//   +X = punto vernale (RA 0h, Dec 0°), +Z = RA 18h (rotazione destrorsa).
export const DEG = Math.PI / 180;
export const AU_PER_PC = 206264.806;
export const LY_PER_PC = 3.261564;
export const OBLIQUITY = 23.43928 * DEG; // inclinazione dell'eclittica J2000

// RA/Dec (gradi) + distanza → {x,y,z} nelle stesse unità della distanza
export function raDecToVec3(raDeg, decDeg, dist, out = {}) {
  const ra = raDeg * DEG, dec = decDeg * DEG;
  const cd = Math.cos(dec);
  out.x = dist * cd * Math.cos(ra);
  out.y = dist * Math.sin(dec);
  out.z = -dist * cd * Math.sin(ra);
  return out;
}

// inversa: {x,y,z} scena → { ra, dec (gradi), dist }
export function vec3ToRaDec(x, y, z) {
  const dist = Math.sqrt(x * x + y * y + z * z) || 1e-12;
  const dec = Math.asin(y / dist) / DEG;
  let ra = Math.atan2(-z, x) / DEG;
  if (ra < 0) ra += 360;
  return { ra, dec, dist };
}

// coordinate eclittiche (x verso il punto vernale, z polo nord eclittico)
// → frame scena equatoriale. Serve per i pianeti del Sistema Solare.
export function eclipticToScene(xe, ye, ze, out = {}) {
  const c = Math.cos(OBLIQUITY), s = Math.sin(OBLIQUITY);
  // rotazione attorno all'asse del punto vernale, poi rimappatura assi scena
  const yq = ye * c - ze * s;
  const zq = ye * s + ze * c;
  out.x = xe;
  out.y = zq;
  out.z = -yq;
  return out;
}

// magnitudine apparente del Sole visto da `distPc` parsec (M_sun = 4.83)
export function sunMagnitudeFrom(distPc) {
  return 4.83 + 5 * Math.log10(Math.max(distPc, 1e-9) / 10);
}
