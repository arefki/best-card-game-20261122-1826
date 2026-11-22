// Boot and turn driver for Emberfall Duel v2.
//
// main.js wires the modules together: it reads ?shot= and ?seed=, builds
// the state, binds the input, and runs the turn loop. The player acts
// freely on their turn; End Turn hands over to the Warden, which plays
// its planned cards one by one with a beat between them so each flip
// reads, then the next turn begins. A staged ?shot= scene renders once
// and does not play — it exists for the screenshots.

import { beginTurn, canPlay, checkWinner, logLine, newGame, playCard } from './state.js';
import { chooseIntent, planEnemyTurn } from './ai.js';
import { renderEnd, renderTable, renderTitle } from './render.js';
import { bindInput } from './input.js';
import { confettiBurst, dealIn, floatNumber, pulseBurst, shake, sleep } from './anim.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed')) || (Date.now() % 2147483647);
const shot = params.get('shot');

let state = newGame(seed);
let selectedId = null;
let busy = false;

function paint() {
  if (state.phase === 'over') {
    renderEnd(state);
    if (state.winner === 'player') {
      confettiBurst(document.getElementById('confetti-layer'));
    }
    return;
  }
  renderTable(state, selectedId);
}

function startGame() {
  state = newGame(seed);
  selectedId = null;
  state.phase = 'player';
  beginTurn(state, 'player');
  state.intent = chooseIntent(state);
  logLine(state, 'The duel begins. Play cards, then end your turn.');
  paint();
  dealIn(document.getElementById('player-hand'));
}

async function playSelected(id) {
  if (busy || state.phase !== 'player') return;
  if (selectedId !== id) {
    selectedId = id;
    paint();
    return;
  }
  if (!canPlay(state, 'player', id)) {
    selectedId = null;
    paint();
    return;
  }
  busy = true;
  selectedId = null;
  const report = playCard(state, 'player', id);
  paint();
  if (report && report.effect.damage) {
    floatNumber(document.getElementById('enemy-panel'), `-${report.effect.damage}`, 'damage');
    shake(document.getElementById('enemy-panel'));
  }
  if (report && report.effect.healed) {
    floatNumber(document.getElementById('player-panel'), `+${report.effect.healed}`, 'heal');
  }
  if (report && report.chained) {
    floatNumber(document.getElementById('played-area'), 'CHAIN +2', 'combo');
  }
  if (report && report.combos.length > 0) {
    pulseBurst(document.getElementById('combo-burst'));
  }
  await sleep(420);
  busy = false;
  if (state.phase === 'over') paint();
}

async function endTurn() {
  if (busy || state.phase !== 'player') return;
  busy = true;
  state.phase = 'enemy';
  paint();
  await sleep(500);
  beginTurn(state, 'enemy');
  const plays = planEnemyTurn(state);
  for (const report of plays) {
    paint();
    if (report.effect.damage) {
      floatNumber(document.getElementById('player-panel'), `-${report.effect.damage}`, 'damage');
      shake(document.getElementById('player-panel'));
    }
    if (report.combos.length > 0) {
      pulseBurst(document.getElementById('combo-burst'));
    }
    await sleep(750);
    if (state.phase === 'over') break;
  }
  if (state.phase !== 'over') {
    state.turn += 1;
    state.phase = 'player';
    beginTurn(state, 'player');
    state.intent = chooseIntent(state);
    logLine(state, `Turn ${state.turn} begins. Energy refills to ${state.player.maxEnergy}.`);
  }
  busy = false;
  paint();
}

function onSlot(index) {
  if (state.phase !== 'player') return;
  const id = state.player.hand[index];
  if (id) playSelected(id);
}

function onConfirm() {
  if (state.phase === 'title' || state.phase === 'over') {
    startGame();
    return;
  }
  if (selectedId) playSelected(selectedId);
}

function boot() {
  if (shot) {
    const staged = stageShot(shot, seed);
    if (staged) {
      state = staged;
      if (shot === 'title') {
        renderTitle();
      } else if (shot === 'table') {
        renderTable(state);
      } else {
        renderEnd(state);
        if (shot === 'win') confettiBurst(document.getElementById('confetti-layer'));
      }
      return;
    }
  }
  renderTitle();
  bindInput({
    onPlay: startGame,
    onRestart: () => { if (state.phase === 'over' || state.phase === 'player') startGame(); },
    onEndTurn: endTurn,
    onCardClick: playSelected,
    onSlot,
    onConfirm,
  });
}

checkWinner(state);
boot();
