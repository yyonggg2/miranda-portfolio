import * as THREE from "three";
import { createSpeechBubble } from "./speech-bubble.js";

// 开场:背包蹦出来,眨眼,说话(一个字一个字打出来),然后等着你双击它
// 现在做到"等你双击"。双击以后,先让物件直接出现(以后会改成从嘴里一个一个吐出来)
// 这个文件还负责背包"平时偶尔眨眼"(开场结束以后也会继续眨),和"重播开场"

// 背包要说的两句话。先说第一句,说完停一下,擦掉,再说第二句(不会两句同时放在上面)
const SENTENCES = [
  "Hi, I'm Miranda's backpack, welcome to our journey!",
  "Double click me to see what's in my tummy, or yell: backpack, backpack!",
];
const CHAR_DELAY = 0.028; // 打一个字要几秒。越小打得越快
const COMMA_DELAY = 0.12; // 逗号后面多停几秒
const STOP_DELAY = 0.2; // 句号、感叹号、冒号后面多停几秒
const SENTENCE_HOLD = 1.1; // 第一句说完,让大家看几秒,再换成第二句
const POP_TIME = 0.8; // 蹦出来用几秒
const FIRST_TALK = 1.6; // 蹦出来以后,等几秒才开口说话(中间眨眼)

// 开场时背包的朝向:不正对着观众,转一点点,露出左侧脸(更自然,不诡异)
// 负数是往观众的左边转。想转到另一边,改成正数。想转得更多或更少,改这个数字(弧度,0.55 约 31 度)
const INTRO_YAW = -0.55;
const MOUTH = new THREE.Vector3(0, 0.45, 0.83); // 嘴在背包身上的位置(和 backpack.js 里的 MOUTH_Y、MOUTH_Z 对应)

// 吐东西的节奏(时间都是从双击开始数,单位是秒)
const SPIT_WINDUP = 0.8; // 憋气多久
const SPIT_FIRST = 1.15; // 第一个物件什么时候出嘴
const SPIT_EVERY = 1.0; // 之后每隔几秒吐一个
const SPIT_FLIGHT = 1.4; // 一个物件从出嘴到落稳,飞几秒
const SPIT_HEIGHT = 1.6; // 飞的时候,往上抛多高
const SPIT_FORWARD = 2.0; // 飞的时候,往前(往观众这边)抛多远
const SPIT_START_SCALE = 0.12; // 刚出嘴的时候,物件有多小(正常大小的几分之几)
const MOUTH_BIG_CENTER = new THREE.Vector3(0, -0.12, 1.25); // 巨大的嘴的正中间,在背包身上的位置(再往前一点点,物件不会被背包挡住)

// 说话时背包的动作
const BOUNCE_WORD = 5; // 每个词开头,身体往上弹的力气
const BOUNCE_VOWEL = 2; // 每个元音,身体再弹一点点
const BOUNCE_SQUASH = 0.05; // 弹的时候,身体上下拉长多少(同时左右变窄一点点)
const BOUNCE_LIFT = 0.05; // 弹的时候,身体往上抬多少

// 蹦出来的缓动:冲过头一点点,再回来(像弹簧)
function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

// 打完一个字以后,要停多久再打下一个
function delayAfter(char) {
  if (char === ",") return COMMA_DELAY;
  if (char === "." || char === "!" || char === "?" || char === ":") return STOP_DELAY;
  return CHAR_DELAY;
}

// 说每个字母时,嘴张多大(0 闭上,1 张到最大)。元音张得大,辅音小,空格和标点几乎闭上
function mouthFor(char) {
  const lower = char.toLowerCase();
  if (lower === "a") return 1;
  if (lower === "o") return 0.85;
  if (lower === "e") return 0.7;
  if (lower === "u") return 0.6;
  if (lower === "i") return 0.5;
  if (/[a-z]/.test(lower)) return 0.3;
  return 0.12;
}

