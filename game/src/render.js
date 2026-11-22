// Rendering for Emberfall Duel: state object in, DOM out.
//
// Every paint starts from the state — no hidden DOM state to drift. Cards
// are DOM elements (crisp text at thumbnail size), the table is one screen
// with three zones: the opponent's row on top, the played card and the log
// in the middle, the player's hand at the bottom. Life totals, energy and
// the AI's telegraphed intent are always visible.

import { CARDS, COMBOS, ELEMENTS, cardById, glyphSvg } from './config.js';

const $ = (id) => document.getElementById(id);

function mainNumber(card) {
  if (card.damage) return { n: card.damage, label: 'DMG' };
  if (card.block) return { n: card.block, label: 'BLK' };
  if (card.heal) return { n: card.heal, label: 'HEAL' };
  return { n: card.cost, label: 'COST' };
}

// One face-up card element. `playable` marks it affordable this turn;
// `selected` marks the player's current pick.
export function cardElement(card, { playable = false, selected = false } = {}) {
  const el = ELEMENTS[card.element];
  const value = mainNumber(card);
  const node = document.createElement('div');
  node.className = `card el-${card.element}${playable ? ' playable' : ''}${selected ? ' selected' : ''}`;
  node.dataset.id = card.id;
  node.innerHTML = [
    `<div class="card-cost" title="Energy cost">${card.cost}</div>`,
    `<div class="card-icon" style="color:${el.color}">${glyphSvg(el.glyph, 34)}</div>`,
    `<div class="card-name">${card.name}</div>`,
    `<div class="card-kind">${card.kind}</div>`,
    `<div class="card-value">${value.n}<span>${value.label}</span></div>`,
    `<div class="card-text">${card.text}</div>`,
  ].join('');
  return node;
}

// One face-down opponent card: a patterned back in the table's gold.
function backElement() {
  const node = document.createElement('div');
  node.className = 'card back';
  node.innerHTML = '<div class="card-back-mark">E</div>';
  return node;
}

export function showScreen(name) {
  for (const id of ['title-screen', 'table-screen', 'end-screen']) {
    $(id).classList.toggle('hidden', id !== `${name}-screen`);
  }
}

function renderLife(who, side) {
  $(`${who}-life-num`).textContent = `${side.life}`;
  $(`${who}-life-bar`).style.width = `${(side.life / side.maxLife) * 100}%`;
  const block = $(`${who}-block`);
  block.textContent = side.block > 0 ? `🛡 ${side.block}` : '';
  block.classList.toggle('has-block', side.block > 0);
}

function renderEnergy(state) {
  const pips = $('energy-pips');
  pips.innerHTML = '';
  for (let i = 0; i < state.player.maxEnergy; i += 1) {
    const pip = document.createElement('i');
    pip.className = `pip${i < state.player.energy ? ' on' : ''}`;
    pips.appendChild(pip);
  }
  $('energy-num').textContent = `${state.player.energy}/${state.player.maxEnergy}`;
}

function renderHand(state, selectedId) {
  const hand = $('player-hand');
  hand.innerHTML = '';
  for (const id of state.player.hand) {
    const card = cardById(id);
    const affordable = state.player.energy >= card.cost && state.phase === 'player';
    const node = cardElement(card, { playable: affordable, selected: id === selectedId });
    hand.appendChild(node);
  }
  $('deck-count').textContent = `Deck ${state.player.deck.length}`;
  $('discard-count').textContent = `Discard ${state.player.discard.length}`;
}

function renderEnemyHand(state) {
  const hand = $('enemy-hand');
  hand.innerHTML = '';
  for (let i = 0; i < state.enemy.hand.length; i += 1) {
    hand.appendChild(backElement());
  }
  $('enemy-count').textContent = `${state.enemy.hand.length} cards`;
}

function renderPlayed(state) {
  const area = $('played-area');
  area.innerHTML = '';
  if (!state.lastPlayed) {
    area.innerHTML = '<div class="played-empty">No card played yet — play a card to open the duel.</div>';
    return;
  }
  const label = document.createElement('div');
  label.className = 'played-label';
  label.textContent = state.lastPlayed.by === 'player' ? 'You played' : 'Ash Warden played';
  area.appendChild(label);
  area.appendChild(cardElement(state.lastPlayed.card));
}

function renderIntent(state) {
  const banner = $('intent-banner');
  if (!state.intent || state.phase === 'over') {
    banner.textContent = '';
    banner.classList.add('hidden');
    return;
  }
  banner.classList.remove('hidden');
  banner.textContent = `Next: ${state.intent.text}`;
}

function renderCombos(state) {
  const track = $('combo-track');
  track.innerHTML = '';
  for (const combo of COMBOS) {
    const chip = document.createElement('div');
    const fired = state.combosFired.includes(combo.name);
    const [a, b] = combo.pair;
    chip.className = `combo-chip${fired ? ' fired' : ''}`;
    chip.innerHTML = [
      `<span style="color:${ELEMENTS[a].color}">${glyphSvg(ELEMENTS[a].glyph, 16)}</span>`,
      '<span class="combo-plus">+</span>',
      `<span style="color:${ELEMENTS[b].color}">${glyphSvg(ELEMENTS[b].glyph, 16)}</span>`,
      `<span class="combo-name">${combo.name}</span>`,
      `<span class="combo-effect">${combo.text.split(': ')[1]}</span>`,
    ].join('');
    track.appendChild(chip);
  }
}

function renderLog(state) {
  const list = $('log-list');
  list.innerHTML = '';
  for (const line of state.log) {
    const item = document.createElement('li');
    item.textContent = line;
    list.appendChild(item);
  }
}

export function renderTable(state, selectedId = null) {
  showScreen('table');
  $('turn-label').textContent = `Turn ${state.turn}`;
  renderLife('player', state.player);
  renderLife('enemy', state.enemy);
  renderEnergy(state);
  renderHand(state, selectedId);
  renderEnemyHand(state);
  renderPlayed(state);
  renderIntent(state);
  renderCombos(state);
  renderLog(state);
  $('btn-end-turn').disabled = state.phase !== 'player';
}

export function renderEnd(state) {
  showScreen('end');
  const won = state.winner === 'player';
  $('end-title').textContent = won ? 'VICTORY' : 'DEFEAT';
  $('end-title').className = won ? 'win' : 'loss';
  $('end-sub').textContent = won
    ? 'The Ash Warden falls. Your elements sang in harmony.'
    : 'The Ash Warden stands. Your embers will rise again.';
  $('end-stats').textContent =
    `Turns ${state.stats.turns} · Cards played ${state.stats.cardsPlayed} · Combos fired ${state.stats.combos}`;
  $('end-life').textContent = `You ${state.player.life} — ${state.enemy.life} Ash Warden`;
}

export function renderTitle() {
  showScreen('title');
}

export { CARDS };
