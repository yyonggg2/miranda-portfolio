// the imported function and the file are from the same folder, so start with .
import { createPlaceholder } from "./placeholder.js";

export function createBackpack() {
  const group = createPlaceholder();
  group.scale.set(2, 2.5, 1.5);

  return group;
}
