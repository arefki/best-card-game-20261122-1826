// Seeded random numbers for Emberfall Duel.
//
// One tiny deterministic generator (mulberry32) drives every shuffle and AI
// choice, so a game started with ?seed=N replays exactly the same way. That
// makes the screenshot scenes and the play-test repeatable: the same seed
// always deals the same hands.

export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher-Yates shuffle, driven by the given rng. Returns a new array.
export function shuffle(cards, rng) {
  const out = cards.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

// Pick one element of an array with the rng (undefined for an empty array).
export function pickOne(items, rng) {
  if (items.length === 0) return undefined;
  return items[Math.floor(rng() * items.length)];
}
