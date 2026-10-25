import * as THREE from "three";
import { createStage } from "./scene.js";
import { createOrbit } from "./orbit.js";
import { createBackpackMotion } from "./backpack-motion.js";
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

// 背包的动作:看着物件转头、停顿(见 backpack-motion.js)
const backpackMotion = createBackpackMotion(backpackGroup, orbit);

// 临时测试:按键盘数字键换表情,看看嘴好不好用(以后做好 hover 就可以删掉)
// 每一项是 [嘴角, 张嘴, 撅嘴]。嘴角 -1 到 1,张嘴 0 到 1,撅嘴 0 到 1
const EXPRESSIONS = {
  1: [-1, 0, 0], // 不开心
  2: [0.8, 0.5, 0], // 咧嘴笑(平时的样子)
  3: [0.7, 0, 0], // 闭嘴微笑
  4: [1, 1, 0], // 张嘴大笑
  5: [0, 0.5, 1], // 撅嘴,一个 O
};

// 让背包换成某一个表情。key 是 1 到 5
function showExpression(key) {
  const expression = EXPRESSIONS[key];
  if (expression && backpackGroup.userData.setExpression) {
    backpackGroup.userData.setExpression(
      expression[0],
      expression[1],
      expression[2],
    );
  }
}

// 自动轮流换表情,方便你一个一个看效果。不想要的话,把 AUTO_CYCLE 改成 false
const AUTO_CYCLE = true;
const CYCLE_SECONDS = 2; // 每隔几秒换一个
const expressionKeys = Object.keys(EXPRESSIONS); // ["1", "2", "3", "4", "5"]
let expressionIndex = 0; // 现在轮到第几个
let expressionTimer = 0; // 这个表情已经显示了几秒

// 按数字键也可以手动换,换完重新开始数秒
window.addEventListener("keydown", (event) => {
  showExpression(event.key);
  expressionTimer = 0;
});

// 动画循环:每一帧执行一次
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  orbit.update(delta); // 让每个物件走一小步
  backpackMotion.update(delta); // 背包看着物件转头(要放在 orbit.update 后面,因为它要知道物件现在在哪)

  // 背包的眼睛:看向现在离镜头最近的那个物件
  // z 越大就越靠近镜头,所以找 z 最大的
  let nearest = orbit.groups[0];
  for (const group of orbit.groups) {
    if (group.position.z > nearest.position.z) nearest = group;
  }
  if (backpackGroup.userData.lookAtTarget) {
    backpackGroup.userData.lookAtTarget(nearest.position, delta);
  }

  // 每过 CYCLE_SECONDS 秒,就换成下一个表情;到了最后一个,回到第一个
  if (AUTO_CYCLE) {
    expressionTimer += delta;
    if (expressionTimer >= CYCLE_SECONDS) {
      expressionTimer = 0;
      expressionIndex = (expressionIndex + 1) % expressionKeys.length;
      showExpression(expressionKeys[expressionIndex]);
    }
  }

  if (backpackGroup.userData.updateFace) {
    backpackGroup.userData.updateFace(delta); // 让嘴慢慢变成想要的表情
  }

  renderer.render(scene, camera);
}
animate();
