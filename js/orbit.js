import * as THREE from "three";

// change how the orbit looks
const RADIUS_X = 4.5; // 椭圆左右半径
const RADIUS_Z = 2.5; // 椭圆前后半径
const SPEED = 0.3; // 转动速度(弧度 / 秒)
const MIN_SCALE = 0.7; // 最后面的物件大小
const MAX_SCALE = 1.2; // 最前面的物件大小
const MIN_OPACITY = 0.45; // 最后面的物件透明度
const MAX_OPACITY = 1; // 最前面的物件透明度

// 给一个物件(Group)里所有零件设置透明度
function setOpacity(group, opacity) {
  group.traverse((child) => {
    // traverse 会走遍 Group 里的每个零件
    if (child.isMesh) {
      child.material.transparent = true;
      child.material.opacity = opacity;
    }
  });
}

// build the orbit, push the items into the orbit and let them spin
export function createOrbit(scene, itemList) {
  const groups = itemList.map((item, index) => {
    const group = item.create();
    group.userData.name = item.name;
    group.userData.hoverScale = 1; // hoverScale = 悬停放大倍数

    // start angle, let angle equally destribute on the orbit
    group.userData.angle = (index / itemList.length) * Math.PI * 2;
    scene.add(group);
    return group;
  });

  const orbit = {
    groups,
    paused: false,

    // runs every clip, delta is the change of time from the last clip
    update(delta) {
      for (const group of groups) {
        if (!orbit.paused) {
          group.userData.angle += SPEED * delta;
        }
        const angle = group.userData.angle;

        // the position of objects on the orbit
        group.position.set(
          Math.cos(angle) * RADIUS_X,
          0,
          Math.sin(angle) * RADIUS_Z,
        );

        // depth (0->1), 0 is back, 1 is frontest
        const depth = (Math.sin(angle) + 1) / 2;

        // front big, back small
        const scale = THREE.MathUtils.lerp(MIN_SCALE, MAX_SCALE, depth);
        group.scale.setScalar(scale * group.userData.hoverScale);

        // 前面的清楚,后面的淡
        setOpacity(
          group,
          THREE.MathUtils.lerp(MIN_OPACITY, MAX_OPACITY, depth),
        );
      }
    },
  };

  return orbit;
}
