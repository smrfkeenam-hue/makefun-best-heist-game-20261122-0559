// Velvet Vault — the screens around the job.
// One job: title, caught and score screens. The heist itself lives in
// main.js and render.js; these are the bookends.

import { VIEW_W, VIEW_H, PALETTE, money } from './config.js';

export function drawTitle(ctx, time) {
  ctx.fillStyle = '#0a0f1e';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // A vault door, drawn large behind the title.
  const cx = VIEW_W / 2;
  const cy = 300;
  ctx.strokeStyle = 'rgba(242, 193, 78, 0.35)';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(cx, cy, 190, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(242, 193, 78, 0.18)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, 150, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + time * 0.05;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 60, cy + Math.sin(a) * 60);
    ctx.lineTo(cx + Math.cos(a) * 150, cy + Math.sin(a) * 150);
    ctx.stroke();
  }
  ctx.fillStyle = PALETTE.gold;
  ctx.beginPath();
  ctx.arc(cx, cy, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0a0f1e';
  ctx.beginPath();
  ctx.arc(cx, cy, 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText('VELVET VAULT', cx, 130);
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.gold;
  ctx.fillText('THE MERIDIAN JOB  ·  VESPER CITY', cx, 164);
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText('A one-night stealth heist. Plan it, run it, drive away rich — or get caught trying.', cx, 560);
  const blink = Math.sin(time * 3) > -0.4;
  if (blink) {
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText('Press ENTER or click to plan the job', cx, 610);
  }
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText('WASD move · Shift sneak · E grab / crack · 1–3 tools · Mouse aims the decoy', cx, 660);
  ctx.fillText('An original game: no real bank, no real crew, no borrowed art.', cx, 684);
}

export function drawCaught(ctx, reason, loot) {
  ctx.fillStyle = 'rgba(20, 4, 8, 0.92)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.font = 'bold 72px system-ui, sans-serif';
  ctx.fillStyle = '#ff4d4d';
  ctx.fillText('BUSTED', VIEW_W / 2, 260);
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText(reason, VIEW_W / 2, 310);
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText(`The crew keeps nothing. ${money(loot)} in loot was left on the floor.`, VIEW_W / 2, 350);
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText('R — run the job again   ·   P — back to the plan', VIEW_W / 2, 430);
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText('Tip: a guard only busts you once the alarm is past 60 — break line of sight and the meter falls.', VIEW_W / 2, 470);
}

// Final tally: take, costs, bonuses and a rank letter.
export function scoreBreakdown(result) {
  const cut = result.cutPercent;
  const gross = result.loot;
  const crewCut = Math.round(gross * (cut / 100));
  const ghost = result.ghost ? 200000 : 0;
  const timeBonus = result.timeSeconds < 240 ? 100000 : result.timeSeconds < 420 ? 50000 : 0;
  const net = gross - crewCut + ghost + timeBonus;
  let rank = 'C';
  if (result.ghost && result.loot >= 2400000 && result.timeSeconds < 420) rank = 'S';
  else if (result.loot >= 2400000 && result.timeSeconds < 420) rank = 'A';
  else if (result.loot >= 2400000) rank = 'B';
  return { gross, crewCut, ghost, timeBonus, net, rank, cut };
}

export function drawScore(ctx, result) {
  const b = scoreBreakdown(result);
  ctx.fillStyle = 'rgba(6, 12, 8, 0.94)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.font = 'bold 56px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.gold;
  ctx.fillText('CLEAN GETAWAY', VIEW_W / 2, 120);
  ctx.font = 'bold 120px system-ui, sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText(b.rank, VIEW_W / 2, 250);
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText(b.rank === 'S' ? 'Ghost rank — the vault never knew you were there.' : b.rank === 'A' ? 'Sharp work. The crew is already spending it.' : 'The job is done. The take could have been cleaner.', VIEW_W / 2, 285);
  const rows = [
    ['Loot taken', money(b.gross)],
    [`Crew cut (${b.cut}%)`, '−' + money(b.crewCut)],
    ['Ghost bonus', b.ghost ? '+' + money(b.ghost) : '—'],
    ['Speed bonus', b.timeBonus ? '+' + money(b.timeBonus) : '—'],
  ];
  let y = 350;
  ctx.font = '18px system-ui, sans-serif';
  for (const [label, value] of rows) {
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.dim;
    ctx.fillText(label, VIEW_W / 2 - 220, y);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff';
    ctx.fillText(value, VIEW_W / 2 + 220, y);
    y += 36;
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.moveTo(VIEW_W / 2 - 220, y);
  ctx.lineTo(VIEW_W / 2 + 220, y);
  ctx.stroke();
  y += 40;
  ctx.textAlign = 'left';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText('YOUR TAKE', VIEW_W / 2 - 220, y);
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.gold;
  ctx.fillText(money(b.net), VIEW_W / 2 + 220, y);
  ctx.textAlign = 'center';
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.dim;
  const mins = Math.floor(result.timeSeconds / 60);
  const secs = Math.floor(result.timeSeconds % 60);
  ctx.fillText(`Job time ${mins}:${String(secs).padStart(2, '0')}  ·  ${result.lootCount} stashes  ·  alarm tripped: ${result.ghost ? 'never' : 'yes'}`, VIEW_W / 2, y + 44);
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText('R — run it again   ·   P — back to the plan', VIEW_W / 2, y + 92);
}
