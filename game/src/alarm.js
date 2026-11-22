// Velvet Vault — the alarm meter.
// One job: turn "being seen" into a number, and turn a full meter into an
// alarm state the guards answer. The meter is the game's heartbeat: it
// climbs while the thief is watched and bleeds away while hidden.

import {
  ALARM_MAX,
  ALARM_DECAY,
  ALARM_GUARD_RATE,
  ALARM_CAMERA_RATE,
  ALARM_SNEAK_FACTOR,
  ALARM_TRIGGER,
  ALARM_COOLDOWN,
} from './config.js';

export function makeAlarm() {
  return {
    value: 0,
    active: false, // full meter: guards hunt, exit stays open
    everTripped: false,
    seenBy: null, // 'guard' | 'camera' | null, for the HUD warning
  };
}

export function updateAlarm(alarm, dt, watchers, sneaking) {
  let seenBy = null;
  let rate = 0;
  for (const w of watchers.guards) {
    if (w.seenPlayer) {
      seenBy = 'guard';
      rate = Math.max(rate, ALARM_GUARD_RATE);
    }
  }
  for (const c of watchers.cameras) {
    if (c.seenPlayer) {
      seenBy = 'camera';
      rate = Math.max(rate, ALARM_CAMERA_RATE);
    }
  }
  alarm.seenBy = seenBy;
  if (rate > 0) {
    if (sneaking) rate *= ALARM_SNEAK_FACTOR;
    alarm.value = Math.min(ALARM_MAX, alarm.value + rate * dt);
  } else {
    alarm.value = Math.max(0, alarm.value - ALARM_DECAY * dt);
  }
  if (!alarm.active && alarm.value >= ALARM_TRIGGER) {
    alarm.active = true;
    alarm.everTripped = true;
  } else if (alarm.active && alarm.value <= ALARM_COOLDOWN) {
    alarm.active = false;
  }
  return alarm;
}

// Readable label for the HUD: what the meter means right now.
export function alarmLabel(alarm) {
  if (alarm.active) return 'ALARM — RUN';
  if (alarm.value >= 60) return 'SPOTTED';
  if (alarm.value > 0) return 'SUSPICIOUS';
  return 'UNDETECTED';
}
