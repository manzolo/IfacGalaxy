// Linee e nomi delle costellazioni, ancorati alle vere posizioni 3D delle stelle.
import * as THREE from "three";
import { raDecToVec3, AU_PER_PC } from "../physics/coords.js";

export function buildConstellationLines(data) {
  const verts = [];
  const v = {};
  for (const c of data.constellations) {
    for (const line of c.lines) {
      for (let i = 0; i < line.length - 1; i++) {
        for (const [ra, dec, dist] of [line[i], line[i + 1]]) {
          raDecToVec3(ra, dec, dist * AU_PER_PC, v);
          verts.push(v.x, v.y, v.z);
        }
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(verts), 3));
  const mat = new THREE.LineBasicMaterial({
    color: 0x4a7a96,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
  });
  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false;
  return lines;
}

// ancore per le etichette: centroide 3D dei vertici di ogni costellazione
export function constellationLabelAnchors(data) {
  const anchors = [];
  const v = {};
  const nameById = new Map(data.labels.map((l) => [l.id, l.name]));
  for (const c of data.constellations) {
    let x = 0, y = 0, z = 0, n = 0;
    for (const line of c.lines) {
      for (const [ra, dec, dist] of line) {
        raDecToVec3(ra, dec, dist * AU_PER_PC, v);
        x += v.x; y += v.y; z += v.z; n++;
      }
    }
    if (!n) continue;
    anchors.push({
      name: nameById.get(c.id) || c.id,
      pos: new THREE.Vector3(x / n, y / n, z / n),
    });
  }
  return anchors;
}
