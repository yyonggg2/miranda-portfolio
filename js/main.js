import * as THREE from "three";
import { createStage } from "./scene.js";

// 找到 index.html 里的 #app 盒子,在里面搭舞台
const container = document.getElementById("app");
const { scene, camera, renderer } = createStage(container);

// 临时测试:一个旋转的方块,确认舞台正常,之后会删掉
const testBox = new THREE.Mesh(
  new THREE.BoxGeometry(2, 2, 2), // 形状:边长 2 的方块
  new THREE.MeshStandardMaterial({ color: 0x9aa5b1, flatShading: true }), // 材质:灰色,有切面感
);
scene.add(testBox);

// 动画循环:每一帧执行一次
function animate() {
  requestAnimationFrame(animate);
  testBox.rotation.y += 0.01; // 每帧绕 y 轴转一点点
  renderer.render(scene, camera);
}
animate();
