// Input for Emberfall Duel: mouse and keyboard.
//
// Click a card to select it, click it again (or press Enter) to play it.
// Number keys 1–7 select a hand slot, E ends the turn, R restarts from an
// end screen. The handlers call back into main.js, which owns the state —
// this module never mutates the game itself.

export function bindInput(hooks) {
  const hand = document.getElementById('player-hand');
  hand.addEventListener('click', (event) => {
    const node = event.target.closest('.card');
    if (!node || !node.dataset.id) return;
    hooks.onCardClick(node.dataset.id);
  });

  document.getElementById('btn-play').addEventListener('click', hooks.onPlay);
  document.getElementById('btn-end-turn').addEventListener('click', hooks.onEndTurn);
  document.getElementById('btn-again').addEventListener('click', hooks.onRestart);

  document.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const key = event.key.toLowerCase();
    if (key >= '1' && key <= '7') hooks.onSlot(Number(key) - 1);
    else if (key === 'enter' || key === ' ') hooks.onConfirm();
    else if (key === 'e') hooks.onEndTurn();
    else if (key === 'r') hooks.onRestart();
  });
}
