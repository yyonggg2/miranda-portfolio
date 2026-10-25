import * as THREE from "three";

// 背包的配色:浅紫色,分成几个深浅,让每一块零件看得清楚
const BODY = 0xbfaaf0; // 主体:浅紫色
const LID = 0xdbcff9; // 盖子和口袋小盖:更浅的紫色
const POCKET = 0xa994e6; // 口袋:稍微深一点
const STRAP = 0x8f7acf; // 压在盖子上的带子
const DARK = 0x5e5478; // 提手和背带:最深
const BASE = 0x5e5478; // 底板:灰紫色
const ACCENT = 0x5e5478; // 扣子
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
const MOUTH_RADIUS = 0.045; // 香肠有多粗
const MOUTH_HALF_WIDTH = 0.24; // 嘴的一半有多宽(左右各这么长),咧嘴笑所以比较宽
const MOUTH_MIN_GAP = 0.02; // 闭嘴时,上下两条香肠的中心离中线多远(很小,几乎贴在一起)
const MOUTH_OPEN_HEIGHT = 0.1; // 张到最大时,上下两条香肠再各分开多远
const MOUTH_PUCKER_SIZE = 0.09; // 撅成 O 形时,圆圈的半径
const MOUTH_CURL = 0.09; // 嘴角往上(笑)或往下(不开心)最多弯多少
const MOUTH_POINTS = 12; // 一圈香肠用几个点围成。点越少越有棱角
const DEFAULT_SMILE = 0.8; // 平时的嘴角:很开心的笑(-1 到 1)
const DEFAULT_OPEN = 0.5; // 平时的张嘴程度:微微张开,露出嘴里面(0 到 1)
const DEFAULT_PUCKER = 0; // 平时没有撅嘴(0 到 1)
const MOUTH_Y = 0.45; // 嘴的高度(中间那一点),在眼睛(0.85)的下面
const MOUTH_Z = 0.83; // 嘴往前凸出的位置

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
  if (rTop > 0)
    s.quadraticCurveTo(x + width, y + height, x + width - rTop, y + height);
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

// 做"折起来的板":从侧面看是一个"L",盖住顶部,折过一个圆角,再垂到前面
// 盖子和压在盖子上的带子都是这种形状,只是位置、厚度不一样,所以做成一个通用的函数
// 参数写在一个 { } 里,按名字对应,不怕顺序弄错:
//   width:左右有多宽    color:颜色
//   zInner、yInner:板子"里面那一面"的位置(里面那一面是贴着东西的那一面)
//   thickness:板子的厚度
//   zBack:顶部那一片往后伸到哪里    legBottom:垂下来的那一片往下伸到哪里
//   innerR:折弯里侧的圆角大小。外侧的圆角会自动等于"里侧 + 厚度",这样板子处处一样厚
// 做法:先画 L 的侧面轮廓,再把它往左右拉出宽度(ExtrudeGeometry),所以顶部和前面是同一块
// 轮廓里 x 是"往前",y 是"往上"(和背包的 z、y 对应),所以画完要把整块转 90 度
function makeFold({
  width,
  color,
  zInner,
  yInner,
  thickness,
  zBack,
  legBottom,
  innerR,
}) {
  const zFront = zInner + thickness; // 板子最前面(外侧)
  const yTop = yInner + thickness; // 板子最高(外侧)
  const yLegBottom = legBottom;
  const outerR = innerR + thickness; // 折弯外侧的圆角
  const bevel = Math.min(0.03, thickness * 0.25); // 两头边缘的小斜面。板子很薄的时候,斜面也要小

  // 沿着 L 的边走一圈。quadraticCurveTo 是画一小段弯线:先给"弯到哪个角",再给"结束的位置"
  const shape = new THREE.Shape();
  shape.moveTo(zBack, yInner);
  shape.lineTo(zInner - innerR, yInner);
  shape.quadraticCurveTo(zInner, yInner, zInner, yInner - innerR); // 里侧的折弯
  shape.lineTo(zInner, yLegBottom);
  shape.lineTo(zFront, yLegBottom);
  shape.lineTo(zFront, yTop - outerR);
  shape.quadraticCurveTo(zFront, yTop, zFront - outerR, yTop); // 外侧的折弯
  shape.lineTo(zBack, yTop);
  shape.lineTo(zBack, yInner);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: width - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel, // 让板子中间的大小刚好等于画的轮廓,不会变胖
    bevelSegments: 1,
    curveSegments: 4,
  });
  geometry.translate(0, 0, -(width - bevel * 2) / 2); // 只把"拉出来的宽度"挪到正中间,轮廓的位置不动

  const lid = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color, flatShading: true }),
  );
  lid.rotation.y = -Math.PI / 2; // 把"拉出来的方向"从前后转成左右
  return lid;
}

