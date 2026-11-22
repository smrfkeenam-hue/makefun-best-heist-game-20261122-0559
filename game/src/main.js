// Velvet Vault — the game itself.
// One job: the loop and the state machine. Title, planning, heist, getaway,
// caught, score — this file moves between them and hands each frame to the
// module that owns it.

import { VIEW_W, VIEW_H, WORLD_W, WORLD_H, ROUTES, GUARD_CATCH_RANGE, GUARD_CATCH_ALARM, money } from './config.js';
import { buildBank, buildPlaza, pushOutOfRect } from './world.js';
import { makeGuard, updateGuard, guardCatches } from './guards.js';
import { makeCamera, updateCamera } from './cameras.js';
import { makePlayer, updatePlayer, nearestLoot, updateCracking } from './player.js';
import { makeAlarm, updateAlarm } from './alarm.js';
import { makeToolState, updateTools, useSmoke, useEmp, useDecoy } from './tools.js';
import { makeGetaway, updateGetaway } from './getaway.js';
import { makeFloorLayer, makePlazaLayer, drawHeist, drawGetaway } from './render.js';
import { makePlanning, planningClick, planningKey, planningCut, planningLoadout, drawPlanning } from './planning.js';
import { drawTitle, drawCaught, drawScore } from './screens.js';
import { sceneFromUrl, autoFromUrl, stageCover, stageVault, stageGetaway, stagePlanning, makeAutopilot } from './scenes.js';
import { makeRng, seedFromUrl } from './random.js';
import { sfx, unlockAudio, toggleMute } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const testOut = document.getElementById('test-result');

const s = {
  phase: 'title', // title | planning | heist | getaway | caught | score
  time: 0,
  jobTime: 0,
  input: { left: false, right: false, up: false, down: false, sneak: false, interact: false },
  mouse: { x: VIEW_W / 2, y: VIEW_H / 2 },
  camera: { cx: WORLD_W / 2, cy: WORLD_H / 2, scale: 1 },
  planning: makePlanning(),
  bank: null,
  floorLayer: null,
  plazaLayer: null,
  guards: [],
  cameras: [],
  player: null,
  alarm: null,
  tools: null,
  getaway: null,
  objective: '',
  objectiveDetail: '',
  objectiveTarget: null,
  toast: { text: '', until: 0 },
  caughtReason: '',
  score: null,
  cutPercent: 0,
  lastExitToast: -10,
  grazeGraceUntil: -10,
  alarmWasActive: false,
  autopilot: null,
  auto: autoFromUrl(),
  rng: makeRng(seedFromUrl()),
};

function toast(text, seconds = 3) {
  s.toast = { text, until: s.time + seconds };
}

function startHeist() {
  s.bank = buildBank();
  s.floorLayer = makeFloorLayer(s.bank);
  const route = ROUTES[s.planning.route];
  const loadout = planningLoadout(s.planning);
  s.cutPercent = planningCut(s.planning);
  s.player = makePlayer(route.spawn, loadout);
  s.guards = s.bank.guardSpawns.map((spawn, i) => makeGuard(spawn, i));
  s.cameras = s.bank.cameras.map((def, i) => makeCamera(def, i));
  s.alarm = makeAlarm();
  s.tools = makeToolState();
  s.getaway = null;
  s.time = 0;
  s.jobTime = 0;
  s.camera = { cx: s.player.x, cy: s.player.y, scale: 1 };
  s.objective = 'Crack the Meridian Vault';
  s.objectiveDetail = 'Side loot is optional — the vault is the job';
  s.objectiveTarget = { x: 1170, y: 170 };
  s.phase = 'heist';
  s.alarmWasActive = false;
  toast(`In through the ${route.name}. Stay out of the cones.`, 4);
}

function startGetaway() {
  const plaza = buildPlaza();
  s.plazaLayer = makePlazaLayer(plaza);
  s.getaway = makeGetaway(plaza, s.rng);
  s.camera = { cx: s.getaway.van.x, cy: s.getaway.van.y, scale: 1 };
  s.phase = 'getaway';
  toast('To the van — the rendezvous is north-east!', 4);
}

s.startGetaway = startGetaway;

function useTool(name) {
  if (s.phase !== 'heist') return;
  if (name === 'smoke' && useSmoke(s.player, s.tools, s.time)) {
    toast('Smoke out — 6 seconds of cover.', 2);
    sfx.click();
  }
  if (name === 'emp' && useEmp(s.player, s.cameras, s.tools, s.time)) {
    toast('Cameras dark for 8 seconds.', 2);
    sfx.click();
  }
  if (name === 'decoy') {
    const w = screenToWorld(s.mouse.x, s.mouse.y);
    if (useDecoy(s.player, s.tools, s.guards, w.x, w.y, s.time)) {
      toast('Coin tossed — someone is going to look.', 2);
      sfx.click();
    }
  }
}
s.useTool = useTool;

function screenToWorld(sx, sy) {
  const cam = s.camera;
  return {
    x: (sx - VIEW_W / 2) / cam.scale + cam.cx,
    y: (sy - VIEW_H / 2) / cam.scale + cam.cy,
  };
}

