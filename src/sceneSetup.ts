import * as THREE from "three";

export function initScene(
  models: { [key: string]: THREE.Object3D },
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera
) {
  const roadGroups: THREE.Group[] = []; // 👈 unified groups
  const obstacles: (THREE.Object3D | null)[] = [];

  let segmentLength = 1;

  // --- Road setup ---
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

  const visibleFrontZ = camera.position.z - 9.2;
  const startZ = visibleFrontZ + segmentLength / 2;
  const initialSegments = 20;

  // Models
  const streetLightModel = models["/assets/models/street_light.glb"];
  const fenceModel = models["/assets/models/road_fence.glb"];

  // Fence size
  const fenceBox = new THREE.Box3().setFromObject(fenceModel);
  const fenceSize = new THREE.Vector3();
  fenceBox.getSize(fenceSize);
  const fenceLength = fenceSize.x;

  // Plains
  const plainWidth = 200;
  const plainMaterial = new THREE.MeshStandardMaterial({ color: 0x228b22 });

  for (let i = 0; i < initialSegments; i++) {
    const zPos = startZ - i * segmentLength;

    // --- Group for this segment ---
    const group = new THREE.Group();

    // --- Road ---
    const seg = roadModel.clone(true);
    seg.position.set(0, 0.01, zPos);
    group.add(seg);

    const offsetX = desiredWidth / 2.2;

    // --- Plains ---
    const leftPlain = new THREE.Mesh(
      new THREE.PlaneGeometry(plainWidth, segmentLength),
      plainMaterial
    );
    leftPlain.rotation.x = -Math.PI / 2;
    leftPlain.position.set(-desiredWidth * 1.5, -0.5, zPos);
    group.add(leftPlain);

    const rightPlain = new THREE.Mesh(
      new THREE.PlaneGeometry(plainWidth, segmentLength),
      plainMaterial
    );
    rightPlain.rotation.x = -Math.PI / 2;
    rightPlain.position.set(desiredWidth * 1.5, -0.5, zPos);
    group.add(rightPlain);

    // --- Streetlights ---
    const leftLight = streetLightModel.clone(true);
    leftLight.position.set(-offsetX, 0.25, zPos);
    leftLight.scale.set(0.7, 0.7, 0.7);
    leftLight.rotateY(Math.PI / 2);
    group.add(leftLight);

    const rightLight = streetLightModel.clone(true);
    rightLight.position.set(offsetX, 0.25, zPos);
    rightLight.scale.set(0.7, 0.7, 0.7);
    rightLight.rotateY(-Math.PI / 2);
    group.add(rightLight);

    // --- Fences ---
    let currentZ = zPos - segmentLength / 2;
    while (currentZ < zPos + segmentLength / 2) {
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

    // --- Initial obstacle ---
    const obs = spawnObstacle(zPos, desiredWidth, group, models);
    obstacles.push(obs);

    // --- Add whole group ---
    scene.add(group);
    roadGroups.push(group);
  }

  // --- Bike ---
  const bike = models["/assets/models/bike.glb"].clone();
  bike.scale.set(1.2, 1.2, 1.2);
  bike.rotation.set(0, Math.PI, 0);
  bike.position.set(0, 0.05, 2.9);
  scene.add(bike);

  let frontTyre: THREE.Mesh | undefined;
  let rearTyre: THREE.Mesh | undefined;

  const frontNode = bike.getObjectByName("Object_40");
  const rearNode = bike.getObjectByName("Object_47");

  bike.traverse((child) => {
    if ((child as THREE.Mesh).isMesh && child.name === "Object_47") {
      rearTyre = child as THREE.Mesh;
    }
  });

  frontNode?.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      frontTyre = child as THREE.Mesh;
    }
  });

  rearNode?.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      rearTyre = child as THREE.Mesh;
    }
  });

  // --- Sky ---
  const sky = models["/assets/models/sky.glb"].clone();
  sky.scale.set(10, 10, 10);
  sky.position.set(0, 0, -50);
  camera.add(sky);
  scene.add(camera);

  // --- Recycling ---
  function recycleSegments(cameraZ: number) {
    for (let i = 0; i < roadGroups.length; i++) {
      const group = roadGroups[i];
      if (group.position.z - cameraZ > segmentLength) {
        const front = roadGroups.reduce((a, b) =>
          a.position.z < b.position.z ? a : b
        );
        group.position.z = front.position.z - segmentLength;

        // recycle obstacle inside group
        if (obstacles[i]) group.remove(obstacles[i]!);
        obstacles[i] = spawnObstacle(
          group.position.z,
          desiredWidth,
          group,
          models
        );
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
