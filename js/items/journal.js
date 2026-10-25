import * as THREE from "three";

// 低多边形线圈本:封面、纸张、左边一排金属线圈,封面上有几条色带和松树贴纸
// 本子立着,正面(封面)朝着 +z,也就是朝着观众

// 配色(颜色不多,但都鲜艳):想换颜色只改这里
const COVER = 0x4dffc3; // 封面:很亮的薄荷绿
const PAGES = 0xfff4dc; // 纸张:奶油色
const RING = 0xffc93c; // 线圈:亮黄
const STRIPE = 0xffb085; // 封面上的色带:蜜桃橙
const PINE = 0x0b6e4f; // 松树贴纸:深绿色
const PINE_TRUNK = 0x5b3a1e; // 树干:深棕色

// 本子的大小
const WIDTH = 1.3; // 左右
const HEIGHT = 1.7; // 上下
const COVER_THICK = 0.05; // 一块封面板有多厚
const PAGES_THICK = 0.3; // 中间纸张有多厚(比参考图的本子厚)
const RING_COUNT = 9; // 线圈有几个

function makeBox(width, height, depth, color) {
  return new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.2, flatShading: true }),
  );
}

// 把零件放到某个位置,再放进 group
function put(group, mesh, x, y, z) {
  mesh.position.set(x, y, z);
  group.add(mesh);
  return mesh;
}

export function createJournal() {
  const group = new THREE.Group();

  // 整本的总厚度,封面板的 z 位置都从这里算出来
  const totalThick = PAGES_THICK + COVER_THICK * 2;
  const coverZ = (PAGES_THICK + COVER_THICK) / 2; // 封面板的中心离正中间多远

  // 1. 前封面、后封面
  put(group, makeBox(WIDTH, HEIGHT, COVER_THICK, COVER), 0, 0, coverZ);
  put(group, makeBox(WIDTH, HEIGHT, COVER_THICK, COVER), 0, 0, -coverZ);

  // 2. 中间的纸张:比封面小一圈,边缘缩进去一点,看起来是一叠纸
  put(group, makeBox(WIDTH - 0.1, HEIGHT - 0.1, PAGES_THICK, PAGES), 0.03, 0, 0);

  // 3. 封面上的三条色带(像参考图),贴在封面的表面上
  const frontZ = totalThick / 2 + 0.01; // 封面最外面再往外一点点,不然会和封面抢位置(闪烁)
  put(group, makeBox(0.8, 0.07, 0.02, STRIPE), 0.1, 0.55, frontZ);
  put(group, makeBox(0.8, 0.07, 0.02, STRIPE), 0.1, 0.4, frontZ);
  put(group, makeBox(0.8, 0.07, 0.02, STRIPE), 0.1, 0.25, frontZ);

  // 4. 松树贴纸:三层三角形叠起来(越往下越宽),下面一小截树干
  //    每一层是一个三角形,拉出一点厚度。上面的层比下面的层再往外一点点,防止闪烁
  function makeTier(width, height, z) {
    const triangle = new THREE.Shape();
    triangle.moveTo(-width / 2, 0); // 左下角
    triangle.lineTo(width / 2, 0); // 右下角
    triangle.lineTo(0, height); // 顶尖
    triangle.closePath();
    const tier = new THREE.Mesh(
      new THREE.ExtrudeGeometry(triangle, { depth: 0.02, bevelEnabled: false }),
      new THREE.MeshStandardMaterial({ color: PINE, emissive: PINE, emissiveIntensity: 0.1, flatShading: true }),
    );
    return put(group, tier, 0.2, 0, z);
  }
  const treeBottom = -0.62; // 整棵树最底下的 y
  put(group, makeBox(0.08, 0.1, 0.02, PINE_TRUNK), 0.2, treeBottom + 0.05, frontZ); // 树干
  makeTier(0.52, 0.26, frontZ).position.y = treeBottom + 0.1; // 最下面一层,最宽
  makeTier(0.4, 0.24, frontZ + 0.005).position.y = treeBottom + 0.22; // 中间一层
  makeTier(0.28, 0.22, frontZ + 0.01).position.y = treeBottom + 0.34; // 最上面一层,最窄
  put(group, makeBox(0.14, 0.14, 0.02, RING), -0.3, -0.12, frontZ);

  // 5. 左边的线圈:一排小圆环,穿过纸张,绕着书脊
  const spineX = -WIDTH / 2 + 0.03; // 线圈中心在书脊(最左边)附近
  const spacing = (HEIGHT - 0.3) / (RING_COUNT - 1);
  for (let i = 0; i < RING_COUNT; i++) {
    const ring = new THREE.Mesh(
      // 半径 0.22,管子粗 0.025,管子 4 边,绕一圈 6 段:很低的面数
      new THREE.TorusGeometry(0.22, 0.03, 4, 6),
      new THREE.MeshStandardMaterial({ color: RING, emissive: RING, emissiveIntensity: 0.2, flatShading: true }),
    );
    ring.rotation.x = Math.PI / 2; // 圆环默认站着,躺平,让它套在书脊上
    ring.scale.x = 0.5; // 左右压扁一点,像参考图里那种窄窄的线圈
    put(group, ring, spineX, HEIGHT / 2 - 0.15 - i * spacing, 0);
  }

  // 整体大小:和相机、背包搭配
  group.scale.setScalar(0.5);

  return group;
}
