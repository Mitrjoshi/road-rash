import * as THREE from "three";
import { spawnObstacle } from "./spawn/spawnObstacles";

export function initScene(
  models: { [key: string]: THREE.Object3D },
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera
) {
  const roadGroups: THREE.Group[] = [];
  const obstacles: (THREE.Object3D | null)[] = [];
  let segmentLength = 1;

  const roadModel = models["/assets/models/road.glb"].clone();
  const box = new THREE.Box3().setFromObject(roadModel);
  const size = new THREE.Vector3();
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);
  roadModel.position.sub(center);

  const desiredWidth = 12;
  const scaleX = desiredWidth / size.x;
  roadModel.scale.set(scaleX, scaleX, scaleX);

  box.setFromObject(roadModel);
  box.getSize(size);
  segmentLength = size.z;

  // Blocks (temporary buildings)

  const visibleFrontZ = camera.position.z - 9.2;
  const startZ = visibleFrontZ + segmentLength / 2;
  const initialSegments = 20;

  const streetLightModel = models["/assets/models/street_light.glb"];
  const fenceModel = models["/assets/models/road_fence.glb"];

  const availableBuildings: THREE.Object3D[] = [];

  const fenceBox = new THREE.Box3().setFromObject(fenceModel);
  const fenceSize = new THREE.Vector3();
  fenceBox.getSize(fenceSize);
  const fenceLength = fenceSize.x;

  const plainWidth = 200;
  const plainMaterial = new THREE.MeshStandardMaterial({ color: 0x228b22 });

  for (let i = 0; i < initialSegments; i++) {
    const zPos = startZ - i * segmentLength;

    const group = new THREE.Group();
    group.position.set(0, 0, zPos);

    // Road
    const seg = roadModel.clone(true);
    seg.position.set(0, 0.01, 0);
    group.add(seg);

    const offsetX = desiredWidth / 2.2;

    // Plains
    const leftPlain = new THREE.Mesh(
      new THREE.PlaneGeometry(plainWidth, segmentLength),
      plainMaterial
    );
    leftPlain.rotation.x = -Math.PI / 2;
    leftPlain.position.set(-desiredWidth * 1.5, -0.5, 0);
    group.add(leftPlain);

    const rightPlain = leftPlain.clone();
    rightPlain.position.x = desiredWidth * 1.5;
    group.add(rightPlain);

    // Lights
    const leftLight = streetLightModel.clone(true);
    leftLight.position.set(-offsetX, 0.25, 0);
    leftLight.scale.set(0.7, 0.7, 0.7);
    leftLight.rotateY(Math.PI / 2);
    group.add(leftLight);

    const rightLight = streetLightModel.clone(true);
    rightLight.position.set(offsetX, 0.25, 0);
    rightLight.scale.set(0.7, 0.7, 0.7);
    rightLight.rotateY(-Math.PI / 2);
    group.add(rightLight);

    // Fences
    let currentZ = -segmentLength / 2;
    while (currentZ < segmentLength / 2) {
      if (Math.random() > 0.2) {
        const leftFence = fenceModel.clone(true);
        leftFence.position.set(-offsetX, 0.25, currentZ);
        leftFence.rotateY(Math.PI / 2);
        group.add(leftFence);

        const rightFence = fenceModel.clone(true);
        rightFence.position.set(offsetX, 0.25, currentZ);
        rightFence.rotateY(-Math.PI / 2);
        group.add(rightFence);
      }
      const randomGap = Math.random() < 0.15 ? fenceLength * 0.5 : 0;
      currentZ += fenceLength + randomGap;
    }

    // Obstacle
    const obs = spawnObstacle(0, desiredWidth, group, models); // relative to group
    obstacles.push(obs);

    scene.add(group);
    roadGroups.push(group);
  }

  // Bike
  const bike = models["/assets/models/bike.glb"].clone();
  bike.scale.set(1.2, 1.2, 1.2);
  bike.rotation.set(0, Math.PI, 0);
  bike.position.set(0, 0.05, 2.9);
  scene.add(bike);

  let frontTyre: THREE.Mesh | undefined;
  let rearTyre: THREE.Mesh | undefined;

  bike.traverse((child) => {
    if ((child as THREE.Mesh).isMesh && child.name === "Object_47")
      rearTyre = child as THREE.Mesh;
    if ((child as THREE.Mesh).isMesh && child.name === "Object_40")
      frontTyre = child as THREE.Mesh;
  });

  // Sky
  const sky = models["/assets/models/sky.glb"].clone();
  sky.scale.set(10, 10, 10);
  sky.position.set(0, 0, -50);
  camera.add(sky);
  scene.add(camera);

  function recycleSegments(cameraZ: number) {
    for (let i = 0; i < roadGroups.length; i++) {
      const group = roadGroups[i];
      if (group.position.z - cameraZ > segmentLength * 10) {
        // Find the front-most group (lowest z)
        const front = roadGroups.reduce((a, b) =>
          a.position.z < b.position.z ? a : b
        );

        // Move this group to the front
        group.position.z = front.position.z - segmentLength;

        // ♻️ recycle obstacle inside this group
        if (obstacles[i]) group.remove(obstacles[i]!);
        obstacles[i] = spawnObstacle(0, desiredWidth, group, models);
      }
    }
  }

  return {
    bike,
    roadGroups,
    segmentLength,
    frontTyre,
    rearTyre,
    desiredWidth,
    obstacles,
    recycleSegments,
  };
}
