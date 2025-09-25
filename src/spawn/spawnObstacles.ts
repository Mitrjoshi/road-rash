import * as THREE from "three";

// --- Spawn obstacle helper ---
export function spawnObstacle(
  zPos: number,
  roadWidth: number,
  parent: THREE.Group | THREE.Scene,
  models: { [key: string]: THREE.Object3D }
): THREE.Object3D | null {
  if (Math.random() < 0.3) {
    const baseModel = models["/assets/models/road_block.glb"];
    if (!baseModel) {
      console.warn("road_block.glb not found in models!");
      return null;
    }

    const obstacle = baseModel.clone(true);
    const maxX = roadWidth / 3;
    const randomX = THREE.MathUtils.randFloat(-maxX, maxX);

    obstacle.position.set(randomX, 0.5, zPos);
    obstacle.scale.set(1.5, 1.5, 1.5);

    const blockBox = new THREE.Box3().setFromObject(obstacle);
    const blockSize = new THREE.Vector3();
    blockBox.getSize(blockSize);

    const blockTopY = blockBox.max.y - obstacle.position.y;

    const redLight = new THREE.PointLight(0xff0000, 100, 30);
    redLight.position.set(0, blockTopY - 0.3, 0);
    obstacle.add(redLight);

    const bulbGeometry = new THREE.SphereGeometry(0.12, 16, 16);
    const positionAttr = bulbGeometry.attributes.position;
    for (let i = 0; i < positionAttr.count; i++) {
      const x = positionAttr.getX(i);
      const y = positionAttr.getY(i);
      const z = positionAttr.getZ(i);
      const noise = (Math.random() - 0.3) * 0.05;
      positionAttr.setXYZ(i, x + noise, y + noise, z + noise);
    }
    bulbGeometry.computeVertexNormals();

    obstacle.rotateY(Math.random() * Math.PI * 2);

    parent.add(obstacle);
    return obstacle;
  }
  return null;
}
