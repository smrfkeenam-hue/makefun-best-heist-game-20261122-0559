// Velvet Vault — tuning constants, palette and loadout definitions.
// One job: every number the rest of the game reads lives here, so balance
// can be tuned without touching logic.

export const VIEW_W = 1280;
export const VIEW_H = 720;

// The bank floor is one open hall plus two offices and a vault chamber.
export const WORLD_W = 1440;
export const WORLD_H = 900;

export const PLAYER_RADIUS = 14;
export const PLAYER_WALK_SPEED = 235;
export const PLAYER_SNEAK_SPEED = 125;
export const PLAYER_GRAB_RANGE = 46;

export const GUARD_RADIUS = 15;
export const GUARD_WALK_SPEED = 95;
export const GUARD_CHASE_SPEED = 205;
export const GUARD_VIEW_RANGE = 270;
export const GUARD_VIEW_HALF_ANGLE = 0.56; // radians, ~32 degrees
export const GUARD_CATCH_RANGE = 30;
export const GUARD_CATCH_ALARM = 60; // a touch only busts you past this alarm

export const CAMERA_RANGE = 305;
export const CAMERA_HALF_ANGLE = 0.49; // ~28 degrees
export const CAMERA_SWEEP = 0.85; // radians either side of the mount angle
export const CAMERA_SWEEP_SPEED = 0.45; // radians per second

export const ALARM_MAX = 100;
export const ALARM_DECAY = 9; // per second while unseen
export const ALARM_GUARD_RATE = 26; // per second while in a guard cone
export const ALARM_CAMERA_RATE = 30; // per second while in a camera cone
export const ALARM_SNEAK_FACTOR = 0.45; // sneaking slows the build
export const ALARM_TRIGGER = 100; // full meter trips the alarm state
export const ALARM_COOLDOWN = 40; // alarm ends when the meter falls here

export const VAULT_CRACK_SECONDS = 8;
export const VAULT_CRACK_LOCKPICK_SECONDS = 3;
export const SAFE_CRACK_SECONDS = 2;

export const LOOT_VAULT = 2400000;
export const LOOT_SAFE = 180000;
export const LOOT_ART = 60000;
export const BONUS_GHOST = 200000; // never tripped the alarm

// Night-heist palette: cool slate room, warm gold loot, hot red danger.
export const PALETTE = {
  floor: '#1b2436',
  floorAlt: '#202a40',
  carpet: '#232d47',
  wall: '#0d1322',
  wallTop: '#33415e',
  door: '#3d5a80',
  cover: '#2e3d5c',
  coverTop: '#42547c',
  plant: '#2f6b4f',
  gold: '#f2c14e',
  goldGlow: '#ffd97a',
  danger: '#ff4d4d',
  dangerSoft: 'rgba(255, 77, 77, 0.16)',
  cameraCone: 'rgba(255, 176, 66, 0.16)',
  safe: '#7fe08a',
  player: '#e8ecf4',
  playerHood: '#394867',
  guard: '#5b7db1',
  guardAlert: '#e04848',
  police: '#4d7dff',
  text: '#e8ecf4',
  dim: '#93a1bd',
  hud: 'rgba(8, 12, 24, 0.78)',
};

// Entry routes: where the thief starts, and what the plan screen promises.
export const ROUTES = [
  {
    id: 'roof',
    name: 'Roof Vent',
    tag: 'Drop in from above',
    detail: 'Rappel through the skylight vent. Starts near the west office, far from the lobby cameras.',
    spawn: { x: 150, y: 130 },
  },
  {
    id: 'tunnel',
    name: 'Service Tunnel',
    tag: 'Under the floor',
    detail: 'Crawl the maintenance tunnel. Starts in the south-west corner, close to the first safe.',
    spawn: { x: 130, y: 790 },
  },
  {
    id: 'lobby',
    name: 'Front Lobby',
    tag: 'Walk in the front door',
    detail: 'Blend in with the night cleaners. Starts at the lobby doors, the fastest line to the hall.',
    spawn: { x: 720, y: 820 },
  },
];

// Tools: each one costs a cut of the final take. Buying nothing is allowed.
export const TOOLS = [
  {
    id: 'smoke',
    key: '1',
    name: 'Smoke Pellet',
    cut: 4,
    uses: 2,
    detail: 'Drops a smoke cloud for 6s. Nobody sees through it — guards or cameras.',
  },
  {
    id: 'emp',
    key: '2',
    name: 'EMP Burst',
    cut: 6,
    uses: 1,
    detail: 'Kills every camera for 8s. Guards still see you, so mind the cones.',
  },
  {
    id: 'decoy',
    key: '3',
    name: 'Decoy Coin',
    cut: 3,
    uses: 2,
    detail: 'Tossed at the mouse. The nearest guard walks over to investigate.',
  },
  {
    id: 'lockpick',
    key: '4',
    name: 'Lockpick Set',
    cut: 5,
    uses: 0,
    detail: 'Passive. Cracks the vault in 3s instead of 8s. No more sweating at the door.',
  },
];

export const GETAWAY = {
  vanSpeed: 330,
  vanAccel: 620,
  policeSpeed: 300,
  policeCount: 3,
  heatNear: 150, // police within this range build heat
  heatRate: 16, // per second while a police car is close
  heatDecay: 7,
  ramHeat: 25,
  rendezvous: { x: 1290, y: 110, r: 64 },
  start: { x: 720, y: 800 },
};

export function money(n) {
  return '$' + Math.round(n).toLocaleString('en-US');
}
