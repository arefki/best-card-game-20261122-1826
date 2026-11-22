// Piles for Emberfall Duel v2: the deck, the hand, the discard.
//
// Both duelists play the same 32-card deck — two copies of each of the 16
// cards in config.js. When a deck runs dry, its discard pile is shuffled
// back in, so a duel never stalls for want of cards. Hands hold at most
// seven cards; draws past the cap are simply skipped.

import { CARDS, HAND_CAP } from './config.js';
import { shuffle } from './rng.js';

export function buildDeck(rng) {
  const pile = [];
  for (const card of CARDS) {
    pile.push(card.id, card.id);
  }
  return shuffle(pile, rng);
}

// Draw up to n cards into a side's hand. Returns the ids actually drawn.
export function drawCards(side, n, rng) {
  const drawn = [];
  for (let i = 0; i < n; i += 1) {
    if (side.hand.length >= HAND_CAP) break;
    if (side.deck.length === 0) {
      if (side.discard.length === 0) break;
      side.deck = shuffle(side.discard, rng);
      side.discard = [];
    }
    const id = side.deck.pop();
    side.hand.push(id);
    drawn.push(id);
  }
  return drawn;
}

// Move one card id from a side's hand to its discard pile.
export function discardFromHand(side, id) {
  const at = side.hand.indexOf(id);
  if (at === -1) return false;
  side.hand.splice(at, 1);
  side.discard.push(id);
  return true;
}
