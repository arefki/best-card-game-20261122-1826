// Screenshot staging for Emberfall Duel v2.
//
// The game reads ?shot=<scene>&seed=<n> and stages that scene
// deterministically, so the four screenshots are real renders of the
// game's own code, taken in a browser:
//   title — the title screen, with its fan of sample cards.
//   table — a mid-game table: both hands, life totals, energy, a fired
//           combo WITH its burst banner, a chained card played face-up,
//           the Warden's telegraphed chain intent, and three new v2 cards
//           in the player's hand.
//   win   — the victory screen with confetti and the final-blow card.
//   loss  — the defeat screen with the Warden's finishing blow.
//
// Staging builds a state through the same newGame() the real game uses,
// then sets the scene's numbers directly — no separate mock renderer, so
// what the screenshots show is what the game really looks like.

import { COMBOS, cardById } from './config.js';
import { newGame } from './state.js';

function stageTable(state) {
  state.phase = 'player';
  state.turn = 5;
  state.player.life = 13;
  state.player.maxEnergy = 6;
  state.player.energy = 5;
  state.player.block = 4;
  state.player.hand = [
    'ember-strike', 'spark-strike', 'tide-guard',
    'thorn-bramble', 'ember-pyre', 'tide-riptide',
  ];
  state.player.deck = state.player.deck.slice(0, 14);
  state.player.discard = ['ember-guard', 'tide-strike', 'spark-guard'];
  state.enemy.life = 10;
  state.enemy.hand = ['ember-strike', 'tide-guard', 'spark-guard', 'thorn-strike'];
  state.enemy.deck = state.enemy.deck.slice(0, 14);
  state.enemy.discard = ['tide-surge'];
  state.elementsThisTurn = ['ember', 'spark'];
  state.chainCount = { ember: 1, spark: 1 };
  state.combosFired = ['Wildfire'];
  state.comboBurst = COMBOS.find((c) => c.name === 'Wildfire');
  state.stats.combos = 2;
  state.stats.chains = 2;
  state.stats.cardsPlayed = 12;
  state.stats.turns = 5;
  // The played card chained: a second Spark this turn, +2 damage.
  const chained = { ...cardById('spark-strike'), damage: 9 };
  state.lastPlayed = { by: 'player', card: chained, chained: true };
  state.intent = { kind: 'chain', element: 'thorn', text: 'Ash Warden is chaining Thorn' };
  state.log = [
    'Combo Wildfire! Ember + Spark: deal 3 damage.',
    'Chain! spark x2: +2 damage.',
    'You played Spark Strike.',
    'You played Ember Surge.',
    'Turn 5 begins. Energy refills to 6.',
  ];
  return state;
}

function stageWin(state) {
  state.phase = 'over';
  state.winner = 'player';
  state.turn = 8;
  state.player.life = 6;
  state.enemy.life = 0;
  state.stats.turns = 8;
  state.stats.cardsPlayed = 21;
  state.stats.combos = 4;
  state.stats.chains = 3;
  state.lastPlayed = { by: 'player', card: cardById('ember-pyre'), chained: false };
  return state;
}

function stageLoss(state) {
  state.phase = 'over';
  state.winner = 'enemy';
  state.turn = 6;
  state.player.life = 0;
  state.enemy.life = 9;
  state.stats.turns = 6;
  state.stats.cardsPlayed = 14;
  state.stats.combos = 1;
  state.stats.chains = 1;
  state.lastPlayed = { by: 'enemy', card: cardById('spark-strike'), chained: false };
  return state;
}

// Build the staged state for a scene name. Returns null for an unknown
// scene (the caller then runs the normal game instead).
export function stageShot(scene, seed) {
  const state = newGame(seed);
  if (scene === 'title') {
    state.phase = 'title';
    return state;
  }
  if (scene === 'table') return stageTable(state);
  if (scene === 'win') return stageWin(state);
  if (scene === 'loss') return stageLoss(state);
  return null;
}
