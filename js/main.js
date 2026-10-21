import * as THREE from "three";
import { createStage } from "./scene.js";
import { createOrbit } from "./orbit.js";
import { backpack, items } from "./items/index.js";

// 找到 index.html 里的 #app 盒子,在里面搭舞台
const container = document.getElementById("app");
const { scene, camera, renderer } = createStage(container);

// put the backpack in the middle
const backpackGroup = backpack();
scene.add(backpackGroup);

// let the other objects surround the backpack
const orbit = createOrbit(scene, items);

// clock
const clock = new THREE.Clock();

// 动画循环:每一帧执行一次
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  renderer.render(scene, camera);
  orbit.update(delta);
}
animate();
