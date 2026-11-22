// The engine for Emberfall Duel v2: state, turns, effects, links, chains.
//
// The rules, in short:
//  - Each side has 20 life. First to 0 loses.
//  - A turn: block fades, max energy grows by 1 (cap 10), energy refills,
//    one card is drawn. The player plays cards by spending energy, then
//    ends the turn; the Warden plays its own hand, then the next turn
//    begins.
//  - Block absorbs damage and fades at the start of the owner's next turn.
//  - Links: play both elements of a pair in one turn and its bonus fires
//    once, for free (see COMBOS in config.js). At most ONE link fires per
//    turn per side, and it fires the moment its pair completes — so the
//    order cards are played in chooses which link fires.
//  - Chains (new in v2): the second card of an element played in one turn
//    gains +2 to its main number — damage first, else block, else heal.
//    Links want two DIFFERENT elements, chains want the SAME one, so every
//    hand is a choice between linking and chaining.
//  - The Warden telegraphs its intent, so its next move can be read and
//    countered.
//
// This module is pure logic: no DOM, no timers. boot.js sequences the
// Warden's turns with pauses for the animation; paint.js draws the state.

import {
  CARDS, CHAIN_BONUS, COMBOS, HAND_CAP, MAX_ENERGY, START_ENERGY,
  START_HAND, START_LIFE,
} from './config.js';
import { buildDeck, discardFromHand, drawCards } from './deck.js';
import { makeRng } from './rng.js';

function freshSide(rng) {
  return {
    life: START_LIFE,
    maxLife: START_LIFE,
    energy: START_ENERGY,
    maxEnergy: START_ENERGY,
    block: 0,
    hand: [],
    deck: buildDeck(rng),
    discard: [],
  };
}

export function newGame(seed) {
  const rng = makeRng(seed);
  const state = {
    seed,
    rng,
    turn: 1,
    phase: 'title', // title | player | enemy | over
    player: freshSide(rng),
    enemy: freshSide(rng),
    playedThisTurn: [], // card ids the player played this turn, in order
    elementsThisTurn: [], // elements played this turn by the acting side
    chainCount: {}, // element -> cards of it played this turn
    combosFired: [], // combo names already fired this turn
    comboBurst: null, // the most recent combo, for the banner
    intent: null, // the Warden's telegraphed plan for its next turn
    lastPlayed: null, // { by, card, chained } shown face-up mid-table
    log: [],
    winner: null, // 'player' | 'enemy'
    stats: { turns: 0, cardsPlayed: 0, combos: 0, chains: 0 },
  };
  drawCards(state.player, START_HAND, rng);
  drawCards(state.enemy, START_HAND, rng);
  return state;
}

export function logLine(state, text) {
  state.log.unshift(text);
  if (state.log.length > 6) state.log.length = 6;
}

// Damage to a side: block absorbs first, the rest hits life.
export function dealDamage(state, side, amount) {
  const target = side === 'player' ? state.player : state.enemy;
  const absorbed = Math.min(target.block, amount);
  target.block -= absorbed;
  const through = amount - absorbed;
  target.life = Math.max(0, target.life - through);
  return { absorbed, through };
}

function healSide(side, amount) {
  side.life = Math.min(side.maxLife, side.life + amount);
}

// Resolve one effect bundle. `by` is who played it; damage lands on the
// other side, everything else on the player of the card.
export function resolveEffect(state, by, effect) {
  const self = by === 'player' ? state.player : state.enemy;
  const outcome = { damage: 0, blocked: 0, healed: 0, drawn: 0, energy: 0 };
  if (effect.damage) {
    const hit = dealDamage(state, by === 'player' ? 'enemy' : 'player', effect.damage);
    outcome.damage = hit.through;
    outcome.blocked = hit.absorbed;
  }
  if (effect.block) self.block += effect.block;
  if (effect.heal) {
    const before = self.life;
    healSide(self, effect.heal);
    outcome.healed = self.life - before;
  }
  if (effect.draw) outcome.drawn = drawCards(self, effect.draw, state.rng).length;
  if (effect.energy) {
    self.energy = Math.min(MAX_ENERGY, self.energy + effect.energy);
    outcome.energy = effect.energy;
  }
  return outcome;
}

