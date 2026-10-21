import * as THREE from "three";

export function createPlaceholder(color = 0x9aa5b1) {
  const group = new THREE.Group();

  // flatShading provides different sides with different lightness
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color, flatShading: true }),
  );
  group.add(box);

  return group;
}
