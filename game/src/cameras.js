// Velvet Vault — the security cameras.
// One job: sweep a cone back and forth along the wall, and report when the
// thief crosses it. An EMP burst blinds them for a while; smoke blinds them
// only while the thief stands inside the cloud.

import { CAMERA_RANGE, CAMERA_HALF_ANGLE, CAMERA_SWEEP, CAMERA_SWEEP_SPEED } from './config.js';
import { watchSees } from './vision.js';

export function makeCamera(def, index) {
  return {
    id: index,
    label: def.label,
    x: def.x,
    y: def.y,
    baseAngle: def.baseAngle,
    facing: def.baseAngle,
    phase: index * 2.1,
    disabledUntil: 0, // game time until which the EMP keeps it dark
    range: CAMERA_RANGE,
    halfAngle: CAMERA_HALF_ANGLE,
    seenPlayer: false,
  };
}

export function updateCamera(cam, dt, time, ctx) {
  // Sinusoidal sweep: slow at the ends, so the cone is readable.
  cam.facing = cam.baseAngle + Math.sin(time * CAMERA_SWEEP_SPEED + cam.phase) * CAMERA_SWEEP;
  if (time < cam.disabledUntil) {
    cam.seenPlayer = false;
    return;
  }
  cam.seenPlayer = watchSees(cam, ctx.player, ctx.solids, ctx.clouds) === 'seen';
}

export function cameraDisabled(cam, time) {
  return time < cam.disabledUntil;
}

export function disableCameras(cameras, time, seconds) {
  for (const cam of cameras) cam.disabledUntil = time + seconds;
}
