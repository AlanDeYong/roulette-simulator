/**
 * ============================================================================
 * STRATEGY NAME: Spin 2 Win (Junko Bodie)
 * SOURCE:
 *   - Video: https://youtu.be/3J8Hp-CGB4w
 *   - YouTube Channel: Junko Bodie
 * ============================================================================
 * 
 * 1. THE FULL LOGIC IN DETAIL:
 *    - The "Spin 2 Win" system utilizes 13 split bets carefully distributed across 
 *      the layout to ensure 4 splits per dozen plus 1 zero split:
 *        * Zero Split: [0, 3] on European tables or [0, '00'] on American tables.
 *        * Dozen 1 (4 splits): [1, 2], [6, 9], [7, 10], [8, 11]
 *        * Dozen 2 (4 splits): [13, 14], [16, 19], [17, 20], [23, 24]
 *        * Dozen 3 (4 splits): [27, 30], [28, 31], [32, 33], [35, 36]
 *    - This covers 25 numbers on European roulette (26 on American roulette).
 * 
 * 2. THE BET PROGRESSION IN DETAIL:
 *    - Session High Tracking: The system constantly tracks the session peak bankroll (`sessionHigh`).
 *    - New Session High / Win at or above High:
 *        * Whenever the bankroll reaches or exceeds `sessionHigh`, a full reset is triggered.
 *        * All 13 split positions are restored to the active layout.
 *        * Bet size resets to the base unit (config.betLimits.min).
 *    - On a Loss (Miss):
 *        * If none of the active splits hit, the bet size per split doubles (1, 2, 4, 8...).
 *        * All currently active split positions remain on the board.
 *    - On a Partial Win (Bankroll still below sessionHigh):
 *        * The specific split that produced the winning number is removed ("knocked out")
 *          from the active layout for subsequent spins.
 *        * The bet size per remaining split remains unchanged (does not increase on a win).
 *        * Play continues until a new session high is achieved or target is hit.
 * 
 * 3. THE GOAL & STOP CONDITIONS:
 *    - Profit Target: Default target profit is $100 (or +20% of initial bankroll).
 *    - Stop Loss: Depleted bankroll or inability to cover minimum bet.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // Base unit for inside split bets
  const baseUnit = config.betLimits && config.betLimits.min ? config.betLimits.min : 1;
  const maxLimit = config.betLimits && config.betLimits.max ? config.betLimits.max : 500;

  // Define default 13 split definitions
  function getFullSplitPositions(isAmerican) {
    return [
      // Zero split
      { id: 'zero_split', value: isAmerican ? [0, '00'] : [0, 3] },
      // Dozen 1
      { id: '1_2', value: [1, 2] },
      { id: '6_9', value: [6, 9] },
      { id: '7_10', value: [7, 10] },
      { id: '8_11', value: [8, 11] },
      // Dozen 2
      { id: '13_14', value: [13, 14] },
      { id: '16_19', value: [16, 19] },
      { id: '17_20', value: [17, 20] },
      { id: '23_24', value: [23, 24] },
      // Dozen 3
      { id: '27_30', value: [27, 30] },
      { id: '28_31', value: [28, 31] },
      { id: '32_33', value: [32, 33] },
      { id: '35_36', value: [35, 36] }
    ];
  }

  const isAmerican = config.tableType === 'american';

  // Initialize persistent state
  if (state.sessionHigh === undefined) {
    state.initialBankroll = bankroll;
    state.sessionHigh = bankroll;
    state.targetProfit = 10000; // Target goal as featured in Junko Bodie's demonstration
    state.multiplier = 1;
    state.activeSplits = getFullSplitPositions(isAmerican);
  }

  // Check if session profit goal has been achieved
  if (bankroll >= state.initialBankroll + state.targetProfit) {
    return []; // Stop betting once profit target is reached
  }

  // Process outcome of the previous spin
  if (spinHistory && spinHistory.length > 0) {
    const lastResult = spinHistory[spinHistory.length - 1];
    const winningNum = lastResult.winningNumber;

    if (bankroll >= state.sessionHigh) {
      // Reached or surpassed session high: Reset full progression and layout
      state.sessionHigh = bankroll;
      state.multiplier = 1;
      state.activeSplits = getFullSplitPositions(isAmerican);
    } else {
      // Below session high: check if last winning number was covered by an active split
      const hitSplitIndex = state.activeSplits.findIndex(s => {
        return s.value.includes(winningNum) || (winningNum === 0 && s.value.includes('00') && lastResult.winningColor === 'green');
      });

      if (hitSplitIndex !== -1) {
        // Hit while in deficit: knock out the winning split
        state.activeSplits.splice(hitSplitIndex, 1);
        // Multiplier remains unchanged on a win
        // If all splits were knocked out without recovering, reset layout to continue
        if (state.activeSplits.length === 0) {
          state.activeSplits = getFullSplitPositions(isAmerican);
        }
      } else {
        // Miss (loss): Double the bet per split
        state.multiplier *= 2;
      }
    }
  }

  // Calculate clamped bet amount per split
  let betAmount = baseUnit * state.multiplier;
  betAmount = Math.max(betAmount, config.betLimits.min);
  betAmount = Math.min(betAmount, maxLimit);

  // Check if bankroll can support placing all active bets
  const totalCost = betAmount * state.activeSplits.length;
  if (bankroll < totalCost) {
    // Insufficient funds to continue full progression
    return [];
  }

  // Construct bet array
  return state.activeSplits.map(split => ({
    type: 'split',
    value: split.value,
    amount: betAmount
  }));
}