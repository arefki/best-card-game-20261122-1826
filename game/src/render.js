// Painting for Emberfall Duel v2: state object in, DOM out.
//
// Every paint starts from the state — no hidden DOM state to drift. Cards
// are DOM elements (crisp text at thumbnail size). The table has three
// zones: the Warden's row on top, the played card and the combo banner in
// the middle, the player's hand at the bottom. Life totals, energy, the
// Warden's telegraphed intent and the element links are always visible.
//
// v2 additions: the title screen fans four real sample cards; a played
// card that chained wears a gold ribbon; a fired combo bursts a banner
// across the middle; the end screens show the card that ended the duel.

import { CARDS, COMBOS, ELEMENTS, KINDS, cardById, glyphSvg } from './config.js';

const $ = (id) => document.getElementById(id);

function mainNumber(card) {
  if (card.damage) return { n: card.damage, label: 'DMG' };
  if (card.block) return { n: card.block, label: 'BLK' };
  if (card.heal) return { n: card.heal, label: 'HEAL' };
  return { n: card.cost, label: 'COST' };
}

// One face-up card. `playable` marks it affordable this turn, `selected`
// the player's current pick, `chainReady` that playing it now would chain.
export function faceCard(card, { playable = false, selected = false, chainReady = false } = {}) {
  const el = ELEMENTS[card.element];
  const kind = KINDS[card.kind];
  const value = mainNumber(card);
  const node = document.createElement('div');
  node.className = `card el-${card.element}${playable ? ' playable' : ''}${selected ? ' selected' : ''}`;
  node.dataset.id = card.id;
  node.innerHTML = [
    `<div class="card-cost">${card.cost}</div>`,
    chainReady ? '<div class="card-chain">CHAIN +2</div>' : '',
    `<div class="card-icon" style="color:${el.color}">${glyphSvg(el.glyph, 40)}</div>`,
    `<div class="card-name">${card.name}</div>`,
    `<div class="card-kind"><span class="kind-glyph">${glyphSvg(kind.glyph, 12)}</span>${card.kind}</div>`,
    `<div class="card-value">${value.n}<span>${value.label}</span></div>`,
    `<div class="card-text">${card.text}</div>`,
  ].join('');
  return node;
}

// One face-down Warden card: a patterned back in the table's gold.
function cardBack() {
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

function paintLife(who, side) {
  $(`${who}-life-num`).textContent = `${side.life}`;
  $(`${who}-life-bar`).style.width = `${(side.life / side.maxLife) * 100}%`;
  const block = $(`${who}-block`);
  block.textContent = side.block > 0 ? `🛡 ${side.block}` : '';
}

function paintEnergy(state) {
  const pips = $('energy-pips');
  pips.innerHTML = '';
  for (let i = 0; i < state.player.maxEnergy; i += 1) {
    const pip = document.createElement('i');
    pip.className = `pip${i < state.player.energy ? ' on' : ''}`;
    pips.appendChild(pip);
  }
  $('energy-num').textContent = `${state.player.energy}/${state.player.maxEnergy}`;
}

function paintHand(state, selectedId) {
  const hand = $('player-hand');
  hand.innerHTML = '';
  for (const id of state.player.hand) {
    const card = cardById(id);
    const affordable = state.player.energy >= card.cost && state.phase === 'player';
    const chainReady = (state.chainCount[card.element] || 0) >= 1 && state.phase === 'player';
    hand.appendChild(faceCard(card, { playable: affordable, selected: id === selectedId, chainReady }));
  }
  $('deck-count').textContent = `Deck ${state.player.deck.length}`;
  $('discard-count').textContent = `Discard ${state.player.discard.length}`;
}

function paintEnemyHand(state) {
  const hand = $('enemy-hand');
  hand.innerHTML = '';
  for (let i = 0; i < state.enemy.hand.length; i += 1) {
    hand.appendChild(cardBack());
  }
  $('enemy-count').textContent = `${state.enemy.hand.length} cards`;
}

function paintPlayed(state) {
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
  const shown = faceCard(state.lastPlayed.card);
  if (state.lastPlayed.chained) {
    const ribbon = document.createElement('div');
    ribbon.className = 'chain-ribbon';
    ribbon.textContent = 'CHAIN +2';
    shown.appendChild(ribbon);
  }
  area.appendChild(shown);
}

function paintBurst(state) {
  const banner = $('combo-burst');
  if (!state.comboBurst) {
    banner.classList.add('hidden');
    banner.innerHTML = '';
    return;
  }
  banner.classList.remove('hidden');
  banner.innerHTML = `<span class="burst-name">${state.comboBurst.name}!</span> <span class="burst-text">${state.comboBurst.text}</span>`;
}

function paintIntent(state) {
  const banner = $('intent-banner');
  if (!state.intent || state.phase === 'over') {
    banner.textContent = '';
    banner.classList.add('hidden');
    return;
  }
  banner.classList.remove('hidden');
  banner.textContent = `Next: ${state.intent.text}`;
}

function paintCombos(state) {
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

function paintLog(state) {
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
  paintLife('player', state.player);
  paintLife('enemy', state.enemy);
  paintEnergy(state);
  paintHand(state, selectedId);
  paintEnemyHand(state);
  paintPlayed(state);
  paintBurst(state);
  paintIntent(state);
  paintCombos(state);
  paintLog(state);
  $('btn-end-turn').disabled = state.phase !== 'player';
}

function paintBlow(state) {
  const slot = $('end-blow');
  slot.innerHTML = '';
  if (!state.lastPlayed) return;
  const won = state.winner === 'player';
  const label = document.createElement('div');
  label.className = 'blow-label';
  label.textContent = won ? 'The final blow' : 'The finishing blow';
  slot.appendChild(label);
  slot.appendChild(faceCard(state.lastPlayed.card));
}

export function renderEnd(state) {
  showScreen('end');
  const won = state.winner === 'player';
  $('end-title').textContent = won ? 'VICTORY' : 'DEFEAT';
  $('end-title').className = won ? 'win' : 'loss';
  $('end-sub').textContent = won
    ? 'The Ash Warden falls. Your elements sang in harmony.'
    : 'The Ash Warden stands. Your embers will rise again.';
  $('end-stats').innerHTML =
    `<span class="stat-chip">Turns ${state.stats.turns}</span>` +
    `<span class="stat-chip">Cards played ${state.stats.cardsPlayed}</span>` +
    `<span class="stat-chip">Combos fired ${state.stats.combos}</span>` +
    `<span class="stat-chip">Chains ${state.stats.chains}</span>`;
  $('end-life').textContent = `You ${state.player.life} — ${state.enemy.life} Ash Warden`;
  $('end-tip').textContent = won
    ? 'Chains and links won this duel — link two elements, or chain the same one twice.'
    : 'Tip: guard when the Warden telegraphs a strike, and chain the same element twice for +2.';
  paintBlow(state);
}

// The title screen fans four real sample cards — one per element — so the
// cover shot shows the game is a card game at a glance.
export function renderTitle() {
  showScreen('title');
  const fan = $('title-fan');
  fan.innerHTML = '';
  const samples = ['ember-strike', 'tide-guard', 'thorn-surge', 'spark-surge'];
  samples.forEach((id, i) => {
    const card = faceCard(cardById(id));
    card.classList.add(`fan-${i + 1}`);
    fan.appendChild(card);
  });
}

export { CARDS };
