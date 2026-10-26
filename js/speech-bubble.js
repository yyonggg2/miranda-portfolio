import * as THREE from "three";

// 背包的对话框:一个立体的白色圆角方块(有厚度,边缘有一点倒角),下面连着一个弯弯的角,指向背包的嘴
// 和背包、物件一样,是 3D 场景里的低多边形东西,不是贴在屏幕上的网页元素
// 字是写在一张画布上,再贴到对话框正面的,所以字会跟着对话框一起转、一起弹
// 这个文件只管"对话框长什么样、怎么出现",说什么话由 intro.js 决定

// 对话框的大小(场景里的单位,背包大约 2.6 高)
const WIDTH = 4.4;
const HEIGHT = 3.3;
const CORNER = 0.55; // 四个角有多圆
const DEPTH = 0.3; // 有多厚
const BEVEL = 0.12; // 边缘的倒角有多大
const TAIL_TIP = new THREE.Vector2(3.5, -2.0); // 弯角的尖,相对对话框正中间的位置。尖会对准背包的嘴

// 写字的画布
const CANVAS_W = 512;
const CANVAS_H = 384;
const FONT_PX = 26; // 像素字大小
const LINE_PX = 42; // 行距
const MAX_CHARS = 17; // 一行最多放几个字
const INK = "#2b2540"; // 字的颜色
const FONT = `${FONT_PX}px "Press Start 2P", monospace`;

// 画一个圆角方块的轮廓。以中心为原点
function roundedRect(width, height, radius) {
  const x = -width / 2;
  const y = -height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.absarc(x + width - radius, y + radius, radius, -Math.PI / 2, 0, false);
  shape.lineTo(x + width, y + height - radius);
  shape.absarc(x + width - radius, y + height - radius, radius, 0, Math.PI / 2, false);
  shape.lineTo(x + radius, y + height);
  shape.absarc(x + radius, y + height - radius, radius, Math.PI / 2, Math.PI, false);
  shape.lineTo(x, y + radius);
  shape.absarc(x + radius, y + radius, radius, Math.PI, Math.PI * 1.5, false);
  return shape;
}

// 把一句话按单词切成一行一行,每行不超过 MAX_CHARS 个字
function wrap(sentence) {
  const lines = [];
  let line = "";
  sentence.split(" ").forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (next.length > MAX_CHARS && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });
  if (line) lines.push(line);
  return lines;
}

