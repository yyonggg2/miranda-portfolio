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

// 挤压和松开的样子
const SQUEEZE_GAP = 0.13; // 挤在一起的时候,相邻两个物件隔多远(弧线全长是 1)
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

// 一个循环里的四个动作,按顺序做完,再从头来
//   to:这一段要变成什么样子。"left" 挤到左边,"right" 挤到右边,"spread" 松开
//   每一段的起点,就是上一段的终点
const MOVES = [
  { to: "left", duration: SQUEEZE_TIME, ease: easeInOutCubic },
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

// 创建轨道:把列表里的每个物件放进场景,让它们在弧线上挤压、松开
export function createOrbit(scene, itemList) {
  const groups = itemList.map((item) => {
    const group = item.create();
    group.userData.name = item.name;
    group.userData.hoverScale = 1; // 悬停放大倍数,hover.js 会来改它
    scene.add(group);
    return group;
  });

  let time = START_TIME; // 轨道自己记的时间。暂停的时候不增加,物件就停住

  const orbit = {
    groups,
    paused: false, // hover.js 会控制它
    phase: "spread", // 现在在做哪一段:"left" 在挤向左边,"right" 在挤向右边,"spread" 在松开。背包的动作会看它

    // 每一帧调用一次。delta 是离上一帧过了几秒
    update(delta) {
      if (!orbit.paused) time += delta;

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

        group.position.set(
          Math.cos(angle) * RADIUS_X,
          0,
          Math.sin(angle) * RADIUS_Z,
        );

        // 深度:0 = 最后面,1 = 最前面
        const depth = (Math.sin(angle) + 1) / 2;

        // 前大后小,再乘上悬停放大倍数
        const scale = THREE.MathUtils.lerp(MIN_SCALE, MAX_SCALE, depth);
        group.scale.setScalar(scale * group.userData.hoverScale);

        // 前面的清楚,后面的淡
        setOpacity(
          group,
          THREE.MathUtils.lerp(MIN_OPACITY, MAX_OPACITY, depth),
        );
      });
    },
  };

  return orbit;
}
