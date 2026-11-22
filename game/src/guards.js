// Velvet Vault — the guards.
// One job: patrol, watch, suspect, chase. A guard walks its route, sweeps
// its cone, and only runs at the thief once the alarm says so — or once it
// has stared at the thief long enough to be sure.

import {
  GUARD_RADIUS,
  GUARD_WALK_SPEED,
  GUARD_CHASE_SPEED,
  GUARD_VIEW_RANGE,
  GUARD_VIEW_HALF_ANGLE,
  GUARD_CATCH_RANGE,
} from './config.js';
import { watchSees } from './vision.js';
import { pushOutOfRect } from './world.js';

export function makeGuard(spawn, index) {
  const patrol = spawn.waypoints ? spawn.waypoints.map(([x, y]) => ({ x, y })) : null;
  return {
    id: index,
    label: spawn.label,
    x: spawn.x,
    y: spawn.y,
    homeX: spawn.x,
    homeY: spawn.y,
    facing: spawn.face ?? -Math.PI / 2,
    patrol,
    waypointIndex: 1 % (patrol ? patrol.length : 1),
    state: 'patrol', // patrol | investigate | chase | return
    suspect: 0, // 0..1: how sure this guard is that something is wrong
    investigateTarget: null,
    sweepPhase: index * 1.7,
    seenPlayer: false,
    range: GUARD_VIEW_RANGE,
    halfAngle: GUARD_VIEW_HALF_ANGLE,
    radius: GUARD_RADIUS,
  };
}

function moveToward(g, tx, ty, speed, dt, solids) {
  const dx = tx - g.x;
  const dy = ty - g.y;
  const d = Math.hypot(dx, dy);
  if (d < 1) return true;
  const step = Math.min(d, speed * dt);
  g.x += (dx / d) * step;
  g.y += (dy / d) * step;
  g.facing = Math.atan2(dy, dx);
  for (const s of solids) {
    const fixed = pushOutOfRect(g.x, g.y, g.radius, s);
    g.x = fixed.x;
    g.y = fixed.y;
  }
  return d <= speed * dt + 1;
}

export function updateGuard(g, dt, ctx) {
  const { player, solids, clouds, alarmActive, time } = ctx;
  g.seenPlayer = watchSees(g, player, solids, clouds) === 'seen';

  if (g.seenPlayer) {
    // Staring builds suspicion; sneaking slows it.
    const rate = player.sneaking ? 0.5 : 1.1;
    g.suspect = Math.min(1, g.suspect + rate * dt);
  } else {
    g.suspect = Math.max(0, g.suspect - 0.35 * dt);
  }

  // Sure of something wrong: go look at where the thief was last seen.
  if (g.suspect >= 1 && g.state === 'patrol') {
    g.state = 'investigate';
    g.investigateTarget = { x: player.x, y: player.y, wait: 0 };
  }

  if (alarmActive) {
    g.state = 'chase';
  } else if (g.state === 'chase' && g.suspect <= 0) {
    g.state = 'return';
  } else if (g.state === 'investigate' && g.investigateTarget === null) {
    g.state = 'return';
  }

  if (g.state === 'chase') {
    moveToward(g, player.x, player.y, GUARD_CHASE_SPEED, dt, solids);
    return;
  }

  if (g.state === 'investigate' && g.investigateTarget) {
    const arrived = moveToward(g, g.investigateTarget.x, g.investigateTarget.y, GUARD_WALK_SPEED * 1.25, dt, solids);
    if (arrived) {
      // Look around for a moment, then give up.
      g.facing += Math.sin(time * 2 + g.sweepPhase) * 0.9 * dt;
      g.investigateTarget.wait = (g.investigateTarget.wait ?? 0) + dt;
      if (g.investigateTarget.wait > 2.5) g.investigateTarget = null;
    }
    return;
  }

  if (g.state === 'return') {
    const home = g.patrol ? g.patrol[0] : { x: g.homeX, y: g.homeY };
    const arrived = moveToward(g, home.x, home.y, GUARD_WALK_SPEED, dt, solids);
    if (arrived) {
      g.state = 'patrol';
      g.waypointIndex = 1 % (g.patrol ? g.patrol.length : 1);
    }
    return;
  }

  // Patrol: walk the waypoints, or sweep in place at a fixed post.
  if (!g.patrol) {
    g.facing = (g.facing + Math.sin(time * 0.6 + g.sweepPhase) * 0.35 * dt) % (Math.PI * 2);
    return;
  }
  const target = g.patrol[g.waypointIndex];
  const arrived = moveToward(g, target.x, target.y, GUARD_WALK_SPEED, dt, solids);
  if (arrived) g.waypointIndex = (g.waypointIndex + 1) % g.patrol.length;
}

// Send a guard to look at a spot (the decoy coin's job).
export function sendGuardTo(guard, x, y) {
  if (guard.state === 'chase') return;
  guard.state = 'investigate';
  guard.investigateTarget = { x, y, wait: 0 };
}

// True when the guard has the thief in hand.
export function guardCatches(g, player) {
  const dx = g.x - player.x;
  const dy = g.y - player.y;
  return dx * dx + dy * dy < GUARD_CATCH_RANGE * GUARD_CATCH_RANGE;
}
