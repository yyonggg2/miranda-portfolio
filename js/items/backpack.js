import * as THREE from "three";

// 背包的配色:浅紫色,分成几个深浅,让每一块零件看得清楚
const BODY = 0xbfaaf0; // 主体:浅紫色
const LID = 0xdbcff9; // 盖子和口袋小盖:更浅的紫色
const POCKET = 0xa994e6; // 口袋:稍微深一点
const STRAP = 0x8f7acf; // 压在盖子上的带子
const DARK = 0x5e5478; // 提手和背带:最深
const BASE = 0x8a86a0; // 底板:灰紫色
const ACCENT = 0xf4ecd8; // 奶油色:扣子
const EYE_WHITE = 0xfffdf7; // 眼白
const EYE_DARK = 0x2b2540; // 眼珠

// 眼睛的大小和位置(都在盖子的前面,两条带子的中间)
const EYE_RADIUS = 0.2; // 眼白的半径
const PUPIL_RADIUS = 0.09; // 眼珠的半径
const EYE_X = 0.23; // 左右眼离中线的距离
const EYE_Y = 0.85; // 眼睛的高度
const EYE_Z = 0.83; // 眼睛往前凸出的位置
const PUPIL_RANGE = 0.09; // 眼珠最多能离开中心多远(再大就跑出眼白了)

// 嘴(香肠)的颜色、大小和位置
const MOUTH = 0xe8909a; // 香肠的粉红色
const MOUTH_INSIDE = 0x3a1f2d; // 张开嘴的时候,嘴里面的深色
const MOUTH_RADIUS = 0.055; // 香肠有多粗
const MOUTH_HALF_WIDTH = 0.24; // 嘴的一半有多宽(左右各这么长),咧嘴笑所以比较宽
const DEFAULT_MOOD = 0.8; // 平时的心情:很开心的笑(-1 到 1)
const DEFAULT_OPEN = 0.5; // 平时的张嘴程度:微微张开,露出嘴里面(0 到 1)
const MOUTH_SEGMENTS = 7; // 嘴由几小节香肠串成。节数越多越圆滑,越少越有棱角
const MOUTH_Y = 0.42; // 嘴的高度(中间那一点),在眼睛(0.85)的下面
const MOUTH_Z = 0.83; // 嘴往前凸出的位置
const MOUTH_DEPTH = 0.09; // 心情是 1 的时候,两端比中间高多少(微笑的弯度)
const MOUTH_OPEN_DEPTH = 0.06; // 张嘴是 1 的时候,再多弯多少,嘴变大

// 做一个"方块零件":宽、高、深、颜色
// flatShading 让每个面亮度不同,这就是低多边形的切面感
function makeBox(width, height, depth, color) {
  return new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ color, flatShading: true }),
  );
}

// 做一个"圆柱零件":半径、高、颜色
// 最后的 8 是"圆周被切成几份"。份数少,圆柱就是棱角分明的八边形
function makeCylinder(radius, height, color) {
  return new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, 8),
    new THREE.MeshStandardMaterial({ color, flatShading: true }),
  );
}

// 画一个圆角矩形的轮廓(只是一条线围成的形状,还没有厚度)
// rBottom 是下面两个角的圆角大小,rTop 是上面两个角的。写 0 就是直角
// quadraticCurveTo 画一小段弯线:先给"弯到哪个角",再给"弯到哪里结束"
function roundedRect(width, height, rBottom, rTop) {
  const x = -width / 2;
  const y = -height / 2;
  const s = new THREE.Shape();
  s.moveTo(x + rBottom, y);
  s.lineTo(x + width - rBottom, y);
  if (rBottom > 0) s.quadraticCurveTo(x + width, y, x + width, y + rBottom);
  s.lineTo(x + width, y + height - rTop);
  if (rTop > 0) s.quadraticCurveTo(x + width, y + height, x + width - rTop, y + height);
  s.lineTo(x + rTop, y + height);
  if (rTop > 0) s.quadraticCurveTo(x, y + height, x, y + height - rTop);
  s.lineTo(x, y + rBottom);
  if (rBottom > 0) s.quadraticCurveTo(x, y, x + rBottom, y);
  return s;
}

