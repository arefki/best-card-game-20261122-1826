// Seeded chance for Emberfall Duel v2.
//
// Every shuffle and every AI tiebreak runs through one small deterministic
// generator, so a game opened with ?seed=N always deals the same hands.
// That is what makes the screenshot scenes and the play-test repeatable:
// the same seed, the same duel, every time.

export function makeRng(seed) {
  let cursor = seed >>> 0;
  return function draw() {
    cursor = (cursor + 0x6d2b79f5) | 0;
    let mix = Math.imul(cursor ^ (cursor >>> 15), 1 | cursor);
    mix = (mix + Math.imul(mix ^ (mix >>> 7), 61 | mix)) ^ mix;
    return ((mix ^ (mix >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher-Yates, driven by the given generator. Returns a fresh array.
export function shuffle(items, rng) {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const held = out[i];
    out[i] = out[j];
    out[j] = held;
  }
  return out;
}
