// Velvet Vault — everything the eye sees.
// One job: draw the floor, the cones, the people, the loot and the HUD.
// The game logic never touches the canvas; this file never touches the
// rules. Safe cover reads green-blue, danger reads red-amber, loot reads
// gold — at a glance, from across the room.

import { VIEW_W, VIEW_H, WORLD_W, WORLD_H, PALETTE, money } from './config.js';
import { coneRayEnd } from './vision.js';
import { alarmLabel } from './alarm.js';

// The static floor (tiles, carpet, walls) is painted once to an offscreen
// canvas and blitted each frame, so the loop only draws what moves.
export function makeFloorLayer(bank) {
  const layer = document.createElement('canvas');
  layer.width = WORLD_W;
  layer.height = WORLD_H;
  const c = layer.getContext('2d');

  c.fillStyle = PALETTE.floor;
  c.fillRect(0, 0, WORLD_W, WORLD_H);
  // Checkerboard floor tiles, subtle.
  c.fillStyle = PALETTE.floorAlt;
  const tile = 72;
  for (let y = 0; y < WORLD_H; y += tile) {
    for (let x = 0; x < WORLD_W; x += tile) {
      if (((x + y) / tile) % 2 === 0) c.fillRect(x, y, tile, tile);
    }
  }
  // The hall carpet: a deep runner down the middle of the room.
  c.fillStyle = PALETTE.carpet;
  c.fillRect(480, 330, 480, 420);
  c.strokeStyle = 'rgba(242, 193, 78, 0.25)';
  c.lineWidth = 3;
  c.strokeRect(492, 342, 456, 396);

  // Doors read as lit gaps in the walls.
  for (const d of bank.doors) {
    c.fillStyle = PALETTE.door;
    c.fillRect(d.x, d.y, d.w, d.h);
    c.fillStyle = 'rgba(255, 255, 255, 0.18)';
    c.fillRect(d.x, d.y, d.w, 4);
  }
  // Walls: dark slabs with a lit top edge.
  for (const w of bank.walls) {
    c.fillStyle = PALETTE.wall;
    c.fillRect(w.x, w.y, w.w, w.h);
    c.fillStyle = PALETTE.wallTop;
    if (w.w >= w.h) c.fillRect(w.x, w.y, w.w, 5);
    else c.fillRect(w.x, w.y, 5, w.h);
  }
  // Cover: desks, pillars, planters, display cases.
  for (const b of bank.cover) {
    if (b.kind === 'planter') {
      c.fillStyle = PALETTE.plant;
      c.beginPath();
      c.arc(b.x + b.w / 2, b.y + b.h / 2, b.w / 2, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#3f8a66';
      c.beginPath();
      c.arc(b.x + b.w / 2, b.y + b.h / 2, b.w / 4, 0, Math.PI * 2);
      c.fill();
      continue;
    }
    c.fillStyle = PALETTE.cover;
    c.fillRect(b.x, b.y, b.w, b.h);
    c.fillStyle = PALETTE.coverTop;
    c.fillRect(b.x, b.y, b.w, 6);
    if (b.kind === 'desk') {
      c.fillStyle = 'rgba(255,255,255,0.08)';
      c.fillRect(b.x + 8, b.y + 12, b.w - 16, b.h - 20);
    }
    if (b.kind === 'case') {
      c.strokeStyle = 'rgba(242, 193, 78, 0.4)';
      c.lineWidth = 2;
      c.strokeRect(b.x + 4, b.y + 4, b.w - 8, b.h - 8);
    }
  }
  return layer;
}

export function makePlazaLayer(plaza) {
  const layer = document.createElement('canvas');
  layer.width = WORLD_W;
  layer.height = WORLD_H;
  const c = layer.getContext('2d');
  c.fillStyle = '#141b2c';
  c.fillRect(0, 0, WORLD_W, WORLD_H);
  // Streets: two avenues and a cross street, with dashed centrelines.
  c.fillStyle = '#232f49';
  c.fillRect(0, 380, WORLD_W, 140);
  c.fillRect(660, 0, 140, WORLD_H);
  c.strokeStyle = 'rgba(232, 236, 244, 0.35)';
  c.lineWidth = 4;
  c.setLineDash([26, 22]);
  c.beginPath();
  c.moveTo(0, 450);
  c.lineTo(WORLD_W, 450);
  c.moveTo(730, 0);
  c.lineTo(730, WORLD_H);
  c.stroke();
  c.setLineDash([]);
  // Pavement blocks.
  c.fillStyle = '#1b2436';
  c.fillRect(60, 60, 520, 260);
  c.fillRect(860, 60, 520, 260);
  c.fillRect(60, 580, 520, 260);
  c.fillRect(860, 580, 520, 260);
  for (const o of plaza.obstacles) {
    if (o.kind === 'roadblock') {
      c.fillStyle = '#e04848';
      c.fillRect(o.x, o.y, o.w, o.h);
      c.fillStyle = '#f4f6fb';
      for (let x = o.x + 6; x < o.x + o.w - 10; x += 22) {
        c.fillRect(x, o.y + 6, 12, o.h - 12);
      }
    } else if (o.kind === 'fountain') {
      c.fillStyle = '#2e5f7a';
      c.beginPath();
      c.arc(o.x + o.w / 2, o.y + o.h / 2, o.w / 2, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#7fc4e8';
      c.beginPath();
      c.arc(o.x + o.w / 2, o.y + o.h / 2, o.w / 4, 0, Math.PI * 2);
      c.fill();
    } else {
      c.fillStyle = PALETTE.plant;
      c.beginPath();
      c.arc(o.x + o.w / 2, o.y + o.h / 2, o.w / 2, 0, Math.PI * 2);
      c.fill();
    }
  }
  return layer;
}

// Camera: { cx, cy, scale } — the world point at the centre of the screen.
export function applyCamera(ctx, cam) {
  ctx.setTransform(cam.scale, 0, 0, cam.scale, VIEW_W / 2 - cam.cx * cam.scale, VIEW_H / 2 - cam.cy * cam.scale);
}

export function resetCamera(ctx) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function drawCone(ctx, watcher, blockers, fill) {
  const steps = 13;
  ctx.beginPath();
  ctx.moveTo(watcher.x, watcher.y);
  for (let i = 0; i <= steps; i++) {
    const a = watcher.facing - watcher.halfAngle + (2 * watcher.halfAngle * i) / steps;
    const end = coneRayEnd(watcher.x, watcher.y, a, watcher.range, blockers);
    ctx.lineTo(end.x, end.y);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawGuard(ctx, g, time) {
  const alert = g.state === 'chase' || g.suspect > 0.6;
  // Body: a navy figure with a cap brim pointing where it looks.
  ctx.fillStyle = alert ? PALETTE.guardAlert : PALETTE.guard;
  ctx.beginPath();
  ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0d1322';
  ctx.beginPath();
  ctx.arc(g.x + Math.cos(g.facing) * 5, g.y + Math.sin(g.facing) * 5, g.radius * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#e8ecf4';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(g.x, g.y);
  ctx.lineTo(g.x + Math.cos(g.facing) * (g.radius + 8), g.y + Math.sin(g.facing) * (g.radius + 8));
  ctx.stroke();
  // "!" when it has seen the thief, "?" while it grows suspicious.
  if (g.seenPlayer || g.suspect > 0.25) {
    const mark = g.seenPlayer || g.suspect > 0.6 ? '!' : '?';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = g.seenPlayer ? '#ff5a5a' : '#ffd166';
    ctx.fillText(mark, g.x, g.y - g.radius - 8);
  }
}

function drawCamera(ctx, cam, time) {
  const disabled = time < cam.disabledUntil;
  ctx.fillStyle = disabled ? '#3a4358' : '#c8cfdd';
  ctx.beginPath();
  ctx.arc(cam.x, cam.y, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = disabled ? '#222a3d' : '#ff2e2e';
  ctx.beginPath();
  ctx.arc(cam.x, cam.y, 4, 0, Math.PI * 2);
  ctx.fill();
  if (disabled) {
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#8be0ff';
    ctx.fillText('EMP', cam.x, cam.y - 18);
  }
}

function drawLoot(ctx, item, time) {
  if (item.taken) return;
  const pulse = 0.75 + 0.25 * Math.sin(time * 3);
  const glow = ctx.createRadialGradient(item.x, item.y, 4, item.x, item.y, 60);
  glow.addColorStop(0, `rgba(242, 193, 78, ${0.5 * pulse})`);
  glow.addColorStop(1, 'rgba(242, 193, 78, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(item.x, item.y, 60, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.gold;
  if (item.kind === 'vault') {
    ctx.fillRect(item.x - 34, item.y - 26, 68, 52);
    ctx.fillStyle = '#7a5b12';
    ctx.beginPath();
    ctx.arc(item.x, item.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff3c4';
    ctx.lineWidth = 3;
    ctx.strokeRect(item.x - 34, item.y - 26, 68, 52);
  } else if (item.kind === 'safe') {
    ctx.fillRect(item.x - 20, item.y - 16, 40, 32);
    ctx.fillStyle = '#7a5b12';
    ctx.beginPath();
    ctx.arc(item.x, item.y, 7, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Art: a gold-framed canvas on the wall.
    ctx.fillRect(item.x - 22, item.y - 16, 44, 32);
    ctx.fillStyle = '#7a4a8a';
    ctx.fillRect(item.x - 17, item.y - 11, 34, 22);
  }
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.goldGlow;
  ctx.fillText(money(item.value), item.x, item.y + (item.kind === 'vault' ? 46 : 36));
}

function drawPlayer(ctx, p, time) {
  // Hooded thief: pale face, dark hood, a gold satchel when carrying loot.
  ctx.fillStyle = PALETTE.playerHood;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius + 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.player;
  ctx.beginPath();
  ctx.arc(p.x + Math.cos(p.facing) * 4, p.y + Math.sin(p.facing) * 4, p.radius * 0.6, 0, Math.PI * 2);
  ctx.fill();
  if (p.loot > 0) {
    ctx.fillStyle = PALETTE.gold;
    ctx.fillRect(p.x - 5, p.y + p.radius - 4, 10, 8);
  }
  if (p.sneaking) {
    ctx.strokeStyle = 'rgba(127, 224, 138, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius + 7, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Cracking progress ring.
  if (p.cracking) {
    const frac = p.cracking.seconds / p.cracking.total;
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius + 12, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
    ctx.stroke();
  }
}

function drawObjectiveMarker(ctx, s, time) {
  const target = s.objectiveTarget;
  if (!target) return;
  const pulse = 1 + 0.12 * Math.sin(time * 4);
  ctx.strokeStyle = 'rgba(127, 224, 138, 0.9)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(target.x, target.y, 30 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(127, 224, 138, 0.9)';
  ctx.beginPath();
  ctx.moveTo(target.x, target.y - 44);
  ctx.lineTo(target.x - 8, target.y - 58);
  ctx.lineTo(target.x + 8, target.y - 58);
  ctx.closePath();
  ctx.fill();
}

function bar(ctx, x, y, w, h, frac, fill, label) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
  if (label) {
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.strokeText(label, x + 6, y + h - 6);
    ctx.fillStyle = '#fff';
    ctx.fillText(label, x + 6, y + h - 6);
  }
}

export function drawHud(ctx, s) {
  // Top bar.
  ctx.fillStyle = PALETTE.hud;
  ctx.fillRect(0, 0, VIEW_W, 58);
  const alarm = s.alarm;
  const frac = alarm.value / 100;
  const fill = alarm.active ? '#ff2e2e' : frac >= 0.6 ? '#ff9f2e' : frac > 0 ? '#ffd166' : '#7fe08a';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff';
  ctx.fillText('ALARM', 18, 20);
  bar(ctx, 18, 26, 260, 18, frac, fill, alarmLabel(alarm));
  if (alarm.seenBy) {
    ctx.fillStyle = '#ff9f9f';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText(alarm.seenBy === 'guard' ? 'GUARD HAS EYES ON YOU' : 'CAMERA HAS EYES ON YOU', 290, 40);
  }
  // Objective, centred.
  ctx.textAlign = 'center';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText(s.objective, VIEW_W / 2, 24);
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText(s.objectiveDetail, VIEW_W / 2, 44);
  // Loot and time, bottom left.
  ctx.textAlign = 'left';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.gold;
  ctx.fillText(money(s.player.loot), 18, VIEW_H - 18);
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText(`${s.player.lootCount} stashes  ·  ${Math.floor(s.time / 60)}:${String(Math.floor(s.time % 60)).padStart(2, '0')}`, 18, VIEW_H - 40);
  // Tool slots, bottom centre.
  const tools = [
    { key: '1', name: 'Smoke', n: s.player.tools.smoke },
    { key: '2', name: 'EMP', n: s.player.tools.emp },
    { key: '3', name: 'Decoy', n: s.player.tools.decoy },
    { key: '4', name: 'Lockpick', n: s.player.tools.lockpick ? 1 : 0 },
  ];
  let tx = VIEW_W / 2 - 170;
  for (const t of tools) {
    const on = t.n > 0;
    ctx.fillStyle = on ? 'rgba(20, 30, 52, 0.9)' : 'rgba(20, 30, 52, 0.45)';
    ctx.fillRect(tx, VIEW_H - 52, 80, 38);
    ctx.strokeStyle = on ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)';
    ctx.strokeRect(tx, VIEW_H - 52, 80, 38);
    ctx.textAlign = 'center';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillStyle = on ? '#fff' : '#6b7894';
    ctx.fillText(`[${t.key}] ${t.name}`, tx + 40, VIEW_H - 34);
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = on ? PALETTE.gold : '#6b7894';
    ctx.fillText(t.n > 0 ? `x${t.n}` : '—', tx + 40, VIEW_H - 20);
    tx += 86;
  }
  // Controls hint, bottom right.
  ctx.textAlign = 'right';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText('WASD move · Shift sneak · E grab / crack · 1-3 tools · click: decoy target', VIEW_W - 18, VIEW_H - 18);
  // Toast message.
  if (s.toast && s.toast.until > s.time) {
    ctx.textAlign = 'center';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(s.toast.text, VIEW_W / 2, 88);
  }
}

export function drawMinimap(ctx, s) {
  const mw = 196;
  const mh = 122;
  const mx = VIEW_W - mw - 14;
  const my = 70;
  const sx = mw / WORLD_W;
  const sy = mh / WORLD_H;
  ctx.fillStyle = 'rgba(8, 12, 24, 0.82)';
  ctx.fillRect(mx, my, mw, mh);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.strokeRect(mx, my, mw, mh);
  const px = (x) => mx + x * sx;
  const py = (y) => my + y * sy;
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  for (const w of s.bank.walls) ctx.fillRect(px(w.x), py(w.y), Math.max(1, w.w * sx), Math.max(1, w.h * sy));
  for (const item of s.bank.loot) {
    if (item.taken) continue;
    ctx.fillStyle = PALETTE.gold;
    ctx.fillRect(px(item.x) - 2, py(item.y) - 2, 4, 4);
  }
  for (const g of s.guards) {
    ctx.fillStyle = g.state === 'chase' ? '#ff2e2e' : '#ff9f9f';
    ctx.beginPath();
    ctx.arc(px(g.x), py(g.y), 3, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const c of s.cameras) {
    ctx.fillStyle = '#ffb042';
    ctx.fillRect(px(c.x) - 2, py(c.y) - 2, 4, 4);
  }
  ctx.fillStyle = '#7fe08a';
  ctx.beginPath();
  ctx.arc(px(s.bank.exits[0].x), py(s.bank.exits[0].y), 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(px(s.player.x), py(s.player.y), 3.5, 0, Math.PI * 2);
  ctx.fill();
}

export function drawHeist(ctx, s) {
  ctx.fillStyle = '#0a0f1e';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  applyCamera(ctx, s.camera);
  ctx.drawImage(s.floorLayer, 0, 0);
  const solids = [...s.bank.walls, ...s.bank.cover];
  // Cones first, under the people: guard cones red, camera cones amber.
  for (const g of s.guards) {
    drawCone(ctx, g, solids, g.seenPlayer || g.suspect > 0.6 ? 'rgba(255, 46, 46, 0.30)' : PALETTE.dangerSoft);
  }
  for (const c of s.cameras) {
    if (s.time < c.disabledUntil) continue;
    drawCone(ctx, c, solids, c.seenPlayer ? 'rgba(255, 176, 66, 0.34)' : PALETTE.cameraCone);
  }
  for (const item of s.bank.loot) drawLoot(ctx, item, s.time);
  // Exit doors glow green once the vault is secured.
  const exit = s.bank.exits[0];
  if (s.player.vaultSecured) {
    const glow = ctx.createRadialGradient(exit.x, exit.y, 4, exit.x, exit.y, 80);
    glow.addColorStop(0, 'rgba(127, 224, 138, 0.5)');
    glow.addColorStop(1, 'rgba(127, 224, 138, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(exit.x, exit.y, 80, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const g of s.guards) drawGuard(ctx, g, s.time);
  for (const c of s.cameras) drawCamera(ctx, c, s.time);
  // Smoke clouds sit above the floor, below the thief.
  for (const cloud of s.tools.clouds) {
    const grad = ctx.createRadialGradient(cloud.x, cloud.y, 4, cloud.x, cloud.y, cloud.r);
    grad.addColorStop(0, 'rgba(200, 205, 215, 0.75)');
    grad.addColorStop(1, 'rgba(200, 205, 215, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cloud.x, cloud.y, cloud.r, 0, Math.PI * 2);
    ctx.fill();
  }
  if (s.tools.decoyMark) {
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(s.tools.decoyMark.x, s.tools.decoyMark.y, 10, 0, Math.PI * 2);
    ctx.stroke();
  }
  drawObjectiveMarker(ctx, s, s.time);
  drawPlayer(ctx, s.player, s.time);
  resetCamera(ctx);
  // Alarm vignette: the room closes in when the alarm is live.
  if (s.alarm.active) {
    const pulse = 0.22 + 0.1 * Math.sin(s.time * 6);
    const grad = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H / 3, VIEW_W / 2, VIEW_H / 2, VIEW_H);
    grad.addColorStop(0, 'rgba(255, 46, 46, 0)');
    grad.addColorStop(1, `rgba(255, 46, 46, ${pulse})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  drawHud(ctx, s);
  drawMinimap(ctx, s);
}

export function drawGetaway(ctx, s) {
  ctx.fillStyle = '#0a0f1e';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  applyCamera(ctx, s.camera);
  ctx.drawImage(s.plazaLayer, 0, 0);
  const g = s.getaway;
  // Rendezvous marker: a green beacon the van is racing to.
  const rz = g.rendezvous;
  const pulse = 1 + 0.1 * Math.sin(s.time * 4);
  ctx.strokeStyle = 'rgba(127, 224, 138, 0.95)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(rz.x, rz.y, rz.r * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(127, 224, 138, 0.18)';
  ctx.beginPath();
  ctx.arc(rz.x, rz.y, rz.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#7fe08a';
  ctx.fillText('RENDEZVOUS', rz.x, rz.y - rz.r - 10);
  // Police cars: blue-white with flashing light bars.
  for (const p of g.police) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.fillStyle = '#1d2f52';
    ctx.fillRect(-20, -11, 40, 22);
    ctx.fillStyle = '#dfe6f2';
    ctx.fillRect(-8, -11, 16, 22);
    const flash = Math.sin(s.time * 10 + p.sirenPhase) > 0;
    ctx.fillStyle = flash ? '#ff2e2e' : '#4d7dff';
    ctx.fillRect(-4, -13, 8, 4);
    ctx.restore();
  }
  // The van: dark, gold stripe, the loot inside.
  const v = g.van;
  ctx.save();
  ctx.translate(v.x, v.y);
  ctx.rotate(v.angle);
  ctx.fillStyle = '#222d45';
  ctx.fillRect(-24, -13, 48, 26);
  ctx.fillStyle = PALETTE.gold;
  ctx.fillRect(-24, -3, 48, 6);
  ctx.fillStyle = '#9fb4d8';
  ctx.fillRect(10, -10, 10, 20);
  ctx.restore();
  resetCamera(ctx);
  // HUD: heat meter, loot, distance.
  ctx.fillStyle = PALETTE.hud;
  ctx.fillRect(0, 0, VIEW_W, 58);
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff';
  ctx.fillText('HEAT', 18, 20);
  bar(ctx, 18, 26, 260, 18, g.heat / 100, g.heat >= 60 ? '#ff2e2e' : '#ff9f2e', g.heat >= 60 ? 'SHAKE THEM' : 'POLICE ON YOUR TAIL');
  ctx.textAlign = 'center';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText('GETAWAY — reach the rendezvous', VIEW_W / 2, 24);
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.dim;
  const dist = Math.round(Math.hypot(v.x - rz.x, v.y - rz.y));
  ctx.fillText(`${dist}m to go  ·  ${g.rams} ram${g.rams === 1 ? '' : 's'}`, VIEW_W / 2, 44);
  ctx.textAlign = 'left';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.gold;
  ctx.fillText(money(s.player.loot), 18, VIEW_H - 18);
  ctx.textAlign = 'right';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText('WASD / arrows drive  ·  outrun them, do not fight them', VIEW_W - 18, VIEW_H - 18);
}