// 眼睛可以瞟一眼的几个地方(在背包身上的位置,背包转了,它们也跟着转)
const GLANCE_BUBBLE = new THREE.Vector3(-3.5, 1.2, 1.5); // 左边:自己的对话框
const GLANCE_UP = new THREE.Vector3(-1, 4.5, 1.5); // 上面,像在想事情
const GLANCE_DOWN = new THREE.Vector3(1.5, -2.5, 2); // 右下

export function createIntro({ backpackGroup, orbit, scene, camera, canvas, gaze, onRestart }) {
  const baseY = backpackGroup.position.y; // 背包本来的高度,蹦的时候在它上面加
  const glanceBubble = new THREE.Vector3();
  const glanceUp = new THREE.Vector3();
  const glanceDown = new THREE.Vector3();
  const glances = [glanceBubble, glanceUp, glanceDown];
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const point = new THREE.Vector3();
  const speech = createSpeechBubble(scene, camera); // 背包的对话框(3D 的,见 speech-bubble.js)

  // 现在在哪一步:"pop" 蹦出来 → "talk" 说话 → "wait" 等你双击 → "done" 结束
  let state = "pop";
  let stateTime = 0; // 这一步已经过了几秒
  let waitHop = 0; // 等待的时候,背包轻轻跳一下的计时
  let clock = 0; // 自己记的时间,给轻轻摇摆用

  // 打字:已经打了几个字,离打下一个字还要等几秒
  let sentenceIndex = 0; // 现在在说第几句
  let typedCount = 0; // 这一句已经打了几个字
  let holdTimer = 0; // 一句说完以后,已经停了几秒
  let typeTimer = 0;
  let typeDelay = 0;
  let mouthOpen = 0.12; // 嘴现在想张多大
  let mouthTimer = 0; // 离上一个字过了几秒,太久没有新字,嘴就合上
  let bounce = 0; // 说话时身体弹的距离
  let bounceVelocity = 0; // 弹得多快

  // 吐东西:每个物件有没有已经吐出来、嘴现在张得多大、身体现在被压扁或拉长了多少
  const spitStart = new THREE.Vector3();
  let spitStarted = false; // 憋气结束、开始弹起来这件事,有没有发生过(只发生一次)
  let spat = [];
  let mouthBig = 0; // 0 是正常的小嘴,1 是巨大的嘴
  let stretch = 0; // 负数是被压扁(又矮又胖),正数是被拉长(又高又瘦)
  let stretchVelocity = 0;

  // 眨眼:用一个计时器,隔几秒眨一下。开场刚开始有连续两次快眨
  let blinkTimer = 0.9; // 离下一次眨眼还有几秒
  let blinkProgress = -1; // 眨眼进行到哪里:0 到 1,-1 是没在眨
  let quickBlinks = 1; // 开场时还要再快眨几次

  // 开场开始(或重新开始)前:背包缩成一个点,物件都藏起来,对话框也藏起来
  function reset() {
    state = "pop";
    stateTime = 0;
    waitHop = 0;
    sentenceIndex = 0;
    typedCount = 0;
    holdTimer = 0;
    typeTimer = 0;
    typeDelay = 0;
    bounce = 0;
    bounceVelocity = 0;
    blinkTimer = 0.9;
    blinkProgress = -1;
    quickBlinks = 1;
    backpackGroup.scale.setScalar(0.001);
    backpackGroup.rotation.set(0, INTRO_YAW, 0);
    orbit.groups.forEach((group) => {
      group.visible = false;
      group.userData.spit = null;
      group.userData.spitScale = 1;
      group.userData.hoverSpin = 0;
    });
    spat = orbit.groups.map(() => false);
    mouthBig = 0;
    stretch = 0;
    stretchVelocity = 0;
    if (backpackGroup.userData.setMouthBig) backpackGroup.userData.setMouthBig(0);
    if (backpackGroup.userData.setEyeBulge) backpackGroup.userData.setEyeBulge(1, 0);
    orbit.selected = null;
    orbit.paused = false;
    speech.show(false);
    speech.setText("", 0);
    canvas.style.cursor = "default";
    if (backpackGroup.userData.setExpression) backpackGroup.userData.setExpression(0.8, 0.5, 0);
  }
  reset();

  function updateBlink(delta) {
    if (blinkProgress < 0) {
      blinkTimer -= delta;
      if (blinkTimer <= 0) blinkProgress = 0; // 开始眨
    } else {
      blinkProgress += delta / 0.2; // 一次眨眼 0.2 秒
      if (blinkProgress >= 1) {
        blinkProgress = -1;
        if (quickBlinks > 0) {
          quickBlinks -= 1;
          blinkTimer = 0.18; // 紧接着再眨一次
        } else {
          blinkTimer = 2.5 + Math.random() * 2.5; // 以后每隔 2.5 到 5 秒眨一次
        }
      }
    }
    // sin 让眼睛慢慢闭上再慢慢睁开:0 → 1 → 0
    const amount = blinkProgress < 0 ? 0 : Math.sin(blinkProgress * Math.PI);
    if (backpackGroup.userData.setBlink) backpackGroup.userData.setBlink(amount);
  }

  // 到某一步
  function goTo(next) {
    state = next;
    stateTime = 0;
  }

  // 鼠标是不是指着背包
  function pointerOnBackpack(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObject(backpackGroup, true).length > 0;
  }

  // 等你双击的时候,鼠标指着背包就变成小手,告诉你"可以双击"
  canvas.addEventListener("pointermove", (event) => {
    if (state === "wait") canvas.style.cursor = pointerOnBackpack(event) ? "pointer" : "default";
  });

  // 双击背包:打开(现在先让物件直接出现,以后会做成吐出来)
  canvas.addEventListener("dblclick", (event) => {
    if ((state === "talk" || state === "wait") && pointerOnBackpack(event)) {
      goTo("spit"); // 开始吐东西
      canvas.style.cursor = "default";
      speech.show(false); // 对话框缩回去
    }
  });

  return {
    // 开场有没有结束。main.js 看这个决定要不要开始悬停和背包看物件
    get done() {
      return state === "done";
    },

    // 重播开场(左下角的按钮会调用它)
    restart() {
      reset();
      if (onRestart) onRestart(); // 让别的部分(比如悬停)也回到开场前的样子
    },

    // 每一帧调用一次
    update(delta) {
      clock += delta;
      stateTime += delta;
      updateBlink(delta);
      const face = backpackGroup.userData;

      if (state === "pop") {
        // 蹦出来:大小从 0 冲到 1,同时往上跳一下再落下
        const t = Math.min(stateTime / POP_TIME, 1);
        backpackGroup.scale.setScalar(Math.max(easeOutBack(t), 0.001));
        backpackGroup.position.y = baseY + Math.sin(t * Math.PI) * 0.5;
        backpackGroup.rotation.y = INTRO_YAW + (1 - t) * 0.6; // 蹦出来的时候,从另一边转过来一点点
        if (stateTime >= FIRST_TALK) goTo("talk");
      } else if (state === "spit") {
        // 吐东西:先憋气(身体缩起来,嘴撅着,一直抖),然后嘴巴张到巨大,物件一个一个喷出来
        const t = stateTime;
        const dt = Math.min(delta, 0.05);
        const lastStart = SPIT_FIRST + (orbit.groups.length - 1) * SPIT_EVERY; // 最后一个物件什么时候出嘴
        const closing = t > lastStart + SPIT_FLIGHT * 0.6; // 最后一个已经飞出去一半了,嘴开始合上

        if (t < SPIT_WINDUP) {
          // 憋气:越来越憋。身体慢慢被压扁,嘴撅成一个小 O,抖得越来越厉害
          const k = t / SPIT_WINDUP;
          stretch = -0.22 * k;
          stretchVelocity = 0;
          if (face.setExpression) face.setExpression(0.2, 0.1, 1);
          backpackGroup.rotation.z = Math.sin(t * 60) * 0.06 * k;
        } else {
          if (!spitStarted) {
            spitStarted = true;
            stretchVelocity = 7; // 一松手,猛地弹起来
          }
          if (face.setExpression) face.setExpression(1, 1, 0); // 咧着嘴,张到最大
          backpackGroup.rotation.z = 0;
        }

        // 嘴有多大:憋气结束就张到巨大,快吐完就合上
        const mouthTarget = t >= SPIT_WINDUP && !closing ? 1 : 0;
        mouthBig += (mouthTarget - mouthBig) * (1 - Math.exp(-9 * dt));
        if (face.setMouthBig) face.setMouthBig(mouthBig);
        if (face.setEyeBulge) face.setEyeBulge(1 + 0.4 * mouthBig, 0.34 * mouthBig); // 嘴越大,眼睛越瞪大、越往上

        // 身体像弹簧:被压扁、被拉长,再慢慢回到原样
        stretchVelocity += (-120 * stretch - 9 * stretchVelocity) * dt;
        if (t >= SPIT_WINDUP) stretch += stretchVelocity * dt;
        backpackGroup.scale.set(1 - stretch * 0.6, 1 + stretch, 1 - stretch * 0.6);
        backpackGroup.position.y = baseY + stretch * 0.3;
        backpackGroup.rotation.y = INTRO_YAW;

        // 一个一个吐物件:到了时间,物件从嘴里出来,开始飞
        orbit.groups.forEach((group, i) => {
          const startAt = SPIT_FIRST + i * SPIT_EVERY;
          if (!spat[i] && t >= startAt) {
            spat[i] = true;
            group.visible = true;
            // 起点:巨大的嘴的正中间,再往前一点点(在背包前面,不会被背包挡住)
            backpackGroup.localToWorld(spitStart.copy(MOUTH_BIG_CENTER));
            group.userData.spit = {
              t: 0,
              from: spitStart.clone(),
              height: SPIT_HEIGHT,
              forward: SPIT_FORWARD,
              spin: (i % 2 === 0 ? 1 : -1) * Math.PI * 4, // 一个顺时针转,一个逆时针转,转两圈
            };
            stretchVelocity -= 5; // 吐的时候,身体猛地收一下
          }
          const spit = group.userData.spit;
          if (spit) {
            spit.t = Math.min((t - startAt) / SPIT_FLIGHT, 1);
            const slow = 1 - Math.pow(1 - spit.t, 3); // 飞出去时快,落下来时慢
            group.userData.spitScale = THREE.MathUtils.lerp(SPIT_START_SCALE, 1, easeOutBack(spit.t)); // 从很小长大,还会稍微胀过头再回来
            group.userData.hoverSpin = spit.spin * (1 - slow); // 一边飞一边转,快落下时转得越来越慢
            if (spit.t >= 1) {
              group.userData.spit = null; // 落到位置了
              group.userData.spitScale = 1;
              group.userData.hoverSpin = 0;
            }
          }
        });

        // 开场的时候,眼睛瞪着观众
        if (face.lookAtTarget) face.lookAtTarget(camera.position, delta);

        // 全部吐完、落稳、嘴也合上了:开场结束
        if (t > lastStart + SPIT_FLIGHT + 0.3) {
          if (face.setMouthBig) face.setMouthBig(0);
          if (face.setEyeBulge) face.setEyeBulge(1, 0);
          if (face.setExpression) face.setExpression(0.8, 0.5, 0);
          backpackGroup.scale.setScalar(1);
          backpackGroup.position.y = baseY;
          spitStarted = false;
          goTo("done");
        }
      } else if (state === "talk" || state === "wait") {
        speech.show(true); // 对话框弹出来

        if (state === "talk") {
          // 一个字一个字打出来。每个字打完要等一会儿(逗号、句号后面等得久一点)
          const sentence = SENTENCES[sentenceIndex]; // 现在在说的这一句
          typeTimer += delta;
          mouthTimer += delta;
          while (typedCount < sentence.length && typeTimer >= typeDelay) {
            typeTimer -= typeDelay;
            const char = sentence[typedCount];
            const previous = typedCount > 0 ? sentence[typedCount - 1] : " ";
            typedCount += 1;
            typeDelay = delayAfter(char);
            mouthOpen = mouthFor(char); // 嘴按这个字母张开
            mouthTimer = 0;
            // 身体跟着说话弹:每个词的开头弹一下,每个元音再轻轻弹一下
            if (/[a-z']/i.test(char) && !/[a-z']/i.test(previous)) bounceVelocity += BOUNCE_WORD;
            else if (/[aeiou]/i.test(char)) bounceVelocity += BOUNCE_VOWEL;
          }
          speech.setText(sentence, typedCount); // 对话框上写出已经打好的字
          if (mouthTimer > 0.09) mouthOpen = 0.12; // 一会儿没有新字,嘴就合上一点
          const talking = typedCount < sentence.length;
          if (face.setExpression) face.setExpression(0.7, talking ? mouthOpen : 0.5, 0);

          if (!talking) {
            // 这一句说完了
            if (sentenceIndex < SENTENCES.length - 1) {
              holdTimer += delta; // 停一会儿,让大家看清楚
              if (holdTimer >= SENTENCE_HOLD) {
                sentenceIndex += 1; // 擦掉,换下一句
                typedCount = 0;
                holdTimer = 0;
                typeTimer = 0;
                typeDelay = 0.25;
              }
            } else if (mouthTimer > 0.3) {
              goTo("wait"); // 最后一句说完了,等你双击
            }
          }
        } else {
          // 等待:像在期待,隔几秒轻轻跳一下,嘴巴微微张一下
          waitHop += delta;
          const cycle = waitHop % 3.5;
          if (cycle < 0.45) {
            bounceVelocity += 0; // 跳是单独算的,和说话的弹互不影响
            if (face.setExpression) face.setExpression(0.9, 0.9, 0);
          } else if (face.setExpression) {
            face.setExpression(0.8, 0.5, 0);
          }
        }

        // 弹簧:把"弹的力气"变成身体上下的伸缩,再慢慢回到原样
        const dt = Math.min(delta, 0.05);
        bounceVelocity += (-90 * bounce - 10 * bounceVelocity) * dt;
        bounce += bounceVelocity * dt;
        const lift = state === "wait" && waitHop % 3.5 < 0.45 ? Math.sin(((waitHop % 3.5) / 0.45) * Math.PI) * 0.18 : 0;
        const squash = Math.max(bounce, -0.5);
        backpackGroup.scale.set(1 - squash * BOUNCE_SQUASH * 0.6, 1 + squash * BOUNCE_SQUASH, 1 - squash * BOUNCE_SQUASH * 0.6);
        backpackGroup.position.y = baseY + lift + squash * BOUNCE_LIFT;
        // 站着的时候,很轻地左右摇、歪一点头,像一个活的东西,不是钉在那里
        backpackGroup.rotation.y = INTRO_YAW + Math.sin(clock * 1.6) * 0.04;
        backpackGroup.rotation.z = Math.sin(clock * 1.1) * 0.025 + squash * 0.02;

        // 开场的时候,眼睛主要看着观众(也就是镜头),隔一会儿瞟一眼:自己的对话框、上面、下面,
        // 眼珠还会有很小的抖动。这样不会死盯着,显得有想法
        if (face.lookAtTarget) {
          backpackGroup.localToWorld(glanceBubble.copy(GLANCE_BUBBLE));
          backpackGroup.localToWorld(glanceUp.copy(GLANCE_UP));
          backpackGroup.localToWorld(glanceDown.copy(GLANCE_DOWN));
          face.lookAtTarget(gaze.update(delta, camera.position, glances), delta);
        }
      }

      // 对话框跟着背包的嘴走:弯角的尖对着嘴。背包弹一下,对话框也跟着动
      backpackGroup.localToWorld(point.copy(MOUTH));
      speech.update(delta, point);
    },
  };
}
