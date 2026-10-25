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

// 背包的摆动:左右各转 50 度,加起来是 100 度,正面在正中间
const SWING_ANGLE = (50 * Math.PI) / 180; // 把"度"换成电脑用的"弧度"
const SWING_SPEED = 0.8; // 摆得多快,数字越大越快
let time = 0; // 自己记录过了多少秒

// 临时测试:按键盘数字键换表情,看看嘴好不好用(以后做好 hover 就可以删掉)
// 每一项是 [心情, 张嘴]。心情 -1 到 1,张嘴 0 到 1
const EXPRESSIONS = {
  1: [-1, 0], // 不开心
  2: [0.8, 0.5], // 咧嘴笑(平时的样子)
  3: [0.7, 0], // 闭嘴微笑
  4: [1, 1], // 张嘴大笑
};
window.addEventListener("keydown", (event) => {
  const expression = EXPRESSIONS[event.key];
  if (expression && backpackGroup.userData.setExpression) {
    backpackGroup.userData.setExpression(expression[0], expression[1]);
  }
});

// 动画循环:每一帧执行一次
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  time += delta;

  // sin 的值在 -1 和 1 之间来回变,乘上 50 度,背包就左右来回摆
  // time 是 0 的时候 sin 是 0,背包正对着你
  backpackGroup.rotation.y = Math.sin(time * SWING_SPEED) * SWING_ANGLE;

  orbit.update(delta); // 让每个物件走一小步

  // 背包的眼睛:看向现在离镜头最近的那个物件
  // z 越大就越靠近镜头,所以找 z 最大的
  let nearest = orbit.groups[0];
  for (const group of orbit.groups) {
    if (group.position.z > nearest.position.z) nearest = group;
  }
  if (backpackGroup.userData.lookAtTarget) {
    backpackGroup.userData.lookAtTarget(nearest.position, delta);
  }
  if (backpackGroup.userData.updateFace) {
    backpackGroup.userData.updateFace(delta); // 让嘴慢慢变成想要的表情
  }

  renderer.render(scene, camera);
}
animate();
