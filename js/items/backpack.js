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

// 做盖子的"L"形整板:从侧面看是一个"L",盖住背包顶部,再垂到前面
// 做法:先画 L 的侧面轮廓,再把它往左右拉出宽度(ExtrudeGeometry),所以顶部和前面是同一块
// 轮廓里 x 是"往前",y 是"往上"(和背包的 z、y 对应),所以画完要把整块转 90 度
function makeLid(width, color) {
  const zBack = -0.725; // 盖子最后面
  const zFront = 0.79; // 盖子最前面(外侧)
  const zInner = 0.65; // 垂下来那一片的里侧(贴着主体的前面)
  const yTop = 1.44; // 盖子最高
  const yInner = 1.3; // 顶部那一片的下面(贴着主体的顶面)
  const yLegBottom = 0.9; // 垂下来的这一片先画到这里,下面接圆角板
  const outerR = 0.2; // 折弯外侧的圆角
  const innerR = 0.06; // 折弯里侧的圆角(比外侧小,这样板子的厚度才一样)
  const bevel = 0.03; // 两头边缘的小斜面

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

  // 3. 盖子:一整块折起来的板,盖住顶部,再垂到前面。折弯的地方是圆的,所以没有接缝
  //    - 上半部分(顶部 + 前面的上半截)是一块"L"形的整板,见 makeLid
  //    - 前面的下半截是圆角的厚板,往上多伸进"L"形里一点点,两块的前面在同一个平面,看起来是一块
  //      它比"L"形薄 0.01,这样重叠的地方不会打架
  place(group, makeLid(2.1, LID), 0, 0, 0);
  place(group, makeRoundedSlab(2.1, 0.76, 0.13, LID, 0.2, 0), 0, 0.62, 0.72);

  // 4. 两条带子,左右各一条(x 分别是 0.55 和 -0.55)
  //    每条带子由两块薄方块拼成:一块躺在盖子上面,一块贴在盖子前面
  //    再加一个奶油色的扣子,在带子的下端
  for (const side of [1, -1]) {
    place(group, makeBox(0.28, 0.04, 1.5, STRAP), side * 0.55, 1.46, 0);
    place(group, makeBox(0.28, 1.4, 0.04, STRAP), side * 0.55, 0.78, 0.81);
    place(
      group,
      makeBuckle(0.38, 0.34, 0.07, 0.08, ACCENT),
      side * 0.55,
      0.2,
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
      const shape = new THREE.Shape(points.map((p) => new THREE.Vector2(p.x, p.y)));
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
