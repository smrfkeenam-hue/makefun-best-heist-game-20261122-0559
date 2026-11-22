// Velvet Vault — the planning table.
// One job: the screen before the job. Pick an entry route, buy tools with a
// cut of the take, and see the plan's price before the night starts.

import { VIEW_W, VIEW_H, ROUTES, TOOLS, LOOT_VAULT, money, PALETTE } from './config.js';

export function makePlanning() {
  return {
    route: 0, // index into ROUTES
    bought: { smoke: false, emp: false, decoy: false, lockpick: false },
    hover: -1,
    startRect: { x: VIEW_W / 2 - 150, y: VIEW_H - 96, w: 300, h: 52 },
  };
}

export function planningCut(p) {
  let cut = 0;
  for (const t of TOOLS) if (p.bought[t.id]) cut += t.cut;
  return cut;
}

export function planningLoadout(p) {
  return { ...p.bought };
}

// Hit rectangles for the route cards and the tool rows.
function routeRect(i) {
  return { x: 60 + i * 250, y: 170, w: 230, h: 190 };
}
function toolRect(i) {
  return { x: 860, y: 170 + i * 88, w: 360, h: 76 };
}

function inside(r, x, y) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

// Mouse click on the planning screen. Returns 'start' when the job begins.
export function planningClick(p, x, y) {
  for (let i = 0; i < ROUTES.length; i++) {
    if (inside(routeRect(i), x, y)) {
      p.route = i;
      return null;
    }
  }
  for (let i = 0; i < TOOLS.length; i++) {
    if (inside(toolRect(i), x, y)) {
      const t = TOOLS[i];
      p.bought[t.id] = !p.bought[t.id];
      return null;
    }
  }
  if (inside(p.startRect, x, y)) return 'start';
  return null;
}

export function planningKey(p, key) {
  if (key === '1' || key === '2' || key === '3') p.route = Number(key) - 1;
  if (key === 'q') p.bought.smoke = !p.bought.smoke;
  if (key === 'w') p.bought.emp = !p.bought.emp;
  if (key === 'e') p.bought.decoy = !p.bought.decoy;
  if (key === 'r') p.bought.lockpick = !p.bought.lockpick;
  if (key === 'Enter') return 'start';
  return null;
}

export function drawPlanning(ctx, p) {
  ctx.fillStyle = '#0d1424';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Blueprint grid.
  ctx.strokeStyle = 'rgba(127, 160, 220, 0.08)';
  ctx.lineWidth = 1;
  for (let x = 0; x < VIEW_W; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, VIEW_H);
    ctx.stroke();
  }
  for (let y = 0; y < VIEW_H; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(VIEW_W, y);
    ctx.stroke();
  }
  ctx.textAlign = 'left';
  ctx.font = 'bold 34px system-ui, sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText('THE PLAN', 60, 70);
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText('One night. One vault. Pick how Wren gets in — and what the crew takes home.', 60, 100);

  // Route cards.
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.gold;
  ctx.fillText('1 · ENTRY ROUTE', 60, 150);
  for (let i = 0; i < ROUTES.length; i++) {
    const r = routeRect(i);
    const route = ROUTES[i];
    const selected = p.route === i;
    ctx.fillStyle = selected ? 'rgba(242, 193, 78, 0.14)' : 'rgba(20, 30, 52, 0.9)';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = selected ? PALETTE.gold : 'rgba(255,255,255,0.2)';
    ctx.lineWidth = selected ? 3 : 1;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.textAlign = 'left';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(`[${i + 1}] ${route.name}`, r.x + 14, r.y + 32);
    ctx.font = 'italic 13px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.gold;
    ctx.fillText(route.tag, r.x + 14, r.y + 56);
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.dim;
    wrapText(ctx, route.detail, r.x + 14, r.y + 80, r.w - 28, 18);
    if (selected) {
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillStyle = PALETTE.gold;
      ctx.fillText('✓ CHOSEN', r.x + 14, r.y + r.h - 14);
    }
  }

  // Tool rows.
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.gold;
  ctx.fillText('2 · TOOLS — EACH COSTS A CUT', 860, 150);
  const toolKeys = ['Q', 'W', 'E', 'R'];
  for (let i = 0; i < TOOLS.length; i++) {
    const r = toolRect(i);
    const t = TOOLS[i];
    const on = p.bought[t.id];
    ctx.fillStyle = on ? 'rgba(127, 224, 138, 0.12)' : 'rgba(20, 30, 52, 0.9)';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = on ? '#7fe08a' : 'rgba(255,255,255,0.2)';
    ctx.lineWidth = on ? 2 : 1;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.textAlign = 'left';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(`[${toolKeys[i]}] ${t.name}`, r.x + 12, r.y + 24);
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.gold;
    ctx.fillText(`${t.cut}% cut`, r.x + r.w - 12, r.y + 24);
    ctx.textAlign = 'left';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.dim;
    wrapText(ctx, t.detail, r.x + 12, r.y + 44, r.w - 24, 16);
    if (on) {
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillStyle = '#7fe08a';
      ctx.fillText('PACKED', r.x + r.w - 58, r.y + r.h - 8);
    }
  }

  // The maths, and the start button.
  const cut = planningCut(p);
  const projected = Math.round(LOOT_VAULT * (1 - cut / 100));
  ctx.textAlign = 'left';
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText(`Crew cut: ${cut}%  ·  Vault ${money(LOOT_VAULT)} → your share ${money(projected)} before side loot`, 60, VIEW_H - 110);
  const b = p.startRect;
  ctx.fillStyle = PALETTE.gold;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.fillStyle = '#1a1405';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('START THE HEIST  →', b.x + b.w / 2, b.y + 34);
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText('Click a route or a tool to change the plan · Enter starts the job', VIEW_W / 2, VIEW_H - 24);
}

function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, yy);
}
