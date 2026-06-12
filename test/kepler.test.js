import { describe, it, expect } from "vitest";
import { solveKepler, perifocalPosition, orbitalPosition, julianDay, J2000 } from "../src/physics/kepler.js";
import { raDecToVec3, vec3ToRaDec, eclipticToScene, sunMagnitudeFrom } from "../src/physics/coords.js";
import { SOLAR_SYSTEM, solarElements } from "../src/data/solarsystem.js";

describe("solveKepler", () => {
  it("orbita circolare: E = M", () => {
    expect(solveKepler(1.234, 0)).toBeCloseTo(1.234, 10);
  });
  it("soddisfa M = E - e·sin(E) per molte combinazioni", () => {
    for (const e of [0.1, 0.5, 0.9, 0.99]) {
      for (let M = 0.1; M < 6.2; M += 0.37) {
        const E = solveKepler(M, e);
        expect(E - e * Math.sin(E)).toBeCloseTo(M % (2 * Math.PI), 9);
      }
    }
  });
  it("caso noto: M=27°, e=0.5 → E≈48.43°", () => {
    // esempio classico dei testi di meccanica celeste
    const E = solveKepler((27 * Math.PI) / 180, 0.5);
    expect((E * 180) / Math.PI).toBeCloseTo(48.43, 1);
  });
});

describe("perifocalPosition", () => {
  it("al periastro (M=0): x = a(1-e), y = 0", () => {
    const p = perifocalPosition(2, 0.3, 0);
    expect(p.x).toBeCloseTo(2 * 0.7, 10);
    expect(p.y).toBeCloseTo(0, 10);
  });
  it("all'afastro (M=π): x = -a(1+e)", () => {
    const p = perifocalPosition(2, 0.3, Math.PI);
    expect(p.x).toBeCloseTo(-2 * 1.3, 10);
    expect(p.y).toBeCloseTo(0, 8);
  });
});

describe("coordinate equatoriali → scena", () => {
  it("polo nord celeste → +Y", () => {
    const v = raDecToVec3(0, 90, 10);
    expect(v.x).toBeCloseTo(0, 9);
    expect(v.y).toBeCloseTo(10, 9);
    expect(v.z).toBeCloseTo(0, 9);
  });
  it("punto vernale (RA 0, Dec 0) → +X", () => {
    const v = raDecToVec3(0, 0, 5);
    expect(v.x).toBeCloseTo(5, 9);
  });
  it("round-trip con Sirio (RA 101.287°, Dec -16.716°, 2.64 pc)", () => {
    const v = raDecToVec3(101.287, -16.716, 2.64);
    const back = vec3ToRaDec(v.x, v.y, v.z);
    expect(back.ra).toBeCloseTo(101.287, 5);
    expect(back.dec).toBeCloseTo(-16.716, 5);
    expect(back.dist).toBeCloseTo(2.64, 8);
  });
});

describe("Sistema Solare vs effemeridi", () => {
  it("la Terra al solstizio di dicembre è a RA eliocentrica ~90° (vista dal Sole verso i Gemelli)", () => {
    // 21 dic 2025 12:00 UTC — il Sole visto dalla Terra è a RA ~270° (Sagittario),
    // quindi la Terra vista dal Sole è a RA ~90°.
    const jd = julianDay(new Date(Date.UTC(2025, 11, 21, 12)));
    const earth = SOLAR_SYSTEM.planets[2];
    const el = solarElements(earth, jd - J2000);
    const p = orbitalPosition(el, 0);
    // posizione eclittica → scena equatoriale (orbitalPosition usa XZ come piano)
    const v = eclipticToScene(p.x, p.z, p.y);
    const { ra } = vec3ToRaDec(v.x, v.y, v.z);
    expect(Math.abs(ra - 90)).toBeLessThan(2);
  });
  it("raggio orbitale della Terra ~1 UA tutto l'anno", () => {
    const earth = SOLAR_SYSTEM.planets[2];
    for (let d = 0; d < 365; d += 30) {
      const p = orbitalPosition(solarElements(earth, d), 0);
      const r = Math.hypot(p.x, p.y, p.z);
      expect(r).toBeGreaterThan(0.98);
      expect(r).toBeLessThan(1.02);
    }
  });
  it("periodo di Giove ~4333 giorni", () => {
    const jup = SOLAR_SYSTEM.planets[4];
    expect(solarElements(jup, 0).periodDays).toBeCloseTo(4332.6, 0);
  });
});

describe("magnitudine del Sole da lontano", () => {
  it("da 10 pc il Sole ha mag = M assoluta = 4.83", () => {
    expect(sunMagnitudeFrom(10)).toBeCloseTo(4.83, 5);
  });
  it("da TRAPPIST-1 (~12.5 pc) il Sole è ~mag 5.3 (appena visibile)", () => {
    expect(sunMagnitudeFrom(12.47)).toBeGreaterThan(5);
    expect(sunMagnitudeFrom(12.47)).toBeLessThan(5.6);
  });
});