function endCaught(reason) {
  s.caughtIn = s.phase;
  s.phase = 'caught';
  s.caughtReason = reason;
  sfx.caught();
  reportTest('CAUGHT: ' + reason);
}

function endScore() {
  s.phase = 'score';
  s.score = {
    loot: s.player.loot,
    lootCount: s.player.lootCount,
    cutPercent: s.cutPercent,
    ghost: !s.alarm.everTripped,
    timeSeconds: s.jobTime,
  };
  sfx.win();
  reportTest(`WIN loot=${s.player.loot} time=${Math.round(s.jobTime)}s`);
}

function updateHeist(dt) {
  s.time += dt;
  s.jobTime += dt;
  if (s.autopilot) s.autopilot.update(s, dt);
  const solids = [...s.bank.walls, ...s.bank.cover];
  updatePlayer(s.player, dt, s.input, solids, { w: WORLD_W, h: WORLD_H });
  for (const g of s.guards) {
    updateGuard(g, dt, { player: s.player, solids, clouds: s.tools.clouds, alarmActive: s.alarm.active, time: s.time });
  }
  for (const c of s.cameras) updateCamera(c, dt, s.time, { player: s.player, solids, clouds: s.tools.clouds });
  updateAlarm(s.alarm, dt, { guards: s.guards, cameras: s.cameras }, s.player.sneaking);
  updateTools(s.tools, s.time);
  if (s.alarm.active && !s.alarmWasActive) {
    toast('ALARM! Every guard is coming for you — run or hide!', 3);
    sfx.alarm();
  }
  s.alarmWasActive = s.alarm.active;

  // Grabbing and cracking.
  const target = nearestLoot(s.player, s.bank.loot);
  const finished = updateCracking(s.player, dt, target, s.input.interact);
  if (finished) {
    if (finished.kind === 'vault') {
      sfx.vaultOpen();
      toast(`VAULT OPEN — ${money(finished.value)} secured. Get to the lobby doors!`, 4);
      s.objective = 'Escape through the lobby doors';
      s.objectiveDetail = 'The van is waiting outside';
      s.objectiveTarget = { x: s.bank.exits[0].x, y: s.bank.exits[0].y };
    } else {
      sfx.pickup();
      toast(`${finished.label} — ${money(finished.value)}`, 2);
    }
  } else if (s.input.interact && target && target.kind !== 'art' && !s.player.cracking) {
    sfx.crack();
  }

  // The exit: only open once the vault is secured.
  const exit = s.bank.exits[0];
  const exitD = Math.hypot(s.player.x - exit.x, s.player.y - exit.y);
  if (exitD < exit.r) {
    if (s.player.vaultSecured) {
      startGetaway();
      return;
    }
    if (s.time - s.lastExitToast > 6) {
      s.lastExitToast = s.time;
      toast('The vault first — the job is not done.', 3);
    }
  }

  // Caught: a guard's hands on the thief while the alarm is hot.
  if (s.time >= s.grazeGraceUntil) {
    for (const g of s.guards) {
      if (guardCatches(g, s.player)) {
        if (s.alarm.value >= GUARD_CATCH_ALARM) {
          endCaught('A guard caught you with the alarm screaming.');
          return;
        }
        // A graze while the meter is low: a scare, not a bust. Shove the
        // thief clear of the guard's hands so the spike does not turn
        // into an instant bust on the next frame, and give a short
        // grace window to break line of sight.
        s.alarm.value = Math.max(s.alarm.value, GUARD_CATCH_ALARM + 5);
        g.suspect = 1;
        const dx = s.player.x - g.x;
        const dy = s.player.y - g.y;
        const d = Math.hypot(dx, dy) || 1;
        let px = s.player.x + (dx / d) * 70;
        let py = s.player.y + (dy / d) * 70;
        for (const solid of solids) {
          const fixed = pushOutOfRect(px, py, s.player.radius, solid);
          px = fixed.x;
          py = fixed.y;
        }
        s.player.x = Math.max(14, Math.min(WORLD_W - 14, px));
        s.player.y = Math.max(14, Math.min(WORLD_H - 14, py));
        s.grazeGraceUntil = s.time + 1.5;
        toast('A guard nearly had you — break line of sight!', 2);
        break;
      }
    }
  }

  // Camera follows the thief, clamped to the floor.
  const tx = Math.max(VIEW_W / 2, Math.min(WORLD_W - VIEW_W / 2, s.player.x));
  const ty = Math.max(VIEW_H / 2, Math.min(WORLD_H - VIEW_H / 2, s.player.y));
  s.camera.cx += (tx - s.camera.cx) * Math.min(1, 5 * dt);
  s.camera.cy += (ty - s.camera.cy) * Math.min(1, 5 * dt);
}

