/**
 * Strategy: Tony's Column Switch Triple Martingale
 * Source: https://youtu.be/0wJ_GFLH_5Y (The Roulette Master)
 *
 * Full Logic in Detail:
 * - Bets are placed exclusively on two adjacent columns at a time:
 *   either Columns [1, 2] or Columns [2, 3].
 * - Column 1 and Column 3 are NEVER bet together; Column 2 is always covered.
 * - Initial Bet: Starts on Columns [1, 2] at 1 base unit each.
 * - On a Win: Keep the bets on the exact same two columns. Do not switch sides.
 * - On a Loss (opposite outer column hits, or 0 hits): Switch to the other
 *   column pair ([1, 2] <-> [2, 3]).
 *
 * Full Bet Progression in Detail:
 * - Uses a Triple Martingale (3x) progression per column: 1 -> 3 -> 9 -> 27 -> 81...
 * - Base unit is `config.betLimits.minOutside`.
 * - Post-Win: Reset the per-column bet multiplier back to 1.
 * - Post-Loss: Multiply the per-column bet multiplier by 3 and switch sides.
 *
 * The Goal:
 * - Designed for a 231-unit bankroll ($231 with $1 units) to grind steady 1-unit
 *   profits per winning cycle while avoiding back-and-forth whipsaws between
 *   Column 1 and Column 3.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  const baseUnit = config.betLimits.minOutside;

  // Initialize persistent state on the first spin
  if (!state.initialized) {
    state.initialized = true;
    state.multiplier = 1;
    // 'low' represents Columns [1, 2]; 'high' represents Columns [2, 3]
    state.activePair = 'low';
    state.lastBetColumns = null;
  }

  // Evaluate the previous spin result if a bet was placed
  if (spinHistory.length > 0 && state.lastBetColumns !== null) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const winningNumber = lastSpin.winningNumber;

    // Determine which column hit (0 = green/none, 1 = Col 1, 2 = Col 2, 3 = Col 3)
    let winningColumn = 0;
    if (winningNumber > 0 && winningNumber <= 36) {
      winningColumn = ((winningNumber - 1) % 3) + 1;
    }

    const wonLastSpin = state.lastBetColumns.includes(winningColumn);

    if (wonLastSpin) {
      // On Win: Reset progression to 1 unit and stay on the same column pair
      state.multiplier = 1;
    } else {
      // On Loss: Triple the bet and switch to the opposite column pair
      state.multiplier *= 3;
      state.activePair = state.activePair === 'low' ? 'high' : 'low';
    }
  }

  // Calculate clamped bet amount per column
  let betAmount = baseUnit * state.multiplier;
  betAmount = Math.max(betAmount, config.betLimits.minOutside);
  betAmount = Math.min(betAmount, config.betLimits.max);

  // Check if bankroll can cover both column bets
  const totalBetRequired = betAmount * 2;
  if (bankroll < totalBetRequired) {
    state.lastBetColumns = null;
    return [];
  }

  // Select the two active columns based on current side
  const targetColumns = state.activePair === 'low' ? [1, 2] : [2, 3];
  state.lastBetColumns = targetColumns;

  return [
    { type: 'column', value: targetColumns[0], amount: betAmount },
    { type: 'column', value: targetColumns[1], amount: betAmount }
  ];
}