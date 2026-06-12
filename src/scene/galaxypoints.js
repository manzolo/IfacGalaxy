// I sistemi esoplanetari nella vista galattica: marcatori a rombo,
// colorati per temperatura della stella ospite, con alpha per filtri/focus.
import * as THREE from "three";
import { kelvinToRGB } from "./color.js";

const VSHADER = /* glsl */ `
  attribute vec3 tint;
  attribute float weight;   // 1 = curato (più grande e pulsante)
  attribute float fade;     // 0..1 per filtri e per nascondere il sistema aperto
  uniform float uTime;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vWeight;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float pulse = 1.0 + 0.18 * weight * sin(uTime * 2.0 + position.x);
    gl_PointSize = (4.5 + 4.0 * weight) * pulse * uPixelRatio;
    vColor = tint;
    vAlpha = fade * (0.55 + 0.45 * weight);
    vWeight = weight;
    gl_Position = projectionMatrix * mv;
  }
`;
const FSHADER = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vWeight;
  void main() {
    vec2 uv = abs(gl_PointCoord - 0.5);
    float d = (uv.x + uv.y) * 2.0;          // rombo
    float ring = smoothstep(1.0, 0.55, d);
    float core = smoothstep(0.45, 0.0, d);
    float a = (ring * 0.5 + core) * vAlpha;
    if (a < 0.02) discard;
    vec3 col = mix(vColor, vec3(1.0), core * 0.5);
    gl_FragColor = vec4(col, a);
  }
`;

export class GalaxyPoints {
  constructor() {
    this.systems = [];
    this.geo = new THREE.BufferGeometry();
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VSHADER,
      fragmentShader: FSHADER,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(devicePixelRatio, 2) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
  }

  // (ri)costruisce i buffer dall'elenco sistemi (chiamata anche dopo il full catalog)
  setSystems(systems) {
    this.systems = systems;
    const n = systems.length;
    const pos = new Float32Array(n * 3);
    const tint = new Float32Array(n * 3);
    const weight = new Float32Array(n);
    const fade = new Float32Array(n).fill(1);
    for (let i = 0; i < n; i++) {
      const s = systems[i];
      pos[i * 3] = s.world.x; pos[i * 3 + 1] = s.world.y; pos[i * 3 + 2] = s.world.z;
      const [r, g, b] = kelvinToRGB(s.teff);
      tint[i * 3] = r; tint[i * 3 + 1] = g; tint[i * 3 + 2] = b;
      weight[i] = s.curated ? 1 : 0;
    }
    this.geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.geo.setAttribute("tint", new THREE.BufferAttribute(tint, 3));
    this.geo.setAttribute("weight", new THREE.BufferAttribute(weight, 1));
    this.geo.setAttribute("fade", new THREE.BufferAttribute(fade, 1));
  }

  // applica filtro + sistema nascosto; filterFn(sys) → bool
  applyVisibility(filterFn, hiddenSystem) {
    const fade = this.geo.getAttribute("fade");
    for (let i = 0; i < this.systems.length; i++) {
      const s = this.systems[i];
      let f = filterFn ? (filterFn(s) ? 1 : 0.08) : 1;
      if (s === hiddenSystem) f = 0;
      fade.setX(i, f);
    }
    fade.needsUpdate = true;
  }
}
