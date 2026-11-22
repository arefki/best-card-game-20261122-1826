// Emberfall Duel — card, element and combo definitions.
//
// Four elements, told apart by colour AND by shape (each has its own icon):
// Ember is a red flame, Tide a blue droplet, Thorn a green leaf, Spark a
// yellow bolt. A card's effect is one bundle of numbers — damage, block,
// heal, draw, energy — so strikes, guards and surges all play through the
// same apply step in state.js.

export const START_LIFE = 20;
export const START_HAND = 4;
export const HAND_CAP = 7;
export const START_ENERGY = 3;
export const MAX_ENERGY = 10;

export const ELEMENTS = {
  ember: { name: 'Ember', color: '#e5484d', soft: '#ffd9d4', glyph: 'flame' },
  tide: { name: 'Tide', color: '#2f7de1', soft: '#d3e7ff', glyph: 'drop' },
  thorn: { name: 'Thorn', color: '#2f9e44', soft: '#d8f5dd', glyph: 'leaf' },
  spark: { name: 'Spark', color: '#d9a400', soft: '#fff3bf', glyph: 'bolt' },
};

// One card: id, name, element, kind, energy cost, and its effect bundle.
// kind is only a label for the player and the AI's intent — the numbers do
// the work.
export const CARDS = [
  { id: 'ember-strike', name: 'Ember Strike', element: 'ember', kind: 'strike', cost: 1, damage: 4, text: 'Deal 4 damage.' },
  { id: 'ember-guard', name: 'Ember Guard', element: 'ember', kind: 'guard', cost: 1, block: 5, text: 'Gain 5 block.' },
  { id: 'ember-surge', name: 'Wildfire', element: 'ember', kind: 'surge', cost: 2, damage: 3, draw: 1, text: 'Deal 3 damage. Draw a card.' },
  { id: 'tide-strike', name: 'Tide Strike', element: 'tide', kind: 'strike', cost: 1, damage: 3, heal: 1, text: 'Deal 3 damage. Heal 1.' },
  { id: 'tide-guard', name: 'Tide Guard', element: 'tide', kind: 'guard', cost: 1, block: 4, draw: 1, text: 'Gain 4 block. Draw a card.' },
  { id: 'tide-surge', name: 'Deep Current', element: 'tide', kind: 'surge', cost: 2, damage: 3, heal: 2, text: 'Deal 3 damage. Heal 2.' },
  { id: 'thorn-strike', name: 'Thorn Strike', element: 'thorn', kind: 'strike', cost: 2, damage: 6, text: 'Deal 6 damage.' },
  { id: 'thorn-guard', name: 'Thorn Guard', element: 'thorn', kind: 'guard', cost: 2, block: 8, text: 'Gain 8 block.' },
  { id: 'thorn-surge', name: 'Bloom', element: 'thorn', kind: 'surge', cost: 1, heal: 5, draw: 1, text: 'Heal 5. Draw a card.' },
  { id: 'spark-strike', name: 'Spark Strike', element: 'spark', kind: 'strike', cost: 2, damage: 7, text: 'Deal 7 damage.' },
  { id: 'spark-guard', name: 'Spark Guard', element: 'spark', kind: 'guard', cost: 2, block: 6, energy: 1, text: 'Gain 6 block and 1 energy.' },
  { id: 'spark-surge', name: 'Stormcall', element: 'spark', kind: 'surge', cost: 2, damage: 2, energy: 2, text: 'Deal 2 damage. Gain 2 energy.' },
];

export function cardById(id) {
  return CARDS.find((c) => c.id === id);
}

// Element links: play both elements of a pair in one turn and the link
// fires once, for free. The pair is unordered — either order triggers it.
export const COMBOS = [
  { pair: ['ember', 'spark'], name: 'Wildfire', damage: 3, text: 'Ember + Spark: deal 3 damage.' },
  { pair: ['tide', 'thorn'], name: 'Bloomtide', heal: 3, text: 'Tide + Thorn: heal 3.' },
  { pair: ['ember', 'thorn'], name: 'Ashbloom', draw: 1, text: 'Ember + Thorn: draw a card.' },
  { pair: ['tide', 'spark'], name: 'Stormsurge', energy: 2, text: 'Tide + Spark: gain 2 energy.' },
];

// Inline SVG glyphs for the four elements (viewBox 0 0 24 24). Drawn here,
// not fetched: the game makes no network request.
export const GLYPHS = {
  flame: '<path d="M12 2 C14 6 18 8 18 13 A6 6 0 1 1 6 13 C6 10 8 8 9 6 C9 8 10 9 11 9 C10 7 11 4 12 2 Z"/>',
  drop: '<path d="M12 2 C12 2 5 10 5 15 A7 7 0 1 0 19 15 C19 10 12 2 12 2 Z"/>',
  leaf: '<path d="M20 4 C10 4 4 10 4 20 C14 20 20 14 20 4 Z M4 20 C8 14 13 9 19 5" fill="none" stroke-width="1.6"/>',
  bolt: '<path d="M13 2 L4 14 H11 L9 22 L20 9 H13 Z"/>',
};

export function glyphSvg(glyph, size) {
  const fill = glyph === 'leaf' ? 'none' : 'currentColor';
  const stroke = glyph === 'leaf' ? 'currentColor' : 'none';
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${fill}" stroke="${stroke}" aria-hidden="true">${GLYPHS[glyph]}</svg>`;
}
