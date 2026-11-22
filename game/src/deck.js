// Deck building and drawing for Emberfall Duel.
//
// Both duelists play the same 24-card deck: two copies of each of the 12
// cards in config.js. When a deck runs out, its discard pile is shuffled
// back in, so a game never stalls for want of cards.

import { CARDS, HAND_CAP } from './config.js';
import { shuffle } from './rng.js';

export function buildDeck(rng) {
  const cards = [];
  for (const card of CARDS) {
    cards.push(card.id, card.id);
  }
  return shuffle(cards, rng);
}

// Draw up to n cards into a side's hand (hand cap respected). Returns the
// ids actually drawn. Reshuffles the discard pile when the deck is empty.
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

// Move a card id from a side's hand to its discard pile. Returns true when
// the card was there.
export function discardFromHand(side, id) {
  const at = side.hand.indexOf(id);
  if (at === -1) return false;
  side.hand.splice(at, 1);
  side.discard.push(id);
  return true;
}
