// Etichette HTML proiettate sulla scena (pool di div riusati, max fisso).
import * as THREE from "three";

const MAX = 60;
const _v = new THREE.Vector3();

export class LabelLayer {
  constructor(container) {
    this.container = container;
    this.pool = [];
    for (let i = 0; i < MAX; i++) {
      const div = document.createElement("div");
      div.className = "lbl";
      div.style.display = "none";
      container.appendChild(div);
      this.pool.push(div);
    }
  }

  // items: [{ pos: Vector3 (scena), text, cls, edge? }]
  // edge: true → se il punto è fuori schermo (anche dietro la camera),
  // l'etichetta resta agganciata al bordo nella direzione del punto.
  render(items, camera, width, height) {
    let used = 0;
    for (const item of items) {
      if (used >= MAX) break;
      _v.copy(item.pos).project(camera);
      const behind = _v.z > 1;
      if (!item.edge && (behind || _v.z < -1)) continue;
      let x = (_v.x * 0.5 + 0.5) * width;
      let y = (-_v.y * 0.5 + 0.5) * height;
      let clamped = false;
      if (item.edge) {
        if (behind) { x = width - x; y = height - y; } // la proiezione dietro la camera è ribaltata
        if (behind || x < 0 || x > width || y < 0 || y > height) {
          const dx = x - width / 2, dy = y - height / 2;
          const s = Math.min(
            (width / 2 - 110) / Math.max(Math.abs(dx), 1e-6),
            (height / 2 - 90) / Math.max(Math.abs(dy), 1e-6),
          );
          x = width / 2 + dx * s;
          y = height / 2 + dy * s;
          clamped = true;
        }
      } else if (x < -40 || x > width + 40 || y < -20 || y > height + 20) continue;
      const div = this.pool[used++];
      div.textContent = item.text;
      div.className = "lbl" + (item.cls ? " " + item.cls : "") + (clamped ? " edge" : "");
      div.style.display = "block";
      div.style.transform = `translate(-50%,-130%) translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
    }
    for (let i = used; i < MAX; i++) this.pool[i].style.display = "none";
  }
}
