/**
 * Source: https://youtu.be/rOmWqdxLOtY (Channel: The Roulette Master)
 * Strategy Name: Pick Three Roulette (by Leon Smith)
 *
 * Full Logic in Detail:
 * - Requires at least 3 spins of history to begin betting [00:12:14].
 * - Tracks the outcome of the spin from 3 spins ago (spinHistory[spinHistory.length - 3]).
 * - Triggers an outside bet on the opposite color:
 *   - If the 3rd spin back was Red, bet on Black [00:12:44].
 *   - If the 3rd spin back was Black, bet on Red [00:12:17].
 *   - If the 3rd spin back was Green (0 or 00), do not bet; wait for the next spin [00:16:24], [00:26:52].
 *
 * Full Bet Progression in Detail:
 * - Base Bet: 1 outside unit (config.betLimits.minOutside).
 * - After a Loss: Increase bet amount by 1 unit (currentUnits + 1) [00:12:49], [00:14:11].
 * - After a Win:
 *   - If current bankroll is in net session profit (>= baseline bankroll), reset bet to 1 unit [00:13:09], [00:21:00].
 *   - If current bankroll remains in a deficit (< baseline bankroll), maintain the exact same bet size [00:15:14], [00:16:05].
 *
 * The Goal:
 * - Reach a session profit target of $250 (or 25 base units) and halt session [00:22:19], [00:36:15].
 */
function bet(spinHistory, bankroll, config, state, utils) {
  const baseUnit = config.betLimits.minOutside;

  // Initialize session state on first execution
  if (!state.initialized) {
    state.initialized = true;
    state.startingBankroll = bankroll;
    state.baselineBankroll = bankroll;
    state.targetProfit = 250;
    state.currentUnits = 1;
    state.lastBankroll = bankroll;
    state.lastBetPlaced = false;
  }

  // Check if session profit target has been achieved
  if (bankroll >= state.startingBankroll + state.targetProfit) {
    return [];
  }

  // Evaluate previous bet result if one was active
  if (state.lastBetPlaced && spinHistory && spinHistory.length > 0) {
    if (bankroll > state.lastBankroll) {
      // Won previous round
      if (bankroll >= state.baselineBankroll) {
        // Back in net session profit: reset progression
        state.currentUnits = 1;
        state.baselineBankroll = bankroll;
      }
      // If still below baseline, hold currentUnits unchanged (flat on win during recovery)
    } else if (bankroll < state.lastBankroll) {
      // Lost previous round: increase progression by 1 unit
      state.currentUnits += 1;
    }
  }

  // Need at least 3 spins of history to evaluate the Pick 3 trigger
  if (!spinHistory || spinHistory.length < 3) {
    state.lastBankroll = bankroll;
    state.lastBetPlaced = false;
    return [];
  }

  // Identify the spin from 3 positions back
  const thirdSpinBack = spinHistory[spinHistory.length - 3];

  // If 3rd spin was zero or green, skip betting this round
  if (
    thirdSpinBack.winningColor === 'green' ||
    thirdSpinBack.winningNumber === 0 ||
    thirdSpinBack.winningNumber === '00'
  ) {
    state.lastBankroll = bankroll;
    state.lastBetPlaced = false;
    return [];
  }

  // Determine opposite color
  let betColor = null;
  if (thirdSpinBack.winningColor === 'red') {
    betColor = 'black';
  } else if (thirdSpinBack.winningColor === 'black') {
    betColor = 'red';
  } else {
    state.lastBankroll = bankroll;
    state.lastBetPlaced = false;
    return [];
  }

  // Compute and clamp bet amount
  let betAmount = baseUnit * state.currentUnits;
  betAmount = Math.max(betAmount, config.betLimits.minOutside);
  betAmount = Math.min(betAmount, config.betLimits.max);

  // Bankroll guard
  if (bankroll < betAmount) {
    betAmount = bankroll;
  }

  if (betAmount < config.betLimits.minOutside) {
    state.lastBankroll = bankroll;
    state.lastBetPlaced = false;
    return [];
  }

  // Record state for the subsequent spin
  state.lastBankroll = bankroll;
  state.lastBetPlaced = true;

  return [{ type: betColor, amount: betAmount }];
}