// 盖子:贴着主体的顶面和前面,厚 0.14
function makeLid(width, color) {
  return makeFold({
    width,
    color,
    zInner: 0.65, // 贴着主体的前面
    yInner: 1.3, // 贴着主体的顶面
    thickness: 0.14,
    zBack: -0.725,
    legBottom: 0.9, // 下面接圆角板
    innerR: 0.06,
  });
}

// 压在盖子上的带子:贴着盖子的外面(盖子最前 0.79,最高 1.44),很薄,只有 0.04
// innerR 是 0.2,和盖子外侧的圆角一样大,所以带子能贴紧盖子的折弯
// legBottom 是带子垂到哪里为止。尾巴(见 makeStrapTail)会从这里接着往下
function makeLidStrap(width, color, legBottom = 0.1) {
  return makeFold({
    width,
    color,
    zInner: 0.79,
    yInner: 1.44,
    thickness: 0.04,
    zBack: -0.75,
    legBottom,
    innerR: 0.2,
  });
}

// 带子的尾巴:穿过扣子以后垂下来的一小段,末端是半圆的
// 形状:上面是长方形,下面接一个半圆。半圆的半径等于带子宽度的一半,所以刚好接得上
// 轮廓画在"左右 × 上下"的平面里,原点在尾巴最上面的中间,再拉出一点点厚度
// 所以放它的时候,放的位置就是尾巴最上面那一点,它从那里往下垂
// length 是尾巴一共有多长(从最上面到半圆最低的地方),半圆那一段占 half,其余是长方形
function makeStrapTail(width, color, length = 0.42) {
  const half = width / 2; // 带子宽度的一半,也是半圆的半径
  const thickness = 0.04; // 和带子一样厚
  const bevel = 0.01; // 边缘的小斜面
  const shape = new THREE.Shape();
  shape.moveTo(-half, 0);
  shape.lineTo(half, 0);
  shape.lineTo(half, -(length - half)); // 长方形的右边,往下走到半圆开始的地方
  // 画半圆:absarc(圆心 x, 圆心 y, 半径, 从哪个角度, 到哪个角度, 是不是顺时针)
  // 圆心在半圆的"直边"正中间。从 0 度(最右)顺时针走到 -180 度(最左),中间会经过最低点
  shape.absarc(0, -(length - half), half, 0, -Math.PI, true);
  shape.lineTo(-half, 0); // 从最左边回到最上面,封口

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 1,
    curveSegments: 4, // 半圆只切 4 份,所以是有棱角的低多边形半圆
  });
  geometry.translate(0, 0, -(thickness - bevel * 2) / 2); // 把厚度挪到正中间
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
  place(
    buckle,
    makeBox(bar, innerHeight, depth, color),
    -(width - bar) / 2,
    0,
    0,
  ); // 左边
  place(
    buckle,
    makeBox(bar, innerHeight, depth, color),
    (width - bar) / 2,
    0,
    0,
  ); // 右边

  // 扣针:框里面一个小长方形,从上边垂下来,像参考图一样偏左一点
  //   长度是框里面高度的 35%,宽度是边的 1.4 倍,厚度是扣子的 70%(比框薄一点,看得出层次)
  //   它的上端往上多伸 0.01,埋进上边里面,这样和上边连成一体,不会飘着
  const innerTop = height / 2 - bar; // 框里面的最上面
  const prongLength = innerHeight * 0.35;
  place(
    buckle,
    makeBox(bar * 1.4, prongLength + 0.01, depth * 0.7, color),
    -width * 0.0,
    innerTop + 0.01 - (prongLength + 0.01) / 2,
    0,
  );
  return buckle;
}

