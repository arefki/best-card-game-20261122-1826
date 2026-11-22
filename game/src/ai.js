// Ash Warden, the opponent brain for Emberfall Duel v2.
//
// The Warden telegraphs its intent, so its next move can be read and
// countered: at the start of the player's turn the table shows what it
// will do next ("will strike for 6", "is guarding", "is chaining Ember").
// The intent is a real plan, not a bluff — the Warden plays to it.
//
// Intent choice, in order: guard when hurt and holding a guard; strike
// when it can finish the player; chain when it holds two cards of one
// element it can afford (it plays the smaller one first, so the +2 chain
// bonus lands on the bigger card); surge when the player is healthy;
// otherwise strike, guard, or surge — whatever it holds.
//
// The Warden also spends leftover energy after its plan: strikes first,
// then surges, then guards.

import { CARDS } from './config.js';
import { canPlay, playCard } from './state.js';

function handCards(state) {
  return state.enemy.hand.map((id) => CARDS.find((c) => c.id === id));
}

function kindDamage(state, kind) {
  return handCards(state)
    .filter((c) => c.kind === kind)
    .reduce((sum, c) => sum + (c.damage || 0), 0);
}

function mainNumber(card) {
  return card.damage || card.block || card.heal || 0;
}

// Find an element the Warden can chain this turn: two cards of it in hand
// whose combined cost fits its energy. Returns the element or null.
function chainableElement(state) {
  const byElement = {};
  for (const card of handCards(state)) {
    (byElement[card.element] = byElement[card.element] || []).push(card);
  }
  for (const [element, cards] of Object.entries(byElement)) {
    if (cards.length < 2) continue;
    const cheapest = cards.map((c) => c.cost).sort((a, b) => a - b);
    if (cheapest[0] + cheapest[1] <= state.enemy.energy) return element;
  }
  return null;
}

export function chooseIntent(state) {
  const foe = state.enemy;
  const you = state.player;
  const cards = handCards(state);
  const hasGuard = cards.some((c) => c.kind === 'guard');
  const hasStrike = cards.some((c) => c.kind === 'strike');
  const hasSurge = cards.some((c) => c.kind === 'surge');
  const strikeTotal = kindDamage(state, 'strike');
  const chainElement = chainableElement(state);

  if (foe.life <= 8 && hasGuard) {
    return { kind: 'guard', text: 'Ash Warden is guarding' };
  }
  if (hasStrike && strikeTotal >= you.life) {
    return { kind: 'strike', text: `Ash Warden will strike for ${strikeTotal}` };
  }
  if (chainElement) {
    const name = chainElement[0].toUpperCase() + chainElement.slice(1);
    return { kind: 'chain', element: chainElement, text: `Ash Warden is chaining ${name}` };
  }
  if (hasSurge && you.life > 10) {
    return { kind: 'surge', text: 'Ash Warden is charging a surge' };
  }
  if (hasStrike) {
    return { kind: 'strike', text: `Ash Warden will strike for ${strikeTotal}` };
  }
  if (hasGuard) {
    return { kind: 'guard', text: 'Ash Warden is guarding' };
  }
  if (hasSurge) {
    return { kind: 'surge', text: 'Ash Warden is charging a surge' };
  }
  return { kind: 'wait', text: 'Ash Warden is watching you' };
}

// Play the Warden's turn to its intent, then spend leftover energy.
// Returns the plays in order, so the driver can animate them one by one.
export function planEnemyTurn(state) {
  const intent = state.intent || chooseIntent(state);
  const plays = [];

  const playOne = (id) => {
    const report = playCard(state, 'enemy', id);
    if (report) plays.push(report);
    return report;
  };

  // The plan itself.
  if (intent.kind === 'chain' && intent.element) {
    const pair = handCards(state)
      .filter((c) => c.element === intent.element && canPlay(state, 'enemy', c.id))
      .sort((a, b) => mainNumber(a) - mainNumber(b)); // small first, bonus on the big one
    for (const card of pair.slice(0, 2)) {
      if (!playOne(card.id)) break;
      if (state.phase === 'over') return plays;
    }
  } else if (intent.kind !== 'wait') {
    let again = true;
    while (again && state.phase !== 'over') {
      again = false;
      const playable = handCards(state)
        .filter((c) => c.kind === intent.kind && canPlay(state, 'enemy', c.id))
        .sort((a, b) => mainNumber(b) - mainNumber(a));
      if (playable.length === 0) break;
      if (!playOne(playable[0].id)) break;
      again = true;
    }
    if (state.phase === 'over') return plays;
  }

  // Leftover energy: strikes, then surges, then guards.
  for (const kind of ['strike', 'surge', 'guard']) {
    let again = true;
    while (again && state.phase !== 'over') {
      again = false;
      const playable = handCards(state)
        .filter((c) => c.kind === kind && canPlay(state, 'enemy', c.id))
        .sort((a, b) => mainNumber(b) - mainNumber(a));
      if (playable.length === 0) break;
      if (!playOne(playable[0].id)) break;
      again = true;
    }
    if (state.phase === 'over') return plays;
  }
  return plays;
}
