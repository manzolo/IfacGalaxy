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

  // items: [{ pos: Vector3 (scena), text, cls }]
  render(items, camera, width, height) {
    let used = 0;
    for (const item of items) {
      if (used >= MAX) break;
      _v.copy(item.pos).project(camera);
      if (_v.z > 1 || _v.z < -1) continue;
      const x = (_v.x * 0.5 + 0.5) * width;
      const y = (-_v.y * 0.5 + 0.5) * height;
      if (x < -40 || x > width + 40 || y < -20 || y > height + 20) continue;
      const div = this.pool[used++];
      div.textContent = item.text;
      div.className = "lbl" + (item.cls ? " " + item.cls : "");
      div.style.display = "block";
      div.style.transform = `translate(-50%,-130%) translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
    }
    for (let i = used; i < MAX; i++) this.pool[i].style.display = "none";
  }
}
