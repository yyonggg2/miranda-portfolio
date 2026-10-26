import * as THREE from "three";

// 眼睛看哪里:不是一直死盯着一个地方,而是像真人一样
//   1. 大部分时间看着"主要的目标"(比如观众,或者正在看的物件)
//   2. 隔一会儿,很快地瞟一眼别的地方(旁边、上面),再回来
//   3. 就算在看同一个地方,眼珠也会有很小很小的抖动(真人的眼睛不会完全不动)
// 一直直勾勾地盯着,会显得很呆;会瞟、会移开视线,才显得聪明、有想法
// 这个文件只算"眼睛该看哪个点",怎么把眼珠转过去,是 backpack.js 里的 lookAtTarget 的事

const LOOK_MIN = 1.4; // 看主要目标至少看几秒
const LOOK_MAX = 3.2; // 看主要目标最多看几秒
const GLANCE_MIN = 0.45; // 瞟一眼至少几秒
const GLANCE_MAX = 1.0; // 瞟一眼最多几秒
const MICRO_EVERY_MIN = 0.35; // 很小的抖动,最快多久换一次
const MICRO_EVERY_MAX = 0.9; // 很小的抖动,最慢多久换一次
const MICRO_SIZE = 0.45; // 很小的抖动有多大(场景里的距离)

const between = (min, max) => min + Math.random() * (max - min);

export function createGaze() {
  const result = new THREE.Vector3(); // 算出来"现在该看哪个点"
  const micro = new THREE.Vector3(); // 当前这一点很小的抖动
  let glancing = false; // 现在是不是在瞟别处
  let glanceTarget = null; // 瞟的是哪一个点
  let timer = between(LOOK_MIN, LOOK_MAX); // 离换一次(看主要目标 ↔ 瞟一眼)还有几秒
  let microTimer = 0;
  let lastGlance = -1; // 上一次瞟的是第几个,下次尽量不重复

  return {
    // 每一帧调用一次。
    //   delta:离上一帧过了几秒
    //   main:主要的目标(一个 Vector3 位置)
    //   glances:可以瞟一眼的地方(一串 Vector3 位置)
    //   返回:眼睛现在该看的位置
    update(delta, main, glances) {
      timer -= delta;
      if (timer <= 0) {
        if (glancing || glances.length === 0) {
          glancing = false; // 瞟完了,回来看主要目标
          timer = between(LOOK_MIN, LOOK_MAX);
        } else {
          glancing = true; // 瞟一眼别的地方
          let pick = Math.floor(Math.random() * glances.length);
          if (pick === lastGlance && glances.length > 1) pick = (pick + 1) % glances.length;
          lastGlance = pick;
          glanceTarget = pick;
          timer = between(GLANCE_MIN, GLANCE_MAX);
        }
      }

      // 很小的抖动:隔一小会儿,换一个很小的偏移
      microTimer -= delta;
      if (microTimer <= 0) {
        microTimer = between(MICRO_EVERY_MIN, MICRO_EVERY_MAX);
        micro.set(between(-1, 1), between(-1, 1), between(-1, 1)).multiplyScalar(MICRO_SIZE);
      }

      const base = glancing && glances[glanceTarget] ? glances[glanceTarget] : main;
      return result.copy(base).add(micro);
    },
  };
}
