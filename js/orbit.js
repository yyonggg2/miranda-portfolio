import * as THREE from "three";

// 轨道的样子:物件不再绕一整圈,而是在背包前面的一段弧线上来回挤压、松开
const RADIUS_X = 5; // 椭圆左右半径
const RADIUS_Z = 3.5; // 椭圆前后半径
const ARC_SPAN = (120 * Math.PI) / 180; // 弧线有多长:120 度,换成电脑用的弧度
const ARC_CENTER = Math.PI / 2; // 弧线的正中间。90 度是正前面(朝着镜头那一边)
const MIN_SCALE = 0.7; // 最后面的物件大小
const MAX_SCALE = 1.2; // 最前面的物件大小
const MIN_OPACITY = 0.45; // 最后面的物件透明度
const MAX_OPACITY = 1; // 最前面的物件透明度

// 物件自己的朝向和动作
const FACE_INWARD = 0.5; // 站在最边上时,往中间转多少(弧度,0.5 约 29 度)
const SWAY = 0.15; // 左右摆动多大(弧度,约 9 度)
const BOB = 0.06; // 上下飘动多大
const EDGE_LIFT = 1.7; // 站在弧线最边上时,比正中间高多少。中间最低,两边往上翘,排成"倒三角"(像一个微笑的弧)
const TUCK = 0.25; // 站在最边上时,往背包收多少(0.25 就是离背包近四分之一)
const HOVER_FORWARD = 2.5; // 悬停时,物件往前走多远
const HOVER_UP = 0.4; // 悬停时,物件再往上多少
const DIM_AMOUNT = 0.65; // 完全变暗时,颜色只剩下原来的 35%
const ORBIT_Y = -0.9; // 整条轨道往下放多少,这样不会挡住背包的脸

// 挤压和松开的样子
const SQUEEZE_GAP = 0.28; // 挤在一起的时候,相邻两个物件隔多远(弧线全长是 1)
const CENTER_GAP = 0.17; // 挤在正中间的时候,相邻两个物件隔多远。比两边的小,因为中间离观众近,看起来更宽
const SPREAD_MARGIN = 0.2; // 松开的时候,两头的物件离弧线的尽头多远
const SQUEEZE_TIME = 1.1; // "挤过去"用几秒,越小越突然,越大越柔和
const LOOSEN_TIME = 3.5; // "慢慢松开"用几秒,越大越慢

// 缓动函数:t 从 0 走到 1,返回的数字也从 0 走到 1,但中间走得快慢不一样
// 起步慢、中间快、最后慢慢停下:用来做"挤过去"。比 easeInOutQuart 柔和,中间没有那么猛
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
// 起步和结尾都很柔和:用来做"慢慢松开"
function easeInOutSine(t) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

// 一个循环里的六个动作,按顺序做完,再从头来:挤左边、松开、挤中间、松开、挤右边、松开
//   to:这一段要变成什么样子。"left" 挤到左边,"center" 挤到正中间,"right" 挤到右边,"spread" 松开
//   每一段的起点,就是上一段的终点
const MOVES = [
  { to: "left", duration: SQUEEZE_TIME, ease: easeInOutCubic },
  { to: "spread", duration: LOOSEN_TIME, ease: easeInOutSine },
  { to: "center", duration: SQUEEZE_TIME, ease: easeInOutCubic },
  { to: "spread", duration: LOOSEN_TIME, ease: easeInOutSine },
  { to: "right", duration: SQUEEZE_TIME, ease: easeInOutCubic },
  { to: "spread", duration: LOOSEN_TIME, ease: easeInOutSine },
];
const CYCLE = MOVES.reduce((sum, move) => sum + move.duration, 0); // 一个循环一共多久

// 一开始就在"慢慢松开"快结束的地方:先是慢慢的,然后突然就挤过去了
const START_TIME = SQUEEZE_TIME + LOOSEN_TIME * 0.7;

