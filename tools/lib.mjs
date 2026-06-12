import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const CACHE = join(ROOT, "tools", "cache");
export const OUT = join(ROOT, "public", "data");

export async function fetchCached(url, cacheName) {
  mkdirSync(CACHE, { recursive: true });
  const path = join(CACHE, cacheName);
  if (existsSync(path)) {
    console.log(`  cache hit: ${cacheName}`);
    return readFileSync(path, "utf8");
  }
  console.log(`  scarico: ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} per ${url}`);
  const text = await res.text();
  writeFileSync(path, text);
  return text;
}

export function writeOutput(name, obj) {
  mkdirSync(OUT, { recursive: true });
  const path = join(OUT, name);
  const json = JSON.stringify(obj);
  writeFileSync(path, json);
  console.log(`  scritto ${name} (${(json.length / 1024).toFixed(0)} KB)`);
}

// arrotonda a n cifre significative (compattezza JSON senza perdere precisione relativa)
export function sig(v, n = 5) {
  if (v == null || !isFinite(v)) return null;
  if (v === 0) return 0;
  return Number(v.toPrecision(n));
}

// parser CSV minimale con supporto campi tra virgolette
export function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}
