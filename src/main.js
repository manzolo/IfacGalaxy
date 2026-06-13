// IfacGalaxy — bootstrap, gestione stato e loop di rendering.
// Mondo continuo: 1 unità scena = 1 UA, floating origin sul sistema selezionato.
import * as THREE from "three";
import { SimClock } from "./physics/time.js";
import { sunMagnitudeFrom, LY_PER_PC, AU_PER_PC, DEG } from "./physics/coords.js";
import { loadCurated, loadFull, loadStars, loadConstellations } from "./data/catalog.js";
import { makeStarMaterial, buildStarfield, buildSunPoint } from "./scene/starfield.js";
import { buildConstellationLines, constellationLabelAnchors } from "./scene/constellations.js";
import { GalaxyPoints } from "./scene/galaxypoints.js";
import { SystemView } from "./scene/systemview.js";
import { CameraRig } from "./camera/rig.js";
import { LabelLayer } from "./ui/labels.js";
import { pickScreen, pickScreenIndex } from "./ui/picking.js";
import { showSystemCard, showPlanetCard, showStarCard, hideCard } from "./ui/infocard.js";
import { bvToKelvin } from "./scene/color.js";
import { Search } from "./ui/search.js";
import { t, getLang, setLang, onLangChange, applyStatic, tMethod } from "./ui/i18n.js";

const GALAXY_DIST = 6.5e6; // ~31 pc: distanza della vista galattica di partenza

