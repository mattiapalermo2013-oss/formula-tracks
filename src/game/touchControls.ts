// Shared touch-input state, mutated by on-screen buttons and read by Car
// alongside the keyboard. Not persisted, not reactive on purpose.
export const touchInput = {
  accelerate: false,
  brake: false,
  left: false,
  right: false,
  handbrake: false,
  reset: false,
};

export function resetTouchInput() {
  touchInput.accelerate = false;
  touchInput.brake = false;
  touchInput.left = false;
  touchInput.right = false;
  touchInput.handbrake = false;
  touchInput.reset = false;
}