export function createSpeechBubble(scene, camera) {
  const group = new THREE.Group();
  group.visible = false;
  scene.add(group);

  // 白色的材质。带一点自己发的光,所以不会被场景的灯光压成灰色
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.7,
    flatShading: true,
  });

  // 1. 对话框的主体:圆角方块拉出厚度,边缘倒角。面数很少,所以有棱角。
  //    倒角会把轮廓往外扩,所以先把轮廓缩小一圈,拉出来才是想要的大小
  const body = new THREE.Mesh(
    new THREE.ExtrudeGeometry(roundedRect(WIDTH - BEVEL * 2, HEIGHT - BEVEL * 2, CORNER - BEVEL), {
      depth: DEPTH,
      bevelEnabled: true,
      bevelThickness: BEVEL,
      bevelSize: BEVEL,
      bevelSegments: 2,
      curveSegments: 5,
    }),
    material,
  );
  body.position.z = -(DEPTH + BEVEL); // 让对话框的正面刚好在 z = 0
  group.add(body);

  // 2. 弯角:一个像牛角一样弯的形状,根在对话框下面,尖指向右下(背包的嘴)
  const tail = new THREE.Shape();
  tail.moveTo(1.0, -1.35); // 根的左边,在对话框里面(会被盖住)
  tail.quadraticCurveTo(1.4, -2.3, TAIL_TIP.x, TAIL_TIP.y); // 外面一条边:先往下,再弯向右,到尖
  tail.quadraticCurveTo(2.3, -1.85, 2.15, -1.35); // 里面一条边:从尖弯回根的右边
  tail.closePath();
  const hook = new THREE.Mesh(
    new THREE.ExtrudeGeometry(tail, {
      depth: 0.16,
      bevelEnabled: true,
      bevelThickness: 0.07,
      bevelSize: 0.07,
      bevelSegments: 1,
      curveSegments: 6,
    }),
    material,
  );
  hook.position.z = -(DEPTH + BEVEL) + 0.1; // 在对话框厚度的中间
  group.add(hook);

  // 3. 字:一张画布,贴在一块比对话框略小的平板上,放在正面前面一点点
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const context = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const textWidth = WIDTH - 0.6;
  const text = new THREE.Mesh(
    new THREE.PlaneGeometry(textWidth, (textWidth * CANVAS_H) / CANVAS_W),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }),
  );
  text.position.z = 0.012;
  group.add(text);

  let sentence = ""; // 现在在说的这句话
  let count = 0; // 已经打出来几个字

  // 把已经打出来的字,画到画布上。整句话先排好行,字一个一个出现,位置不会跳
  function draw() {
    context.clearRect(0, 0, CANVAS_W, CANVAS_H);
    const lines = wrap(sentence);
    context.font = FONT;
    context.fillStyle = INK;
    context.textBaseline = "middle";
    const top = (CANVAS_H - lines.length * LINE_PX) / 2 + LINE_PX / 2; // 整块字上下居中
    const left = (CANVAS_W - MAX_CHARS * FONT_PX) / 2; // 每行从同一个位置开始写
    let remaining = count;
    lines.forEach((line, i) => {
      if (remaining <= 0) return;
      context.fillText(line.slice(0, remaining), left, top + i * LINE_PX);
      remaining -= line.length + 1; // +1 是行末的空格
    });
    texture.needsUpdate = true;
  }
  // 字体加载好以后,重画一次(第一次画的时候,字体可能还没到)
  if (document.fonts && document.fonts.load) document.fonts.load(FONT).then(draw);

  // 出现和消失:大小慢慢变过去,出现的时候会稍微胀过头再回来(像弹出来)
  let want = 0; // 想要的大小:1 出现,0 消失
  let size = 0; // 现在的大小
  let velocity = 0;
  let clock = 0;
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  const toCamera = new THREE.Vector3();

  return {
    // 出现或消失
    show(visible) {
      want = visible ? 1 : 0;
    },

    // 换成哪句话,打出来几个字
    setText(newSentence, newCount) {
      if (newSentence === sentence && newCount === count) return; // 没变化就不用重画
      sentence = newSentence;
      count = newCount;
      draw();
    },

    // 每一帧调用一次。anchor 是背包的嘴现在在场景里的位置:弯角的尖会对准它
    update(delta, anchor) {
      clock += delta;
      const dt = Math.min(delta, 0.05);

      // 弹簧:大小冲向想要的大小,稍微冲过头,再回来
      velocity += (150 * (want - size) - 14 * velocity) * dt;
      size += velocity * dt;
      group.visible = size > 0.01 || want > 0;
      if (!group.visible) return;

      // 对话框永远大致朝着镜头,但歪一点点(不是死板地正对),再很轻地左右摇
      group.quaternion.copy(camera.quaternion);
      group.rotateY(-0.22 + Math.sin(clock * 1.3) * 0.04);
      group.rotateZ(0.03 + Math.sin(clock * 0.9) * 0.015);
      group.scale.setScalar(Math.max(size, 0.001));

      // 位置:让弯角的尖落在背包的嘴上。从尖倒着走回去,就是对话框的中心
      // 用镜头的"右"和"上"当方向,这样不管镜头怎么摆,对话框都在嘴的左上方
      right.set(1, 0, 0).applyQuaternion(camera.quaternion);
      up.set(0, 1, 0).applyQuaternion(camera.quaternion);
      toCamera.set(0, 0, 1).applyQuaternion(camera.quaternion);
      const s = Math.max(size, 0.001);
      group.position
        .copy(anchor)
        .addScaledVector(right, -TAIL_TIP.x * s)
        .addScaledVector(up, -TAIL_TIP.y * s)
        .addScaledVector(toCamera, 0.8); // 往镜头这边挪一点,盖在背包前面
    },
  };
}