// 把零件放进背包,并且放到 (x, y, z) 这个位置
// x 是往右,y 是往上,z 是往前(朝向你)
function place(group, part, x, y, z) {
  part.position.set(x, y, z);
  group.add(part);
  return part;
}

// 做一条拉链,横在 (x, y) 这个高度:一条深紫色的分割条 + 一排小齿 + 一个拉链头
// 参数写在一个 { } 里:
//   x、y:拉链的中心     length:左右有多长
//   backZ、frontZ:分割条从哪里到哪里(前后),frontZ 是它最前面的那一面
//   pullOffset:拉链头从中线往右偏多远
function addZipper(group, { x, y, length, backZ, frontZ, pullOffset = 0 }) {
  const stripHeight = 0.05; // 分割条有多粗(上下方向)

  // 1. 分割条:深紫色(和提手同色 DARK),把口袋和小盖分开
  place(
    group,
    makeBox(length, stripHeight, frontZ - backZ, DARK),
    x,
    y,
    (backZ + frontZ) / 2,
  );

  // 2. 小齿:一排很小的方块,贴在分割条的前面,一个高一点、一个低一点交替,像拉链的锯齿
  const toothCount = Math.round(length / 0.09); // 大约每 0.09 一颗
  const spacing = length / toothCount; // 实际每颗之间的距离
  for (let i = 0; i < toothCount; i++) {
    const toothX = x - length / 2 + spacing * (i + 0.5);
    const toothY = y + (i % 2 === 0 ? 0.008 : -0.008); // 偶数的往上一点,奇数的往下一点
    place(
      group,
      makeBox(spacing * 0.5, 0.016, 0.008, ACCENT), // 又扁又薄:高 0.016,凸出来只有 0.008
      toothX,
      toothY,
      frontZ + 0.004,
    );
  }

  // 3. 拉链头:一个小滑块,下面挂一个深色的小拉片(拉片只有 0.14 长)
  place(
    group,
    makeBox(0.1, 0.07, 0.03, ACCENT),
    x + pullOffset,
    y,
    frontZ + 0.015,
  );
  place(
    group,
    makeBox(0.04, 0.14, 0.05, DARK),
    x + pullOffset,
    y - 0.1,
    frontZ - 0.005,
  );
}

