/**
 * 27# Siege Strategy
 * 
 * Source:
 * - YouTube Channel: The Roulette Factory
 * - Video URL: https://youtu.be/wHiSVRmbgsw ("ONE GETS ELIMINATED! Holy Grail vs 27# Siege")
 * 
 * Strategy Logic:
 * - The strategy covers 27 numbers across the roulette board using a combination of inside bets:
 *   - 9 Split Bets (1 unit each): [1,2], [5,6], [11,12], [13,14], [17,18], [25,26], [29,30], [31,32], [35,36]
 *   - 1 Street Bet (1 unit): Street 7 (covers 7, 8, 9) - acts as a hedge
 *   - 1 Double Street / Line Bet (2 units): Line 19 (covers 19, 20, 21, 22, 23, 24)
 * - Total base bet = 12 units (9 splits * 1 + 1 street * 1 + 1 line * 2).
 * 
 * Bet Progression:
 * - Base Level: Start at level 1 (12 units total).
 * - On Win / New High Profit: Reset progression back to base level 1 upon hitting a new net session profit high.
 * - On Loss: Track consecutive losses. After 2 consecutive losses, increase the bet progression by 1 unit level
 *   (each split/street increases by 1 base unit, double street increases by 2 base units).
 * - Pushes (0 net outcome) do not count as losses and do not change the progression level.
 * 
 * Goal:
 * - Achieve continuous session profit highs through 27-number board coverage, resetting to base level whenever
 *   a new profit peak is reached.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Initialize State
  if (state.level === undefined) {
    state.level = 1;
    state.consecutiveLosses = 0;
    state.highestBankroll = bankroll;
    state.lastBankroll = bankroll;
  }

  // 2. Process Previous Spin Result
  if (spinHistory && spinHistory.length > 0) {
    const netChange = bankroll - state.lastBankroll;

    if (bankroll > state.highestBankroll) {
      // Reached new profit high -> Reset to base level
      state.highestBankroll = bankroll;
      state.level = 1;
      state.consecutiveLosses = 0;
    } else if (netChange < 0) {
      // Full loss
      state.consecutiveLosses += 1;
      if (state.consecutiveLosses >= 2) {
        state.level += 1;
        state.consecutiveLosses = 0;
      }
    } else if (netChange > 0) {
      // Win, but not a new high -> keep current level, clear consecutive loss streak
      state.consecutiveLosses = 0;
    }
    // Note: If netChange === 0 (push), keep level and consecutiveLosses unchanged
  }

  state.lastBankroll = bankroll;

  // 3. Determine Base Unit (respect inside bet limits)
  const minInside = config.betLimits.min || 1;
  const maxBet = config.betLimits.max || 500;
  const unit = minInside;
  const level = state.level;

  // 4. Helper function to calculate and clamp bet amounts
  function createBet(type, value, baseUnits) {
    let amount = baseUnits * level * unit;
    amount = Math.max(amount, minInside);
    amount = Math.min(amount, maxBet);
    return { type, value, amount };
  }

  // 5. Construct Bet Array
  const bets = [
    createBet('split', [1, 2], 1),
    createBet('split', [5, 6], 1),
    createBet('street', 7, 1),
    createBet('split', [11, 12], 1),
    createBet('split', [13, 14], 1),
    createBet('split', [17, 18], 1),
    createBet('line', 19, 2),
    createBet('split', [25, 26], 1),
    createBet('split', [29, 30], 1),
    createBet('split', [31, 32], 1),
    createBet('split', [35, 36], 1)
  ];

  return bets;
}