// ---------------------------------------------------------------- renderer --
const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({
  canvas, antialias: true, logarithmicDepthBuffer: true, powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const camera = new THREE.PerspectiveCamera(58, 1, 1e-4, 1e10);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x04060d);

const worldGroup = new THREE.Group(); // contenuto a coordinate assolute (UA)
scene.add(worldGroup);

const systemView = new SystemView(); // sistema selezionato, centrato in origine
scene.add(systemView.group);

const rig = new CameraRig(camera, canvas);
const labels = new LabelLayer(document.getElementById("labels"));
const sim = new SimClock();

// ------------------------------------------------------------------- stato --
const settings = {
  sizeScale: 1, compression: 1, brightness: 1,
  orbits: true, names: true, constellations: true, constNames: false,
  filterMethod: "", filterMaxPc: Infinity, fullCatalog: false,
};
let systems = [];
let focused = null;
let followPlanet = null;       // indice pianeta seguito dalla camera
let povState = null;           // { index, mesh }
let origin = { x: 0, y: 0, z: 0 };
let inGalaxy = false;          // camera ritirata nella vista galattica
let starMat, sunPoint, constLines, constAnchors = [];
let hygStars, hygConsts, starPoints; // catalogo HYG di sfondo, per il picking
const galaxy = new GalaxyPoints();
let fullLoading = false;
let fullLoaded = false;

// sistemi attivi secondo il toggle "catalogo completo"
const activeSystems = () => (settings.fullCatalog ? systems : systems.filter((s) => s.curated));

function reorigin(p) {
  const delta = new THREE.Vector3(origin.x - p.x, origin.y - p.y, origin.z - p.z);
  origin = { x: p.x, y: p.y, z: p.z };
  worldGroup.position.set(-p.x, -p.y, -p.z);
  rig.shiftWorld(delta);
}

function currentFilter() {
  const { filterMethod, filterMaxPc } = settings;
  if (!filterMethod && !isFinite(filterMaxPc)) return null;
  return (sys) =>
    (!filterMethod || sys.planets.some((p) => p.method === filterMethod)) &&
    (sys.distPc <= filterMaxPc || sys.isSun);
}

function refreshGalaxyVisibility() {
  galaxy.applyVisibility(currentFilter(), focused);
}

function setContext() {
  const el = document.getElementById("hud-context");
  el.innerHTML = focused
    ? `${t("system")}: <b>${focused.isSun ? t("solarSystem") : focused.label}</b> · ${
        focused.isSun ? "" : `${(focused.distPc * LY_PER_PC).toFixed(0)} ${t("ly")}`}`
    : "";
  // "☉ Sole" è disponibile ogni volta che non sei nel Sistema Solare, vista
  // galattica compresa (lì anche se il focus è ancora il Sole serve un rientro)
  document.getElementById("btn-home").hidden = !inGalaxy && (!focused || focused.isSun);
}

function setURL() {
  const url = focused ? `?focus=${focused.slug}` : location.pathname;
  history.replaceState(null, "", url);
}

// ------------------------------------------------------------------- focus --
function focusSystem(sys, { fly = true, card = true } = {}) {
  exitPov(false);
  followPlanet = null;
  if (focused !== sys) {
    reorigin(sys.world);
    systemView.build(sys, settings);
    systemView.setOrbitsVisible(settings.orbits);
    focused = sys;
  }
  inGalaxy = false;
  sunPoint.visible = !sys.isSun;
  refreshGalaxyVisibility();
  if (fly) rig.flyTo(new THREE.Vector3(0, 0, 0), Math.max(systemView.span * 3.4, 0.05));
  if (card) showSystemCard(sys, cardHandlers(sys));
  setContext();
  setURL();
}

function focusPlanet(index, { fly = true } = {}) {
  if (!focused) return;
  exitPov(false);
  followPlanet = index;
  const mesh = systemView.planetMeshes[index];
  if (fly && mesh) rig.flyTo(mesh.position.clone(), mesh.scale.x * 9);
  showPlanetCard(focused.planets[index], focused, planetHandlers(index));
}

function backToGalaxy() {
  exitPov(false);
  followPlanet = null;
  inGalaxy = true;
  hideCard();
  setContext();
  rig.flyTo(new THREE.Vector3(0, 0, 0), GALAXY_DIST);
}

// vola su un sistema a caso (escluso il Sole e quello attuale) per esplorare
function discoverRandom() {
  const pool = activeSystems().filter((s) => !s.isSun && s !== focused);
  if (!pool.length) return;
  focusSystem(pool[(Math.random() * pool.length) | 0]);
}

function cardHandlers(sys) {
  return {
    onFocus: () => focusSystem(sys),
    onPlanet: (i) => {
      if (focused !== sys) focusSystem(sys, { card: false });
      focusPlanet(i);
    },
  };
}
function planetHandlers(index) {
  return {
    onSystem: () => showSystemCard(focused, cardHandlers(focused)),
    onPov: () => enterPov(index),
  };
}

// --------------------------------------------------------- vista da pianeta --
function enterPov(index) {
  if (!focused) return;
  const mesh = systemView.planetMeshes[index];
  if (!mesh) return;
  exitPov(false);
  mesh.visible = false;
  povState = { index, mesh };
  const offset = mesh.scale.x * 1.4;
  rig.enterPov(
    () => systemView.planetScenePos(index).clone().add(new THREE.Vector3(0, offset, 0)),
    new THREE.Vector3(0, 0, 0),
  );
  hideCard();
  const p = focused.planets[index];
  const name = getLang() === "en" && p.nameEn ? p.nameEn : p.name;
  let caption = `${t("povFrom")} ${name}`;
  if (!focused.isSun) {
    const mag = sunMagnitudeFrom(focused.distPc);
    caption += ` — ${t("sunFromHere")} ${mag.toFixed(1)} ${mag > 6 ? t("sunInvisible") : t("sunVisible")}`;
  }
  document.getElementById("pov-caption").textContent = caption;
  document.getElementById("pov-exit").hidden = false;
}

function exitPov(flyBack = true) {
  if (!povState) return;
  povState.mesh.visible = true;
  const idx = povState.index;
  povState = null;
  document.getElementById("pov-exit").hidden = true;
  rig.exitPov();
  if (flyBack && focused) {
    const mesh = systemView.planetMeshes[idx];
    rig.controls.target.copy(mesh.position);
    rig.flyTo(new THREE.Vector3(0, 0, 0), Math.max(systemView.span * 3.4, 0.05));
  }
}

// ---------------------------------------------------------------- picking --
// costellazione di appartenenza: confronto RA/Dec con i vertici delle linee
let constNameById = null;
function constellationOf(ra, dec) {
  if (!hygConsts) return null;
  constNameById ??= new Map(hygConsts.labels.map((l) => [l.id, l.name]));
  const cosd = Math.cos(dec * DEG);
  for (const c of hygConsts.constellations) {
    for (const line of c.lines) {
      for (const v of line) {
        let dra = Math.abs(v[0] - ra);
        if (dra > 180) dra = 360 - dra;
        if (dra * cosd < 0.1 && Math.abs(v[1] - dec) < 0.1) return constNameById.get(c.id) || c.id;
      }
    }
  }
  return null;
}

function hygStarInfo(i) {
  return {
    name: hygStars.names?.[i] || null,
    hip: hygStars.hip[i],
    mag: hygStars.mag[i],
    distPc: hygStars.dist[i],
    teff: hygStars.ci[i] != null ? bvToKelvin(hygStars.ci[i]) : null,
    constellation: constellationOf(hygStars.ra[i], hygStars.dec[i]),
  };
}

function setupPicking() {
  let downX = 0, downY = 0, moved = false;
  canvas.addEventListener("pointerdown", (e) => { downX = e.clientX; downY = e.clientY; moved = false; });
  canvas.addEventListener("pointermove", (e) => {
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) moved = true;
  });
  canvas.addEventListener("pointerup", (e) => {
    if (moved || rig.mode === "pov") return;
    const w = innerWidth, h = innerHeight;
    const candidates = [];
    if (focused && rig.distance < systemView.span * 400) {
      candidates.push({ pos: new THREE.Vector3(0, 0, 0), ref: { kind: "star", system: focused }, px: 10 });
      systemView.planetMeshes.forEach((m, i) => {
        candidates.push({ pos: m.position, ref: { kind: "planet", system: focused, index: i }, px: 8 });
      });
    }
    const wp = worldGroup.position;
    for (const sys of galaxy.systems) {
      if (sys === focused) continue;
      candidates.push({
        pos: new THREE.Vector3(sys.world.x + wp.x, sys.world.y + wp.y, sys.world.z + wp.z),
        ref: { kind: "system", system: sys },
        px: sys.curated ? 6 : 3,
      });
    }
    const hit = pickScreen(candidates, camera, e.clientX, e.clientY, w, h);
    if (hit) {
      const r = hit.ref;
      if (r.kind === "system") focusSystem(r.system);
      else if (r.kind === "star") showSystemCard(r.system, cardHandlers(r.system));
      else focusPlanet(r.index);
      return;
    }
    // priorità bassa: stelle di sfondo HYG solo se nessun sistema/pianeta colpito
    const si = pickScreenIndex(
      starPoints.geometry.attributes.position.array, wp, camera, e.clientX, e.clientY, w, h, 9,
    );
    if (si >= 0) showStarCard(hygStarInfo(si));
  });
}

