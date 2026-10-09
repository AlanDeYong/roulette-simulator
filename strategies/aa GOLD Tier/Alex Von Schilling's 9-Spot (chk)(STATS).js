/**
 * Alex Von Schilling's 9-Spot Roulette Strategy
 * 
 * Source:
 * - URL: https://youtu.be/dbQXJS504b4
 * - Channel: The Roulette Master
 * 
 * The Full Logic in Detail:
 * - The strategy places bets on 9 specific positions across the layout on every spin:
 *   1. 2nd Column (12 numbers: 2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35)
 *   2. Corner 1-2-4-5 (topLeft: 1)
 *   3. Corner 8-9-11-12 (topLeft: 8)
 *   4. Corner 13-14-16-17 (topLeft: 13)
 *   5. Corner 20-21-23-24 (topLeft: 20)
 *   6. Corner 25-26-28-29 (topLeft: 25)
 *   7. Corner 32-33-35-36 (topLeft: 32)
 *   8. Zero/Corner Bet: On American tables, the 0-00-2 corner/basket; on European, the 0-1-2 trio.
 *   9. Split 17-20: Overlaps column and corner bets for major "jackpot" payouts.
 * 
 * The Full Bet Progression in Detail:
 * - Base Level: 1 unit on each of the 9 spots.
 * - On Loss (Net loss on the spin): Increase each spot by +2 units (+2 base multiplier).
 * - On Win (Net win on the spin):
 *   - If current bankroll is greater than or equal to the session starting/peak bankroll,
 *     reset progression back to base level (1 unit).
 *   - Otherwise, hold the current bet level and repeat until session profit is restored.
 * - On Push/Break-Even: Retain the current bet level without increasing or resetting.
 * 
 * The Goal:
 * - Accumulate consistent session profit with coverage across 2nd column and key corners,
 *   capitalizing on overlapping multi-hit jackpot spots (17, 20, 0, 00, 2) during elevated
 *   progression tiers.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Initialize State
  if (!state.initialized) {
    state.initialized = true;
    state.units = 1; // Base unit multiplier
    state.peakBankroll = bankroll;
    state.lastBankroll = bankroll;
  }

  // 2. Evaluate previous spin outcome (if spins have occurred)
  if (spinHistory && spinHistory.length > 0 && state.lastBankroll !== undefined) {
    const netSpinProfit = bankroll - state.lastBankroll;

    if (bankroll > state.peakBankroll) {
      state.peakBankroll = bankroll;
    }

    if (netSpinProfit > 0) {
      // Won this spin
      if (bankroll >= state.peakBankroll) {
        // Recovered into session profit: reset to base level
        state.units = 1;
      }
      // If still below peak bankroll, hold current level
    } else if (netSpinProfit < 0) {
      // Lost this spin: increase progression by +2 units
      state.units += 2;
    }
    // If netSpinProfit === 0 (break-even / push), hold current level
  }

  // 3. Determine base unit sizing respecting limits
  const baseInside = Math.max(config.betLimits.min || 1, 1);
  const baseOutside = Math.max(config.betLimits.minOutside || baseInside, baseInside);

  // Calculate current stake amounts for inside and outside positions
  let insideAmount = baseInside * state.units;
  insideAmount = Math.max(insideAmount, config.betLimits.min);
  insideAmount = Math.min(insideAmount, config.betLimits.max);

  let columnAmount = baseOutside * state.units;
  columnAmount = Math.max(columnAmount, config.betLimits.minOutside);
  columnAmount = Math.min(columnAmount, config.betLimits.max);

  // 4. Construct the 9 bet spots
  const bets = [
    // 1. 2nd Column
    { type: 'column', value: 2, amount: columnAmount },

    // 2-7. The 6 Corner Bets along the 2nd column
    { type: 'corner', value: 1, amount: insideAmount },
    { type: 'corner', value: 8, amount: insideAmount },
    { type: 'corner', value: 13, amount: insideAmount },
    { type: 'corner', value: 20, amount: insideAmount },
    { type: 'corner', value: 25, amount: insideAmount },
    { type: 'corner', value: 32, amount: insideAmount },

    // 8. Zero protection / overlap bet
    config.tableType === 'american'
      ? { type: 'basket', value: 0, amount: insideAmount }
      : { type: 'trio', value: [0, 1, 2], amount: insideAmount },

    // 9. Jackpot Split (17-20)
    { type: 'split', value: [17, 20], amount: insideAmount }
  ];

  // 5. Total cost verification against available bankroll
  const totalWager = bets.reduce((sum, b) => sum + b.amount, 0);
  if (bankroll < totalWager) {
    return []; // Insufficient funds to maintain full spread
  }

  // Update last tracked bankroll before placing bet
  state.lastBankroll = bankroll;

  return bets;
}