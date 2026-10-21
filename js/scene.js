import * as THREE from "three";

// 创建"舞台":场景、相机、渲染器、灯光
// container 是 index.html 里的 #app 盒子,画布会放进去
export function createStage(container) {
  // 1. 场景:摄影棚
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a1a); // 临时背景色,和 CSS 保持一致

  // 2. 相机:摄影机
  const camera = new THREE.PerspectiveCamera(
    45, // 视野角度
    container.clientWidth / container.clientHeight, // 宽高比
    0.1, // 最近能拍到的距离
    100, // 最远能拍到的距离
  );
  camera.position.set(0, 2, 9); // 位置:稍微高一点,往下看,轨道才有椭圆感
  camera.lookAt(0, 0, 0); // 镜头对准中心(背包的位置)

  // 3. 渲染器:把画面画出来
  const renderer = new THREE.WebGLRenderer({ antialias: true }); // antialias 让边缘更平滑
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio); // 高清屏上保持清晰
  container.appendChild(renderer.domElement); // 把画布放进 #app

  // 4. 灯光
  const ambient = new THREE.AmbientLight(0xffffff, 0.6); // 环境光:颜色,强度
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffffff, 1.2); // 平行光
  sun.position.set(5, 8, 6); // 光从右上前方来
  scene.add(sun);

  // 5. 窗口大小变化时,相机和渲染器跟着调整
  window.addEventListener("resize", () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix(); // 改了相机参数后,要调用这个让它生效
    renderer.setSize(container.clientWidth, container.clientHeight);
  });

  // 把舞台的几个部分交出去,别的文件要用
  return { scene, camera, renderer };
}
