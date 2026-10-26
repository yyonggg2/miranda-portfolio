import * as THREE from "three";

// 背包的动作:它像一个有生命的东西,会"看"着周围的物件
//   - 物件突然挤到一边:背包先愣一下,再转过去看
//   - 物件慢慢松开:背包一个一个地看,看一个停一下
//   - 转头的时候有弹性,会稍微转过头再回来一点,身体还会倾斜一下
// 这个文件只管"背包怎么动",不管背包长什么样,也不管物件怎么转

const MAX_YAW = (50 * Math.PI) / 180; // 最多往左右转多少度
const STIFFNESS = 60; // 弹簧有多"紧"。越大,转得越快
const DAMPING = 9; // 阻力。越小,转头时越会晃(超过再回来);越大,越稳
const REACT_DELAY = 0.25; // 物件挤过去以后,背包愣几秒才转头
const FIRST_GLANCE = 0.9; // 物件开始松开以后,多久看第一个
const GLANCE_EVERY = 0.9; // 之后每隔几秒看下一个
const LEAN = 0.04; // 转头的时候身体倾斜多少
const MAX_LEAN = 0.12; // 最多倾斜多少
const WOBBLE = 0.02; // 停着的时候,很轻的晃动有多大
const MAX_DELTA = 0.05; // 一帧最多算 0.05 秒,卡顿的时候弹簧才不会算乱

// backpackGroup 是背包,orbit 是轨道(要从它那里知道现在是哪一段、物件在哪里)
export function createBackpackMotion(backpackGroup, orbit) {
  let yaw = 0; // 现在转了多少(弧度)。往右转是正的
  let velocity = 0; // 转得有多快
  let target = 0; // 想转到哪里
  let clock = 0; // 自己记的时间,给"呼吸晃动"用

  let lastPhase = orbit.phase; // 上一帧是哪一段,用来发现"换段了"
  let sincePhase = 0; // 这一段已经过了几秒
  let reacted = false; // 挤过去以后,有没有转头看了
  let glancesDone = 0; // 松开的时候,已经看了几个
  let hadSelected = false; // 上一帧有没有物件被选中,用来发现"选中结束了"
  let clusterSide = 0; // 上一次物件挤到了哪边:-1 左边,1 右边,0 还没有

  return {
    // 从背包现在的角度重新开始(开场结束的时候用,这样不会突然跳一下)
    resume() {
      yaw = backpackGroup.rotation.y;
      velocity = 0;
      target = yaw;
      lastPhase = orbit.phase;
      sincePhase = 0;
      reacted = false;
      glancesDone = 0;
      hadSelected = false;
    },

    // 每一帧调用一次。delta 是离上一帧过了几秒
    update(delta) {
      const dt = Math.min(delta, MAX_DELTA);
      clock += dt;

      // 1. 发现换段了,把计时清零
      if (orbit.phase !== lastPhase) {
        lastPhase = orbit.phase;
        sincePhase = 0;
        reacted = false;
        glancesDone = 0;
        if (orbit.phase === "left") clusterSide = -1;
        if (orbit.phase === "right") clusterSide = 1;
        if (orbit.phase === "center") clusterSide = 0; // 挤在中间:背包正对着前面看
      }
      sincePhase += dt;

      // 2. 决定想转到哪里
      if (orbit.selected) {
        // 有物件被选中:直接转过去面对它(不管轨道在做什么)
        const item = orbit.selected;
        const direction = Math.atan2(item.position.x, item.position.z);
        target = THREE.MathUtils.clamp(direction, -MAX_YAW, MAX_YAW);
        hadSelected = true;
      } else if (hadSelected) {
        // 选中结束了:当作换了一段,让背包重新开始自己的节奏
        hadSelected = false;
        sincePhase = 0;
        reacted = false;
        glancesDone = 0;
        target = 0;
      } else if (orbit.phase === "spread") {
        // 松开的时候:一个一个看。先看挤过的那一边的物件,再往另一边看
        const count = orbit.groups.length;
        const due = FIRST_GLANCE + glancesDone * GLANCE_EVERY;
        if (glancesDone < count && sincePhase >= due) {
          // 上次挤在左边(或还没挤过),就从左边的物件开始看;上次挤在右边,就从右边的开始
          const order = clusterSide <= 0 ? glancesDone : count - 1 - glancesDone;
          const item = orbit.groups[order];
          // atan2(x, z) 是"从背包看过去,那个物件在哪个方向",再限制在最大角度以内
          const direction = Math.atan2(item.position.x, item.position.z);
          target = THREE.MathUtils.clamp(direction, -MAX_YAW, MAX_YAW);
          glancesDone += 1;
        }
      } else if (!reacted && sincePhase >= REACT_DELAY) {
        // 挤过去的时候:愣了一下,然后转过去看那一堆
        target = clusterSide * MAX_YAW * 0.9;
        reacted = true;
      }

      // 3. 弹簧:离目标越远,拉力越大;速度越快,阻力越大。所以会稍微转过头,再回来
      const acceleration = STIFFNESS * (target - yaw) - DAMPING * velocity;
      velocity += acceleration * dt;
      yaw += velocity * dt;

      // 4. 摆到背包上:转头 + 停着时很轻的晃动,再加上转头时身体往转的方向倾斜
      backpackGroup.rotation.y = yaw + Math.sin(clock * 2.2) * WOBBLE;
      backpackGroup.rotation.z = THREE.MathUtils.clamp(
        -velocity * LEAN,
        -MAX_LEAN,
        MAX_LEAN,
      );
    },
  };
}
