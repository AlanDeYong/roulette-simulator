/**
 * Strategy: Just Do It
 * Source: https://www.youtube.com/watch?v=cRgLLP0EeS8 (Channel: The Roulette Master)
 * * The Logic: 
 * - Base bet is constructed using a 5:5:1 ratio to maintain balance while adhering to table minimums.
 * - Place 5 base units on Black.
 * - Place 5 base units on the 2nd Column.
 * - Place 1 base unit on every Street that contains exactly 2 black numbers: Streets 4, 10, 13, 22, 28, and 31.
 * * The Progression:
 * - On a full loss (0 payout): Double the bets (move 1 step up the doubling progression).
 * - On a partial loss (small payout but net loss, e.g., hitting a red number on a covered street): Keep bets the same.
 * - On a win (net profit > 0):
 * - If the win brings the bankroll to a new peak (session profit), reset bets to the base level.
 * - If not at peak bankroll, step back 2 levels in the doubling progression.
 * * The Goal: Accumulate session profit efficiently while riding out losing streaks with partial covers, resetting upon reaching a new peak bankroll.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Initialize State
  if (state.peakBankroll === undefined) {
    state.peakBankroll = bankroll;
    state.progressionIndex = 0; // 0 = 1x, 1 = 2x, 2 = 4x, etc.
  }

  // 2. Evaluate previous spin and update progression
  if (spinHistory.length > 0 && state.lastBankroll !== undefined) {
    const netProfit = bankroll - state.lastBankroll;

    if (netProfit > 0) {
      // Win
      if (bankroll >= state.peakBankroll) {
        // Reached new peak bankroll, reset to base bet
        state.progressionIndex = 0;
        state.peakBankroll = bankroll;
      } else {
        // Not at peak bankroll, go back 2 levels in the doubling progression
        state.progressionIndex = Math.max(0, state.progressionIndex - 2);
      }
    } else if (netProfit < 0) {
      // Loss: Check if it was a full loss or a partial loss
      if (Math.abs(netProfit) === state.lastBetAmount) {
        // Full loss -> Double up
        state.progressionIndex++;
      } else {
        // Partial loss -> Keep bets the same (do not change progressionIndex)
      }
    }
  }

  // 3. Determine base units respecting minimum limits
  const baseStreetBet = config.betLimits.min;
  const baseOutsideBet = Math.max(config.betLimits.minOutside, baseStreetBet * 5);

  // 4. Calculate current bet amounts with progression multiplier
  const multiplier = Math.pow(2, state.progressionIndex);
  let streetBetAmount = baseStreetBet * multiplier;
  let outsideBetAmount = baseOutsideBet * multiplier;

  // 5. Clamp amounts to maximum limits
  streetBetAmount = Math.min(streetBetAmount, config.betLimits.max);
  outsideBetAmount = Math.min(outsideBetAmount, config.betLimits.max);

  // 6. Define bets
  const bets = [
    { type: 'black', amount: outsideBetAmount },
    { type: 'column', value: 2, amount: outsideBetAmount },
    { type: 'street', value: 4, amount: streetBetAmount },
    { type: 'street', value: 10, amount: streetBetAmount },
    { type: 'street', value: 13, amount: streetBetAmount },
    { type: 'street', value: 22, amount: streetBetAmount },
    { type: 'street', value: 28, amount: streetBetAmount },
    { type: 'street', value: 31, amount: streetBetAmount }
  ];

  // 7. Store state for the next spin evaluation
  state.lastBankroll = bankroll;
  state.lastBetAmount = (outsideBetAmount * 2) + (streetBetAmount * 6);

  return bets;
}