// 做一块"圆角的厚板":宽、高、厚、颜色、下面的圆角、上面的圆角
// 做法:把圆角矩形"挤"出厚度(ExtrudeGeometry),边缘再切一道小斜面(bevel),看起来就有弧度
// curveSegments: 3 是圆角只切 3 份,所以是低多边形的棱角圆角
// bevel 会让板子往外多出一圈,所以先把轮廓缩小一圈,最后的大小才刚好
function makeRoundedSlab(width, height, thickness, color, rBottom, rTop) {
  const bevel = 0.03;
  const shape = roundedRect(
    width - bevel * 2,
    height - bevel * 2,
    Math.max(rBottom - bevel, 0),
    Math.max(rTop - bevel, 0),
  );
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
    curveSegments: 3,
  });
  geometry.center(); // 把板子的中心挪到 (0, 0, 0),和 makeBox 一样好摆放
  return new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color, flatShading: true }),
  );
}

// 做一个"空心的扣子":四条细方块围成一个框,中间是空的
// width、height 是整个框的大小,bar 是边的粗细,depth 是厚度
function makeBuckle(width, height, bar, depth, color) {
  const buckle = new THREE.Group();
  const innerHeight = height - bar * 2; // 左右两条边夹在上下两条边中间,所以要短一点
  place(buckle, makeBox(width, bar, depth, color), 0, (height - bar) / 2, 0); // 上边
  place(buckle, makeBox(width, bar, depth, color), 0, -(height - bar) / 2, 0); // 下边
  place(buckle, makeBox(bar, innerHeight, depth, color), -(width - bar) / 2, 0, 0); // 左边
  place(buckle, makeBox(bar, innerHeight, depth, color), (width - bar) / 2, 0, 0); // 右边
  return buckle;
}

// 把零件放进背包,并且放到 (x, y, z) 这个位置
// x 是往右,y 是往上,z 是往前(朝向你)
function place(group, part, x, y, z) {
  part.position.set(x, y, z);
  group.add(part);
  return part;
}

