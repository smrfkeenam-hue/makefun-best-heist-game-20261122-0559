// Velvet Vault — staged scenes and the autopilot.
// One job: put the game into a photogenic state for a screenshot, and drive
// the whole job hands-free for verification. A scene is a real game state —
// the same update and draw code runs on it — never a faked picture.
//
//   ?scene=cover    mid-heist: thief, cones, cameras, loot, alarm in one frame
//   ?scene=vault    the vault crack, guard closing in
//   ?scene=getaway  the drive out, police on the van's tail
//   ?scene=planning the plan table, half-filled
//   ?auto=1         the autopilot plays the job end to end

import { VIEW_W, VIEW_H, WORLD_W, WORLD_H } from './config.js';

export function sceneFromUrl() {
  try {
    return new URLSearchParams(window.location.search).get('scene');
  } catch {
    return null;
  }
}

export function autoFromUrl() {
  try {
    return new URLSearchParams(window.location.search).get('auto') === '1';
  } catch {
    return false;
  }
}

function fitCamera() {
  const scale = Math.min(VIEW_W / WORLD_W, VIEW_H / WORLD_H);
  return { cx: WORLD_W / 2, cy: WORLD_H / 2, scale };
}

// Stage the heist mid-run: the thief crossing the hall, guards on patrol
// with their cones out, cameras sweeping, the vault glowing, alarm at 34.
export function stageCover(s) {
  s.phase = 'heist';
  s.time = 6.4; // cones mid-sweep
  s.player.x = 700;
  s.player.y = 540;
  s.player.facing = -Math.PI / 2;
  s.player.loot = 180000;
  s.player.lootCount = 1;
  s.alarm.value = 34;
  // Guards caught mid-patrol, cones sweeping the hall.
  const spots = [
    { x: 620, y: 300, facing: 0.4 },
    { x: 900, y: 180, facing: Math.PI - 0.3 },
    { x: 420, y: 760, facing: -0.5 },
    { x: 1250, y: 430, facing: Math.PI / 2 },
    { x: 1160, y: 330, facing: Math.PI / 2 },
  ];
  s.guards.forEach((g, i) => {
    g.x = spots[i].x;
    g.y = spots[i].y;
    g.facing = spots[i].facing;
  });
  s.camera = fitCamera();
  s.objective = 'Crack the Meridian Vault';
  s.objectiveDetail = 'The vault is top right — mind the cones';
  s.objectiveTarget = { x: 1170, y: 170 };
  s.toast = { text: 'The hall is crawling. Read the cones before you move.', until: s.time + 30 };
}

export function stageVault(s) {
  s.phase = 'heist';
  s.time = 11.2;
  s.player.x = 1170;
  s.player.y = 215;
  s.player.facing = -Math.PI / 2;
  s.player.loot = 240000;
  s.player.lootCount = 2;
  const vault = s.bank.loot.find((l) => l.id === 'vault');
  s.player.cracking = { loot: vault, seconds: 5.2, total: 8 };
  s.alarm.value = 55;
  s.guards[4].x = 1160;
  s.guards[4].y = 360;
  s.guards[4].facing = -Math.PI / 2;
  s.guards[4].suspect = 0.7;
  s.guards[3].x = 1250;
  s.guards[3].y = 470;
  s.guards[3].facing = -Math.PI / 2;
  s.camera = { cx: 1130, cy: 300, scale: 1 };
  s.objective = 'Hold E — cracking the vault…';
  s.objectiveDetail = 'The vault guard is getting curious';
  s.objectiveTarget = { x: 1170, y: 170 };
  s.toast = { text: 'Almost there — hold still, hold E.', until: s.time + 30 };
}

export function stageGetaway(s) {
  s.startGetaway();
  s.time = 14.6;
  s.getaway.van.x = 880;
  s.getaway.van.y = 330;
  s.getaway.van.angle = -0.7;
  s.getaway.heat = 58;
  s.getaway.police[0].x = 700;
  s.getaway.police[0].y = 420;
  s.getaway.police[1].x = 1080;
  s.getaway.police[1].y = 480;
  s.getaway.police[2].x = 560;
  s.getaway.police[2].y = 200;
  // Tight on the van: the chase reads at a glance, rendezvous still in frame.
  s.camera = { cx: 880, cy: 330, scale: 1 };
  s.toast = { text: '', until: 0 };
}

export function stagePlanning(s) {
  s.phase = 'planning';
  s.planning.route = 1;
  s.planning.bought.smoke = true;
  s.planning.bought.lockpick = true;
}

