// Schede informative per stelle/sistemi e pianeti.
import { t, tMethod, getLang } from "./i18n.js";
import { LY_PER_PC } from "../physics/coords.js";

const card = () => document.getElementById("infocard");
const body = () => document.getElementById("card-body");

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
function row(label, value) {
  return value == null || value === "" ? "" : `<tr><td>${label}</td><td>${value}</td></tr>`;
}
function fmt(v, digits = 2) {
  if (v == null) return null;
  if (v !== 0 && (Math.abs(v) < 0.01 || Math.abs(v) >= 100000)) return v.toExponential(2);
  return Number(v.toFixed(digits)).toLocaleString(getLang() === "it" ? "it-IT" : "en-US");
}

export function hideCard() {
  card().hidden = true;
}

export function showSystemCard(sys, handlers) {
  const lang = getLang();
  const distLy = sys.distPc * LY_PER_PC;
  const planetButtons = sys.planets.map((p, i) => {
    const name = lang === "en" && p.nameEn ? p.nameEn : p.name;
    return `<li><button data-planet="${i}"><span>${esc(name)}</span><span class="kind">${p.inHZ ? "🌿 " : ""}${p.a ? fmt(p.a) + " UA" : ""}</span></button></li>`;
  }).join("");
  body().innerHTML = `
    <h2>${esc(sys.isSun ? t("sun") : sys.label)}</h2>
    <h3>${t("star")}${sys.spectype ? " · " + esc(sys.spectype) : ""}</h3>
    ${sys.desc ? `<p class="desc">${esc(sys.desc[lang] || sys.desc.it)}</p>` : ""}
    <table>
      ${sys.isSun ? "" : row(t("distance"), `${fmt(distLy, 1)} ${t("ly")} · ${fmt(sys.distPc, 1)} pc`)}
      ${row(t("temperature"), sys.teff ? `${fmt(sys.teff, 0)} K` : null)}
      ${row(t("stRadius"), sys.st_rad ? `${fmt(sys.st_rad)} R☉` : null)}
      ${row(t("stMass"), sys.st_mass ? `${fmt(sys.st_mass)} M☉` : null)}
      ${row(t("nStars"), sys.nStars > 1 ? sys.nStars : null)}
      ${row(t("nPlanets"), sys.planets.length)}
    </table>
    <ul class="planet-list">${planetButtons}</ul>
    <div class="card-actions">
      <button class="chip amber" id="card-focus">${t("focusBtn")}</button>
    </div>`;
  card().hidden = false;
  body().querySelectorAll("[data-planet]").forEach((btn) => {
    btn.addEventListener("click", () => handlers.onPlanet(parseInt(btn.dataset.planet)));
  });
  body().querySelector("#card-focus").addEventListener("click", () => handlers.onFocus());
}

// scheda ridotta per le stelle di sfondo (catalogo HYG, nessun pianeta da visitare)
export function showStarCard(star) {
  const distLy = star.distPc * LY_PER_PC;
  body().innerHTML = `
    <h2>${esc(star.name || `HIP ${star.hip}`)}</h2>
    <h3>${t("star")}${star.constellation ? " · " + esc(star.constellation) : ""}</h3>
    <table>
      ${row(t("distance"), `${fmt(distLy, 1)} ${t("ly")} · ${fmt(star.distPc, 1)} pc`)}
      ${row(t("appMag"), fmt(star.mag, 1))}
      ${row(t("temperature"), star.teff ? `~${fmt(star.teff, 0)} K` : null)}
      ${star.name ? row("HIP", star.hip) : ""}
    </table>
    <p class="desc">${t("noExoplanets")}</p>`;
  card().hidden = false;
}

// confronto dimensioni pianeta vs Terra (SVG inline)
function sizeCompareSVG(radiusE) {
  const maxR = Math.max(radiusE, 1);
  const scale = 36 / maxR;
  const rp = Math.max(radiusE * scale, 2);
  const re = Math.max(1 * scale, 2);
  const w = 260, h = Math.max(rp, re) * 2 + 26;
  const cy = h - 12 - Math.max(rp, re);
  return `<svg class="size-compare" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <circle cx="${70}" cy="${cy}" r="${rp}" fill="rgba(255,179,71,0.25)" stroke="#ffb347"/>
    <circle cx="${190}" cy="${cy}" r="${re}" fill="rgba(111,227,255,0.25)" stroke="#6fe3ff"/>
    <text x="70" y="${h - 2}" fill="#ffb347" font-size="9" text-anchor="middle">${esc("✦")}</text>
    <text x="190" y="${h - 2}" fill="#6fe3ff" font-size="9" text-anchor="middle">${getLang() === "it" ? "Terra" : "Earth"}</text>
  </svg>`;
}

export function showPlanetCard(p, sys, handlers) {
  const lang = getLang();
  const name = lang === "en" && p.nameEn ? p.nameEn : p.name;
  const periodTxt = p.periodDays >= 1000
    ? `${fmt(p.periodDays / 365.25, 1)} ${t("years")}`
    : `${fmt(p.periodDays, 2)} ${t("days")}`;
  const badges = [
    p.inHZ ? `<span class="badge hz">🌿 ${t("hzBadge")}</span>` : "",
    p.estOrbit ? `<span class="badge est">${t("estOrbit")}</span>` : "",
    p.estRadius ? `<span class="badge est">${t("estRadius")}</span>` : "",
  ].join("");
  body().innerHTML = `
    <h2>${esc(name)}</h2>
    <h3>${t("planet")} · ${t("inSystem")} ${esc(sys.isSun ? t("solarSystem") : sys.label)}</h3>
    <div>${badges}</div>
    ${sizeCompareSVG(p.radiusE)}
    <table>
      ${row(t("semiAxis"), p.a ? `${fmt(p.a, 3)} UA` : null)}
      ${row(t("period"), periodTxt)}
      ${row(t("eccentricity"), p.e ? fmt(p.e) : null)}
      ${row(t("plRadius"), p.radiusE ? `${fmt(p.radiusE)} ${t("earthRadii")}` : null)}
      ${row(t("plMass"), p.massE ? `${fmt(p.massE)} ${t("earthMasses")}` : null)}
      ${row(t("eqTemp"), p.teq ? `${fmt(p.teq, 0)} K · ${fmt(p.teq - 273, 0)} °C` : null)}
      ${row(t("method"), p.method ? tMethod(p.method) : null)}
      ${row(t("year"), p.year)}
    </table>
    <div class="card-actions">
      <button class="chip" id="card-back">← ${esc(sys.isSun ? t("sun") : sys.label)}</button>
      <button class="chip amber" id="card-pov">👁 ${t("povBtn")}</button>
    </div>`;
  card().hidden = false;
  body().querySelector("#card-back").addEventListener("click", () => handlers.onSystem());
  body().querySelector("#card-pov").addEventListener("click", () => handlers.onPov());
}
