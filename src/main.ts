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
loaderDiv.style.position = "absolute";
loaderDiv.style.top = "50%";
loaderDiv.style.left = "50%";
loaderDiv.style.transform = "translate(-50%, -50%)";
loaderDiv.style.fontSize = "24px";
loaderDiv.style.fontFamily = "Arial, sans-serif";
loaderDiv.style.color = "white";
loaderDiv.innerText = "Loading: 0%";
document.body.appendChild(loaderDiv);

// --- Status UI ---
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

// --- Road Rash Style Start Screen ---
const startScreen = document.createElement("div");
startScreen.style.position = "absolute";
startScreen.style.top = "0";
startScreen.style.left = "0";
startScreen.style.width = "100%";
startScreen.style.height = "100%";
startScreen.style.backgroundImage = "url('/assets/images/start-bg.jpg')"; // add a splash background
startScreen.style.backgroundSize = "cover";
startScreen.style.backgroundPosition = "center";
startScreen.style.display = "flex";
startScreen.style.flexDirection = "column";
startScreen.style.alignItems = "center";
startScreen.style.justifyContent = "center";
startScreen.style.zIndex = "10";
startScreen.style.color = "white";
startScreen.style.fontFamily = "'Press Start 2P', monospace"; // retro font (Google Fonts)
startScreen.style.backgroundColor = "rgba(0,0,0,1)";

// Title
const title = document.createElement("h1");
title.innerText = "ROAD RASH 3D";
title.style.fontSize = "64px";
title.style.marginBottom = "50px";
title.style.textShadow = "0 0 20px red, 0 0 40px orange";
title.style.animation = "glow 1.5s infinite alternate";
startScreen.appendChild(title);

// Menu container
const menu = document.createElement("div");
menu.style.display = "flex";
menu.style.flexDirection = "column";
menu.style.gap = "20px";
menu.style.textAlign = "center";
startScreen.appendChild(menu);

// Menu options
const options = ["Start Game", "Options", "Exit"];
let selectedIndex = 0;
const buttons: HTMLDivElement[] = [];

options.forEach((opt, i) => {
  const btn = document.createElement("div");
  btn.innerText = opt;
  btn.style.fontSize = "28px";
  btn.style.cursor = "pointer";
  btn.style.padding = "10px 20px";
  btn.style.borderRadius = "6px";
  btn.style.transition = "all 0.2s";
  btn.style.textShadow = "0 0 10px black";

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

// Keyboard navigation
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

// Handle actions
function handleMenuSelect(opt: string) {
  if (opt === "Start Game") {
    document.body.removeChild(startScreen);
    startGame();
  } else if (opt === "Options") {
    alert("Options not implemented yet!");
  } else if (opt === "Exit") {
    window.close(); // only works for opened windows; can just hide instead
    startScreen.style.display = "none";
  }
}

document.body.appendChild(startScreen);

// Add glow animation to the page
const styleTag = document.createElement("style");
styleTag.innerHTML = `
@keyframes glow {
  from { text-shadow: 0 0 10px red, 0 0 20px orange; }
  to   { text-shadow: 0 0 20px yellow, 0 0 40px red; }
}
`;
document.head.appendChild(styleTag);

// --- Lazy load GLTFLoader and scene setup ---
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

  // Load scene setup
  const { initScene } = await import("./sceneSetup");
  const {
    bike,
    segmentLength,
    frontTyre,
    rearTyre,
    desiredWidth,
    obstacles,
    recycleSegments,
    roadGroups, // ✅ new name
  } = initScene(models, scene, camera);

  // Setup controls
  const { setupControls, controlState } = await import("./controls");
  setupControls();

  // Start animation
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
