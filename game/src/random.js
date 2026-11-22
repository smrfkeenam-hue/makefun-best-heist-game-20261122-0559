// Velvet Vault — a tiny seeded random number generator.
// One job: deterministic randomness, so a screenshot scene or a demo run can
// be replayed exactly by passing the same seed in the URL (?seed=7).

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed) {
  const next = mulberry32(seed);
  return {
    next,
    // Float in [min, max).
    range(min, max) {
      return min + next() * (max - min);
    },
    // Integer in [min, max] inclusive.
    int(min, max) {
      return Math.floor(min + next() * (max - min + 1));
    },
    // One element of an array, uniformly.
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
    // True with probability p.
    chance(p) {
      return next() < p;
    },
  };
}

// Reads ?seed= from the page URL, defaulting to a fixed seed so the first
// run is always the same run.
export function seedFromUrl() {
  try {
    const raw = new URLSearchParams(window.location.search).get('seed');
    const parsed = raw === null ? NaN : parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : 1337;
  } catch {
    return 1337;
  }
}
