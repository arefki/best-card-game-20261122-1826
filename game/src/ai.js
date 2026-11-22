// The opponent brain for Emberfall Duel: Ash Warden.
//
// The AI telegraphs its intent, so the player can read it and counter it:
// at the start of the player's turn the table shows what Ash Warden will do
// next ("will strike for 6", "is guarding", "is charging a surge"). The
// intent is a real plan, not a bluff — the AI plays to it on its turn.
//
// Intent choice, in order: guard when hurt and holding a guard; strike
// when it can finish the player; surge when it holds one and the player is
// healthy; otherwise strike when it holds a strike, else guard, else surge.

import { CARDS } from './config.js';
import { canPlay, playCard } from './state.js';

function handCards(state) {
  return state.enemy.hand.map((id) => CARDS.find((c) => c.id === id));
}

function intentDamage(state, kind) {
  const cards = handCards(state).filter((c) => c.kind === kind);
  return cards.reduce((sum, c) => sum + (c.damage || 0), 0);
}

export function chooseIntent(state) {
  const enemy = state.enemy;
  const player = state.player;
  const hasGuard = handCards(state).some((c) => c.kind === 'guard');
  const hasStrike = handCards(state).some((c) => c.kind === 'strike');
  const hasSurge = handCards(state).some((c) => c.kind === 'surge');
  const strikeTotal = intentDamage(state, 'strike');

  if (enemy.life <= 8 && hasGuard) {
    return { kind: 'guard', value: 0, text: 'Ash Warden is guarding' };
  }
  if (hasStrike && strikeTotal >= player.life) {
    return { kind: 'strike', value: strikeTotal, text: `Ash Warden will strike for ${strikeTotal}` };
  }
  if (hasSurge && player.life > 10) {
    return { kind: 'surge', value: intentDamage(state, 'surge'), text: 'Ash Warden is charging a surge' };
  }
  if (hasStrike) {
    return { kind: 'strike', value: strikeTotal, text: `Ash Warden will strike for ${strikeTotal}` };
  }
  if (hasGuard) {
    return { kind: 'guard', value: 0, text: 'Ash Warden is guarding' };
  }
  if (hasSurge) {
    return { kind: 'surge', value: intentDamage(state, 'surge'), text: 'Ash Warden is charging a surge' };
  }
  return { kind: 'wait', value: 0, text: 'Ash Warden is watching you' };
}

// Play the AI's turn to its intent: cards of the intended kind first
// (biggest effect first), then anything else affordable. Returns the list
// of plays, in order, so the driver can animate them one by one.
export function planEnemyTurn(state) {
  const intent = state.intent || chooseIntent(state);
  const plays = [];
  const kinds = [intent.kind, 'strike', 'surge', 'guard'].filter(
    (kind, at, all) => all.indexOf(kind) === at,
  );
  for (const kind of kinds) {
    let again = true;
    while (again) {
      again = false;
      const playable = handCards(state)
        .filter((c) => c.kind === kind && canPlay(state, 'enemy', c.id))
        .sort((a, b) => (b.damage || b.block || 0) - (a.damage || a.block || 0));
      if (playable.length === 0) break;
      const report = playCard(state, 'enemy', playable[0].id);
      if (!report) break;
      plays.push(report);
      again = true;
      if (state.phase === 'over') return plays;
    }
  }
  return plays;
}
