import * as THREE from "three";

export function animate({
  scene,
  camera,
  renderer,
  bike,
  roadGroups, // 👈 now each group has road+lights+plains+fences
  segmentLength,
  desiredWidth,
  controlState,
  statusDiv,
  frontTyre,
  rearTyre,
  obstacles,
  models,
  recycleSegments, // 👈 unified recycling
}: {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  bike: THREE.Object3D;
  roadGroups: THREE.Group[];
  segmentLength: number;
  desiredWidth: number;
  controlState: any;
  statusDiv: HTMLDivElement;
  frontTyre?: THREE.Mesh;
  rearTyre?: THREE.Mesh;
  obstacles?: (THREE.Object3D | null)[];
  models: { [key: string]: THREE.Object3D };
  recycleSegments: (cameraZ: number) => void;
}) {
  const gears = [0, 40, 70, 100, 130];
  let currentGear = 0;
  let speed = 0;
  const maxSpeed = 1;
  const baseKmph = 180;

  // Camera follow
  const followOffset = new THREE.Vector3().subVectors(
    camera.position,
    bike.position
  );

  // Crash state
  let collisionActive = false;
  let cinematicMode = false;
  let wastedActive = false;
  let slowMotionFactor = 1;

  // Bike physics
  const bikeVelocity = new THREE.Vector3(0, 0, 0);
  const bikeAngularVel = new THREE.Vector3(0, 0, 0);
  const gravity = -0.01;
  const groundY = 0.05;

  // UI
  const wastedDiv = document.createElement("div");
  wastedDiv.innerText = "WASTED";
  Object.assign(wastedDiv.style, {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%) scale(0.5)",
    fontFamily: "'Impact', sans-serif",
    fontSize: "100px",
    color: "red",
    textShadow: "0 0 10px black, 0 0 20px black",
    opacity: "0",
    transition: "all 1s ease-out",
    zIndex: "9999",
  });
  document.body.appendChild(wastedDiv);

  const restartDiv = document.createElement("div");
  Object.assign(restartDiv.style, {
    position: "absolute",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.8)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    fontFamily: "Arial, sans-serif",
    fontSize: "32px",
    zIndex: "10000",
    opacity: "0",
    transition: "opacity 0.5s ease-out",
    pointerEvents: "none",
  });
  document.body.appendChild(restartDiv);

  const restartText = document.createElement("h2");
  restartText.innerText = "Game Over";
  restartDiv.appendChild(restartText);

  const restartBtn = document.createElement("button");
  restartBtn.innerText = "Restart Game";
  Object.assign(restartBtn.style, {
    marginTop: "20px",
    padding: "10px 20px",
    fontSize: "24px",
    cursor: "pointer",
  });
  restartDiv.appendChild(restartBtn);

  restartBtn.onclick = () => {
    restartDiv.style.opacity = "0";
    restartDiv.style.pointerEvents = "none";
    setTimeout(() => {
      window.location.reload();
    }, 150);
  };

  // Lean / wheelie
  let bikeTilt = 0;
  const maxTilt = 0.5;
  const tiltSpeed = 0.05;
  let wheelieTilt = 0;
  const maxWheelieTilt = 0.5;

  const tyreAxis = new THREE.Vector3(1, 0, 0).normalize();

  function triggerWasted() {
    wastedActive = true;
    wastedDiv.style.opacity = "1";
    wastedDiv.style.transform = "translate(-50%, -50%) scale(1)";
    setTimeout(() => {
      wastedDiv.style.opacity = "0";
      restartDiv.style.opacity = "1";
      restartDiv.style.pointerEvents = "auto";
    }, 3000);
  }

  function loop() {
    requestAnimationFrame(loop);

    const delta = slowMotionFactor;
    const currentMaxKmph = baseKmph * maxSpeed;
    const currentKmph = (speed / maxSpeed) * currentMaxKmph;

    // 🚴 Movement
    if (!collisionActive) {
      const minAcc = 0.0005 * delta;
      const maxAcc = 0.0025 * delta;
      const accFactor = currentKmph / currentMaxKmph;
      const acceleration = minAcc + (maxAcc - minAcc) * accFactor;

      if (controlState.accelerating) {
        speed += acceleration;
        if (speed > maxSpeed) speed = maxSpeed;
      } else if (!controlState.reversing) {
        if (speed > maxSpeed * 0.8) speed *= 0.995;
        else speed *= 0.97;
        if (speed < 0.001) speed = 0;
      }

      if (controlState.reversing) {
        bike.position.z += speed > 0.001 ? -speed * delta : 0.01 * delta;
      } else {
        bike.position.z -= speed * delta;
      }

      if (speed !== 0 || controlState.reversing) {
        const moveSpeed = controlState.reversing
          ? 0.02 * delta
          : (0.03 + (0.07 - 0.03) * (speed / maxSpeed)) * delta;

        if (controlState.moveLeft) bike.position.x -= moveSpeed;
        if (controlState.moveRight) bike.position.x += moveSpeed;

        const maxX = desiredWidth / 2.5;
        bike.position.x = THREE.MathUtils.clamp(bike.position.x, -maxX, maxX);

        wheelieTilt = THREE.MathUtils.lerp(
          wheelieTilt,
          controlState.doingWheelie ? maxWheelieTilt : 0,
          0.1
        );
        bike.rotation.x = wheelieTilt;

        if (controlState.moveLeft)
          bikeTilt = THREE.MathUtils.lerp(bikeTilt, -maxTilt, tiltSpeed);
        else if (controlState.moveRight)
          bikeTilt = THREE.MathUtils.lerp(bikeTilt, maxTilt, tiltSpeed);
        else bikeTilt = THREE.MathUtils.lerp(bikeTilt, 0, tiltSpeed);

        bike.rotation.z = bikeTilt;
      }
    }

    // 📷 Camera
    if (wastedActive) {
      const targetPos = new THREE.Vector3(
        bike.position.x,
        bike.position.y + 6,
        bike.position.z
      );
      camera.position.lerp(targetPos, 0.05);
      camera.lookAt(bike.position);
    } else if (!cinematicMode) {
      camera.position.set(
        bike.position.x + followOffset.x,
        bike.position.y + followOffset.y,
        bike.position.z + followOffset.z
      );
    } else {
      const radius = 8;
      const angle = performance.now() * 0.0003;
      camera.position.set(
        bike.position.x + radius * Math.cos(angle),
        bike.position.y + 4,
        bike.position.z + radius * Math.sin(angle)
      );
      camera.lookAt(bike.position);
    }

    // ♻️ Infinite road + plains + fences recycling
    recycleSegments(camera.position.z);

    // 🚴 Tyre spin
    if (!collisionActive && rearTyre && frontTyre) {
      const distance = speed * delta;
      const wheelRadius = 0.35;
      const circumference = 2 * Math.PI * wheelRadius;
      const rotationAngle =
        (distance / circumference) *
        2 *
        Math.PI *
        (controlState.reversing ? -1 : 1);
      rearTyre.rotateOnAxis(tyreAxis, -rotationAngle);
      frontTyre.rotateOnAxis(tyreAxis, -rotationAngle);
    }

    // ⚙️ Gear + HUD
    for (let i = gears.length - 1; i >= 0; i--) {
      if (currentKmph >= gears[i]) {
        currentGear = i + 1;
        break;
      }
    }
    if (currentKmph < gears[0]) currentGear = 0;
    statusDiv.innerText = collisionActive
      ? `CRASHED!`
      : controlState.reversing
      ? `Speed: ${Math.round(currentKmph)} km/h | Gear: R`
      : `Speed: ${Math.round(currentKmph)} km/h | Gear: ${
          currentGear === 0 ? "N" : currentGear
        }`;

    // 💥 Crash physics
    if (collisionActive) {
      slowMotionFactor = 0.3;
      bikeVelocity.y += gravity * delta;
      bike.position.addScaledVector(bikeVelocity, delta);

      bike.rotation.x += bikeAngularVel.x * delta;
      bike.rotation.y += bikeAngularVel.y * delta;
      bike.rotation.z += bikeAngularVel.z * delta;

      if (bike.position.y <= groundY) {
        bike.position.y = groundY;
        bikeVelocity.set(0, 0, 0);
        bikeAngularVel.set(0, 0, 0);
        triggerWasted();
      }
    }

    // 🚧 Collision detection
    if (!collisionActive && obstacles) {
      const bikeBox = new THREE.Box3().setFromObject(bike);
      obstacles.forEach((obs) => {
        if (!obs) return;
        const obstacleBox = new THREE.Box3().setFromObject(obs);
        if (bikeBox.intersectsBox(obstacleBox)) {
          if ((speed / maxSpeed) * baseKmph > 60) {
            bikeVelocity.set((Math.random() - 0.5) * 0.1, 0.5, -0.6);
            bikeAngularVel.set(
              -0.3,
              (Math.random() - 0.5) * 0.06,
              (Math.random() - 0.5) * 0.12
            );
            speed = 0;
            collisionActive = true;
            cinematicMode = true;
          } else {
            speed = 0;
          }
        }
      });
    }

    renderer.render(scene, camera);
  }

  loop();
}
