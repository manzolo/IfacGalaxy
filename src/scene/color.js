// Colore RGB da temperatura di corpo nero (approssimazione di Tanner Helland).
export function kelvinToRGB(k) {
  k = Math.max(1500, Math.min(40000, k || 5500)) / 100;
  let r, g, b;
  if (k <= 66) {
    r = 255;
    g = 99.47 * Math.log(k) - 161.12;
    b = k <= 19 ? 0 : 138.52 * Math.log(k - 10) - 305.04;
  } else {
    r = 329.7 * Math.pow(k - 60, -0.1332);
    g = 288.12 * Math.pow(k - 60, -0.0755);
    b = 255;
  }
  const c = (v) => Math.max(0, Math.min(1, v / 255));
  return [c(r), c(g), c(b)];
}

// indice di colore B-V → temperatura (Ballesteros 2012)
export function bvToKelvin(bv) {
  bv = Math.max(-0.4, Math.min(2.0, bv));
  return 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62));
}
