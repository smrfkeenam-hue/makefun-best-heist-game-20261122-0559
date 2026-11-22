// Velvet Vault — the floors the heist plays on.
// One job: build the bank interior and the getaway plaza as data. No logic
// lives here; guards, cameras and the player read these layouts.

import { WORLD_W, WORLD_H, LOOT_VAULT, LOOT_SAFE, LOOT_ART, GETAWAY } from './config.js';

// A wall or cover block: { x, y, w, h } in world units, top-left origin.
// Doors are gaps between wall segments, drawn from the `doors` list.
export function buildBank() {
  const T = 24; // wall thickness
  const walls = [
    // Outer shell (south wall leaves the lobby-door gap at x 660..780).
    { x: 0, y: 0, w: WORLD_W, h: T },
    { x: 0, y: WORLD_H - T, w: 660, h: T },
    { x: 780, y: WORLD_H - T, w: WORLD_W - 780, h: T },
    { x: 0, y: 0, w: T, h: WORLD_H },
    { x: WORLD_W - T, y: 0, w: T, h: WORLD_H },
    // Vault chamber, top right: x 980..1360, y 60..300.
    // West wall with a door gap at y 200..260.
    { x: 980, y: 60, w: T, h: 140 },
    { x: 980, y: 260, w: T, h: 40 },
    // North wall of the chamber.
    { x: 980, y: 60, w: 380, h: T },
    // South wall with the vault door gap at x 1120..1200.
    { x: 980, y: 276, w: 140, h: T },
    { x: 1200, y: 276, w: 160, h: T },
    // West office, top left: x 60..420, y 80..300.
    { x: 60, y: 80, w: 360, h: T },
    { x: 60, y: 80, w: T, h: 220 },
    // East wall of the west office, door gap at y 170..230.
    { x: 396, y: 80, w: T, h: 90 },
    { x: 396, y: 230, w: T, h: 70 },
    { x: 60, y: 276, w: 360, h: T },
    // East office, bottom right: x 1020..1360, y 560..820.
    // North wall with a door gap at x 1140..1220.
    { x: 1020, y: 560, w: 120, h: T },
    { x: 1220, y: 560, w: 140, h: T },
    { x: 1020, y: 560, w: T, h: 260 },
    { x: 1020, y: 796, w: 340, h: T },
  ];

  const doors = [
    { x: 660, y: WORLD_H - T, w: 120, h: T, name: 'lobby' },
    { x: 1120, y: 276, w: 80, h: T, name: 'vault' },
    { x: 980, y: 200, w: T, h: 60, name: 'vault-side' },
    { x: 396, y: 170, w: T, h: 60, name: 'office-west' },
    { x: 1140, y: 560, w: 80, h: T, name: 'office-east' },
  ];

  // Cover blocks vision and movement: pillars, desks, planters, cases.
  const cover = [
    { x: 520, y: 380, w: 44, h: 44, kind: 'pillar' },
    { x: 880, y: 380, w: 44, h: 44, kind: 'pillar' },
    { x: 520, y: 640, w: 44, h: 44, kind: 'pillar' },
    { x: 880, y: 640, w: 44, h: 44, kind: 'pillar' },
    { x: 470, y: 470, w: 130, h: 42, kind: 'desk' },
    { x: 840, y: 470, w: 130, h: 42, kind: 'desk' },
    { x: 620, y: 560, w: 200, h: 42, kind: 'desk' },
    { x: 120, y: 430, w: 40, h: 40, kind: 'planter' },
    { x: 1280, y: 430, w: 40, h: 40, kind: 'planter' },
    { x: 660, y: 120, w: 120, h: 40, kind: 'case' },
    { x: 240, y: 660, w: 120, h: 40, kind: 'case' },
    { x: 1080, y: 660, w: 40, h: 120, kind: 'case' },
  ];

  const loot = [
    { id: 'vault', kind: 'vault', x: 1170, y: 170, value: LOOT_VAULT, taken: false, label: 'Meridian Vault' },
    { id: 'safe-w', kind: 'safe', x: 200, y: 180, value: LOOT_SAFE, taken: false, label: 'West Safe' },
    { id: 'safe-e', kind: 'safe', x: 1200, y: 700, value: LOOT_SAFE, taken: false, label: 'East Safe' },
    { id: 'art-1', kind: 'art', x: 80, y: 480, value: LOOT_ART, taken: false, label: 'Portrait of a Lady' },
    { id: 'art-2', kind: 'art', x: 1360, y: 470, value: LOOT_ART, taken: false, label: 'Harbour at Dusk' },
    { id: 'art-3', kind: 'art', x: 500, y: 850, value: LOOT_ART, taken: false, label: 'The Brass Bowl' },
  ];

  // Cameras: wall mounts that sweep a cone. Angle 0 faces east, PI/2 south.
  const cameras = [
    { x: 720, y: 34, baseAngle: Math.PI / 2, label: 'Hall Cam' },
    { x: 34, y: 450, baseAngle: 0, label: 'West Cam' },
    { x: 1406, y: 420, baseAngle: Math.PI, label: 'Vault Cam' },
  ];

  // Guards: patrol waypoints, or a fixed post with a slow sweep.
  const guardSpawns = [
    { x: 400, y: 330, waypoints: [[400, 330], [1000, 330], [1000, 700], [400, 700]], label: 'Hall Patrol' },
    { x: 300, y: 180, waypoints: [[300, 180], [900, 180]], label: 'North Patrol' },
    { x: 300, y: 760, waypoints: [[300, 760], [950, 760]], label: 'South Patrol' },
    { x: 1250, y: 350, waypoints: [[1250, 350], [1250, 520]], label: 'Vault Patrol' },
    { x: 1160, y: 330, waypoints: null, face: Math.PI / 2, label: 'Vault Door Guard' },
  ];

  const exits = [{ x: 720, y: WORLD_H - 40, r: 55, name: 'lobby doors' }];

  return { walls, doors, cover, loot, cameras, guardSpawns, exits };
}

