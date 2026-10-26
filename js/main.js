import * as THREE from "three";
import { createStage } from "./scene.js";
import { createOrbit } from "./orbit.js";
import { createBackpackMotion } from "./backpack-motion.js";
import { createHover } from "./hover.js";
import { createTheme } from "./theme.js";
import { createIntro } from "./intro.js";
import { createGaze } from "./gaze.js";
import { backpack, items } from "./items/index.js";

// 找到 index.html 里的 #app 盒子,在里面搭舞台
const container = document.getElementById("app");
const { scene, camera, renderer } = createStage(container);

// 明暗模式:右上角的月亮 / 太阳按钮(见 theme.js)
const theme = createTheme(scene, document.getElementById("theme-toggle"));

// put the backpack in the middle
const backpackGroup = backpack();
scene.add(backpackGroup);

// let the other objects surround the backpack
const orbit = createOrbit(scene, items);

// clock
const clock = new THREE.Clock();

// 悬停:鼠标放上去时轨道暂停,物件放大、转圈,下面出现一行字(见 hover.js)
const hover = createHover({
  camera,
  canvas: renderer.domElement,
  orbit,
  label: document.getElementById("label"),
});

// 眼睛看哪里(不是死盯着,会瞟、会抖动)。开场和平时都用它(见 gaze.js)
const gaze = createGaze();
const glances = []; // 平时可以瞟一眼的地方,每一帧重新排
const lookUp = new THREE.Vector3(0, 4.5, 4); // 背包上方的一个点,瞟一眼上面,像在想事情

// 开场:背包蹦出来、眨眼、说话,等你双击(见 intro.js)
const intro = createIntro({
  backpackGroup,
  orbit,
  camera,
  gaze,
  scene,
  canvas: renderer.domElement,
  onRestart: () => {
    hover.reset(); // 重播的时候,悬停和选中也回到开始的样子
    wasDone = false;
  },
});
let wasDone = false; // 上一帧开场有没有结束,用来发现"刚结束"

// 左下角的重播按钮
document.getElementById("replay").addEventListener("click", () => intro.restart());

// 背包的动作:看着物件转头、停顿(见 backpack-motion.js)
const backpackMotion = createBackpackMotion(backpackGroup, orbit);

// 临时测试:按键盘数字键换表情,看看嘴好不好用(以后做好 hover 就可以删掉)
// 每一项是 [嘴角, 张嘴, 撅嘴]。嘴角 -1 到 1,张嘴 0 到 1,撅嘴 0 到 1
const EXPRESSIONS = {
  2: [0.8, 0.5, 0], // 咧嘴笑(平时的样子)
  3: [0.7, 0, 0], // 闭嘴微笑
  4: [1, 1, 0], // 张嘴大笑
  5: [0, 0.5, 1], // 撅嘴,一个 O
};

// 让背包换成某一个表情。key 是 2 到 5
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
const AUTO_CYCLE = false; // 表情现在由开场控制,不再自动轮流(想测试表情时,按键盘数字键 2 到 5)
const CYCLE_SECONDS = 2; // 每隔几秒换一个
const expressionKeys = Object.keys(EXPRESSIONS); // ["2", "3", "4", "5"]
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

  intro.update(delta); // 开场:蹦出来、眨眼、说话、等你双击。开场结束以后,它只负责偶尔眨眼
  theme.update(delta); // 背景颜色慢慢变到想要的明暗
  orbit.update(delta); // 让每个物件走一小步

  // 开场没结束的时候,不能悬停,背包也不转头(它在看着观众,等你双击)
  if (intro.done) {
    if (!wasDone) {
      wasDone = true;
      backpackMotion.resume(); // 刚结束:从背包现在的角度接着转,不要突然跳回去
    }
    hover.update(delta); // 先看鼠标放在谁身上,决定轨道要不要停
    backpackMotion.update(delta); // 背包看着物件转头(要放在 orbit.update 后面,因为它要知道物件现在在哪)

    // 背包的眼睛:看向现在离镜头最近的那个物件
    // z 越大就越靠近镜头,所以找 z 最大的
    let nearest = orbit.groups[0];
    for (const group of orbit.groups) {
      if (group.position.z > nearest.position.z) nearest = group;
    }
    // 但不是一直死盯着它:隔一会儿会瞟一眼观众、上面,或者别的物件,眼珠还有很小的抖动(见 gaze.js)
    if (backpackGroup.userData.lookAtTarget) {
      glances.length = 0;
      glances.push(camera.position, lookUp);
      for (const group of orbit.groups) if (group !== nearest) glances.push(group.position);
      backpackGroup.userData.lookAtTarget(gaze.update(delta, nearest.position, glances), delta);
    }
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
