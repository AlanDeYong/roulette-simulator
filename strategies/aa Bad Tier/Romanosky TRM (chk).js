/**
 * Romanosky Roulette Strategy
 *
 * Source:
 *   - Video: https://youtu.be/sZzYb7nn_B8
 *   - Channel: CEG Dealer School
 *
 * The Full Logic in Detail:
 *   - The Romanosky strategy covers 32 out of 37 numbers (86.5% wheel coverage) on a European wheel.
 *   - Bets are placed simultaneously on:
 *       1. Two distinct Dozens (e.g., Dozen 1 and Dozen 2).
 *       2. Two Corner bets inside the remaining unbet Dozen (e.g., Corners [25,26,28,29] and [32,33,35,36] in Dozen 3).
 *   - Ratio: 3 units on Dozen A, 3 units on Dozen B, 1 unit on Corner 1, 1 unit on Corner 2 (Total = 8 units).
 *   - Payout on any hit:
 *       - Dozen win pays 2:1 -> 3 * 3 = 9 units (Net +1 unit).
 *       - Corner win pays 8:1 -> 1 * 9 = 9 units (Net +1 unit).
 *       - Uncovered numbers (4 numbers in the third dozen + Zero) result in a loss of 8 units.
 *
 * The Full Bet Progression in Detail:
 *   - Base Level (Multiplier = 1):
 *       - Dozen bets = 3 * unitOutside
 *       - Corner bets = 1 * unitInside
 *   - On Win: Reset multiplier back to 1 (or lock in profit).
 *   - On Loss: Increase multiplier according to Martingale/tiered progression (1 -> 2 -> 4 -> 8...)
 *     to recover the lost units and achieve the net profit target.
 *
 * The Goal:
 *   - Grind steady small unit wins (+1 unit per hit) with high strike rate.
 *   - Stop-loss reached if bankroll is insufficient to place the next progression step.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // Initialize state on first spin
  if (!state.initialized) {
    state.initialized = true;
    state.multiplier = 1;
    state.startBankroll = bankroll;
    state.lastBetPlaced = null;
  }

  const minInside = config.betLimits.min;
  const minOutside = config.betLimits.minOutside;
  const maxBet = config.betLimits.max;

  // Process win/loss from previous spin if bets were active
  if (spinHistory.length > 0 && state.lastBetPlaced) {
    const lastResult = spinHistory[spinHistory.length - 1];
    const winningNum = lastResult.winningNumber;

    let won = false;
    for (const b of state.lastBetPlaced) {
      if (b.type === 'dozen') {
        if (b.value === 1 && winningNum >= 1 && winningNum <= 12) won = true;
        if (b.value === 2 && winningNum >= 13 && winningNum <= 24) won = true;
        if (b.value === 3 && winningNum >= 25 && winningNum <= 36) won = true;
      } else if (b.type === 'corner') {
        const cVal = b.value;
        const covered = [cVal, cVal + 1, cVal + 3, cVal + 4];
        if (covered.includes(winningNum)) won = true;
      }
    }

    if (won) {
      state.multiplier = 1;
    } else {
      state.multiplier *= 2;
    }
  }

  // Base unit sizing respecting table minimums
  const dozenUnit = Math.max(minOutside, 3 * minInside);
  const cornerUnit = Math.max(minInside, Math.floor(dozenUnit / 3));

  let dozenAmount = dozenUnit * state.multiplier;
  let cornerAmount = cornerUnit * state.multiplier;

  // Clamp amounts to table limits
  dozenAmount = Math.max(minOutside, Math.min(dozenAmount, maxBet));
  cornerAmount = Math.max(minInside, Math.min(cornerAmount, maxBet));

  // Determine which dozens to bet based on last outcome or default to Dozen 1 & 2
  let dozenA = 1;
  let dozenB = 2;
  let corner1 = 25; // Covers 25, 26, 28, 29
  let corner2 = 32; // Covers 32, 33, 35, 36

  if (spinHistory.length > 0) {
    const lastNum = spinHistory[spinHistory.length - 1].winningNumber;
    if (lastNum >= 25 && lastNum <= 36) {
      // If last was in Dozen 3, bet Dozen 2 & 3, place corners in Dozen 1
      dozenA = 2;
      dozenB = 3;
      corner1 = 1;  // Covers 1, 2, 4, 5
      corner2 = 8;  // Covers 8, 9, 11, 12
    } else if (lastNum >= 13 && lastNum <= 24) {
      // If last was in Dozen 2, bet Dozen 1 & 3, place corners in Dozen 2
      dozenA = 1;
      dozenB = 3;
      corner1 = 13; // Covers 13, 14, 16, 17
      corner2 = 20; // Covers 20, 21, 23, 24
    }
  }

  const bets = [
    { type: 'dozen', value: dozenA, amount: dozenAmount },
    { type: 'dozen', value: dozenB, amount: dozenAmount },
    { type: 'corner', value: corner1, amount: cornerAmount },
    { type: 'corner', value: corner2, amount: cornerAmount }
  ];

  // Bankroll verification
  const totalWager = bets.reduce((sum, b) => sum + b.amount, 0);
  if (bankroll < totalWager) {
    state.multiplier = 1;
    return [];
  }

  state.lastBetPlaced = bets;
  return bets;
}