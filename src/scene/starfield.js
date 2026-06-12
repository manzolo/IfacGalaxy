// Cielo stellato HYG: THREE.Points con shader che ricalcola la magnitudine
// apparente dalla posizione della camera — spostandosi tra i sistemi le stelle
// cambiano luminosità e posizione in modo fisicamente corretto.
import * as THREE from "three";
import { raDecToVec3, AU_PER_PC } from "../physics/coords.js";
import { kelvinToRGB, bvToKelvin } from "./color.js";

const VSHADER = /* glsl */ `
  attribute float absmag;
  attribute vec3 tint;
  attribute float seed;
  uniform float uBrightness;
  uniform float uTime;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float distPc = max(length(mv.xyz) / 206264.806, 1e-6);
    // magnitudine apparente dalla camera; log10(x) = ln(x)/ln(10)
    float m = absmag + 2.171472 * log(distPc / 10.0);
    float twinkle = 1.0 + 0.12 * sin(uTime * 2.7 + seed * 91.7);
    float lum = pow(10.0, -0.25 * m) * uBrightness * twinkle * 2.4;
    gl_PointSize = clamp(2.6 * sqrt(lum) * uPixelRatio + 1.0, 1.2, 15.0 * uPixelRatio);
    vAlpha = clamp(lum * 1.6, 0.12, 1.0);
    vColor = tint;
    gl_Position = projectionMatrix * mv;
  }
`;
const FSHADER = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv) * 2.0;
    float a = smoothstep(1.0, 0.25, d) * vAlpha;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor, a);
  }
`;

export function makeStarMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: VSHADER,
    fragmentShader: FSHADER,
    uniforms: {
      uBrightness: { value: 1 },
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(devicePixelRatio, 2) },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

export function buildStarfield(stars, material) {
  const n = stars.count;
  const pos = new Float32Array(n * 3);
  const absmag = new Float32Array(n);
  const tint = new Float32Array(n * 3);
  const seed = new Float32Array(n);
  const v = {};
  for (let i = 0; i < n; i++) {
    raDecToVec3(stars.ra[i], stars.dec[i], stars.dist[i] * AU_PER_PC, v);
    pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;
    absmag[i] = stars.mag[i] - 5 * Math.log10(Math.max(stars.dist[i], 0.1) / 10);
    const [r, g, b] = kelvinToRGB(bvToKelvin(stars.ci[i]));
    // desatura leggermente verso il bianco, come appare a occhio
    tint[i * 3] = 0.55 + 0.45 * r; tint[i * 3 + 1] = 0.55 + 0.45 * g; tint[i * 3 + 2] = 0.55 + 0.45 * b;
    seed[i] = (i % 997) / 997;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("absmag", new THREE.BufferAttribute(absmag, 1));
  geo.setAttribute("tint", new THREE.BufferAttribute(tint, 3));
  geo.setAttribute("seed", new THREE.BufferAttribute(seed, 1));
  const points = new THREE.Points(geo, material);
  points.frustumCulled = false;
  return points;
}

// il Sole come stella del cielo (visibile quando si è altrove)
export function buildSunPoint(material) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));
  geo.setAttribute("absmag", new THREE.BufferAttribute(new Float32Array([4.83]), 1));
  geo.setAttribute("tint", new THREE.BufferAttribute(new Float32Array([1, 0.95, 0.85]), 3));
  geo.setAttribute("seed", new THREE.BufferAttribute(new Float32Array([0.5]), 1));
  const p = new THREE.Points(geo, material);
  p.frustumCulled = false;
  return p;
}
