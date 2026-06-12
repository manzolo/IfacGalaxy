// Picking screen-space: uniforme per punti della galassia e sfere dei pianeti.
import * as THREE from "three";

const _v = new THREE.Vector3();

// candidates: [{ pos: Vector3 (scena), ref, px? (raggio extra in pixel) }]
export function pickScreen(candidates, camera, x, y, width, height, maxPx = 16) {
  let best = null, bestD = Infinity;
  for (const c of candidates) {
    _v.copy(c.pos).project(camera);
    if (_v.z > 1 || _v.z < -1) continue;
    const sx = (_v.x * 0.5 + 0.5) * width;
    const sy = (-_v.y * 0.5 + 0.5) * height;
    const d = Math.hypot(sx - x, sy - y);
    const limit = maxPx + (c.px || 0);
    if (d < limit && d < bestD) { bestD = d; best = c; }
  }
  return best;
}

// pick su un array piatto di posizioni xyz (es. geometria dello starfield),
// traslato di `offset` (floating origin): ritorna l'indice del punto o -1.
export function pickScreenIndex(posArray, offset, camera, x, y, width, height, maxPx = 10) {
  let best = -1, bestD = Infinity;
  for (let i = 0; i < posArray.length; i += 3) {
    _v.set(posArray[i] + offset.x, posArray[i + 1] + offset.y, posArray[i + 2] + offset.z).project(camera);
    if (_v.z > 1 || _v.z < -1) continue;
    const sx = (_v.x * 0.5 + 0.5) * width;
    const sy = (-_v.y * 0.5 + 0.5) * height;
    const d = Math.hypot(sx - x, sy - y);
    if (d < maxPx && d < bestD) { bestD = d; best = i / 3; }
  }
  return best;
}
