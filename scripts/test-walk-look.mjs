import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { createWalkLook } from '../src/walk-look.js';

test('many complete turns stay continuous across the angle boundary', () => {
  const camera = new PerspectiveCamera(), look = createWalkLook(camera);
  const forward = new Vector3(), previous = new Quaternion();
  let totalYaw = 0;
  look.set(0, .8);
  for (let i = 0; i < 40000; i++) {
    previous.copy(camera.quaternion);
    look.turn(18, 0);
    totalYaw -= 18 * .0023;
    assert.ok(previous.angleTo(camera.quaternion) < .0415, 'no snap between samples');
    assert.ok(Math.abs(look.yaw) <= Math.PI);
    camera.getWorldDirection(forward);
    assert.ok(Math.abs(forward.x + Math.sin(totalYaw) * Math.cos(.8)) < 1e-8);
    assert.ok(Math.abs(forward.y - Math.sin(.8)) < 1e-10);
    assert.equal(camera.rotation.z, 0);
  }
});

test('locking and isolated bad packets cannot change or poison the view', () => {
  const camera = new PerspectiveCamera(), look = createWalkLook(camera);
  look.set(1.2, -.4);
  const before = camera.quaternion.clone();
  look.beginPointerInput();
  assert.equal(look.pointer(950, -480), false);
  assert.equal(look.pointer(1200, 0), false);
  assert.equal(look.pointer(0, -900), false);
  assert.equal(look.pointer(NaN, 1), false);
  assert.equal(look.pointer(1, Infinity), false);
  assert.ok(before.angleTo(camera.quaternion) < 1e-7);
  assert.equal(look.pointer(28, -4), true);
  assert.ok(Math.abs(look.yaw - (1.2 - 28 * .0023)) < 1e-12);
  assert.ok(Math.abs(look.pitch - (-.4 + 4 * .0023)) < 1e-12);
});

test('pitch limits and restored state keep the same direction without roll', () => {
  const camera = new PerspectiveCamera(), look = createWalkLook(camera);
  look.turn(2200, -9000);
  assert.equal(look.pitch, 1.18);
  const saved = { yaw: look.yaw, pitch: look.pitch }, before = camera.quaternion.clone();
  // The menu uses its own orbit orientation; restoring walking must use saved input state.
  camera.lookAt(20, 15, 30);
  look.set(saved.yaw, saved.pitch);
  assert.ok(before.angleTo(camera.quaternion) < 1e-7);
  look.turn(18, 9000);
  assert.equal(look.pitch, -1.18);
  assert.equal(camera.rotation.z, 0);
});
