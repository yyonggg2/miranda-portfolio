import { createPlaceholder } from "./placeholder.js";
import { createBackpack } from "./backpack.js";
import { createCamera } from "./camera.js";
import { createJournal } from "./journal.js";
import { createComputer } from "./computer.js";

//The backpack in the center, no spinning
export const backpack = createBackpack;

//The other stuffs on the spinning orbit
//caption 是悬停时,显示在这个物件正下面的那个像素字
//color 是这行字阴影的颜色,用这个物件的主色调
export const items = [
  { name: "Camera", caption: "moments", color: "#ff6b6b", create: createCamera },
  { name: "Computer", caption: "projects", color: "#6a4cff", create: createComputer },
  { name: "Journal", caption: "thoughts", color: "#4dffc3", create: createJournal },
];
