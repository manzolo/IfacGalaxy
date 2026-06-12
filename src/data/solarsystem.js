// Il Sistema Solare come sistema "ospite" di riferimento.
// Elementi kepleriani J2000 (JPL, approssimazione valida 1800-2050):
// a (UA), e, i (gradi), L (long. media), peri (long. periastro ϖ), node (Ω),
// Lrate (gradi/secolo giuliano). ω = ϖ - Ω, M = L - ϖ.
// Le posizioni sono nel piano dell'eclittica: la vista di sistema applica
// l'obliquità per restare coerente con il fondo stellato equatoriale.
export const SOLAR_SYSTEM = {
  host: "Sole",
  hostEn: "Sun",
  isSun: true,
  teff: 5772,
  spectype: "G2 V",
  st_rad: 1,
  st_mass: 1,
  dist: 0,
  planets: [
    { name: "Mercurio", en: "Mercury", a: 0.38709927, e: 0.20563593, incl: 7.00497902, L: 252.2503235, peri: 77.45779628, node: 48.33076593, Lrate: 149472.67411175, radius: 0.383, mass: 0.0553, color: 0x9c8e84 },
    { name: "Venere", en: "Venus", a: 0.72333566, e: 0.00677672, incl: 3.39467605, L: 181.9790995, peri: 131.60246718, node: 76.67984255, Lrate: 58517.81538729, radius: 0.949, mass: 0.815, color: 0xe6c89c },
    { name: "Terra", en: "Earth", a: 1.00000261, e: 0.01671123, incl: -0.00001531, L: 100.46457166, peri: 102.93768193, node: 0, Lrate: 35999.37244981, radius: 1, mass: 1, color: 0x4f81c7 },
    { name: "Marte", en: "Mars", a: 1.52371034, e: 0.0933941, incl: 1.84969142, L: -4.55343205, peri: -23.94362959, node: 49.55953891, Lrate: 19140.30268499, radius: 0.532, mass: 0.107, color: 0xc1623c },
    { name: "Giove", en: "Jupiter", a: 5.202887, e: 0.04838624, incl: 1.30439695, L: 34.39644051, peri: 14.72847983, node: 100.47390909, Lrate: 3034.74612775, radius: 11.21, mass: 317.8, color: 0xc8a06e },
    { name: "Saturno", en: "Saturn", a: 9.53667594, e: 0.05386179, incl: 2.48599187, L: 49.95424423, peri: 92.59887831, node: 113.66242448, Lrate: 1222.49362201, radius: 9.45, mass: 95.2, color: 0xd9c08a },
    { name: "Urano", en: "Uranus", a: 19.18916464, e: 0.04725744, incl: 0.77263783, L: 313.23810451, peri: 170.9542763, node: 74.01692503, Lrate: 428.48202785, radius: 4.01, mass: 14.5, color: 0x9ad3d4 },
    { name: "Nettuno", en: "Neptune", a: 30.06992276, e: 0.00859048, incl: 1.77004347, L: -55.12002969, peri: 44.96476227, node: 131.78422574, Lrate: 218.45945325, radius: 3.88, mass: 17.1, color: 0x5a7fd6 },
  ],
};

// elementi JPL → formato del solver (M0 in radianti, periodo in giorni)
export function solarElements(p, daysSinceJ2000 = 0) {
  const DEG = Math.PI / 180;
  const T = daysSinceJ2000 / 36525; // secoli giuliani
  const L = p.L + p.Lrate * T;
  const M = ((L - p.peri) % 360) * DEG;
  return {
    a: p.a,
    e: p.e,
    periodDays: 36525 * 360 / p.Lrate,
    M0: M, // anomalia media già al tempo richiesto → usare tDays=0
    inclDeg: p.incl,
    nodeDeg: p.node,
    periDeg: p.peri - p.node,
  };
}
