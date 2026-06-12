// Bilingue IT/EN, preferenza persistita come in SistemaSolare.
const DICT = {
  subtitle: { it: "osservatorio esoplanetario", en: "exoplanet observatory" },
  searchPlaceholder: { it: "Cerca stella o pianeta…", en: "Search star or planet…" },
  backGalaxy: { it: "⟲ Galassia", en: "⟲ Galaxy" },
  timeSpeed: { it: "velocità tempo", en: "time speed" },
  epoch: { it: "data", en: "date" },
  now: { it: "oggi", en: "today" },
  sizeScale: { it: "scala dimensioni", en: "size scale" },
  distScale: { it: "compressione orbite", en: "orbit compression" },
  brightness: { it: "luminosità", en: "brightness" },
  orbits: { it: "orbite", en: "orbits" },
  names: { it: "nomi", en: "names" },
  constellations: { it: "costellazioni", en: "constellations" },
  constNames: { it: "nomi costellazioni", en: "constellation names" },
  fullCatalog: { it: "catalogo completo", en: "full catalog" },
  exitPov: { it: "esci dalla vista", en: "exit view" },
  filterMethod: { it: "metodo scoperta", en: "discovery method" },
  filterDist: { it: "distanza max", en: "max distance" },
  allMethods: { it: "tutti", en: "all" },
  hint: {
    it: "trascina per ruotare · rotella per zoom · clic su un corpo per la scheda",
    en: "drag to rotate · scroll to zoom · click a body for its card",
  },
  // schede
  star: { it: "stella", en: "star" },
  planet: { it: "pianeta", en: "planet" },
  system: { it: "sistema", en: "system" },
  distance: { it: "distanza", en: "distance" },
  spectype: { it: "tipo spettrale", en: "spectral type" },
  temperature: { it: "temperatura", en: "temperature" },
  stRadius: { it: "raggio", en: "radius" },
  stMass: { it: "massa", en: "mass" },
  nPlanets: { it: "pianeti noti", en: "known planets" },
  nStars: { it: "stelle nel sistema", en: "stars in system" },
  semiAxis: { it: "semiasse maggiore", en: "semi-major axis" },
  period: { it: "periodo orbitale", en: "orbital period" },
  eccentricity: { it: "eccentricità", en: "eccentricity" },
  plRadius: { it: "raggio", en: "radius" },
  plMass: { it: "massa", en: "mass" },
  eqTemp: { it: "temp. di equilibrio", en: "equilibrium temp." },
  method: { it: "metodo di scoperta", en: "discovery method" },
  year: { it: "anno di scoperta", en: "discovery year" },
  hzBadge: { it: "zona abitabile", en: "habitable zone" },
  estOrbit: { it: "orbita stimata", en: "estimated orbit" },
  estRadius: { it: "raggio stimato", en: "estimated radius" },
  focusBtn: { it: "vai al sistema", en: "go to system" },
  povBtn: { it: "vista da qui", en: "view from here" },
  days: { it: "giorni", en: "days" },
  years: { it: "anni", en: "years" },
  ly: { it: "anni luce", en: "light-years" },
  earthRadii: { it: "R⊕", en: "R⊕" },
  earthMasses: { it: "M⊕", en: "M⊕" },
  povFrom: { it: "Vista da", en: "View from" },
  sunFromHere: { it: "il Sole visto da qui: mag", en: "the Sun seen from here: mag" },
  sunInvisible: { it: "(invisibile a occhio nudo)", en: "(invisible to the naked eye)" },
  sunVisible: { it: "(visibile a occhio nudo)", en: "(visible to the naked eye)" },
  inSystem: { it: "sistema", en: "system" },
  paused: { it: "in pausa", en: "paused" },
  daysPerSec: { it: "g/s", en: "d/s" },
  yearsPerSec: { it: "a/s", en: "y/s" },
  realtime: { it: "reale", en: "real" },
  loadingFull: { it: "carico il catalogo completo…", en: "loading full catalog…" },
  sun: { it: "Sole", en: "Sun" },
  solarSystem: { it: "Sistema Solare", en: "Solar System" },
  methodNames: {
    it: {
      "Transit": "Transito", "Radial Velocity": "Velocità radiale", "Imaging": "Immagine diretta",
      "Microlensing": "Microlente gravitazionale", "Transit Timing Variations": "Variazioni nei transiti",
      "Eclipse Timing Variations": "Variazioni nelle eclissi", "Pulsar Timing": "Timing di pulsar",
      "Pulsation Timing Variations": "Variazioni di pulsazione", "Orbital Brightness Modulation": "Modulazione di luminosità",
      "Astrometry": "Astrometria", "Disk Kinematics": "Cinematica del disco",
    },
    en: {},
  },
};

let lang = localStorage.getItem("ifacgalaxy-lingua") || "it";
const listeners = [];

export function t(key) {
  const e = DICT[key];
  return e ? (e[lang] ?? e.it) : key;
}
export function tMethod(m) {
  if (!m) return "—";
  return DICT.methodNames[lang]?.[m] || m;
}
export function getLang() { return lang; }

export function setLang(l) {
  lang = l;
  localStorage.setItem("ifacgalaxy-lingua", l);
  document.documentElement.lang = l;
  applyStatic();
  for (const fn of listeners) fn(l);
}
export function onLangChange(fn) { listeners.push(fn); }

export function applyStatic() {
  for (const el of document.querySelectorAll("[data-i18n]")) el.textContent = t(el.dataset.i18n);
  for (const el of document.querySelectorAll("[data-i18n-ph]")) el.placeholder = t(el.dataset.i18nPh);
  document.getElementById("lang-it").classList.toggle("active", lang === "it");
  document.getElementById("lang-en").classList.toggle("active", lang === "en");
}
