import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 1.1, 5);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Light
scene.add(new THREE.AmbientLight(0xffffff, 1));
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(10, 20, 10);
scene.add(dirLight);

// Road
const roadSegments: THREE.Object3D[] = [];
let segmentLength = 1;

// Bike and tyres
let bike: THREE.Object3D;
const gears = [0, 40, 70, 100, 130]; // km/h thresholds
let currentGear = 0;

// Speed
// Speed
let speed = 0;
const maxSpeed = 1; // your current maxSpeed
let accelerating = false;

// Dynamically compute maxKmph based on maxSpeed
const baseKmph = 180; // default value if maxSpeed = 1

let reversing = false;
const reverseSpeed = 0.01; // slow constant speed

let moveLeft = false;
let moveRight = false;
const maxX = 2.5; // maximum left/right offset
let collision = false;

// Tilt
let bikeTilt = 0;
const maxTilt = 0.5; // radians (~28 degrees)
const tiltSpeed = 0.05;

let doingWheelie = false;
let wheelieTilt = 0;
const maxWheelieTilt = 0.5; // radians (~28 deg)
const wheelieSpeed = 0.05; // how fast the bike tilts up/down

// Loader
const loaderDiv = document.createElement("div");
loaderDiv.style.position = "absolute";
loaderDiv.style.top = "50%";
loaderDiv.style.left = "50%";
loaderDiv.style.transform = "translate(-50%, -50%)";
loaderDiv.style.fontSize = "24px";
loaderDiv.style.fontFamily = "Arial, sans-serif";
loaderDiv.style.color = "white";
loaderDiv.innerText = "Loading: 0%";
document.body.appendChild(loaderDiv);

// Speed + Gear indicator
const statusDiv = document.createElement("div");
statusDiv.style.position = "absolute";
statusDiv.style.top = "20px";
statusDiv.style.right = "20px";
statusDiv.style.fontSize = "24px";
statusDiv.style.fontFamily = "Arial, sans-serif";
statusDiv.style.color = "white";
statusDiv.style.backgroundColor = "rgba(0,0,0,0.5)";
statusDiv.style.padding = "10px 15px";
statusDiv.style.borderRadius = "8px";
statusDiv.innerText = "Speed: 0 km/h | Gear: N";
document.body.appendChild(statusDiv);

// Key events
window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") accelerating = true;
  if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") reversing = true;
  if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") moveLeft = true;
  if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") moveRight = true;
  if (e.code === "Space") doingWheelie = true; // start wheelie
});

window.addEventListener("keyup", (e) => {
  if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") accelerating = false;
  if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") reversing = false;
  if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") moveLeft = false;
  if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") moveRight = false;
  if (e.code === "Space") doingWheelie = false; // stop wheelie
});

// Preload all GLBs
const glbFiles = [
  "/assets/models/road.glb",
  "/assets/models/sky.glb",
  "/assets/models/bike.glb",
];
function preloadGLBs(
  paths: string[],
  callback: (models: { [key: string]: THREE.Object3D }) => void
) {
  const loadedModels: { [key: string]: THREE.Object3D } = {};
  let loadedCount = 0;

  paths.forEach((path) => {
    const loader = new GLTFLoader();
    loader.load(
      path,
      (gltf) => {
        loadedModels[path] = gltf.scene;
        loadedCount++;
        loaderDiv.innerText = `Loading: ${Math.round(
          (loadedCount / paths.length) * 100
        )}%`;

        if (loadedCount === paths.length) {
          setTimeout(() => {
            document.body.removeChild(loaderDiv);
            callback(loadedModels);
          }, 200);
        }
      },
      (xhr) => {
        if (xhr.total) {
          loaderDiv.innerText = `Loading: ${Math.round(
            (xhr.loaded / xhr.total) * 100
          )}%`;
        }
      },
      (err) => console.error("Error loading GLB:", err)
    );
  });
}

// Initialize scene
function initScene(models: { [key: string]: THREE.Object3D }) {
  // Road
  const roadModel = models["/assets/models/road.glb"].clone();
  const box = new THREE.Box3().setFromObject(roadModel);
  const size = new THREE.Vector3();
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);
  roadModel.position.sub(center);

  const desiredWidth = 6;
  const scaleX = desiredWidth / size.x;
  roadModel.scale.set(scaleX, scaleX, scaleX);

  box.setFromObject(roadModel);
  box.getSize(size);
  segmentLength = size.z;

  const visibleFrontZ = camera.position.z - 9.2;
  const startZ = visibleFrontZ + segmentLength / 2;
  const initialSegments = 20;

  for (let i = 0; i < initialSegments; i++) {
    const seg = roadModel.clone(true);
    seg.position.set(0, 0.01, startZ - i * segmentLength);
    scene.add(seg);
    roadSegments.push(seg);
  }

  // Bike
  bike = models["/assets/models/bike.glb"].clone();
  bike.scale.set(0.7, 0.7, 0.7);

  // Reset rotation
  bike.rotation.set(0, Math.PI, 0);

  // Position bike on road
  bike.position.set(0, 0.05, startZ + segmentLength / 3);
  scene.add(bike);

  // Sky
  const sky = models["/assets/models/sky.glb"].clone();
  sky.scale.set(10, 10, 10);
  sky.position.set(0, 0, -50);
  camera.add(sky);
  scene.add(camera);
}