export function createBackpack() {
  const group = new THREE.Group();

  // 1. 主体:一个大方块(宽 2,高 2.6,深 1.3)。它的上边在 y = 1.3,下边在 y = -1.3
  place(group, makeBox(2, 2.6, 1.3, BODY), 0, 0, 0);

  // 2. 底板:比主体大一圈的薄方块,垫在最下面
  place(group, makeBox(2, 0.15, 1.3, BASE), 0, -1.375, 0);

  // 3. 盖子:一整块折起来的板,盖住顶部,再垂到前面。折弯的地方是圆的,所以没有接缝
  //    - 上半部分(顶部 + 前面的上半截)是一块"L"形的整板,见 makeLid
  //    - 前面的下半截是圆角的厚板,往上多伸进"L"形里一点点,两块的前面在同一个平面,看起来是一块
  //      它比"L"形薄 0.01,这样重叠的地方不会打架
  place(group, makeLid(2.1, LID), 0, 0, 0);
  place(group, makeRoundedSlab(2.1, 0.76, 0.13, LID, 0.2, 0), 0, 0.62, 0.72);

  // 4. 两条带子,左右各一条(x 分别是 0.55 和 -0.55)
  //    每条带子是一整块折起来的薄板,从盖子顶上折过去,垂到盖子前面,折弯的地方是圆的
  //    makeLidStrap 里已经写好了位置,所以这里只要放在左右各一边,高度和前后都是 0
  //    再加一个扣子,在带子的下端
  for (const side of [1, -1]) {
    const buckleY = 0.3; // 扣子的高度。想挪扣子,只要改这一个数字,带子和尾巴会跟着走
    const strapEnd = buckleY - 0.14; // 带子穿过扣子,在扣子下面那条边的后面结束,尾巴从这里开始
    const strapX = 0.65; // 带子离中线多远。数字越大,带子越靠外,离眼睛越远(眼睛在 0.23)

    place(group, makeLidStrap(0.25, STRAP, strapEnd), side * strapX, 0, 0);

    // 尾巴:从 strapEnd 往下垂。没有转角度,所以和带子在同一个平面上(z 都是 0.81,厚度都是 0.04)
    // 最后一个数字是尾巴的长度,想更长或更短改它
    const tail = makeStrapTail(0.25, STRAP, 0.35);
    place(group, tail, side * strapX, strapEnd, 0.81);

    place(
      group,
      makeBuckle(0.34, 0.34, 0.07, 0.08, ACCENT),
      side * strapX,
      buckleY,
      0.84,
    );
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
  place(group, makeBox(1.71, 0.25, 0.3, LID), 0, -0.42, 0.82);

  // 6b. 口袋和小盖之间的拉链(见 addZipper)
  //     y = -0.545 就是小盖的下边缘(-0.42 - 0.25 / 2),口袋和小盖在这里接上
  //     分割条比小盖宽一点点(1.73),前面比小盖的前面(0.97)凸出一点点(0.98),所以不会和它们打架
  addZipper(group, {
    x: 0,
    y: -0.545,
    length: 1.73,
    backZ: 0.65, // 一直通到后面(贴着主体的前面),这样口袋的两个侧面也被分割条包住,不会有缺口
    frontZ: 0.98,
    pullOffset: 0.55,
  });

  // 7. 左右两边的侧袋,做法一样,所以用一个循环做两遍(side 是 1 就在右边,是 -1 就在左边)
  //    每个侧袋也有一条浅色的小盖
  for (const side of [1, -1]) {
    place(group, makeBox(0.2, 0.9, 0.8, POCKET), side * 1.05, -0.7, 0.1);
    place(group, makeBox(0.24, 0.22, 0.84, LID), side * 1.05, -0.35, 0.1);

    // 侧袋的拉链:做法和前面口袋一样,只是要"横着"放在侧袋的外面
    //   先在一个单独的容器 sideZip 里做好拉链,"前面"就是容器的 z 方向
    //   再把容器转 90 度(右边的转 +90,左边的转 -90),让"前面"朝向外面
    //   length 0.86 比小盖的长度(0.84)稍微长一点;backZ、frontZ 从 -0.12 到 0.13,穿过整个侧袋的厚度
    //   y = -0.46 是小盖的下边缘(-0.35 - 0.22 / 2)
    //   容器转过以后,"往右偏"会变成"往后偏",所以乘上 -side,让拉链头在两边都靠前
    const sideZip = new THREE.Group();
    addZipper(sideZip, {
      x: 0,
      y: 0,
      length: 0.86,
      backZ: -0.12,
      frontZ: 0.13,
      pullOffset: -side * 0.25,
    });
    sideZip.rotation.y = (side * Math.PI) / 2;
    place(group, sideZip, side * 1.05, -0.46, 0.1);
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

  // 9b. 嘴:一圈香肠围成的椭圆,像真的嘴唇,在两只眼睛的正中间下面
  //     - 撅起嘴:椭圆缩小,变成一个小小的 "O"
  //     - 笑:椭圆拉宽,上面一条香肠、下面一条香肠,中间是空的(嘴里面)
  //     - 闭嘴:椭圆压扁,上下两条香肠贴在一起,变成一条线
  //     做法:先算出椭圆上的一圈点,再让一根"管子"(TubeGeometry)沿着这些点走一圈
  //     点很少,管子的截面也只有 5 个边,所以香肠是有棱角的低多边形
  //     mouth 是一个容器,香肠圈和嘴里面都放进去,所以挪动 mouth 就挪动整张嘴
  const mouth = new THREE.Group();
  mouth.position.set(0, MOUTH_Y, MOUTH_Z);
  group.add(mouth);

  const lipMaterial = new THREE.MeshStandardMaterial({
    color: MOUTH,
    flatShading: true,
  });
  const insideMaterial = new THREE.MeshStandardMaterial({
    color: MOUTH_INSIDE,
    flatShading: true,
  });
  let lips = null; // 现在的香肠圈
  let inside = null; // 现在的嘴里面(嘴张得够开才有)

  // 根据表情,重新做一次嘴
  //   smile:-1 嘴角往下(不开心),0 平的,1 嘴角往上(笑)
  //   open:0 闭着,1 张到最大
  //   pucker:0 正常,1 撅成 "O" 形
  function buildMouth(smile, open, pucker) {
    // 椭圆的半宽、半高。撅嘴的时候两个都靠近同一个小数字,椭圆就变成圆圈
    const openHeight = MOUTH_MIN_GAP + open * MOUTH_OPEN_HEIGHT;
    const halfWidth = THREE.MathUtils.lerp(
      MOUTH_HALF_WIDTH,
      MOUTH_PUCKER_SIZE,
      pucker,
    );
    const halfHeight = THREE.MathUtils.lerp(
      openHeight,
      MOUTH_PUCKER_SIZE,
      pucker,
    );
    // 嘴角的弯度。撅嘴的时候不弯
    const curl = smile * MOUTH_CURL * (1 - pucker);

    // 椭圆上的一圈点:角度走一整圈,x = 半宽 × cos,y = 半高 × sin
    // 再加上 curl × cos × cos:左右两端(cos 是 1 或 -1)被抬高或压低,中间不动,嘴就弯了
    const points = [];
    for (let i = 0; i < MOUTH_POINTS; i++) {
      const angle = (i / MOUTH_POINTS) * Math.PI * 2;
      const cos = Math.cos(angle);
      points.push(
        new THREE.Vector3(
          halfWidth * cos,
          halfHeight * Math.sin(angle) + curl * cos * cos,
          0,
        ),
      );
    }

    // 把旧的拆掉,换新的。dispose 是把旧形状占的内存还给电脑
    if (lips) {
      mouth.remove(lips);
      lips.geometry.dispose();
    }
    if (inside) {
      mouth.remove(inside);
      inside.geometry.dispose();
      inside = null;
    }

    // 管子沿着这些点走一圈。第二个参数 true 表示首尾连起来,是一个圈
    const curve = new THREE.CatmullRomCurve3(points, true);
    lips = new THREE.Mesh(
      new THREE.TubeGeometry(curve, MOUTH_POINTS * 2, MOUTH_RADIUS, 5, true),
      lipMaterial,
    );
    mouth.add(lips);

    // 嘴张得够开,就在香肠圈里面铺一块深色
    if (halfHeight > 0.04) {
      const shape = new THREE.Shape(
        points.map((p) => new THREE.Vector2(p.x, p.y)),
      );
      inside = new THREE.Mesh(new THREE.ShapeGeometry(shape), insideMaterial);
      inside.position.z = -0.025; // 稍微贴在盖子的前面,又在香肠的后面
      mouth.add(inside);
    }
  }

  // 表情不是一下子变过去的,而是慢慢滑过去,所以先记下"想要的表情",每一帧再走一部分
  // 一开始就是咧嘴笑,没人换表情的时候,它一直是这个样子
  let smile = DEFAULT_SMILE;
  let open = DEFAULT_OPEN;
  let pucker = DEFAULT_PUCKER;
  let targetSmile = DEFAULT_SMILE;
  let targetOpen = DEFAULT_OPEN;
  let targetPucker = DEFAULT_PUCKER;
  buildMouth(smile, open, pucker);

  // 外面用这个函数换表情,例如 setExpression(1, 1) 是张嘴大笑,setExpression(0, 0.5, 1) 是撅嘴 O
  group.userData.setExpression = (newSmile, newOpen, newPucker = 0) => {
    targetSmile = newSmile;
    targetOpen = newOpen;
    targetPucker = newPucker;
  };

  // 每一帧调用一次,让嘴慢慢变成想要的样子
  group.userData.updateFace = (delta) => {
    const smooth = 1 - Math.exp(-10 * delta);
    smile += (targetSmile - smile) * smooth;
    open += (targetOpen - open) * smooth;
    pucker += (targetPucker - pucker) * smooth;
    // 已经到位了就不用重新做,省力气
    const change =
      Math.abs(targetSmile - smile) +
      Math.abs(targetOpen - open) +
      Math.abs(targetPucker - pucker);
    if (change > 0.002) buildMouth(smile, open, pucker);
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
