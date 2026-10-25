import * as THREE from "three";

// 低多边形线圈本:封面、纸张、左边一排金属线圈,封面上有几条色带和小贴纸
// 本子立着,正面(封面)朝着 +z,也就是朝着观众

// 配色(颜色不多,但都鲜艳):想换颜色只改这里
const COVER = 0x3d5afe; // 封面:亮蓝
const PAGES = 0xfff4dc; // 纸张:奶油色
const RING = 0xffc93c; // 线圈:亮黄
const STRIPE = 0xffb085; // 封面上的色带:蜜桃橙
const STICKER = 0xff6fb5; // 贴纸:亮粉

// 本子的大小
const WIDTH = 1.3; // 左右
const HEIGHT = 1.7; // 上下
const COVER_THICK = 0.05; // 一块封面板有多厚
const PAGES_THICK = 0.3; // 中间纸张有多厚(比参考图的本子厚)
const RING_COUNT = 9; // 线圈有几个

function makeBox(width, height, depth, color) {
  return new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ color, flatShading: true }),
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

  // 4. 贴纸:一个六边形的粉色圆片,和一个小方块
  const sticker = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.02, 6),
    new THREE.MeshStandardMaterial({ color: STICKER, flatShading: true }),
  );
  sticker.rotation.x = Math.PI / 2; // 圆柱默认竖着,躺下来让圆面朝着观众
  put(group, sticker, 0.2, -0.35, frontZ);
  put(group, makeBox(0.16, 0.16, 0.02, RING), -0.2, -0.65, frontZ);

  // 5. 左边的线圈:一排小圆环,穿过纸张,绕着书脊
  const spineX = -WIDTH / 2 + 0.03; // 线圈中心在书脊(最左边)附近
  const spacing = (HEIGHT - 0.3) / (RING_COUNT - 1);
  for (let i = 0; i < RING_COUNT; i++) {
    const ring = new THREE.Mesh(
      // 半径 0.22,管子粗 0.025,管子 4 边,绕一圈 6 段:很低的面数
      new THREE.TorusGeometry(0.22, 0.03, 4, 6),
      new THREE.MeshStandardMaterial({ color: RING, flatShading: true }),
    );
    ring.rotation.x = Math.PI / 2; // 圆环默认站着,躺平,让它套在书脊上
    ring.scale.x = 0.5; // 左右压扁一点,像参考图里那种窄窄的线圈
    put(group, ring, spineX, HEIGHT / 2 - 0.15 - i * spacing, 0);
  }

  // 整体大小:和相机、背包搭配
  group.scale.setScalar(0.6);

  return group;
}
