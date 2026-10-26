import * as THREE from "three";

// 明暗模式:右上角一个按钮,点一下在"暗色"和"亮色"之间切换
//   暗色:深灰色背景(#1a1a1a),按钮是一弯月亮
//   亮色:象牙白背景,按钮是太阳
// 这个文件只管"背景颜色和按钮",不管背包和物件

const DARK = 0x1a1a1a; // 暗色背景(和以前一样)
const LIGHT = 0xe3d8c8; // 亮色背景:象牙白

export function createTheme(scene, button) {
  const background = new THREE.Color(DARK);
  scene.background = background;

  let mode = "dark";
  let amount = 0; // 0 是完全的暗色,1 是完全的亮色。切换的时候慢慢变
  const dark = new THREE.Color(DARK);
  const light = new THREE.Color(LIGHT);

  function setMode(newMode) {
    mode = newMode;
    document.documentElement.classList.toggle("day", mode === "light"); // 给整个页面加或去掉 day,CSS 按它换按钮图标和字的颜色
    try {
      localStorage.setItem("mode", mode); // 记在浏览器里,下次打开还是这个
    } catch (error) {
      // 浏览器不让存的话,就算了
    }
  }

  // 上次是什么就是什么
  try {
    setMode(localStorage.getItem("mode") === "light" ? "light" : "dark");
  } catch (error) {
    setMode("dark");
  }
  amount = mode === "light" ? 1 : 0; // 一打开就是对的,不用慢慢变
  background.lerpColors(dark, light, amount);

  button.addEventListener("click", () => {
    setMode(mode === "dark" ? "light" : "dark");
  });

  return {
    // 每一帧调用一次:背景颜色慢慢变到想要的那个
    update(delta) {
      const target = mode === "light" ? 1 : 0;
      amount += (target - amount) * (1 - Math.exp(-8 * delta));
      background.lerpColors(dark, light, amount);
    },
  };
}
