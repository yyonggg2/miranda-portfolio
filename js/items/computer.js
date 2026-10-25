import * as THREE from "three";

// 低多边形电脑:不是死板的长方形,而是切了角的屏幕和切了角的底座(像科幻电脑)
// 屏幕会闪烁:屏幕和按键的亮度会轻轻抖动
// 电脑的正面朝着 +z,也就是朝着观众

// 配色:外壳深一点,发光的地方鲜艳
const SHELL = 0x3b2f8f; // 外壳:靛紫色
const SCREEN = 0x1a7fe0; // 屏幕:蓝(不要太亮)
const KEYS = [0xff6fb5, 0xffd23f, 0x4ecdc4]; // 按键:粉、黄、薄荷绿

// 用一串点(x, y)做出一个形状。点按顺序连起来
function makeShape(points) {
  const shape = new THREE.Shape();
  points.forEach(([x, y], i) => {
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  shape.closePath();
  return shape;
}

// 普通材质(不发光)
function solid(color) {
  return new THREE.MeshStandardMaterial({ color, flatShading: true });
}

// 会发光的材质。emissive 是"自己发的光",intensity 越大越亮
function glow(color, intensity) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    flatShading: true,
  });
}

export function createComputer() {
  const group = new THREE.Group();

  // 1. 底座:一块切了前面两个角的板。先在平面(x, y)上画,再躺平
  //    躺平以后,画的 y 会变成 -z(往前),所以前面是负的 y 的反面
  const baseShape = makeShape([
    [-1.1, 0.5], // 后左(躺平后 z = -0.5,在后面)
    [1.1, 0.5], // 后右
    [1.1, -0.3], // 前右的上面一点
    [0.8, -0.65], // 前右切角
    [-0.8, -0.65], // 前左切角
    [-1.1, -0.3], // 前左的上面一点
  ]);
  const baseGeometry = new THREE.ExtrudeGeometry(baseShape, {
    depth: 0.12, // 底座的厚度
    bevelEnabled: false,
  });
  const base = new THREE.Mesh(baseGeometry, solid(SHELL));
  base.rotation.x = -Math.PI / 2; // 躺平。拉出来的厚度会朝上
  group.add(base);

  // 2. 按键:4 排,每排 9 个,颜色轮流用粉、黄、薄荷绿
  //    同一种颜色共用一个材质,这样闪烁的时候只要改 3 个材质
  const keyMaterials = KEYS.map((color) => glow(color, 0.6));
  const keyGeometry = new THREE.BoxGeometry(0.14, 0.04, 0.1);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 9; col++) {
      const key = new THREE.Mesh(keyGeometry, keyMaterials[(row + col) % 3]);
      key.position.set(-0.8 + col * 0.2, 0.14, -0.3 + row * 0.15);
      group.add(key);
    }
  }
  // 触控板:前面一条发光的长条
  const pad = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.03, 0.08), glow(SCREEN, 0.5));
  pad.position.set(0, 0.135, 0.42);
  group.add(pad);

  // 3. 屏幕:一块大的、上面两个角切掉的板,往后微微倾斜
  const screen = new THREE.Group();
  screen.position.set(0, 0.12, -0.5); // 转轴在底座后面的边上
  screen.rotation.x = -0.2; // 负数是顶部往后倒
  group.add(screen);

  const frameShape = makeShape([
    [-1.05, 0],
    [-1.05, 1.15],
    [-0.75, 1.5],
    [0.75, 1.5],
    [1.05, 1.15],
    [1.05, 0],
  ]);
  const frame = new THREE.Mesh(
    new THREE.ExtrudeGeometry(frameShape, { depth: 0.1, bevelEnabled: false }),
    solid(SHELL),
  );
  screen.add(frame);

  // 屏幕的发光面:比外框小一圈,贴在外框前面(z = 0.1 是外框的前表面,再往外 0.005 防止闪烁)
  const glassShape = makeShape([
    [-0.9, 0.12],
    [-0.9, 1.1],
    [-0.66, 1.38],
    [0.66, 1.38],
    [0.9, 1.1],
    [0.9, 0.12],
  ]);
  const glassMaterial = glow(SCREEN, 0.45);
  const glass = new THREE.Mesh(new THREE.ShapeGeometry(glassShape), glassMaterial);
  glass.position.z = 0.105;
  screen.add(glass);

  // 屏幕上的装饰:一个会变色的大问号(用小方块拼出来,像像素画),放在整个屏幕的正中间
  // 1 是有方块,0 是空的。一共 5 列 7 行,从上往下写
  const QUESTION = [
    "01110",
    "10001",
    "00001",
    "00110",
    "00100",
    "00000",
    "00100",
  ];
  const questionMaterial = glow(0xff6fb5, 0.5); // 颜色会在 animate 里一直变
  const pixel = 0.15; // 每个小方块的大小
  const questionGeometry = new THREE.BoxGeometry(pixel, pixel, 0.03);
  QUESTION.forEach((line, row) => {
    for (let col = 0; col < line.length; col++) {
      if (line[col] !== "1") continue;
      const block = new THREE.Mesh(questionGeometry, questionMaterial);
      // 问号中心放在 (0, 0.75),也就是屏幕正中间:列往右是 +x,行往下是 -y
      block.position.set((col - 2) * pixel, 0.75 + (3 - row) * pixel, 0.12);
      screen.add(block);
    }
  });

  // 4. 闪烁:orbit.js 每一帧会调用它,time 是轨道的时间(悬停暂停时它也会停)
  group.userData.animate = (time) => {
    // 屏幕亮度:慢慢起伏,再加一个很快的小抖动,像老电视在闪
    const flicker = 0.45 + Math.sin(time * 3) * 0.08 + Math.sin(time * 23) * 0.04;
    glassMaterial.emissiveIntensity = flicker;
    // 问号变色:色相(hue)从 0 走到 1 就是把彩虹的颜色走一圈。每 6 秒走一圈
    questionMaterial.color.setHSL((time / 6) % 1, 0.85, 0.6);
    questionMaterial.emissive.copy(questionMaterial.color);
    questionMaterial.emissiveIntensity = flicker * 0.9;

    // 按键:三种颜色轮流亮,各有各的节奏,像在打字
    keyMaterials.forEach((material, i) => {
      material.emissiveIntensity = 0.4 + Math.abs(Math.sin(time * 4 + i * 2)) * 0.6;
    });
  };

  // 整体大小:和相机、日记本搭配
  group.scale.setScalar(0.45);

  return group;
}
