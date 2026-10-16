/**
 * Strategy: The Ultimate Roulette System (by Gary)
 * Source: https://www.youtube.com/watch?v=Nm3M3h1FOt0 (Channel: The Roulette Master, 00:00:00 - 00:22:01)
 *
 * Full Logic in Detail:
 * - Phase 1 (Base Level): Place 1 unit on a 1:1 even-money outside bet (e.g., Black, Even, Odd, Red, Low, High).
 *   - On a win: Remain at Base Level (1 unit) and switch to a different 1:1 outside bet.
 *   - On a loss: Enter Phase 2 (Recovery Mode). Keep the losing 1:1 outside bet and add two Dozens.
 * - Phase 2 (Recovery Mode): Bet equal amounts on the 1:1 outside bet and two Dozens.
 *
 * Full Bet Progression in Detail:
 * - Base Unit: `config.betLimits.minOutside` (e.g., $10 unit for $2,000 bankroll, or $1 unit for $200 bankroll).
 * - Step 1: 1 unit on 1:1 outside bet.
 * - Step 2 (after Step 1 loss): Add two Dozens at 1 unit each, then increase all three bets by +1 unit to 2 units each (6 units total).
 * - Subsequent Steps (Step 3+):
 *   - If BOTH the 1:1 outside bet AND one of the two Dozens win on the same spin: Reset immediately to Step 1 (1 unit on a new 1:1 outside bet), regardless of whether a new session profit high was reached.
 *   - If ONLY ONE wins (break-even push when Dozen wins, or partial loss when only 1:1 bet wins) OR BOTH lose (total loss): Increase all three bets by +1 unit (e.g., 3 units each, 4 units each, 5 units each...).
 *
 * The Goal:
 * - Steadily accumulate profit while preventing catastrophic bankroll wipeouts by resetting as soon as both the Dozen and outside bet hit together, accepting minor profit fluctuations after long losing streaks.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  const outsideOptions = ['black', 'even', 'odd', 'red', 'low', 'high'];
  const dozenPairs = [
    [1, 2],
    [1, 3],
    [2, 3]
  ];

  // Initialize persistent state
  if (!state.initialized) {
    state.initialized = true;
    state.inRecovery = false;
    state.multiplier = 1;
    state.outsideIndex = 0;
    state.dozenPairIndex = 0;
  }

  const baseUnit = config.betLimits.minOutside;
  const incrementUnit =
    config.incrementMode === 'fixed' && config.minIncrementalBet
      ? config.minIncrementalBet
      : baseUnit;

  // Evaluate previous spin result
  if (spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const num = lastSpin.winningNumber;
    const color = lastSpin.winningColor;

    const currentOutside = outsideOptions[state.outsideIndex];
    const outsideWon = checkOutsideWin(num, color, currentOutside);

    if (!state.inRecovery) {
      if (outsideWon) {
        // Won at Level 1: stay at 1 unit and pick a different outside bet
        state.outsideIndex = (state.outsideIndex + 1) % outsideOptions.length;
      } else {
        // Lost at Level 1: enter recovery mode, add two dozens, and go up 1 unit (to 2 units each)
        state.inRecovery = true;
        state.multiplier = 2;
        state.dozenPairIndex = (state.dozenPairIndex + 1) % dozenPairs.length;
      }
    } else {
      const activeDozens = dozenPairs[state.dozenPairIndex];
      const dozenWon = checkDozenWin(num, activeDozens[0]) || checkDozenWin(num, activeDozens[1]);

      if (outsideWon && dozenWon) {
        // Hit BOTH outside bet and dozen: reset to Level 1 regardless of session profit
        state.inRecovery = false;
        state.multiplier = 1;
        state.outsideIndex = (state.outsideIndex + 1) % outsideOptions.length;
      } else {
        // Push (dozen only), partial loss (outside only), or total loss: increase all bets by 1 unit
        state.multiplier += 1;
      }
    }
  }

  // Calculate clamped bet amount per position
  let rawAmount = baseUnit + (state.multiplier - 1) * incrementUnit;
  let betAmount = Math.max(rawAmount, config.betLimits.minOutside);
  betAmount = Math.min(betAmount, config.betLimits.max);

  const bets = [];
  const activeOutside = outsideOptions[state.outsideIndex];

  if (!state.inRecovery) {
    if (bankroll < betAmount) return [];
    bets.push({ type: activeOutside, amount: betAmount });
  } else {
    const totalNeeded = betAmount * 3;
    if (bankroll < totalNeeded) return [];

    const activeDozens = dozenPairs[state.dozenPairIndex];
    bets.push({ type: activeOutside, amount: betAmount });
    bets.push({ type: 'dozen', value: activeDozens[0], amount: betAmount });
    bets.push({ type: 'dozen', value: activeDozens[1], amount: betAmount });
  }

  return bets;

  // Helper: check if 1:1 outside bet won
  function checkOutsideWin(num, color, betType) {
    if (num === 0 || num === '00' || num === 37) return false;
    switch (betType) {
      case 'red':
        return color === 'red';
      case 'black':
        return color === 'black';
      case 'even':
        return num % 2 === 0;
      case 'odd':
        return num % 2 !== 0;
      case 'low':
        return num >= 1 && num <= 18;
      case 'high':
        return num >= 19 && num <= 36;
      default:
        return false;
    }
  }

  // Helper: check if dozen bet won
  function checkDozenWin(num, dozenVal) {
    if (num === 0 || num === '00' || num === 37) return false;
    if (dozenVal === 1) return num >= 1 && num <= 12;
    if (dozenVal === 2) return num >= 13 && num <= 24;
    if (dozenVal === 3) return num >= 25 && num <= 36;
    return false;
  }
}