function updateGetawayPhase(dt) {
  s.time += dt;
  s.jobTime += dt;
  if (s.autopilot) s.autopilot.update(s, dt);
  updateGetaway(s.getaway, dt, s.input);
  const v = s.getaway.van;
  const tx = Math.max(VIEW_W / 2, Math.min(WORLD_W - VIEW_W / 2, v.x));
  const ty = Math.max(VIEW_H / 2, Math.min(WORLD_H - VIEW_H / 2, v.y));
  s.camera.cx += (tx - s.camera.cx) * Math.min(1, 5 * dt);
  s.camera.cy += (ty - s.camera.cy) * Math.min(1, 5 * dt);
  if (s.getaway.finished) endScore();
  else if (s.getaway.busted) endCaught('The police boxed the van in — heat hit 100.');
}

function reportTest(text) {
  if (!testOut) return;
  testOut.textContent = `phase=${s.phase} ${text}`;
  document.title = 'VV-' + text.split(' ')[0];
}

// --- Input ---------------------------------------------------------------
const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
};

window.addEventListener('keydown', (e) => {
  unlockAudio();
  const dir = KEYMAP[e.code];
  if (dir) {
    s.input[dir] = true;
    e.preventDefault();
  }
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') s.input.sneak = true;
  if (e.code === 'KeyE') s.input.interact = true;
  if (e.code === 'KeyM') toggleMute();
  if (e.repeat) return;
  if (s.phase === 'title' && (e.code === 'Enter' || e.code === 'Space')) {
    s.phase = 'planning';
    sfx.click();
  } else if (s.phase === 'planning') {
    const out = planningKey(s.planning, e.key);
    if (out === 'start') startHeist();
    else sfx.click();
  } else if (s.phase === 'heist') {
    if (e.code === 'Digit1') useTool('smoke');
    if (e.code === 'Digit2') useTool('emp');
    if (e.code === 'Digit3') useTool('decoy');
  } else if (s.phase === 'caught' || s.phase === 'score') {
    if (e.code === 'KeyR') startHeist();
    if (e.code === 'KeyP') {
      s.phase = 'planning';
      s.planning = makePlanning();
    }
  }
});

window.addEventListener('keyup', (e) => {
  const dir = KEYMAP[e.code];
  if (dir) s.input[dir] = false;
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') s.input.sneak = false;
  if (e.code === 'KeyE') s.input.interact = false;
});

function canvasPos(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * VIEW_W,
    y: ((e.clientY - r.top) / r.height) * VIEW_H,
  };
}

canvas.addEventListener('mousemove', (e) => {
  s.mouse = canvasPos(e);
});

canvas.addEventListener('click', (e) => {
  unlockAudio();
  const p = canvasPos(e);
  s.mouse = p;
  if (s.phase === 'title') {
    s.phase = 'planning';
    sfx.click();
  } else if (s.phase === 'planning') {
    const out = planningClick(s.planning, p.x, p.y);
    if (out === 'start') startHeist();
    else sfx.click();
  } else if (s.phase === 'heist') {
    // Clicking throws the decoy at the clicked spot when one is packed.
    if (s.player.tools.decoy > 0) useTool('decoy');
  }
});

// --- Loop ----------------------------------------------------------------
let last = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (s.phase === 'heist') updateHeist(dt);
  else if (s.phase === 'getaway') updateGetawayPhase(dt);
  else if (s.phase === 'title') s.time += dt;

  if (s.phase === 'title') drawTitle(ctx, s.time);
  else if (s.phase === 'planning') drawPlanning(ctx, s.planning);
  else if (s.phase === 'heist') drawHeist(ctx, s);
  else if (s.phase === 'getaway') drawGetaway(ctx, s);
  else if (s.phase === 'caught') {
    if (s.caughtIn === 'getaway') drawGetaway(ctx, s);
    else drawHeist(ctx, s);
    drawCaught(ctx, s.caughtReason, s.player.loot);
  } else if (s.phase === 'score') {
    drawScore(ctx, s.score);
  }
  if (testOut && s.phase !== 'title') {
    testOut.textContent = `phase=${s.phase} loot=${s.player ? s.player.loot : 0} alarm=${s.alarm ? Math.round(s.alarm.value) : 0} t=${Math.round(s.jobTime)}s`;
  }
  requestAnimationFrame(frame);
}

// --- Boot: scenes and autopilot for screenshots and verification ---------
const scene = sceneFromUrl();
if (scene === 'planning') {
  stagePlanning(s);
} else if (scene === 'cover' || scene === 'vault') {
  s.planning.route = 2;
  s.planning.bought.smoke = true;
  s.planning.bought.emp = true;
  s.planning.bought.decoy = true;
  s.planning.bought.lockpick = true;
  startHeist();
  if (scene === 'cover') stageCover(s);
  else stageVault(s);
} else if (scene === 'getaway') {
  s.planning.route = 2;
  startHeist();
  s.player.loot = 2580000;
  s.player.lootCount = 3;
  s.player.vaultSecured = true;
  stageGetaway(s);
}
if (s.auto) {
  s.planning.route = 1; // service tunnel: the autopilot's route
  s.planning.bought.smoke = true;
  s.planning.bought.lockpick = true;
  startHeist();
  s.autopilot = makeAutopilot();
  document.title = 'VV-AUTO';
}

window.__vv = s;
window.addEventListener('error', (e) => {
  document.title = 'VV-ERROR: ' + e.message;
});
requestAnimationFrame(frame);
