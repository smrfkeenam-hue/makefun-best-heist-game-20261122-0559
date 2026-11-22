// Velvet Vault — the thief.
// One job: move, sneak, grab loot and crack the vault. The player never
// decides what the guards do; it only reports where it is and what it holds.

import {
  PLAYER_RADIUS,
  PLAYER_WALK_SPEED,
  PLAYER_SNEAK_SPEED,
  PLAYER_GRAB_RANGE,
  VAULT_CRACK_SECONDS,
  VAULT_CRACK_LOCKPICK_SECONDS,
  SAFE_CRACK_SECONDS,
} from './config.js';
import { pushOutOfRect } from './world.js';

export function makePlayer(spawn, loadout) {
  return {
    x: spawn.x,
    y: spawn.y,
    radius: PLAYER_RADIUS,
    facing: -Math.PI / 2,
    sneaking: false,
    moving: false,
    loot: 0,
    lootCount: 0,
    vaultSecured: false,
    tools: {
      smoke: loadout.smoke ? 2 : 0,
      emp: loadout.emp ? 1 : 0,
      decoy: loadout.decoy ? 2 : 0,
      lockpick: !!loadout.lockpick,
    },
    cracking: null, // { loot, seconds, total } while holding E on a target
  };
}

export function updatePlayer(p, dt, input, solids, worldBounds) {
  let mx = 0;
  let my = 0;
  if (input.left) mx -= 1;
  if (input.right) mx += 1;
  if (input.up) my -= 1;
  if (input.down) my += 1;
  p.moving = mx !== 0 || my !== 0;
  p.sneaking = !!input.sneak;
  if (p.moving) {
    const len = Math.hypot(mx, my);
    const speed = p.sneaking ? PLAYER_SNEAK_SPEED : PLAYER_WALK_SPEED;
    p.x += (mx / len) * speed * dt;
    p.y += (my / len) * speed * dt;
    p.facing = Math.atan2(my, mx);
  }
  // Keep the thief inside the floor.
  p.x = Math.max(p.radius, Math.min(worldBounds.w - p.radius, p.x));
  p.y = Math.max(p.radius, Math.min(worldBounds.h - p.radius, p.y));
  for (const s of solids) {
    const fixed = pushOutOfRect(p.x, p.y, p.radius, s);
    p.x = fixed.x;
    p.y = fixed.y;
  }
}

// The nearest loot the thief can reach right now, or null.
export function nearestLoot(p, loot) {
  let best = null;
  let bestD = PLAYER_GRAB_RANGE;
  for (const item of loot) {
    if (item.taken) continue;
    const d = Math.hypot(item.x - p.x, item.y - p.y);
    if (d < bestD) {
      bestD = d;
      best = item;
    }
  }
  return best;
}

// How long this target takes to open, in seconds.
export function crackTimeFor(p, item) {
  if (item.kind === 'vault') return p.tools.lockpick ? VAULT_CRACK_LOCKPICK_SECONDS : VAULT_CRACK_SECONDS;
  if (item.kind === 'safe') return SAFE_CRACK_SECONDS;
  return 0; // art is snatched at once
}

// Hold-to-crack progress. Call every frame with whether E is held.
// Returns the finished loot item, or null.
export function updateCracking(p, dt, target, interactHeld) {
  if (!target || !interactHeld) {
    p.cracking = null;
    return null;
  }
  const total = crackTimeFor(p, target);
  if (total === 0) {
    target.taken = true;
    p.loot += target.value;
    p.lootCount += 1;
    p.cracking = null;
    return target;
  }
  if (!p.cracking || p.cracking.loot !== target) {
    p.cracking = { loot: target, seconds: 0, total };
  }
  p.cracking.seconds += dt;
  if (p.cracking.seconds >= total) {
    target.taken = true;
    p.loot += target.value;
    p.lootCount += 1;
    if (target.kind === 'vault') p.vaultSecured = true;
    p.cracking = null;
    return target;
  }
  return null;
}
