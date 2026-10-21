import { createPlaceholder } from "./placeholder.js";
import { createBackpack } from "./backpack.js";

//The backpack in the center, no spinning
export const backpack = createBackpack;

//The other stuffs on the spinning orbit
export const items = [
  { name: "Camera", create: createPlaceholder },
  { name: "Computer", create: createPlaceholder },
  { name: "Journal", create: createPlaceholder },
];
