import * as THREE from "three";

export function getRandomBuilding(availableBuildings: THREE.Object3D[]) {
  if (availableBuildings.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * availableBuildings.length);
  return availableBuildings[randomIndex].clone(true);
}
