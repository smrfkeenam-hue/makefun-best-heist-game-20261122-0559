// Velvet Vault — the thief's tools.
// One job: what each bought tool does when it is used, and how long its
// effect lasts. Tools are bought in planning with a cut of the take; this
// file only spends them.

import { disableCameras } from './cameras.js';
import { sendGuardTo } from './guards.js';

export const SMOKE_SECONDS = 6;
export const SMOKE_RADIUS = 95;
export const EMP_SECONDS = 8;
export const DECOY_RANGE = 520; // a guard further away never hears the coin

export function makeToolState() {
  return {
    clouds: [], // { x, y, r, until }
    decoyMark: null, // { x, y, until } shown where the coin landed
    flashes: [], // { x, y, until, kind } short visual pops
  };
}

export function updateTools(state, time) {
  state.clouds = state.clouds.filter((c) => time < c.until);
  if (state.decoyMark && time >= state.decoyMark.until) state.decoyMark = null;
  state.flashes = state.flashes.filter((f) => time < f.until);
}

// Use the smoke pellet: a cloud at the thief's feet.
export function useSmoke(player, state, time) {
  if (player.tools.smoke <= 0) return false;
  player.tools.smoke -= 1;
  state.clouds.push({ x: player.x, y: player.y, r: SMOKE_RADIUS, until: time + SMOKE_SECONDS });
  state.flashes.push({ x: player.x, y: player.y, until: time + 0.4, kind: 'smoke' });
  return true;
}

// Use the EMP burst: every camera goes dark for a while.
export function useEmp(player, cameras, state, time) {
  if (player.tools.emp <= 0) return false;
  player.tools.emp -= 1;
  disableCameras(cameras, time, EMP_SECONDS);
  state.flashes.push({ x: player.x, y: player.y, until: time + 0.5, kind: 'emp' });
  return true;
}

// Throw the decoy coin at a world point. The nearest guard in earshot
// walks over to look; the coin mark shows where it landed.
export function useDecoy(player, state, guards, wx, wy, time) {
  if (player.tools.decoy <= 0) return false;
  player.tools.decoy -= 1;
  let best = null;
  let bestD = DECOY_RANGE;
  for (const g of guards) {
    const d = Math.hypot(g.x - wx, g.y - wy);
    if (d < bestD) {
      bestD = d;
      best = g;
    }
  }
  if (best) sendGuardTo(best, wx, wy);
  state.decoyMark = { x: wx, y: wy, until: time + 3 };
  state.flashes.push({ x: wx, y: wy, until: time + 0.4, kind: 'decoy' });
  return true;
}