// Fire a link whose two elements have both been played this turn. At most
// one link fires per turn per side — the first pair completed wins, so play
// order chooses the link. Returns the link that fired, if any.
export function checkCombos(state, by) {
  if (state.combosFired.length > 0) return [];
  for (const combo of COMBOS) {
    const [a, b] = combo.pair;
    if (!state.elementsThisTurn.includes(a) || !state.elementsThisTurn.includes(b)) continue;
    state.combosFired.push(combo.name);
    state.stats.combos += 1;
    resolveEffect(state, by, combo);
    state.comboBurst = combo;
    logLine(state, `Combo ${combo.name}! ${combo.text}`);
    return [combo];
  }
  return [];
}

export function canPlay(state, by, id) {
  const side = by === 'player' ? state.player : state.enemy;
  const card = CARDS.find((c) => c.id === id);
  if (!card) return false;
  return side.hand.includes(id) && side.energy >= card.cost;
}

// The number a chain bonus lifts: damage first, else block, else heal.
function chainField(card) {
  if (card.damage) return 'damage';
  if (card.block) return 'block';
  if (card.heal) return 'heal';
  return null;
}

// Play a card from a side's hand. Returns a report of what happened, or
// null when the play is not legal. The caller re-paints after.
export function playCard(state, by, id) {
  if (!canPlay(state, by, id)) return null;
  const side = by === 'player' ? state.player : state.enemy;
  const card = CARDS.find((c) => c.id === id);
  side.energy -= card.cost;
  discardFromHand(side, id);
  state.stats.cardsPlayed += 1;

  // Chain: a second card of this element this turn gains +2.
  const already = state.chainCount[card.element] || 0;
  const chained = already >= 1;
  const field = chained ? chainField(card) : null;
  const boosted = { ...card };
  if (field) {
    boosted[field] = card[field] + CHAIN_BONUS;
    state.stats.chains += 1;
  }
  state.chainCount[card.element] = already + 1;
  if (!state.elementsThisTurn.includes(card.element)) {
    state.elementsThisTurn.push(card.element);
  }
  if (by === 'player') state.playedThisTurn.push(id);
  state.lastPlayed = { by, card: boosted, chained };

  const effect = resolveEffect(state, by, boosted);
  const combos = checkCombos(state, by);
  if (chained && field) {
    logLine(state, `Chain! ${card.element} x${already + 1}: +${CHAIN_BONUS} ${field}.`);
  }
  logLine(state, `${by === 'player' ? 'You' : 'Ash Warden'} played ${card.name}.`);
  checkWinner(state);
  return { card: boosted, effect, combos, chained };
}

// Start a side's turn: block fades, max energy grows, energy refills,
// draw a card, and the turn's link/chain tracking resets.
export function beginTurn(state, by) {
  const side = by === 'player' ? state.player : state.enemy;
  side.block = 0;
  side.maxEnergy = Math.min(MAX_ENERGY, START_ENERGY + state.turn - 1);
  side.energy = side.maxEnergy;
  state.elementsThisTurn = [];
  state.chainCount = {};
  state.combosFired = [];
  state.comboBurst = null;
  if (by === 'player') {
    state.playedThisTurn = [];
    state.stats.turns = state.turn;
  }
  if (state.turn > 1 || by === 'enemy') drawCards(side, 1, state.rng);
}

export function checkWinner(state) {
  if (state.phase === 'over') return;
  if (state.enemy.life <= 0 && state.player.life <= 0) {
    state.winner = 'player'; // a simultaneous fall goes to the attacker
  } else if (state.enemy.life <= 0) {
    state.winner = 'player';
  } else if (state.player.life <= 0) {
    state.winner = 'enemy';
  }
  if (state.winner) {
    state.phase = 'over';
    logLine(state, state.winner === 'player' ? 'Victory!' : 'Defeat.');
  }
}

export { HAND_CAP };
