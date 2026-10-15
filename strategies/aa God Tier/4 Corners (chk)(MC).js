/**
 * ============================================================================
 * STRATEGY: 4 Corners
 * ============================================================================
 * 
 * SOURCE:
 * - YouTube Video: https://youtu.be/4_iwAK1YV_
 * - Channel: Roulette Strategy Channel
 * 
 * THE FULL LOGIC IN DETAILS:
 * - Trigger: Always active on every spin.
 * - Initial Wagers: Place 4 Corner bets covering numbers:
 *   1. Corner 7/11 (covers 7, 8, 10, 11 -> top-left number is 7)
 *   2. Corner 13/17 (covers 13, 14, 16, 17 -> top-left number is 13)
 *   3. Corner 19/23 (covers 19, 20, 22, 23 -> top-left number is 19)
 *   4. Corner 25/29 (covers 25, 26, 28, 29 -> top-left number is 25)
 * 
 * THE FULL BET PROGRESSION IN DETAILS:
 * - Progression Levels (Units per Corner):
 *   Level 0: 1 unit  (Total bet: 4 units)
 *   Level 1: 2 units (Total bet: 8 units)
 *   Level 2: 3 units (Total bet: 12 units)
 *   Level 3: 5 units (Total bet: 20 units)
 *   Level 4: 8 units (Total bet: 32 units)
 *   Level 5: 13 units (Total bet: 52 units)
 *   Level 6: 21 units (Total bet: 84 units)
 *   Level 7+: Double the previous level's bet per corner (e.g., Level 7 = 42 units/corner -> Total: 168 units)
 * 
 * - Win/Loss Progression Rules:
 *   - On LOSS: Advance progression level by +1 (Fibonacci progression for 6 losses, then double-up on subsequent losses).
 *   - On WIN:
 *     - Track the session's peak bankroll (highest bankroll reached).
 *     - If the current bankroll reaches or exceeds the peak bankroll, RESET progression back to Level 0 (1 unit).
 *     - If current bankroll is below peak profit, maintain/rebet at current progression level.
 * 
 * THE GOAL:
 * - Profit accumulation by securing wins on 4 covered corner zones, locking in peak bankroll targets and resetting progression on new peak highs.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Determine base unit for inside bets (Corner bets are inside bets)
  const baseUnit = config.betLimits.min;

  // 2. Initialize State
  if (state.peakBankroll === undefined) {
    state.peakBankroll = bankroll;
  }
  if (state.progressionLevel === undefined) {
    state.progressionLevel = 0;
  }

  // Update peak bankroll if current bankroll is higher
  if (bankroll > state.peakBankroll) {
    state.peakBankroll = bankroll;
  }

  // 3. Process previous spin result if history exists
  if (spinHistory && spinHistory.length > 0) {
    const lastResult = spinHistory[spinHistory.length - 1];
    const winningNum = lastResult.winningNumber;

    // Check if the winning number hit any of our 4 corner bets
    const corner1 = [7, 8, 10, 11];
    const corner2 = [13, 14, 16, 17];
    const corner3 = [19, 20, 22, 23];
    const corner4 = [25, 26, 28, 29];

    const isWin = corner1.includes(winningNum) ||
                  corner2.includes(winningNum) ||
                  corner3.includes(winningNum) ||
                  corner4.includes(winningNum);

    if (isWin) {
      // On win: reset if at or above session peak bankroll
      if (bankroll >= state.peakBankroll) {
        state.progressionLevel = 0;
      }
      // If not at peak profit, maintain current progression level
    } else {
      // On loss: advance progression
      state.progressionLevel += 1;
    }
  }

  // 4. Calculate unit multiplier for each corner based on progression level
  // Progression steps per corner: 1, 2, 3, 5, 8, 13, 21, then double up (42, 84, ...)
  const fibonacciUnits = [1, 2, 3, 5, 8, 13, 21];
  let unitsPerCorner;

  if (state.progressionLevel < fibonacciUnits.length) {
    unitsPerCorner = fibonacciUnits[state.progressionLevel];
  } else {
    // Double up after Fibonacci progression runs out
    const extraLosses = state.progressionLevel - (fibonacciUnits.length - 1);
    unitsPerCorner = 21 * Math.pow(2, extraLosses);
  }

  // 5. Calculate & clamp bet amount per corner
  let betAmountPerCorner = baseUnit * unitsPerCorner;

  // Clamp to min and max table bet limits
  betAmountPerCorner = Math.max(betAmountPerCorner, config.betLimits.min);
  betAmountPerCorner = Math.min(betAmountPerCorner, config.betLimits.max);

  // 6. Return corner bet placements (top-left number represents corner value)
  return [
    { type: 'corner', value: 7, amount: betAmountPerCorner },
    { type: 'corner', value: 13, amount: betAmountPerCorner },
    { type: 'corner', value: 19, amount: betAmountPerCorner },
    { type: 'corner', value: 25, amount: betAmountPerCorner }
  ];
}