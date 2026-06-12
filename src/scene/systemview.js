// Vista di un sistema planetario: stella ospite, pianeti con materiali
// procedurali, orbite ellittiche. Il piano orbitale dei sistemi esoplanetari è
// orientato secondo l'inclinazione misurata rispetto alla linea di vista dalla
// Terra (i transiti appaiono di taglio, come sono davvero).
import * as THREE from "three";
import { orbitalPosition } from "../physics/kepler.js";
import { solarElements } from "../data/solarsystem.js";
import { eclipticToScene } from "../physics/coords.js";
import { kelvinToRGB } from "./color.js";

const R_EARTH_AU = 4.2635e-5;
const R_SUN_AU = 0.00465;

// ---- texture procedurali (niente asset esterni) -----------------------------
const texCache = new Map();
function proceduralTexture(kind, hex) {
  const key = kind + hex;
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement("canvas");
  c.width = 128; c.height = 64;
  const ctx = c.getContext("2d");
  const base = new THREE.Color(hex);
  ctx.fillStyle = `#${base.getHexString()}`;
  ctx.fillRect(0, 0, 128, 64);
  let seed = 0;
  for (let i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) % 10000;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  if (kind === "banded") {
    for (let y = 0; y < 64; y++) {
      const t = 0.82 + 0.36 * Math.sin(y * 0.45 + rnd() * 0.8) + (rnd() - 0.5) * 0.12;
      ctx.fillStyle = `rgba(${(base.r * 255 * t) | 0},${(base.g * 255 * t) | 0},${(base.b * 255 * t) | 0},0.9)`;
      ctx.fillRect(0, y, 128, 1);
    }
  } else {
    for (let i = 0; i < 380; i++) {
      const t = 0.7 + rnd() * 0.6;
      ctx.fillStyle = `rgba(${(base.r * 255 * t) | 0},${(base.g * 255 * t) | 0},${(base.b * 255 * t) | 0},0.5)`;
      const r = 1 + rnd() * 5;
      ctx.beginPath();
      ctx.arc(rnd() * 128, rnd() * 64, r, 0, 7);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, tex);
  return tex;
}

// categoria visiva del pianeta → [tipo texture, colore]
function planetLook(p) {
  if (p.color != null) {
    return [p.radiusE > 3 ? "banded" : "rocky", p.color];
  }
  const r = p.radiusE, t = p.teq;
  if (r > 7) {
    if (t && t > 1200) return ["banded", 0xc04a28];
    if (t && t > 700) return ["banded", 0xcf8a4e];
    return ["banded", 0xb9a07c];
  }
  if (r > 3.5) return ["banded", 0x5a7fd6];
  if (r > 1.7) return ["rocky", 0x5fa9a0];
  if (t && t > 700) return ["rocky", 0xb35636];
  if (p.inHZ) return ["rocky", 0x4f81c7];
  return ["rocky", 0x9c8e84];
}

function haloTexture() {
  if (texCache.has("halo")) return texCache.get("halo");
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,0.9)");
  g.addColorStop(0.25, "rgba(255,255,255,0.32)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  texCache.set("halo", tex);
  return tex;
}

const sphereGeo = new THREE.SphereGeometry(1, 40, 24);

export class SystemView {
  constructor() {
    this.group = new THREE.Group();
    this.system = null;
    this.planetMeshes = [];
    this.orbitLines = [];
    this.compression = 1;
    this.sizeScale = 1;
  }

  // matrice di orientamento del piano orbitale del sistema
  _orientation(sys) {
    if (sys.isSun) return null; // il Sistema Solare usa direttamente l'eclittica
    const w = new THREE.Vector3(sys.world.x, sys.world.y, sys.world.z).normalize(); // linea di vista
    const up = Math.abs(w.y) > 0.93 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const u = new THREE.Vector3().crossVectors(up, w).normalize();
    const v = new THREE.Vector3().crossVectors(w, u);
    const inclVals = sys.planets.map((p) => p.inclDeg).filter((x) => x != null);
    const incl = (inclVals.length ? inclVals.reduce((a, b) => a + b) / inclVals.length : 60) * Math.PI / 180;
    const n = w.clone().multiplyScalar(Math.cos(incl)).addScaledVector(v, Math.sin(incl)).normalize();
    const e1 = u;
    const e2 = new THREE.Vector3().crossVectors(e1, n);
    return new THREE.Matrix4().makeBasis(e1, n, e2);
  }

  build(sys, { compression = 1, sizeScale = 1 } = {}) {
    this.dispose();
    this.system = sys;
    this.compression = compression;
    this.sizeScale = sizeScale;
    this.orient = this._orientation(sys);
    this.span = Math.pow(sys.maxA, compression);

    // stella ospite
    const [r, g, b] = kelvinToRGB(sys.teff);
    const starColor = new THREE.Color(r, g, b);
    this.starRadius = this._starVisualRadius(sys);
    this.starMesh = new THREE.Mesh(sphereGeo, new THREE.MeshBasicMaterial({ color: starColor }));
    this.starMesh.scale.setScalar(this.starRadius);
    this.starMesh.userData = { kind: "star", system: sys };
    this.group.add(this.starMesh);

    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: haloTexture(), color: starColor, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.85,
    }));
    // l'alone è grande rispetto al sistema: la stella "domina" la scena anche
    // quando la sfera è geometricamente piccola per non inghiottire i pianeti interni
    this.haloScale = Math.max(this.starRadius * 7, this.span * 0.09);
    this.halo.scale.setScalar(this.haloScale);
    this.group.add(this.halo);

    this.light = new THREE.PointLight(0xffffff, 2.4, 0, 0);
    this.light.color = starColor.clone().lerp(new THREE.Color(1, 1, 1), 0.5);
    this.group.add(this.light);
    this.ambient = new THREE.AmbientLight(0xffffff, 0.12);
    this.group.add(this.ambient);

    // pianeti + orbite
    for (const p of sys.planets) {
      const [kind, color] = planetLook(p);
      const mat = new THREE.MeshStandardMaterial({
        map: proceduralTexture(kind, color),
        roughness: 0.92,
        metalness: 0,
      });
      const mesh = new THREE.Mesh(sphereGeo, mat);
      mesh.scale.setScalar(this._planetVisualRadius(p));
      mesh.userData = { kind: "planet", planet: p, system: sys };
      this.group.add(mesh);
      this.planetMeshes.push(mesh);
      this.orbitLines.push(this._buildOrbit(p));
    }
    return this.group;
  }

  _starVisualRadius(sys) {
    const real = (sys.st_rad || 1) * R_SUN_AU;
    const innermost = Math.pow(Math.min(...sys.planets.map((p) => p.a * (1 - p.e))), this.compression);
    return Math.min(Math.max(real, this.span * 0.035), innermost * 0.55);
  }

  _planetVisualRadius(p) {
    const real = p.radiusE * R_EARTH_AU;
    const legible = this.span * (0.006 + 0.02 * Math.log10(1 + p.radiusE) / Math.log10(13)) * this.sizeScale;
    return Math.max(real, legible);
  }

  // posizione orbitale reale → compressa radialmente → orientata nel frame scena
  _planetPos(p, daysSinceJ2000, out = new THREE.Vector3()) {
    let pos;
    if (this.system.isSun) {
      const el = solarElements(p.jpl, daysSinceJ2000);
      const q = orbitalPosition(el, 0);
      pos = eclipticToScene(q.x, q.z, q.y);
    } else {
      pos = orbitalPosition({
        a: p.a, e: p.e, periodDays: p.periodDays, M0: p.M0,
      }, daysSinceJ2000);
    }
    out.set(pos.x, pos.y, pos.z);
    const r = out.length();
    if (r > 1e-9 && this.compression < 1) out.multiplyScalar(Math.pow(r, this.compression) / r);
    if (this.orient) out.applyMatrix4(this.orient);
    return out;
  }

  _buildOrbit(p) {
    const N = 160;
    const pts = new Float32Array((N + 1) * 3);
    const v = new THREE.Vector3();
    const step = p.periodDays / N;
    for (let i = 0; i <= N; i++) {
      // campiona un periodo intero partendo da J2000
      this._planetPos(p, i * step, v);
      pts[i * 3] = v.x; pts[i * 3 + 1] = v.y; pts[i * 3 + 2] = v.z;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pts, 3));
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({
      color: p.inHZ ? 0x4fbf86 : 0x3a6f86,
      transparent: true,
      opacity: p.inHZ ? 0.65 : 0.45,
      depthWrite: false,
    }));
    this.group.add(line);
    return line;
  }

  setOrbitsVisible(v) {
    for (const l of this.orbitLines) l.visible = v;
  }

  setScales({ compression, sizeScale }) {
    if (compression === this.compression && sizeScale === this.sizeScale) return;
    const sys = this.system;
    if (sys) this.build(sys, { compression, sizeScale });
  }

  update(daysSinceJ2000, elapsed) {
    if (!this.system) return;
    for (let i = 0; i < this.planetMeshes.length; i++) {
      const mesh = this.planetMeshes[i];
      this._planetPos(this.system.planets[i], daysSinceJ2000, mesh.position);
      mesh.rotation.y = elapsed * 0.15 + i;
    }
    if (this.halo) {
      const pulse = 1 + 0.06 * Math.sin(elapsed * 2.1);
      this.halo.scale.setScalar(this.haloScale * pulse);
    }
  }

  // ancore etichette: stella + pianeti
  labelAnchors(lang) {
    if (!this.system) return [];
    const out = [{
      pos: new THREE.Vector3(0, 0, 0),
      text: this.system.label,
      cls: "amber",
      ref: { kind: "star", system: this.system },
    }];
    for (let i = 0; i < this.planetMeshes.length; i++) {
      const p = this.system.planets[i];
      out.push({
        pos: this.planetMeshes[i].position,
        text: lang === "en" && p.nameEn ? p.nameEn : p.name,
        cls: "",
        ref: { kind: "planet", planet: p, system: this.system, index: i },
      });
    }
    return out;
  }

  planetScenePos(index) {
    return this.planetMeshes[index]?.position;
  }

  dispose() {
    for (const m of this.planetMeshes) m.material.dispose();
    for (const l of this.orbitLines) l.geometry.dispose();
    this.group.clear();
    this.planetMeshes = [];
    this.orbitLines = [];
    this.system = null;
  }
}
