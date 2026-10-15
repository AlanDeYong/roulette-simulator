/**
 * Roulette Strategy: Roulette Mastery (Corrected Corner Values)
 * 
 * Source:
 * - Channel: The Roulette Master
 * - Video URL: https://youtu.be/oqOTk9hbGWE
 * 
 * Full Logic in Detail:
 * - Places 3 simultaneous bets every spin:
 *   1. Corner 13/17: covers [13, 14, 16, 17] (top-left / anchor value: 13)
 *   2. Corner 17/21: covers [17, 18, 20, 21] (top-left / anchor value: 17)
 *   3. 2nd Column (Column value 2: covers 2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35)
 * - The overlap creates a high-payout sweet spot on number 17 (both corners + column win),
 *   strong wins on 14 and 20 (corner + column win), solid wins on 13, 16, 18, 21 (corner win),
 *   and break-even (net 0) on any other 2nd column number.
 * 
 * Full Bet Progression in Detail:
 * - Base bet: 1 unit on each of the 3 positions (3 units total).
 * - After a Net Loss: Increase each position by 2 units (multiplier increases by +2).
 * - After a Break-Even (Net Win == 0): Repeat the identical bet size.
 * - After a Net Win:
 *   - If current bankroll >= initial baseline bankroll + session target (or reaches new peak), reset progression multiplier back to 1.
 *   - Otherwise, maintain the current bet level to recover the remaining deficit.
 * 
 * The Goal:
 * - Achieve continuous session profit through corner overlaps and column insurance while recovering drawdowns using a 2-unit step progression.
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // Initialize persistent strategy state
  if (!state.initialized) {
    state.initialized = true;
    state.multiplier = 1;
    state.targetProfit = 100;
    state.startBankroll = bankroll;
    state.lastBankroll = bankroll;
    state.lastTotalBet = 0;
  }

  // Evaluate previous outcome if spins have occurred
  if (spinHistory && spinHistory.length > 0 && state.lastTotalBet > 0) {
    const netChange = bankroll - state.lastBankroll;

    if (netChange > 0) {
      // Net Win
      if (bankroll >= state.startBankroll + state.targetProfit || bankroll >= state.startBankroll) {
        state.multiplier = 1;
        state.startBankroll = bankroll; // update high-water benchmark
      }
    } else if (netChange < 0) {
      // Net Loss: escalate by 2 units per position
      state.multiplier += 2;
    }
    // Net Change === 0 (Break-even): leave state.multiplier unchanged
  }

  // Determine unit sizes adhering to minimum table limits
  const baseInside = config && config.betLimits ? config.betLimits.min : 10;
  const baseOutside = config && config.betLimits ? config.betLimits.minOutside : 10;
  const maxLimit = config && config.betLimits ? config.betLimits.max : 10000;

  let cornerBetAmount = baseInside * state.multiplier;
  cornerBetAmount = Math.max(cornerBetAmount, baseInside);
  cornerBetAmount = Math.min(cornerBetAmount, maxLimit);

  let columnBetAmount = baseOutside * state.multiplier;
  columnBetAmount = Math.max(columnBetAmount, baseOutside);
  columnBetAmount = Math.min(columnBetAmount, maxLimit);

  const totalRequired = (cornerBetAmount * 2) + columnBetAmount;

  // Validate sufficient bankroll
  if (bankroll < totalRequired) {
    return [];
  }

  state.lastBankroll = bankroll;
  state.lastTotalBet = totalRequired;

  // Return bet array: Corner 13/17 (value: 13), Corner 17/21 (value: 17), and 2nd Column
  return [
    { type: 'corner', value: 13, amount: cornerBetAmount },
    { type: 'corner', value: 17, amount: cornerBetAmount },
    { type: 'column', value: 2, amount: columnBetAmount }
  ];
}