// 某个物件在某个样子下,应该站在弧线上的哪里。返回 0 到 1:0 是最左边,1 是最右边
//   index 是第几个物件,count 是一共几个
function slotOf(shape, index, count) {
  if (shape === "left") return index * SQUEEZE_GAP; // 挤在最左边,一个挨着一个
  if (shape === "right") return 1 - (count - 1 - index) * SQUEEZE_GAP; // 挤在最右边
  if (shape === "center") return 0.5 + (index - (count - 1) / 2) * CENTER_GAP; // 挤在正中间,以中间为准往两边排
  if (count === 1) return 0.5; // 只有一个物件,站在正中间
  // 松开:平均分在弧线上,两头留一点空
  return SPREAD_MARGIN + (1 - SPREAD_MARGIN * 2) * (index / (count - 1));
}

// 给一个物件(Group)里所有零件设置透明度
function setOpacity(group, opacity) {
  group.traverse((child) => {
    // traverse 会走遍 Group 里的每个零件
    if (child.isMesh) {
      child.material.transparent = true;
      child.material.opacity = opacity;
    }
  });
}

// "盖暗"的做法:把每个材质的颜色(和发光)乘上一个小于 1 的数
// 乘完以后,下一帧开头要还原,所以把原来的颜色记在这个列表里
const dimmed = []; // 里面是 { material, color, emissive }
function applyDim(group, amount) {
  if (amount < 0.001) return;
  const factor = 1 - DIM_AMOUNT * amount;
  const materials = new Set(); // 同一个材质可能被很多零件共用(比如电脑的按键),用 Set 保证每个只处理一次
  group.traverse((child) => {
    if (child.isMesh) materials.add(child.material);
  });
  materials.forEach((material) => {
    dimmed.push({ material, color: material.color.clone(), emissive: material.emissive.clone() });
    material.color.multiplyScalar(factor);
    material.emissive.multiplyScalar(factor);
  });
}
function restoreDim() {
  dimmed.forEach(({ material, color, emissive }) => {
    material.color.copy(color);
    material.emissive.copy(emissive);
  });
  dimmed.length = 0;
}

