export const controlState = {
  accelerating: false,
  reversing: false,
  moveLeft: false,
  moveRight: false,
  doingWheelie: false,
};

export function setupControls() {
  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp" || e.key.toLowerCase() === "w")
      controlState.accelerating = true;
    if (e.key === "ArrowDown" || e.key.toLowerCase() === "s")
      controlState.reversing = true;
    if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a")
      controlState.moveLeft = true;
    if (e.key === "ArrowRight" || e.key.toLowerCase() === "d")
      controlState.moveRight = true;
    if (e.code === "Space") controlState.doingWheelie = true;
  });

  window.addEventListener("keyup", (e) => {
    if (e.key === "ArrowUp" || e.key.toLowerCase() === "w")
      controlState.accelerating = false;
    if (e.key === "ArrowDown" || e.key.toLowerCase() === "s")
      controlState.reversing = false;
    if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a")
      controlState.moveLeft = false;
    if (e.key === "ArrowRight" || e.key.toLowerCase() === "d")
      controlState.moveRight = false;
    if (e.code === "Space") controlState.doingWheelie = false;
  });
}
