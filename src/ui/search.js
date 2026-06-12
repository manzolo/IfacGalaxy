// Ricerca globale su stelle ospiti e pianeti.
import { t, getLang } from "./i18n.js";

export class Search {
  constructor(onPick) {
    this.onPick = onPick;
    this.entries = [];
    this.input = document.getElementById("search");
    this.results = document.getElementById("search-results");
    this.input.addEventListener("input", () => this._update());
    this.input.addEventListener("focus", () => this._update());
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#searchbox")) this.results.hidden = true;
    });
  }

  setSystems(systems) {
    this.entries = [];
    systems.forEach((sys, si) => {
      this.entries.push({ label: sys.isSun ? t("sun") : sys.label, lower: sys.label.toLowerCase(), kind: "star", si });
      sys.planets.forEach((p, pi) => {
        const name = getLang() === "en" && p.nameEn ? p.nameEn : p.name;
        this.entries.push({ label: name, lower: (name + " " + p.name).toLowerCase(), kind: "planet", si, pi });
      });
    });
  }

  _update() {
    const q = this.input.value.trim().toLowerCase();
    if (q.length < 2) { this.results.hidden = true; return; }
    const hits = [];
    for (const e of this.entries) {
      if (e.lower.includes(q)) {
        hits.push(e);
        if (hits.length >= 14) break;
      }
    }
    if (!hits.length) { this.results.hidden = true; return; }
    this.results.innerHTML = hits.map((h, i) =>
      `<button data-i="${i}"><span>${h.label}</span><span class="kind">${t(h.kind === "star" ? "star" : "planet")}</span></button>`
    ).join("");
    this.results.hidden = false;
    this.results.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const h = hits[parseInt(btn.dataset.i)];
        this.results.hidden = true;
        this.input.value = "";
        this.onPick(h);
      });
    });
  }
}
