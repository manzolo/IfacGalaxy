// Orologio di simulazione: tempo disaccoppiato dal frame-rate,
// velocità in giorni simulati per secondo reale (anche negativa).
import { julianDay, dateFromJulian, J2000 } from "./kepler.js";

export class SimClock {
  constructor() {
    this.jd = julianDay(new Date());
    this.daysPerSecond = 1;
    this.paused = false;
  }
  // dt: secondi reali trascorsi dall'ultimo frame
  tick(dt) {
    if (!this.paused) this.jd += this.daysPerSecond * dt;
  }
  // giorni trascorsi dall'epoca J2000 (input per il solver di Keplero)
  get daysSinceJ2000() {
    return this.jd - J2000;
  }
  get date() {
    return dateFromJulian(this.jd);
  }
  setDate(date) {
    this.jd = julianDay(date);
  }
}