// --------------------------------------------------------------------- UI --
function fmtSpeed(dps) {
  if (dps >= 365.25) return `${(dps / 365.25).toFixed(dps < 3650 ? 1 : 0)} ${t("yearsPerSec")}`;
  if (dps >= 1) return `${dps.toFixed(dps < 10 ? 1 : 0)} ${t("daysPerSec")}`;
  return `${dps.toFixed(2)} ${t("daysPerSec")}`;
}

function populateMethodFilter() {
  const sel = document.getElementById("f-method");
  const methods = new Set();
  for (const s of activeSystems()) for (const p of s.planets) if (p.method) methods.add(p.method);
  const cur = sel.value;
  sel.innerHTML = `<option value="">${t("allMethods")}</option>` +
    [...methods].sort().map((m) => `<option value="${m}">${tMethod(m)}</option>`).join("");
  sel.value = cur;
}

async function loadFullCatalog() {
  if (fullLoaded || fullLoading) return;
  fullLoading = true;
  const hint = document.getElementById("hint");
  hint.textContent = t("loadingFull");
  hint.classList.remove("fade");
  try {
    const extra = await loadFull(systems);
    systems = systems.concat(extra);
    fullLoaded = true;
  } finally {
    fullLoading = false;
    hint.classList.add("fade");
  }
}

// attiva/disattiva il catalogo completo e riallinea galassia, ricerca e filtri
async function setFullCatalog(on) {
  settings.fullCatalog = on;
  if (on) await loadFullCatalog();
  const active = activeSystems();
  galaxy.setSystems(active);
  refreshGalaxyVisibility();
  search.setSystems(active);
  populateMethodFilter();
}

