import * as THREE from "three";

// 鼠标和物件的互动,分成两件事:
//   悬停(鼠标放在物件上):轨道照常转,物件正下方出现一个像素字(字会跟着物件走)
//   选中(点击物件):轨道停住,这个物件放大、往前走、转一圈,别的物件被盖上暗色,背包转向它
//   再点一下它、点空白的地方、或者按 Esc,就取消选中
// 这个文件只管"互动",不管物件长什么样,也不管轨道怎么转

const SELECT_SCALE = 1.7; // 选中时放大几倍
const SPIN_TIME = 2.4; // 转一整圈用几秒。越大越慢
const EASE_SPEED = 8; // 放大、往前走、变暗的快慢。越大越快
const LABEL_GAP = 28; // 字离物件底部多少像素

// 起步和结尾都慢、中间快,让转圈柔和
function easeInOutSine(t) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

export function createHover({ camera, canvas, orbit, label }) {
  const raycaster = new THREE.Raycaster(); // 射线:从鼠标的位置往画面里射一根线,看碰到了谁
  const pointer = new THREE.Vector2(); // 鼠标的位置,换算成 -1 到 1
  let hovered = null; // 鼠标现在放在哪个物件上,没有就是 null
  let selected = null; // 现在点击选中了哪个物件,没有就是 null
  let hasPointer = false; // 鼠标有没有在画面里

  // 每个物件的转圈进度:0 是没转,1 是转完了。用物件本身当钥匙
  const spinProgress = new Map();
  orbit.groups.forEach((group) => spinProgress.set(group, 0));
  const box = new THREE.Box3(); // 用来量物件的大小(放在一个盒子里)
  const point = new THREE.Vector3();

  // 选中一个物件(或者 null 表示取消选中)
  function select(group) {
    selected = group;
    orbit.selected = group;
    // 新选中的物件,从头开始转一圈。如果它还在转上一圈,就让它转完,不重来
    if (group && spinProgress.get(group) === 0) spinProgress.set(group, 0.0001);
  }

  canvas.addEventListener("pointermove", (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1; // 屏幕的 y 往下是正的,3D 里往上是正的,所以要反过来
    hasPointer = true;
  });
  canvas.addEventListener("pointerleave", () => {
    hasPointer = false;
  });
  canvas.addEventListener("click", () => {
    if (hovered && hovered !== selected) {
      console.log(hovered.userData.name);
      select(hovered); // 点了一个新的物件:选中它
    } else {
      select(null); // 点了已经选中的物件,或者点了空白:取消选中
    }
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") select(null);
  });

  return {
    // 每一帧调用一次
    update(delta) {
      // 1. 射线看鼠标碰到了哪个物件(true 是连物件里面的每个零件一起查)
      hovered = null;
      if (hasPointer) {
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(orbit.groups, true);
        if (hits.length > 0) {
          // 碰到的零件,往上找它属于哪一个物件
          let object = hits[0].object;
          while (object.parent && !orbit.groups.includes(object)) object = object.parent;
          hovered = object;
        }
      }
      canvas.style.cursor = hovered ? "pointer" : "default"; // 鼠标变成小手

      // 2. 只有物件被选中时,轨道才停住。鼠标只是放在上面,轨道照常转
      orbit.paused = selected !== null;

      // 3. 每个物件:被选中的放大、往前走;别的(有选中时)变暗;都是慢慢变过去
      const ease = 1 - Math.exp(-EASE_SPEED * delta); // 每帧往目标走一部分,走得又快又柔和
      orbit.groups.forEach((group) => {
        const isSelected = group === selected;
        const data = group.userData;
        data.hoverScale = THREE.MathUtils.lerp(data.hoverScale, isSelected ? SELECT_SCALE : 1, ease);
        data.hoverPull = THREE.MathUtils.lerp(data.hoverPull, isSelected ? 1 : 0, ease);
        // 有物件被选中时,没被选中的变暗;没有选中任何物件,大家都是原样
        const dimTarget = selected && !isSelected ? 1 : 0;
        data.dim = THREE.MathUtils.lerp(data.dim, dimTarget, ease);

        // 转圈:转的过程中,就算取消选中,也让它转完
        let progress = spinProgress.get(group);
        if (progress > 0) progress += delta / SPIN_TIME;
        if (progress >= 1) progress = 0; // 转完了,回到起点(转了 360 度,看起来是一样的)
        spinProgress.set(group, progress);
        data.hoverSpin = easeInOutSine(progress) * Math.PI * 2;
      });

      // 4. 物件正下方的像素字:鼠标放在哪个物件上,就显示哪个的
      if (hovered) {
        // 量出物件现在最底下的位置,再把这个 3D 的点换算成屏幕上的像素位置
        box.setFromObject(hovered);
        point.set((box.min.x + box.max.x) / 2, box.min.y, (box.min.z + box.max.z) / 2);
        point.project(camera); // 换算成 -1 到 1
        const rect = canvas.getBoundingClientRect();
        const x = ((point.x + 1) / 2) * rect.width + rect.left;
        const y = ((1 - point.y) / 2) * rect.height + rect.top;
        label.style.left = `${x}px`;
        label.style.top = `${y + LABEL_GAP}px`;
        label.textContent = hovered.userData.caption || hovered.userData.name;
        label.style.opacity = 1;
      } else {
        label.style.opacity = 0;
      }
    },
  };
}
