// Game state and turn rules for Emberfall Duel.
//
// One state object holds both duelists. The rules, in short:
//  - Each side has 20 life. First to 0 loses.
//  - A turn: energy refills to the side's max (max grows +1 a turn, cap 10),
//    then the side draws a card. The player plays cards by spending energy,
//    then ends the turn; the AI plays its own hand, then the next turn begins.
//  - Block absorbs damage and fades at the start of the owner's next turn.
//  - Combos: playing both elements of a link in one turn fires its bonus
//    once, for free (see COMBOS in config.js).
//  - The AI telegraphs its intent, so the player can read and counter it.
//
// This module is pure logic: no DOM, no timers. main.js sequences the AI's
// turns with delays for the animation; render.js paints the state.

import {
  CARDS, COMBOS, HAND_CAP, MAX_ENERGY, START_ENERGY, START_HAND, START_LIFE,
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
    elementsThisTurn: [], // elements played this turn (player or AI)
    combosFired: [], // combo names already fired this turn
    intent: null, // the AI's telegraphed plan for its next turn
    lastPlayed: null, // { by, card } shown face-up in the middle of the table
    log: [],
    winner: null, // 'player' | 'enemy'
    stats: { turns: 0, cardsPlayed: 0, combos: 0 },
  };
  drawCards(state.player, START_HAND, rng);
  drawCards(state.enemy, START_HAND, rng);
  return state;
}

export function logLine(state, text) {
  state.log.unshift(text);
  if (state.log.length > 6) state.log.length = 6;
}

// Deal damage to a side: block absorbs first, the rest hits life.
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

// Apply one card's effect bundle. `by` is who played it; damage always
// lands on the other side, the rest on the player of the card.
export function applyEffect(state, by, effect) {
  const self = by === 'player' ? state.player : state.enemy;
  const foe = by === 'player' ? state.enemy : state.player;
  const result = { damage: 0, blocked: 0, healed: 0, drawn: 0, energy: 0 };
  if (effect.damage) {
    const hit = dealDamage(state, by === 'player' ? 'enemy' : 'player', effect.damage);
    result.damage = hit.through;
    result.blocked = hit.absorbed;
  }
  if (effect.block) self.block += effect.block;
  if (effect.heal) {
    const before = self.life;
    healSide(self, effect.heal);
    result.healed = self.life - before;
  }
  if (effect.draw) result.drawn = drawCards(self, effect.draw, state.rng).length;
  if (effect.energy) {
    self.energy = Math.min(MAX_ENERGY, self.energy + effect.energy);
    result.energy = effect.energy;
  }
  return result;
}

// Fire any combo links whose two elements have both been played this turn.
// Each link fires at most once per turn. Returns the combos that fired.
export function checkCombos(state, by) {
  const fired = [];
  for (const combo of COMBOS) {
    if (state.combosFired.includes(combo.name)) continue;
    const [a, b] = combo.pair;
    if (!state.elementsThisTurn.includes(a) || !state.elementsThisTurn.includes(b)) continue;
    state.combosFired.push(combo.name);
    state.stats.combos += 1;
    applyEffect(state, by, combo);
    fired.push(combo);
    logLine(state, `Combo ${combo.name}! ${combo.text}`);
  }
  return fired;
}

export function cardInHand(state, by, id) {
  const side = by === 'player' ? state.player : state.enemy;
  return side.hand.includes(id);
}

export function canPlay(state, by, id) {
  const side = by === 'player' ? state.player : state.enemy;
  const card = CARDS.find((c) => c.id === id);
  if (!card) return false;
  return side.hand.includes(id) && side.energy >= card.cost;
}

// Play a card from a side's hand. Returns a report of what happened, or
// null when the play is not legal. The caller re-renders after.
export function playCard(state, by, id) {
  if (!canPlay(state, by, id)) return null;
  const side = by === 'player' ? state.player : state.enemy;
  const card = CARDS.find((c) => c.id === id);
  side.energy -= card.cost;
  discardFromHand(side, id);
  state.stats.cardsPlayed += 1;
  state.lastPlayed = { by, card };
  if (!state.elementsThisTurn.includes(card.element)) {
    state.elementsThisTurn.push(card.element);
  }
  if (by === 'player') state.playedThisTurn.push(id);
  const effect = applyEffect(state, by, card);
  const combos = checkCombos(state, by);
  logLine(state, `${by === 'player' ? 'You' : 'Ash Warden'} played ${card.name}.`);
  checkWinner(state);
  return { card, effect, combos };
}

// Start a side's turn: block fades, max energy grows, energy refills, draw.
export function beginTurn(state, by) {
  const side = by === 'player' ? state.player : state.enemy;
  side.block = 0;
  if (by === 'player') {
    side.maxEnergy = Math.min(MAX_ENERGY, START_ENERGY + state.turn - 1);
    state.playedThisTurn = [];
    state.elementsThisTurn = [];
    state.combosFired = [];
  } else {
    side.maxEnergy = Math.min(MAX_ENERGY, START_ENERGY + state.turn - 1);
    state.elementsThisTurn = [];
    state.combosFired = [];
  }
  side.energy = side.maxEnergy;
  if (state.turn > 1 || by === 'enemy') drawCards(side, 1, state.rng);
  if (by === 'player') state.stats.turns = state.turn;
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

export function handValue(hand) {
  return hand.length;
}

export { HAND_CAP };