let search;
function setupUI() {
  const $ = (id) => document.getElementById(id);

  search = new Search((hit) => {
    const sys = activeSystems()[hit.si];
    if (hit.kind === "planet") {
      focusSystem(sys, { card: false });
      focusPlanet(hit.pi);
    } else focusSystem(sys);
  });
  search.setSystems(activeSystems());

  $("btn-galaxy").addEventListener("click", backToGalaxy);
  $("btn-discover").addEventListener("click", discoverRandom);

  // zoom a schermo: tap singolo (anche da tastiera) un passo, tenuto premuto
  // ripete in continuo — pensato per chi fatica con la rotellina del mouse
  const holdZoom = (btn, zoomIn) => {
    let delay = null, rep = null;
    const stop = () => { clearTimeout(delay); clearInterval(rep); delay = rep = null; };
    btn.addEventListener("click", () => rig.zoomStep(zoomIn));
    btn.addEventListener("pointerdown", () => {
      delay = setTimeout(() => { rep = setInterval(() => rig.zoomStep(zoomIn), 90); }, 300);
    });
    for (const ev of ["pointerup", "pointerleave", "pointercancel"]) btn.addEventListener(ev, stop);
  };
  holdZoom($("zoom-in"), true);
  holdZoom($("zoom-out"), false);
  $("btn-home").addEventListener("click", () => focusSystem(systems[0], { card: false }));
  const sources = $("sources-dialog");
  $("open-sources").addEventListener("click", () => sources.showModal());
  $("close-sources").addEventListener("click", () => sources.close());
  sources.addEventListener("click", (e) => {
    if (e.target === sources) sources.close();
  });
  $("card-close").addEventListener("click", hideCard);
  $("btn-pov-exit").addEventListener("click", () => exitPov(true));
  $("lang-it").addEventListener("click", () => setLang("it"));
  $("lang-en").addEventListener("click", () => setLang("en"));
  $("dash-toggle").addEventListener("click", () => {
    const collapsed = $("dashboard").classList.toggle("collapsed");
    $("dash-toggle").textContent = collapsed ? "⚙ ▴" : "▾";
  });

  // tempo
  const speedSlider = $("time-speed"), speedOut = $("time-speed-out");
  const applySpeed = () => {
    sim.daysPerSecond = Math.pow(10, parseFloat(speedSlider.value));
    speedOut.textContent = fmtSpeed(sim.daysPerSecond);
  };
  speedSlider.addEventListener("input", applySpeed);
  applySpeed();
  $("btn-pause").addEventListener("click", () => {
    sim.paused = !sim.paused;
    $("btn-pause").textContent = sim.paused ? "▶" : "⏸";
  });
  const epoch = $("epoch");
  epoch.value = new Date().toISOString().slice(0, 10);
  epoch.addEventListener("change", () => {
    if (epoch.value) sim.setDate(new Date(epoch.value + "T12:00:00Z"));
  });
  $("btn-now").addEventListener("click", () => {
    sim.setDate(new Date());
    epoch.value = new Date().toISOString().slice(0, 10);
  });

  // scale e luminosità
  $("size-scale").addEventListener("input", (e) => {
    settings.sizeScale = parseFloat(e.target.value);
    systemView.setScales({ compression: settings.compression, sizeScale: settings.sizeScale });
    systemView.setOrbitsVisible(settings.orbits);
  });
  $("dist-scale").addEventListener("input", (e) => {
    settings.compression = parseFloat(e.target.value);
    systemView.setScales({ compression: settings.compression, sizeScale: settings.sizeScale });
    systemView.setOrbitsVisible(settings.orbits);
  });
  $("brightness").addEventListener("input", (e) => {
    settings.brightness = parseFloat(e.target.value);
  });

  // toggle
  $("tg-orbits").addEventListener("change", (e) => {
    settings.orbits = e.target.checked;
    systemView.setOrbitsVisible(settings.orbits);
  });
  $("tg-names").addEventListener("change", (e) => { settings.names = e.target.checked; });
  $("tg-constellations").addEventListener("change", (e) => {
    settings.constellations = e.target.checked;
    constLines.visible = settings.constellations;
  });
  $("tg-constnames").addEventListener("change", (e) => { settings.constNames = e.target.checked; });
  $("tg-fullcatalog").addEventListener("change", (e) => { setFullCatalog(e.target.checked); });

  // filtri
  $("f-method").addEventListener("change", (e) => {
    settings.filterMethod = e.target.value;
    refreshGalaxyVisibility();
  });
  const fd = $("f-dist"), fdo = $("f-dist-out");
  fd.addEventListener("input", () => {
    const v = parseFloat(fd.value);
    settings.filterMaxPc = v >= 3.6 ? Infinity : Math.pow(10, v);
    fdo.textContent = isFinite(settings.filterMaxPc)
      ? `${Math.round(settings.filterMaxPc * LY_PER_PC)} ${t("ly")}` : "∞";
    refreshGalaxyVisibility();
  });

  onLangChange(() => {
    hideCard();
    search.setSystems(activeSystems());
    populateMethodFilter();
    setContext();
    applySpeed();
  });
  applyStatic();

  // dissolvenza dell'hint al primo input
  canvas.addEventListener("pointerdown", () => {
    setTimeout(() => document.getElementById("hint").classList.add("fade"), 2500);
  }, { once: true });
}

// ------------------------------------------------------------------- loop --
const _tmp = new THREE.Vector3();
let lastFrame = performance.now() / 1000;
let elapsedTime = 0;