export function createBackpack() {
  const group = new THREE.Group();

  // 1. 主体:一个大方块(宽 2,高 2.6,深 1.3)。它的上边在 y = 1.3,下边在 y = -1.3
  place(group, makeBox(2, 2.6, 1.3, BODY), 0, 0, 0);

  // 2. 底板:比主体大一圈的薄方块,垫在最下面
  place(group, makeBox(2.2, 0.15, 1.5, BASE), 0, -1.375, 0);

  // 3. 盖子:由两块圆角的厚板拼成一个"L"形
  //    - 顶部那块盖住主体的上面,四个角都是圆的
  //      板子默认是立着的,rotation.x 转 -90 度让它躺下来
  //    - 前面那块从顶部垂下来,只有下面两个角是圆的(上面的角被顶部那块盖住了)
  const lidTop = makeRoundedSlab(2.1, 1.45, 0.14, LID, 0.15, 0.15);
  lidTop.rotation.x = -Math.PI / 2;
  place(group, lidTop, 0, 1.37, 0);
  place(group, makeRoundedSlab(2.1, 1.2, 0.14, LID, 0.2, 0), 0, 0.84, 0.72);

  // 4. 两条带子,左右各一条(x 分别是 0.55 和 -0.55)
  //    每条带子由两块薄方块拼成:一块躺在盖子上面,一块贴在盖子前面
  //    再加一个奶油色的扣子,在带子的下端
  for (const side of [1, -1]) {
    place(group, makeBox(0.28, 0.04, 1.5, STRAP), side * 0.55, 1.46, 0);
    place(group, makeBox(0.28, 1.4, 0.04, STRAP), side * 0.55, 0.78, 0.81);
    place(group, makeBuckle(0.38, 0.34, 0.07, 0.08, ACCENT), side * 0.55, 0.2, 0.84);
  }

  // 5. 提手:一个半圆的细环,立在盖子顶上,两条带子的中间
  //    TorusGeometry 的参数:环的半径、管子的粗细、管子切几份、环切几份、画多大的弧
  //    弧度写 Math.PI,就是只画上面一半(半圆)。切的份数很少,所以拱形有棱角
  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(0.3, 0.06, 4, 6, Math.PI),
    new THREE.MeshStandardMaterial({ color: DARK, flatShading: true }),
  );
  place(group, handle, 0, 1.44, 0);

  // 6. 前面的大口袋:一个厚方块,贴在主体前面的下半部分
  //    口袋上面再放一条小盖,颜色更浅
  place(group, makeBox(1.7, 0.95, 0.3, POCKET), 0, -0.8, 0.8);
  place(group, makeBox(1.76, 0.25, 0.34, LID), 0, -0.42, 0.82);

  // 7. 左右两边的侧袋,做法一样,所以用一个循环做两遍(side 是 1 就在右边,是 -1 就在左边)
  //    每个侧袋也有一条浅色的小盖
  for (const side of [1, -1]) {
    place(group, makeBox(0.3, 0.9, 0.8, POCKET), side * 1.15, -0.7, 0.1);
    place(group, makeBox(0.34, 0.22, 0.84, LID), side * 1.15, -0.35, 0.1);
  }

  // 8. 背带:两条弧形的带子,从背包顶部往后弯出去,再回到底部
  //    做法:先用半圆环(和提手一样),再把它转到对的方向,最后压成又宽又扁的带子
  //    - rotation.set(0, Math.PI / 2, -Math.PI / 2):先让半圆躺到侧面,再让弧形往后鼓出去
  //    - scale.set(0.6, 1, 4):x 压到 0.6,让弧形不要鼓太远
  //      z 拉到 4,让细细的管子变成宽宽的带子(转完以后 z 会变成左右方向)
  //    环切得很少(管子 4 份,环 6 份),所以带子是有棱角的
  for (const side of [1, -1]) {
    const strap = new THREE.Mesh(
      new THREE.TorusGeometry(1.2, 0.16, 4, 6, Math.PI),
      new THREE.MeshStandardMaterial({ color: DARK, flatShading: true }),
    );
    strap.rotation.set(0, Math.PI / 2, -Math.PI / 2);
    strap.scale.set(0.85, 1, 1.25);
    place(group, strap, side * 0.55, 0.1, -0.65);
  }

  // 9. 眼睛:左右各一个,每个由"眼白"和"眼珠"两个八边形圆柱叠起来
  //    圆柱默认是立着的,rotation.x 转 90 度,让圆面朝向前面(朝着你)
  //    眼珠比眼白再往前一点点,这样才不会被眼白挡住
  const pupils = []; // 把两个眼珠存起来,等一下让它们动
  for (const side of [1, -1]) {
    const eyeball = makeCylinder(EYE_RADIUS, 0.08, EYE_WHITE);
    eyeball.rotation.x = Math.PI / 2;
    place(group, eyeball, side * EYE_X, EYE_Y, EYE_Z);

    const pupil = makeCylinder(PUPIL_RADIUS, 0.06, EYE_DARK);
    pupil.rotation.x = Math.PI / 2;
    place(group, pupil, side * EYE_X, EYE_Y, EYE_Z + 0.06);

    // homeX、homeY 是眼珠站在正中间的位置
    pupils.push({ mesh: pupil, homeX: side * EYE_X, homeY: EYE_Y });
  }

  // 9b. 嘴:很多小节香肠串成一条线,在两只眼睛的正中间下面
  //     CapsuleGeometry 是"胶囊"形状:中间一段圆柱,两头是半圆
  //     参数:半径、中间那一段的长度、半圆切几份、圆周切几份(数字都很小,所以有棱角)
  //     mouth 是一个容器,小节和嘴里面都放进去,所以挪动 mouth 就挪动整张嘴
  const mouth = new THREE.Group();
  mouth.position.set(0, MOUTH_Y, MOUTH_Z);
  group.add(mouth);

  const spacing = (MOUTH_HALF_WIDTH * 2) / (MOUTH_SEGMENTS - 1); // 相邻两小节离多远
  const segments = [];
  for (let i = 0; i < MOUTH_SEGMENTS; i++) {
    const segment = new THREE.Mesh(
      new THREE.CapsuleGeometry(MOUTH_RADIUS, spacing, 2, 6),
      new THREE.MeshStandardMaterial({ color: MOUTH, flatShading: true }),
    );
    mouth.add(segment);
    segments.push(segment);
  }

  // 嘴里面:一块深色的"下巴形"薄片,上边是直的,下边弯弯的
  // 轮廓画在一个"单位方框"里(宽从 -1 到 1,上边在 0,最低在 -1),之后用 scale 拉大
  // quadraticCurveTo(0, -2, -1, 0) 是从右上角,经过下面,弯回到左上角
  const insideShape = new THREE.Shape();
  insideShape.moveTo(-1, 0);
  insideShape.lineTo(1, 0);
  insideShape.quadraticCurveTo(0, -2, -1, 0);
  const inside = new THREE.Mesh(
    new THREE.ShapeGeometry(insideShape, 6),
    new THREE.MeshStandardMaterial({ color: MOUTH_INSIDE, flatShading: true }),
  );
  inside.position.z = -0.025; // 稍微贴在盖子的前面,又在香肠的后面
  mouth.add(inside);

  // 根据"心情"和"张嘴"摆好每一小节
  //   mood:-1 往下(不开心),0 平的,1 微笑
  //   open:0 闭着,1 张开大笑
  // 做法:每一小节站在一条抛物线上,y = depth × t × t
  //   t 从 -1(最左)到 1(最右)。depth 是正数,两端就比中间高,是微笑;是负数就是往下
  function shapeMouth(mood, open) {
    const depth = mood * MOUTH_DEPTH + open * MOUTH_OPEN_DEPTH;
    for (let i = 0; i < MOUTH_SEGMENTS; i++) {
      const t = (i / (MOUTH_SEGMENTS - 1)) * 2 - 1;
      const segment = segments[i];
      segment.position.set(t * MOUTH_HALF_WIDTH, depth * t * t, 0);
      // 每一小节要顺着弯线的方向转一点角度(胶囊默认是立着的,所以要再减 90 度)
      segment.rotation.z =
        Math.atan2(2 * depth * t, MOUTH_HALF_WIDTH) - Math.PI / 2;
    }
    // 张开嘴并且是笑的弯度,才显示嘴里面。它的高度刚好等于嘴的弯度,正好填满
    const isOpen = open > 0.05 && depth > 0.02;
    inside.visible = isOpen;
    inside.position.y = depth;
    inside.scale.set(MOUTH_HALF_WIDTH, Math.max(depth, 0.001), 1);
  }
  shapeMouth(DEFAULT_MOOD, DEFAULT_OPEN);

  // 表情不是一下子变过去的,而是慢慢滑过去,所以先记下"想要的表情",每一帧再走一部分
  // 一开始就是咧嘴笑,没人换表情的时候,它一直是这个样子
  let mood = DEFAULT_MOOD;
  let open = DEFAULT_OPEN;
  let targetMood = DEFAULT_MOOD;
  let targetOpen = DEFAULT_OPEN;

  // 外面用这个函数换表情,例如 setExpression(1, 1) 是张嘴大笑
  group.userData.setExpression = (newMood, newOpen) => {
    targetMood = newMood;
    targetOpen = newOpen;
  };

  // 每一帧调用一次,让嘴慢慢变成想要的样子
  group.userData.updateFace = (delta) => {
    const smooth = 1 - Math.exp(-10 * delta);
    mood += (targetMood - mood) * smooth;
    open += (targetOpen - open) * smooth;
    shapeMouth(mood, open);
  };

  // 10. 让眼睛看向某一个点:main.js 每一帧会把"要看的位置"交给它
  //     - worldTarget:要看的东西在场景里的位置
  //     - delta:离上一帧过了几秒,用来让眼珠慢慢滑过去,不是瞬间跳过去
  //     把函数存在 group.userData 里,main.js 用名字找得到它
  //     (以后你做自己的背包,只要也有这个名字的函数,眼睛就会动)
  group.userData.lookAtTarget = (worldTarget, delta) => {
    group.updateMatrixWorld(true); // 先更新背包现在的位置和角度
    // 背包会左右摆动,所以要把"场景里的位置"换成"背包自己看到的位置"
    const target = group.worldToLocal(worldTarget.clone());

    for (const p of pupils) {
      // 从眼睛中心指向目标的方向
      const dx = target.x - p.homeX;
      const dy = target.y - p.homeY;
      const dz = target.z - EYE_Z;
      const length = Math.hypot(dx, dy, dz) || 1; // 这个方向有多长(用来换成"方向"本身)

      // 眼珠想去的位置:朝着目标的方向,走出一小段
      const wantX = p.homeX + (dx / length) * PUPIL_RANGE;
      const wantY = p.homeY + (dy / length) * PUPIL_RANGE;

      // 每一帧只往想去的位置走一部分,看起来就很顺滑
      const smooth = 1 - Math.exp(-8 * delta);
      p.mesh.position.x += (wantX - p.mesh.position.x) * smooth;
      p.mesh.position.y += (wantY - p.mesh.position.y) * smooth;
    }
  };

  // 整个背包的中心偏高了一点,往下挪一点,让它站在画面正中间
  group.position.y = -0.15;

  return group;
}
