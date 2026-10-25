import { createPlaceholder } from "./placeholder.js";
import { createBackpack } from "./backpack.js";
import { createCamera } from "./camera.js";
import { createJournal } from "./journal.js";
import { createComputer } from "./computer.js";

//The backpack in the center, no spinning
export const backpack = createBackpack;

//The other stuffs on the spinning orbit
//caption 是悬停时,显示在这个物件正下面的那个像素字
export const items = [
  { name: "Camera", caption: "moments", create: createCamera },
  { name: "Computer", caption: "projects", create: createComputer },
  { name: "Journal", caption: "thoughts", create: createJournal },
];
