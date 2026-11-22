// Velvet Vault — seeing and being seen.
// One job: the geometry every watcher uses. A watcher sees the thief only
// when the thief is inside its cone, in range, in line of sight, and not
// hidden by smoke.

// Does segment (x1,y1)-(x2,y2) cross rectangle r? Slab test.
export function segmentHitsRect(x1, y1, x2, y2, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tmin = 0;
  let tmax = 1;
  if (dx === 0) {
    if (x1 < r.x || x1 > r.x + r.w) return false;
  } else {
    let t1 = (r.x - x1) / dx;
    let t2 = (r.x + r.w - x1) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (dy === 0) {
    if (y1 < r.y || y1 > r.y + r.h) return false;
  } else {
    let t1 = (r.y - y1) / dy;
    let t2 = (r.y + r.h - y1) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

// Line of sight: true when no wall or cover block stands between the points.
export function hasLineOfSight(x1, y1, x2, y2, blockers) {
  for (const b of blockers) {
    if (segmentHitsRect(x1, y1, x2, y2, b)) return false;
  }
  return true;
}

// Is the target inside the watcher's cone? Facing angle, half-angle, range.
export function inCone(wx, wy, facing, halfAngle, range, tx, ty) {
  const dx = tx - wx;
  const dy = ty - wy;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (dist < 1) return true;
  const targetAngle = Math.atan2(dy, dx);
  let diff = targetAngle - facing;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff) <= halfAngle;
}

// Is the point inside any active smoke cloud?
export function inSmoke(x, y, clouds) {
  for (const c of clouds) {
    const dx = x - c.x;
    const dy = y - c.y;
    if (dx * dx + dy * dy < c.r * c.r) return true;
  }
  return false;
}

// Full visibility test for one watcher. Returns 'hidden' | 'seen'.
export function watchSees(watcher, target, blockers, clouds) {
  if (inSmoke(target.x, target.y, clouds)) return 'hidden';
  if (inSmoke(watcher.x, watcher.y, clouds)) return 'hidden';
  if (!inCone(watcher.x, watcher.y, watcher.facing, watcher.halfAngle, watcher.range, target.x, target.y)) {
    return 'hidden';
  }
  if (!hasLineOfSight(watcher.x, watcher.y, target.x, target.y, blockers)) return 'hidden';
  return 'seen';
}

// Where a cone's edge ray stops: the range, or the first wall it hits.
// Used to draw cones that hug the room instead of passing through walls.
export function coneRayEnd(wx, wy, angle, range, blockers) {
  let best = range;
  const ex = wx + Math.cos(angle) * range;
  const ey = wy + Math.sin(angle) * range;
  for (const b of blockers) {
    // Sample along the ray; cheap and smooth enough for a drawn cone.
    for (let t = 0.05; t < 1; t += 0.05) {
      const px = wx + (ex - wx) * t;
      const py = wy + (ey - wy) * t;
      if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) {
        best = Math.min(best, range * t);
        break;
      }
    }
  }
  return { x: wx + Math.cos(angle) * best, y: wy + Math.sin(angle) * best };
}
