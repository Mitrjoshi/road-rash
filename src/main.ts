import * as THREE from "three";

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 2, 5.5);
camera.lookAt(0, 0, 0);

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.style.position = "absolute";
renderer.domElement.style.zIndex = "0";
document.body.appendChild(renderer.domElement);

// Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Lights ---
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(10, 20, 10);
scene.add(dirLight);

// --- Loader UI ---
const loaderDiv = document.createElement("div");
Object.assign(loaderDiv.style, {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  fontSize: "24px",
  fontFamily: "Arial, sans-serif",
  color: "white",
  zIndex: "11",
});
loaderDiv.innerText = "Loading: 0%";
document.body.appendChild(loaderDiv);

// --- Status UI ---
const statusDiv = document.createElement("div");
Object.assign(statusDiv.style, {
  position: "absolute",
  top: "20px",
  right: "20px",
  fontSize: "24px",
  fontFamily: "Arial, sans-serif",
  color: "white",
  backgroundColor: "rgba(0,0,0,0.5)",
  padding: "10px 15px",
  borderRadius: "8px",
  zIndex: "12",
});
statusDiv.innerText = "Speed: 0 km/h | Gear: N";
document.body.appendChild(statusDiv);

// --- Road Rash Style Start Screen ---
const startScreen = document.createElement("div");
Object.assign(startScreen.style, {
  position: "absolute",
  top: "0",
  left: "0",
  width: "100%",
  height: "100%",
  backgroundImage: "url('/assets/images/start-bg.jpg')",
  backgroundSize: "cover",
  backgroundPosition: "center",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  zIndex: "99",
  color: "white",
  fontFamily: "'Press Start 2P', monospace",
  backgroundColor: "rgba(0,0,0,1)",
});

// Title
const title = document.createElement("h1");
title.innerText = "ROAD RASH 3D";
Object.assign(title.style, {
  fontSize: "64px",
  marginBottom: "50px",
  textShadow: "0 0 20px red, 0 0 40px orange",
  animation: "glow 1.5s infinite alternate",
});
startScreen.appendChild(title);

// Menu
const menu = document.createElement("div");
Object.assign(menu.style, {
  display: "flex",
  flexDirection: "column",
  gap: "20px",
  textAlign: "center",
});
startScreen.appendChild(menu);

const options = ["Start Game", "Options", "Exit"];
let selectedIndex = 0;
const buttons: HTMLDivElement[] = [];

options.forEach((opt, i) => {
  const btn = document.createElement("div");
  btn.innerText = opt;
  Object.assign(btn.style, {
    fontSize: "28px",
    cursor: "pointer",
    padding: "10px 20px",
    borderRadius: "6px",
    transition: "all 0.2s",
    textShadow: "0 0 10px black",
  });
  btn.onclick = () => handleMenuSelect(opt);
  buttons.push(btn);
  menu.appendChild(btn);
});

function updateSelection() {
  buttons.forEach((btn, i) => {
    if (i === selectedIndex) {
      btn.style.background = "rgba(255, 0, 0, 0.8)";
      btn.style.transform = "scale(1.1)";
    } else {
      btn.style.background = "transparent";
      btn.style.transform = "scale(1)";
    }
  });
}
updateSelection();

window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowUp") {
    selectedIndex = (selectedIndex - 1 + options.length) % options.length;
    updateSelection();
  }
  if (e.key === "ArrowDown") {
    selectedIndex = (selectedIndex + 1) % options.length;
    updateSelection();
  }
  if (e.key === "Enter") {
    handleMenuSelect(options[selectedIndex]);
  }
});

function handleMenuSelect(opt: string) {
  if (opt === "Start Game") {
    document.body.removeChild(startScreen);
    startGame();
  } else if (opt === "Options") {
    alert("Options not implemented yet!");
  } else if (opt === "Exit") {
    startScreen.style.display = "none"; // safe exit
  }
}
document.body.appendChild(startScreen);

// Glow animation
const styleTag = document.createElement("style");
styleTag.innerHTML = `
@keyframes glow {
  from { text-shadow: 0 0 10px red, 0 0 20px orange; }
  to   { text-shadow: 0 0 20px yellow, 0 0 40px red; }
}
`;
document.head.appendChild(styleTag);

// --- Load Models ---
async function loadModels() {
  const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader");
  const loader = new GLTFLoader();

  const paths = [
    "/assets/models/road.glb",
    "/assets/models/sky.glb",
    "/assets/models/bike.glb",
    "/assets/models/street_light.glb",
    "/assets/models/road_block.glb",
    "/assets/models/starry_night.glb",
    "/assets/models/milkyway.glb",
    "/assets/models/tree.glb",
    "/assets/models/road_fence.glb",
    "/assets/models/buildings.glb",
  ];

  return new Promise<{ [key: string]: THREE.Object3D }>((resolve) => {
    const loadedModels: { [key: string]: THREE.Object3D } = {};
    let loadedCount = 0;

    paths.forEach((path) => {
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
              resolve(loadedModels);
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
  });
}

// --- Bootstrap ---
async function startGame() {
  const models = await loadModels();

  const { initScene } = await import("./sceneSetup");
  const {
    bike,
    segmentLength,
    frontTyre,
    rearTyre,
    desiredWidth,
    obstacles,
    recycleSegments,
    roadGroups,
  } = initScene(models, scene, camera);

  const { setupControls, controlState } = await import("./controls");
  setupControls();

  const { animate } = await import("./animate");
  animate({
    scene,
    camera,
    renderer,
    bike,
    segmentLength,
    controlState,
    statusDiv,
    frontTyre,
    rearTyre,
    desiredWidth,
    models,
    obstacles,
    recycleSegments,
    roadGroups,
  });
}