function collectLabels() {
  const items = [];
  const camDist = rig.distance;
  const wp = worldGroup.position;
  // casa è sempre indicata: il marker del Sole sostituisce la sua etichetta ambra
  const sunMarker = focused && !focused.isSun;
  if (sunMarker) {
    items.push({
      pos: new THREE.Vector3(wp.x, wp.y, wp.z),
      text: rig.mode === "pov"
        ? `${t("sun")} · mag ${sunMagnitudeFrom(focused.distPc).toFixed(1)}`
        : `${t("sun")} · ${(focused.distPc * LY_PER_PC).toFixed(0)} ${t("ly")}`,
      cls: "sun-marker",
      edge: true,
    });
  }
  if (settings.names && focused && (camDist < systemView.span * 300 || rig.mode === "pov")) {
    items.push(...systemView.labelAnchors(getLang()));
  }
  if (settings.names && camDist > 5e4) {
    for (const sys of galaxy.systems) {
      if (!sys.curated || sys === focused || (sys.isSun && sunMarker)) continue;
      items.push({
        pos: new THREE.Vector3(sys.world.x + wp.x, sys.world.y + wp.y, sys.world.z + wp.z),
        text: sys.isSun ? t("sun") : sys.label,
        cls: "amber",
      });
      if (items.length > 55) break;
    }
  }
  if (settings.constNames) {
    for (const a of constAnchors) {
      items.push({ pos: _tmp.copy(a.pos).add(wp).clone(), text: a.name, cls: "const" });
    }
  }
  return items;
}

function animate() {
  const now = performance.now() / 1000;
  const dt = Math.min(now - lastFrame, 0.1);
  lastFrame = now;
  elapsedTime += dt;
  const elapsed = elapsedTime;
  sim.tick(dt);

  starMat.uniforms.uTime.value = elapsed;
  starMat.uniforms.uBrightness.value = settings.brightness;
  galaxy.mat.uniforms.uTime.value = elapsed;

  // le costellazioni sono un disegno "terrestre": svaniscono allontanandosi da casa
  if (constLines.visible) {
    const camFromSunPc = camera.position.clone().sub(worldGroup.position).length() / AU_PER_PC;
    constLines.material.opacity = 0.34 * THREE.MathUtils.clamp(1 - (camFromSunPc - 15) / 85, 0.12, 1);
  }

  systemView.update(sim.daysSinceJ2000, elapsed);

  // la camera segue il pianeta selezionato
  if (followPlanet != null && rig.mode === "orbit" && !rig.transition) {
    const p = systemView.planetScenePos(followPlanet);
    if (p) {
      _tmp.copy(p).sub(rig.controls.target);
      rig.controls.target.copy(p);
      camera.position.add(_tmp);
    }
  }

  rig.update(dt);
  labels.render(collectLabels(), camera, innerWidth, innerHeight);

  const d = sim.date;
  document.getElementById("sim-date").textContent =
    d.toISOString().slice(0, 10) + (sim.paused ? ` · ${t("paused")}` : "");

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);

// ------------------------------------------------------------------- avvio --
async function start() {
  document.documentElement.lang = getLang();
  const [curated, stars, consts] = await Promise.all([
    loadCurated(), loadStars(), loadConstellations(),
  ]);
  systems = curated;

  hygStars = stars;
  hygConsts = consts;
  starMat = makeStarMaterial();
  starPoints = buildStarfield(stars, starMat);
  worldGroup.add(starPoints);
  sunPoint = buildSunPoint(starMat);
  worldGroup.add(sunPoint);
  constLines = buildConstellationLines(consts);
  worldGroup.add(constLines);
  constAnchors = constellationLabelAnchors(consts);
  galaxy.setSystems(systems);
  worldGroup.add(galaxy.points);

  setupUI();
  setupPicking();
  populateMethodFilter();
  resize();

  // posizione iniziale: il Sistema Solare visto da sopra le orbite
  camera.position.set(18, 26, 64);
  rig.controls.target.set(0, 0, 0);

  // deep-link ?focus=<slug>
  const slug = new URLSearchParams(location.search).get("focus");
  let target = systems[0];
  if (slug) {
    let hit = systems.find((s) => s.slug === slug);
    if (!hit) {
      document.getElementById("tg-fullcatalog").checked = true;
      await setFullCatalog(true);
      hit = systems.find((s) => s.slug === slug);
    }
    if (hit) target = hit;
  }
  focusSystem(target, { fly: target !== systems[0], card: false });
  if (target === systems[0]) {
    // niente volo: si parte già dentro il Sistema Solare
    setContext();
  }

  animate();

  // hook di debug/test (non documentato nella UI)
  window.__ifac = {
    get systems() { return systems; },
    get focused() { return focused; },
    galaxy,
    focusSystem, focusPlanet, enterPov, exitPov, backToGalaxy, discoverRandom, rig, sim,
  };
}

start();
