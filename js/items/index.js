import { createPlaceholder } from "./placeholder.js";
import { createBackpack } from "./backpack.js";
import { createCamera } from "./camera.js";
import { createJournal } from "./journal.js";
import { createComputer } from "./computer.js";

//The backpack in the center, no spinning
export const backpack = createBackpack;

//The other stuffs on the spinning orbit
export const items = [
  { name: "Camera", create: createCamera },
  { name: "Computer", create: createComputer },
  { name: "Journal", create: createJournal },
];