// The autopilot: a scripted run through the whole job, used to verify the
// game is winnable end to end. It steers with the same input the player
// uses — no teleporting, no cheating.
export function makeAutopilot() {
  // Waypoints are hand-walked around every wall and desk: the autopilot
  // steers in straight lines, so a waypoint inside a wall would strand it.
  const steps = [
    { x: 300, y: 700, what: 'move' },
    { x: 450, y: 620, what: 'move' },
    { x: 450, y: 400, what: 'move' },
    { x: 460, y: 200, what: 'move' },
    { x: 408, y: 200, what: 'move' },
    { x: 230, y: 180, what: 'crack', loot: 'safe-w' },
    // Wait at the safe until the north patrol is east of the office and
    // walking away: the door opens onto its route, and stepping out
    // into the guard's arms ends the run.
    { what: 'wait', guard: 1, xMin: 550, timeout: 12 },
    { x: 460, y: 200, what: 'move' },
    { x: 700, y: 320, what: 'move' },
    { x: 1000, y: 330, what: 'move' },
    { x: 1130, y: 300, what: 'move' },
    { x: 1170, y: 215, what: 'crack', loot: 'vault' },
    { x: 1100, y: 360, what: 'move' },
    { x: 700, y: 360, what: 'move' },
    { x: 560, y: 420, what: 'move' },
    { x: 440, y: 500, what: 'move' },
    { x: 440, y: 650, what: 'move' },
    // Wait before crossing the south patrol's line: the lobby doors
    // are south of it, and the guard walks the crossing.
    { what: 'wait', guard: 2, xMin: 650, timeout: 12 },
    { x: 720, y: 850, what: 'move' },
  ];
  const driveSteps = [
    { x: 720, y: 600, what: 'drive' },
    { x: 760, y: 420, what: 'drive' },
    { x: 1100, y: 300, what: 'drive' },
    { x: 1290, y: 110, what: 'drive' },
  ];
  let step = 0;
  let driveStep = 0;
  let stuckTimer = 0;
  let sidestepTimer = 0;
  let sidestepSign = 1;
  let waitTimer = 0;
  let lastX = 0;
  let lastY = 0;
  return {
    get done() {
      return step >= steps.length && driveStep >= driveSteps.length;
    },
    update(s, dt) {
      const input = s.input;
      input.left = input.right = input.up = input.down = false;
      input.sneak = false;
      input.interact = false;
      if (s.phase === 'heist') {
        if (step >= steps.length) return;
        // Smoke first, before any early return: the vault crack is the
        // hottest moment, and a pellet bought for it must actually fire.
        if (s.alarm.value > 55 && s.player.tools.smoke > 0) s.useTool('smoke');
        const cur = steps[step];
        // A wait step holds position until its guard is past the
        // threshold and walking away (waypoint 1 = the east end of a
        // two-point route), or until the timeout — a missed window
        // must not strand the run.
        if (cur.what === 'wait') {
          const g = s.guards[cur.guard];
          waitTimer += dt;
          const clear = g.waypointIndex === 1 && g.x > cur.xMin;
          if (clear || waitTimer > cur.timeout) {
            step += 1;
            waitTimer = 0;
          }
          return;
        }
        const p = s.player;
        // A crack step steers at the loot itself: holding E only works
        // inside grab range of the loot, not of an arbitrary waypoint.
        const aim = cur.what === 'crack'
          ? s.bank.loot.find((l) => l.id === cur.loot)
          : cur;
        const dx = aim.x - p.x;
        const dy = aim.y - p.y;
        const d = Math.hypot(dx, dy);
        if (cur.what === 'crack') {
          const item = s.bank.loot.find((l) => l.id === cur.loot);
          if (item.taken) {
            step += 1;
            return;
          }
          if (d < 40) {
            input.interact = true;
            return;
          }
        } else if (d < 34) {
          step += 1;
          return;
        }
        // Steer toward the waypoint; if stuck against a wall, sidestep along
        // it for a fixed stretch — sticky, so a single free frame cannot
        // cancel the escape and trap the run in a jitter.
        if (Math.hypot(p.x - lastX, p.y - lastY) < 1) {
          stuckTimer += dt;
        } else {
          stuckTimer = 0;
        }
        lastX = p.x;
        lastY = p.y;
        let sx = dx;
        let sy = dy;
        if (stuckTimer > 0.6 && sidestepTimer <= 0) {
          sidestepTimer = 0.9;
          sidestepSign = -sidestepSign;
        }
        if (sidestepTimer > 0) {
          sidestepTimer -= dt;
          const tmp = sx;
          sx = -sy * sidestepSign;
          sy = tmp * sidestepSign;
        }
        if (sx < -8) input.left = true;
        if (sx > 8) input.right = true;
        if (sy < -8) input.up = true;
        if (sy > 8) input.down = true;
        return;
      }
      if (s.phase === 'getaway') {
        if (driveStep >= driveSteps.length) return;
        const cur = driveSteps[driveStep];
        const v = s.getaway.van;
        const dx = cur.x - v.x;
        const dy = cur.y - v.y;
        if (Math.hypot(dx, dy) < 60) {
          driveStep += 1;
          return;
        }
        if (dx < -20) input.left = true;
        if (dx > 20) input.right = true;
        if (dy < -20) input.up = true;
        if (dy > 20) input.down = true;
      }
    },
  };
}