// The plaza outside: open streets, roadblocks and the rendezvous point.
export function buildPlaza() {
  const obstacles = [
    { x: 300, y: 300, w: 90, h: 34, kind: 'roadblock' },
    { x: 900, y: 480, w: 90, h: 34, kind: 'roadblock' },
    { x: 560, y: 180, w: 90, h: 34, kind: 'roadblock' },
    { x: 180, y: 620, w: 120, h: 120, kind: 'fountain' },
    { x: 1120, y: 620, w: 60, h: 60, kind: 'planter' },
    { x: 420, y: 640, w: 60, h: 60, kind: 'planter' },
  ];
  return {
    obstacles,
    rendezvous: GETAWAY.rendezvous,
    start: GETAWAY.start,
  };
}

// Circle-vs-rectangle test, used for movement collision.
export function circleHitsRect(cx, cy, r, rect) {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

// Push a circle out of a rectangle it overlaps. Returns the corrected point.
export function pushOutOfRect(cx, cy, r, rect) {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  let dx = cx - nx;
  let dy = cy - ny;
  const d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return { x: cx, y: cy };
  if (d2 === 0) {
    // Centre is inside the rect: push out along the smallest penetration.
    const left = cx - rect.x;
    const right = rect.x + rect.w - cx;
    const top = cy - rect.y;
    const bottom = rect.y + rect.h - cy;
    const m = Math.min(left, right, top, bottom);
    if (m === left) return { x: rect.x - r, y: cy };
    if (m === right) return { x: rect.x + rect.w + r, y: cy };
    if (m === top) return { x: cx, y: rect.y - r };
    return { x: cx, y: rect.y + rect.h + r };
  }
  const d = Math.sqrt(d2);
  dx /= d;
  dy /= d;
  return { x: nx + dx * r, y: ny + dy * r };
}
