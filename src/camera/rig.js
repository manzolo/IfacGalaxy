// Rig camera a stati: orbit (OrbitControls), transizioni animate con zoom
// logaritmico (necessario per passare da UA a parsec senza salti), e modalità
// POV ancorata a un pianeta con sguardo libero.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

export class CameraRig {
  constructor(camera, dom) {
    this.camera = camera;
    this.dom = dom;
    this.controls = new OrbitControls(camera, dom);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.zoomSpeed = 1.2;
    this.controls.minDistance = 1e-3;
    this.controls.maxDistance = 8e8;
    this.mode = "orbit";
    this.transition = null;
    this.pov = null;
    this.baseFov = camera.fov;
    this._bindPovEvents();
  }

  // vola verso un punto della scena fermandosi a `distance`; la distanza è
  // interpolata in scala log così galassia↔sistema resta fluido
  flyTo(target, distance, duration = 1.8) {
    const dir = this.camera.position.clone().sub(this.controls.target);
    const startDist = Math.max(dir.length(), 1e-6);
    dir.normalize();
    if (!isFinite(dir.x)) dir.set(0, 0.35, 1).normalize();
    this.transition = {
      t: 0, duration,
      startT: this.controls.target.clone(),
      endT: target.clone(),
      startDist,
      endDist: distance,
      dir,
    };
    this.controls.enabled = false;
    if (this.mode === "pov") this.exitPov(false);
    this.mode = "orbit";
  }

  // trasla il frame quando cambia l'origine del mondo (floating origin)
  shiftWorld(delta) {
    this.camera.position.add(delta);
    this.controls.target.add(delta);
    if (this.transition) {
      this.transition.startT.add(delta);
      this.transition.endT.add(delta);
    }
  }

  enterPov(getPos, lookAt) {
    const pos = getPos();
    const d = lookAt.clone().sub(pos).normalize();
    this.pov = {
      getPos,
      yaw: Math.atan2(-d.x, -d.z),
      pitch: Math.asin(THREE.MathUtils.clamp(d.y, -1, 1)),
    };
    this.mode = "pov";
    this.transition = null;
    this.controls.enabled = false;
  }

  exitPov(restore = true) {
    this.pov = null;
    this.mode = "orbit";
    if (restore) {
      this.controls.enabled = true;
      this.camera.fov = this.baseFov;
      this.camera.updateProjectionMatrix();
    }
  }

  _bindPovEvents() {
    let dragging = false, lx = 0, ly = 0;
    this.dom.addEventListener("pointerdown", (e) => {
      if (this.mode !== "pov") return;
      dragging = true; lx = e.clientX; ly = e.clientY;
    });
    window.addEventListener("pointermove", (e) => {
      if (!dragging || this.mode !== "pov" || !this.pov) return;
      const s = 0.0022 * (this.camera.fov / this.baseFov);
      this.pov.yaw -= (e.clientX - lx) * s;
      this.pov.pitch += (e.clientY - ly) * s;
      this.pov.pitch = THREE.MathUtils.clamp(this.pov.pitch, -1.5, 1.5);
      lx = e.clientX; ly = e.clientY;
    });
    window.addEventListener("pointerup", () => { dragging = false; });
    this.dom.addEventListener("wheel", (e) => {
      if (this.mode !== "pov") return;
      e.preventDefault();
      this.camera.fov = THREE.MathUtils.clamp(this.camera.fov * (e.deltaY > 0 ? 1.08 : 0.93), 12, 100);
      this.camera.updateProjectionMatrix();
    }, { passive: false });
  }

  // zoom a passo discreto per i pulsanti a schermo (accessibilità: alternativa
  // alla rotellina). In orbita avvicina/allontana dal target rispettando i
  // limiti; in POV stringe/allarga il campo visivo come fa la rotellina lì.
  zoomStep(zoomIn) {
    if (this.transition) return;
    if (this.mode === "pov") {
      this.camera.fov = THREE.MathUtils.clamp(this.camera.fov * (zoomIn ? 0.93 : 1.08), 12, 100);
      this.camera.updateProjectionMatrix();
      return;
    }
    const t = this.controls.target;
    const offset = this.camera.position.clone().sub(t);
    const dist = Math.max(offset.length(), 1e-9);
    const next = THREE.MathUtils.clamp(
      dist * (zoomIn ? 1 / 1.15 : 1.15),
      this.controls.minDistance, this.controls.maxDistance,
    );
    this.camera.position.copy(t).addScaledVector(offset.divideScalar(dist), next);
  }

  // rotazione/inclinazione a passo discreto per il pad direzionale a schermo
  // (accessibilità: alternativa al trascinamento). axis "yaw" gira attorno al
  // bersaglio, "pitch" alza/abbassa il punto di vista; in POV muove lo sguardo.
  orbitStep(axis, dir) {
    if (this.transition) return;
    const step = 0.12; // ~7° per passo
    if (this.mode === "pov" && this.pov) {
      if (axis === "yaw") this.pov.yaw -= dir * step;
      else this.pov.pitch = THREE.MathUtils.clamp(this.pov.pitch + dir * step, -1.5, 1.5);
      return;
    }
    const t = this.controls.target;
    const offset = this.camera.position.clone().sub(t);
    const sph = new THREE.Spherical().setFromVector3(offset);
    if (axis === "yaw") {
      sph.theta += dir * step;
    } else {
      const lo = this.controls.minPolarAngle + 1e-3;
      const hi = this.controls.maxPolarAngle - 1e-3;
      sph.phi = THREE.MathUtils.clamp(sph.phi - dir * step, lo, hi);
    }
    sph.makeSafe();
    offset.setFromSpherical(sph);
    this.camera.position.copy(t).add(offset);
    this.camera.lookAt(t);
  }

  // pan a passo discreto per i pulsanti a schermo: sposta camera e bersaglio
  // lungo gli assi dello schermo, passo proporzionale alla distanza. Non si
  // applica in POV (lì le frecce restano sulla rotazione dello sguardo).
  panStep(axis, dir) {
    if (this.transition || this.mode === "pov") return;
    const step = 0.12 * this.distance;
    const v = (axis === "x" ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0))
      .applyQuaternion(this.camera.quaternion).multiplyScalar(dir * step);
    this.camera.position.add(v);
    this.controls.target.add(v);
  }

  update(dt) {
    if (this.transition) {
      const tr = this.transition;
      tr.t += dt;
      const k = easeInOut(Math.min(tr.t / tr.duration, 1));
      const target = tr.startT.clone().lerp(tr.endT, k);
      const dist = Math.exp(THREE.MathUtils.lerp(Math.log(tr.startDist), Math.log(tr.endDist), k));
      this.controls.target.copy(target);
      this.camera.position.copy(target).addScaledVector(tr.dir, dist);
      this.camera.lookAt(target);
      if (tr.t >= tr.duration) {
        this.transition = null;
        this.controls.enabled = true;
      }
    } else if (this.mode === "pov" && this.pov) {
      this.camera.position.copy(this.pov.getPos());
      this.camera.quaternion.setFromEuler(new THREE.Euler(this.pov.pitch, this.pov.yaw, 0, "YXZ"));
    } else {
      this.controls.update();
    }
  }

  get distance() {
    return this.camera.position.distanceTo(this.controls.target);
  }
}
