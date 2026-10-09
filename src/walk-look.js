const sensitivity = .0023;
const pitchLimit = 1.18;
const maxPointerTurn = 1; // A single packet must not teleport the view by over 57 degrees.

export function createWalkLook(camera) {
  let yaw = 0, pitch = 0, firstPointerSample = true;
  function apply() { camera.rotation.set(pitch, yaw, 0, 'YXZ'); }
  function set(nextYaw, nextPitch) {
    if (!Number.isFinite(nextYaw) || !Number.isFinite(nextPitch)) return false;
    yaw = Math.atan2(Math.sin(nextYaw), Math.cos(nextYaw));
    pitch = Math.max(-pitchLimit, Math.min(pitchLimit, nextPitch));
    apply();
    return true;
  }
  function turn(dx, dy) {
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return false;
    return set(yaw - dx * sensitivity, pitch - dy * sensitivity);
  }
  return {
    set, turn,
    get yaw() { return yaw; },
    get pitch() { return pitch; },
    beginPointerInput() { firstPointerSample = true; },
    pointer(dx, dy) {
      if (!Number.isFinite(dx) || !Number.isFinite(dy)) return false;
      // Locking/recentering can produce a stale first delta. It is not user movement.
      if (firstPointerSample) { firstPointerSample = false; return false; }
      // Discard a bad packet entirely; do not retain it as a delayed turn.
      if (Math.hypot(dx, dy) * sensitivity > maxPointerTurn) return false;
      return turn(dx, dy);
    }
  };
}
