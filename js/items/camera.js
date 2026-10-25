import * as THREE from "three";

// 低多边形相机:机身、顶部的取景器和旋钮、前面的八边形镜头
// 相机的正面朝着 +z(也就是朝着镜头外面的观众)

// 配色(鲜亮的):想换颜色只改这里
const BODY = 0xff6b6b; // 机身:珊瑚红
const GRIP = 0x2b2d42; // 机身下半截的"皮":深蓝灰
const TOP = 0xfff1d6; // 顶盖:奶油色
const RING = 0xffd23f; // 镜头外圈:亮黄
const RING_DARK = 0xf4a300; // 镜头里面一圈:橙黄
const GLASS = 0x3a86ff; // 镜片:亮蓝
const GLASS_SHINE = 0xbde0fe; // 镜片中间的反光:浅蓝
const DIAL = 0x4ecdc4; // 旋钮:薄荷绿

// 做一个盒子零件。flatShading 让每个面颜色分开,有切面的感觉
function makeBox(width, height, depth, color) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ color, flatShading: true }),
  );
  return mesh;
}

// 做一个八边形的圆柱(只有 8 条边,所以是低多边形)
// 圆柱默认是竖着的,这里把它躺下,让圆面朝着 +z
function makeOctagon(radiusTop, radiusBottom, length, color) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, length, 8),
    new THREE.MeshStandardMaterial({ color, flatShading: true }),
  );
  mesh.rotation.x = Math.PI / 2;
  mesh.rotation.y = Math.PI / 8; // 转一点点,让八边形有一条边朝上,更像参考图
  return mesh;
}

// 把零件放到某个位置,再放进 group
function put(group, mesh, x, y, z) {
  mesh.position.set(x, y, z);
  group.add(mesh);
  return mesh;
}

export function createCamera() {
  const group = new THREE.Group();

  // 1. 机身:上面红色,下面一条深色的"皮"
  put(group, makeBox(1.7, 0.75, 0.8, BODY), 0, 0.15, 0);
  put(group, makeBox(1.71, 0.3, 0.81, GRIP), 0, -0.3, 0);

  // 2. 顶盖:一块奶油色的平板,盖在机身上面
  put(group, makeBox(1.72, 0.1, 0.82, TOP), 0, 0.575, 0);

  // 3. 取景器:顶盖中间凸起的一块,上窄下宽(两层叠起来)
  put(group, makeBox(0.62, 0.2, 0.55, TOP), 0, 0.73, -0.02);
  put(group, makeBox(0.4, 0.14, 0.4, BODY), 0, 0.9, -0.02);

  // 4. 顶盖左边:一个小旋钮(八边形),右边:一个方方的小按钮
  put(group, makeOctagon(0.2, 0.2, 0.18, DIAL), -0.62, 0.69, 0.05).rotation.set(0, Math.PI / 8, 0);
  put(group, makeBox(0.22, 0.14, 0.22, DIAL), 0.62, 0.69, 0.1);
  put(group, makeBox(0.12, 0.1, 0.12, RING), 0.62, 0.8, 0.1); // 快门按钮

  // 5. 镜头:三层八边形,一层比一层往里,最里面是蓝色的镜片
  put(group, makeOctagon(0.52, 0.52, 0.1, RING), 0.0, 0.1, 0.45); // 贴着机身的底座
  put(group, makeOctagon(0.44, 0.48, 0.3, RING_DARK), 0.0, 0.1, 0.6); // 镜筒,前面稍窄
  put(group, makeOctagon(0.36, 0.36, 0.08, GLASS), 0.0, 0.1, 0.77); // 镜片
  put(group, makeOctagon(0.16, 0.16, 0.06, GLASS_SHINE), -0.04, 0.14, 0.81); // 镜片上的反光

  // 6. 机身正面左上角的小闪光灯窗口
  put(group, makeBox(0.28, 0.18, 0.04, GLASS_SHINE), -0.6, 0.3, 0.41);

  // 整体放大缩小用:跟背包和其他物件的大小搭配
  group.scale.setScalar(0.55);

  return group;
}