// 创建轨道:把列表里的每个物件放进场景,让它们在弧线上挤压、松开
export function createOrbit(scene, itemList) {
  const groups = itemList.map((item) => {
    const group = item.create();
    group.userData.name = item.name;
    group.userData.caption = item.caption; // 悬停时显示的那行字
    group.userData.color = item.color; // 那行字阴影的颜色
    group.userData.hoverScale = 1; // 悬停放大倍数,hover.js 会来改它
    group.userData.hoverPull = 0; // 悬停时往前(靠近观众)走多少,0 到 1,hover.js 会来改它
    group.userData.dim = 0; // 被"盖暗"多少,0 是原样,1 是最暗。有别的物件被选中时,hover.js 会让没选中的变暗
    group.userData.hoverSpin = 0; // 悬停时额外转了多少角度(弧度),hover.js 会来改它
    group.userData.spit = null; // 开场被背包吐出来的过程:{ t, from, height, forward },intro.js 会来设置。null 表示没在飞
    group.userData.spitScale = 1; // 被吐出来的时候,大小的倍数(从很小长到正常),intro.js 会来改它
    group.userData.baseScale = group.scale.x; // 物件自己设的大小(各个 items 文件里的 setScalar),轨道的缩放要乘上它
    scene.add(group);
    return group;
  });

  let time = START_TIME; // 轨道自己记的时间。暂停的时候不增加,物件就停住

  const orbit = {
    groups,
    paused: false, // hover.js 会控制它
    selected: null, // 现在被选中(点击)的物件。背包会转向它,hover.js 会设置它
    phase: "spread", // 现在在做哪一段:"left" 在挤向左边,"center" 在挤向中间,"right" 在挤向右边,"spread" 在松开。背包的动作会看它

    // 每一帧调用一次。delta 是离上一帧过了几秒
    update(delta) {
      if (!orbit.paused) time += delta;

      // 0. 把上一帧"盖暗"的颜色先还原,这样物件自己的动画(比如会变色的问号)不会被搞乱
      restoreDim();

      // 1. 现在在循环的第几段,这一段走到哪里了
      let timeInCycle = time % CYCLE;
      let moveIndex = 0;
      while (
        moveIndex < MOVES.length - 1 &&
        timeInCycle >= MOVES[moveIndex].duration
      ) {
        timeInCycle -= MOVES[moveIndex].duration;
        moveIndex += 1;
      }
      const move = MOVES[moveIndex];
      const previous = MOVES[(moveIndex + MOVES.length - 1) % MOVES.length];
      const progress = move.ease(Math.min(timeInCycle / move.duration, 1)); // 0 到 1
      orbit.phase = move.to; // 告诉外面,现在是哪一段

      // 2. 每个物件:算出弧线上的位置,再摆过去
      groups.forEach((group, index) => {
        // 这一段开始的位置,和结束的位置,按 progress 取中间
        const from = slotOf(previous.to, index, groups.length);
        const to = slotOf(move.to, index, groups.length);
        const slot = THREE.MathUtils.lerp(from, to, progress);

        // 把 0 到 1 换成角度。0 在左边,1 在右边,0.5 正对着镜头
        // x 往右是正的,所以角度越小越靠右,要用 "减"
        const angle = ARC_CENTER - (slot - 0.5) * ARC_SPAN;

        // slot 是 0 到 1:0.5 是正中间。fromCenter:0 在正中间,1 在最边上
        const fromCenter = Math.abs(slot - 0.5) * 2;
        // 越靠边,越往里收(靠近背包),像一只手把背包抱住。1.5 次方:边上收得更明显
        const tuck = 1 - TUCK * Math.pow(fromCenter, 1.5);

        group.position.set(
          Math.cos(angle) * RADIUS_X * tuck,
          0,
          Math.sin(angle) * RADIUS_Z * tuck,
        );

        // 朝向:物件的正面永远大致朝着观众,不会转到背面
        //   1. 站在两边的,稍微往中间(背包)转一点,像在看着背包
        //   2. 再加一点很轻的左右摆动,每个物件的节奏错开,看起来像在"呼吸"
        //   3. 上下轻轻飘一点点
        // 用轨道自己的 time,所以悬停暂停的时候,它们也会停住
        const side = Math.cos(angle); // -1 在最左边,1 在最右边
        group.rotation.y =
          -side * FACE_INWARD + Math.sin(time * 1.3 + index * 2) * SWAY + group.userData.hoverSpin;
        // 离中间越远,往上抬得越多(用 1.5 次方:越靠边抬得越快)
        group.position.y = ORBIT_Y + Math.pow(fromCenter, 1.5) * EDGE_LIFT + Math.sin(time * 1.7 + index * 2) * BOB;

        // 悬停时:被选中的物件往前走,靠近观众,再稍微往上一点,不会被别的物件挡住
        const pull = group.userData.hoverPull;
        group.position.z += pull * HOVER_FORWARD;
        group.position.y += pull * HOVER_UP;

        // 开场被背包吐出来:从背包的嘴出发,沿着一道弧线,飞向它在轨道上的位置
        //   t 是飞到哪里了(0 刚出嘴,1 落到位置)。越靠前飞得越快,快到的时候慢下来
        const spit = group.userData.spit;
        if (spit && spit.t < 1) {
          const e = 1 - Math.pow(1 - spit.t, 3);
          const arc = Math.sin(spit.t * Math.PI); // 0 → 1 → 0:先升高再落下
          group.position.lerpVectors(spit.from, group.position, e);
          group.position.y += arc * spit.height; // 往上抛
          group.position.z += arc * spit.forward; // 往前抛,飞到观众这边
        }

        // 物件如果自己有动画(比如电脑屏幕闪烁),就让它动一下
        if (group.userData.animate) group.userData.animate(time);

        // 没被选中的物件,盖上一层暗色(先记下原来的颜色,下一帧开头再还原)
        applyDim(group, group.userData.dim);

        // 深度:0 = 最后面,1 = 最前面
        const depth = (Math.sin(angle) + 1) / 2;

        // 前大后小,再乘上悬停放大倍数
        const scale = THREE.MathUtils.lerp(MIN_SCALE, MAX_SCALE, depth);
        group.scale.setScalar(scale * group.userData.baseScale * group.userData.hoverScale * group.userData.spitScale);

        // 前面的清楚,后面的淡
        // 悬停的物件一定是清清楚楚的:pull 越大,越不透明
        const opacity = THREE.MathUtils.lerp(MIN_OPACITY, MAX_OPACITY, depth);
        setOpacity(group, THREE.MathUtils.lerp(opacity, 1, pull));
      });
    },
  };

  return orbit;
}
