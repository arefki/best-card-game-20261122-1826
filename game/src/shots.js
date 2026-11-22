// Screenshot staging for Emberfall Duel.
//
// The game reads ?shot=<scene>&seed=<n> and stages that scene
// deterministically, so the four screenshots are real renders of the game's
// own code, taken in a browser:
//   title — the title screen, as a new player sees it.
//   table — a mid-game table: both hands, life totals, energy, a fired
//           combo, the AI's telegraphed intent, and a card played face-up.
//   win   — the victory screen with confetti.
//   loss  — the defeat screen.
//
// Staging builds a state through the same newGame() the real game uses,
// then sets the scene's numbers directly — no separate mock renderer, so
// what the screenshots show is what the game really looks like.

import { newGame, logLine } from './state.js';
import { chooseIntent } from './ai.js';
import { cardById } from './config.js';

function stageTable(state) {
  state.phase = 'player';
  state.turn = 4;
  state.player.life = 14;
  state.player.maxEnergy = 6;
  state.player.energy = 5;
  state.player.block = 3;
  state.player.hand = [
    'ember-strike', 'spark-strike', 'tide-guard', 'thorn-surge', 'ember-surge',
  ];
  state.player.deck = state.player.deck.slice(0, 12);
  state.player.discard = ['ember-guard', 'tide-strike'];
  state.enemy.life = 11;
  state.enemy.hand = ['ember-strike', 'tide-guard', 'spark-guard', 'thorn-strike'];
  state.enemy.deck = state.enemy.deck.slice(0, 12);
  state.enemy.discard = ['tide-surge'];
  state.elementsThisTurn = ['ember', 'spark'];
  state.combosFired = ['Wildfire'];
  state.stats.combos = 1;
  state.stats.cardsPlayed = 9;
  state.stats.turns = 4;
  state.lastPlayed = { by: 'enemy', card: cardById('spark-strike') };
  state.intent = { kind: 'strike', value: 6, text: 'Ash Warden will strike for 6' };
  state.log = [
    'Combo Wildfire! Ember + Spark: deal 3 damage.',
    'Ash Warden played Spark Strike.',
    'You played Ember Surge.',
    'Turn 4 begins. Energy refills to 6.',
  ];
  return state;
}

function stageWin(state) {
  state.phase = 'over';
  state.winner = 'player';
  state.turn = 7;
  state.player.life = 8;
  state.enemy.life = 0;
  state.stats.turns = 7;
  state.stats.cardsPlayed = 18;
  state.stats.combos = 3;
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

export { chooseIntent, logLine };