// Animate loop
function animate() {
  requestAnimationFrame(animate);

  const currentMaxKmph = baseKmph * maxSpeed;
  const currentKmph = (speed / maxSpeed) * currentMaxKmph;

  // Smooth acceleration
  const minAcc = 0.0005;
  const maxAcc = 0.0025;
  const accFactor = currentKmph / currentMaxKmph;
  const acceleration = minAcc + (maxAcc - minAcc) * accFactor;

  // Forward acceleration
  if (accelerating) {
    speed += acceleration;
    if (speed > maxSpeed) speed = maxSpeed;
  } else if (!reversing) {
    // slow deceleration if not reversing
    if (speed > maxSpeed * 0.8) speed *= 0.995;
    else speed *= 0.97;
    if (speed < 0.001) speed = 0;
  }

  // Reverse movement
  if (reversing) {
    // Gradually slow forward speed
    if (speed > 0.001) {
      speed *= 0.95; // slow down smoothly
      camera.position.z -= speed;
      if (bike) bike.position.z -= speed;
    } else {
      // Start reverse only when forward speed is nearly 0
      bike.position.z += reverseSpeed;
      camera.position.z += reverseSpeed;
    }
  } else {
    // Move camera and bike forward normally
    camera.position.z -= speed;
    if (bike) bike.position.z -= speed;
  }

  // Move camera and bike
  camera.position.z -= speed;
  if (bike) bike.position.z -= speed;

  // Infinite road
  for (const road of roadSegments) {
    if (road.position.z - camera.position.z > segmentLength / 2) {
      const last = roadSegments.reduce((prev, curr) =>
        curr.position.z < prev.position.z ? curr : prev
      );
      road.position.z = last.position.z - segmentLength;
    }
  }

  // Determine moveSpeed based on current speed
  let moveSpeed = 0.03; // minimum lateral speed
  if (!reversing) {
    const minMove = 0.03;
    const maxMove = 0.07;
    const speedFactor = speed / maxSpeed; // 0 to 1
    moveSpeed = minMove + (maxMove - minMove) * speedFactor;
  } else {
    moveSpeed = 0.02; // slow lateral movement in reverse
  }

  // Left/right bike movement
  const isMoving = speed !== 0 || reversing;
  if (bike && isMoving) {
    const wheelieUpSpeed = 0.1; // slower when lifting front wheel
    const wheelieDownSpeed = 0.15; // faster when coming down

    if (moveLeft) bike.position.x -= moveSpeed;
    if (moveRight) bike.position.x += moveSpeed;

    if (doingWheelie) {
      wheelieTilt = THREE.MathUtils.lerp(
        wheelieTilt,
        maxWheelieTilt,
        wheelieUpSpeed
      );
    } else {
      wheelieTilt = THREE.MathUtils.lerp(wheelieTilt, 0, wheelieDownSpeed);
    }

    // Apply wheelie rotation on X-axis
    bike.rotation.x = wheelieTilt;

    // Maintain existing Z-axis tilt for left/right
    bike.rotation.z = bikeTilt;

    // Check collision with max X
    if (bike.position.x > maxX) {
      bike.position.x = maxX;
      collision = true;
    } else if (bike.position.x < -maxX) {
      bike.position.x = -maxX;
      collision = true;
    } else {
      collision = false;
    }

    // Smooth bike tilt
    if (moveLeft)
      bikeTilt = THREE.MathUtils.lerp(bikeTilt, -maxTilt, tiltSpeed);
    else if (moveRight)
      bikeTilt = THREE.MathUtils.lerp(bikeTilt, maxTilt, tiltSpeed);
    else bikeTilt = THREE.MathUtils.lerp(bikeTilt, 0, tiltSpeed);

    bike.rotation.z = bikeTilt;
    camera.position.x = bike.position.x;
  } else {
    bikeTilt = THREE.MathUtils.lerp(bikeTilt, 0, tiltSpeed);
    if (bike) bike.rotation.z = bikeTilt;
  }

  if (collision) {
    console.log("Collision with road boundary!");
    // Optional: stop bike or end game
  }

  // Determine current gear based on speed
  for (let i = gears.length - 1; i >= 0; i--) {
    if (currentKmph >= gears[i]) {
      currentGear = i + 1;
      break;
    }
  }
  if (currentKmph < gears[0]) currentGear = 0;

  if (reversing) {
    statusDiv.innerText = `Speed: ${Math.round(currentKmph)} km/h | Gear: R`;
  } else {
    // Determine current gear based on speed
    for (let i = gears.length - 1; i >= 0; i--) {
      if (currentKmph >= gears[i]) {
        currentGear = i + 1;
        break;
      }
    }
    if (currentKmph < gears[0]) currentGear = 0;

    statusDiv.innerText = `Speed: ${Math.round(currentKmph)} km/h | Gear: ${
      currentGear === 0 ? "N" : currentGear
    }`;
  }

  renderer.render(scene, camera);
}

// Start preloading
preloadGLBs(glbFiles, (models) => {
  initScene(models);
  animate();
});
