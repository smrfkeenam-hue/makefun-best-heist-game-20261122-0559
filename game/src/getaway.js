// Velvet Vault — the getaway.
// One job: the drive out. The thief steers the van to the rendezvous while
// police cars hunt it and the heat meter climbs whenever one gets close.
// Reach the marker before the heat fills, or the job ends in cuffs.

import { GETAWAY, WORLD_W, WORLD_H } from './config.js';
import { pushOutOfRect, circleHitsRect } from './world.js';

export function makeGetaway(plaza, rng) {
  const van = {
    x: plaza.start.x,
    y: plaza.start.y,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    radius: 20,
  };
  const police = [];
  const spawns = [
    { x: 120, y: 120 },
    { x: 1320, y: 300 },
    { x: 240, y: 480 },
  ];
  for (let i = 0; i < GETAWAY.policeCount; i++) {
    police.push({
      x: spawns[i].x + rng.range(-30, 30),
      y: spawns[i].y + rng.range(-30, 30),
      vx: 0,
      vy: 0,
      angle: 0,
      radius: 18,
      sirenPhase: rng.range(0, Math.PI * 2),
    });
  }
  return {
    van,
    police,
    heat: 0,
    time: 0,
    rams: 0,
    finished: false,
    busted: false,
    obstacles: plaza.obstacles,
    rendezvous: plaza.rendezvous,
  };
}

function steerCar(car, tx, ty, dt, maxSpeed, accel) {
  const dx = tx - car.x;
  const dy = ty - car.y;
  const d = Math.hypot(dx, dy);
  if (d < 1) return;
  car.vx += (dx / d) * accel * dt;
  car.vy += (dy / d) * accel * dt;
  const speed = Math.hypot(car.vx, car.vy);
  if (speed > maxSpeed) {
    car.vx = (car.vx / speed) * maxSpeed;
    car.vy = (car.vy / speed) * maxSpeed;
  }
  car.x += car.vx * dt;
  car.y += car.vy * dt;
  car.angle = Math.atan2(car.vy, car.vx);
}

export function updateGetaway(g, dt, input) {
  g.time += dt;
  const v = g.van;

  // The van answers like a car: thrust in the direction the keys point,
  // with drag so it coasts instead of stopping dead.
  let ax = 0;
  let ay = 0;
  if (input.left) ax -= 1;
  if (input.right) ax += 1;
  if (input.up) ay -= 1;
  if (input.down) ay += 1;
  if (ax !== 0 || ay !== 0) {
    const len = Math.hypot(ax, ay);
    v.vx += (ax / len) * GETAWAY.vanAccel * dt;
    v.vy += (ay / len) * GETAWAY.vanAccel * dt;
  }
  v.vx *= 1 - 1.6 * dt;
  v.vy *= 1 - 1.6 * dt;
  const speed = Math.hypot(v.vx, v.vy);
  if (speed > GETAWAY.vanSpeed) {
    v.vx = (v.vx / speed) * GETAWAY.vanSpeed;
    v.vy = (v.vy / speed) * GETAWAY.vanSpeed;
  }
  v.x += v.vx * dt;
  v.y += v.vy * dt;
  if (speed > 20) v.angle = Math.atan2(v.vy, v.vx);
  v.x = Math.max(v.radius, Math.min(WORLD_W - v.radius, v.x));
  v.y = Math.max(v.radius, Math.min(WORLD_H - v.radius, v.y));
  for (const o of g.obstacles) {
    const fixed = pushOutOfRect(v.x, v.y, v.radius, o);
    if (fixed.x !== v.x || fixed.y !== v.y) {
      v.vx *= 0.3;
      v.vy *= 0.3;
    }
    v.x = fixed.x;
    v.y = fixed.y;
  }

  // Police steer at the van, a touch slower than it at full tilt.
  let nearest = Infinity;
  for (const p of g.police) {
    steerCar(p, v.x, v.y, dt, GETAWAY.policeSpeed, 480);
    p.x = Math.max(p.radius, Math.min(WORLD_W - p.radius, p.x));
    p.y = Math.max(p.radius, Math.min(WORLD_H - p.radius, p.y));
    for (const o of g.obstacles) {
      const fixed = pushOutOfRect(p.x, p.y, p.radius, o);
      p.x = fixed.x;
      p.y = fixed.y;
    }
    const d = Math.hypot(p.x - v.x, p.y - v.y);
    nearest = Math.min(nearest, d);
    // A ram: a jolt, a heat spike, and the police car bounces off.
    if (d < v.radius + p.radius + 2) {
      const nx = (v.x - p.x) / (d || 1);
      const ny = (v.y - p.y) / (d || 1);
      v.vx += nx * 260;
      v.vy += ny * 260;
      p.vx -= nx * 180;
      p.vy -= ny * 180;
      g.heat = Math.min(100, g.heat + GETAWAY.ramHeat);
      g.rams += 1;
    }
  }

  // Heat builds near police, bleeds away when the van shakes them.
  if (nearest < GETAWAY.heatNear) {
    g.heat = Math.min(100, g.heat + GETAWAY.heatRate * dt);
  } else {
    g.heat = Math.max(0, g.heat - GETAWAY.heatDecay * dt);
  }
  if (g.heat >= 100) g.busted = true;

  // Reached the rendezvous?
  const rd = Math.hypot(v.x - g.rendezvous.x, v.y - g.rendezvous.y);
  if (rd < g.rendezvous.r) g.finished = true;
  return g;
}

export function getawayDistance(g) {
  return Math.hypot(g.van.x - g.rendezvous.x, g.van.y - g.rendezvous.y);
}

export { circleHitsRect };
