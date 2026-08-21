/**
 * ============================================================================
 * ROULETTE STRATEGY: Ride My Splits
 * ============================================================================
 * 
 * SOURCE:
 * - Video URL: https://youtu.be/DdLnkub0VfM
 * - Channel: CEG Dealer School
 * - Strategy Name: Ride My Splits
 * 
 * THE FULL LOGIC IN DETAILS:
 * - The strategy places 5 inside Split bets on the roulette board.
 * - Default Split Positions (5 splits covering 10 numbers):
 *   1. Split [1, 2]
 *   2. Split [5, 6]
 *   3. Split [7, 8]
 *   4. Split [11, 12]
 *   5. Split [17, 18]
 * - A spin is considered a WIN if any of the placed split bets hits.
 * 
 * THE FULL BET PROGRESSION IN DETAILS:
 * - Base Bet: 1 unit per split (where 1 unit = config.betLimits.min).
 * - Progression Modes:
 *   1. Base Level (1 unit):
 *      - If WIN: Increase unit multiplier by +1 unit for the next spin (Positive Progression).
 *      - If LOSS: Increase unit multiplier by +1 unit for the next spin (Negative Progression).
 *   2. Positive Progression (Winning streak):
 *      - If WIN: Press up by +1 unit per split for the next spin.
 *      - If LOSS: Reset back to Base Level (1 unit per split).
 *   3. Negative Progression (Loss recovery):
 *      - If LOSS: Increase bet size by +1 unit per split for the next spin.
 *      - If WIN: Reset back to Base Level (1 unit per split).
 * 
 * THE GOAL:
 * - Capitalize on winning streaks via positive progression while recovering loss streaks 
 *   using controlled single-unit incremental steps on split payouts (17:1).
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Define Base Unit for Inside Bets (Split is an inside bet)
  const baseUnit = config.betLimits.min || 2;

  // 2. Initialize State
  if (state.units === undefined) {
    state.units = 1;         // Current units per split
    state.mode = 'base';      // Modes: 'base', 'positive', 'negative'
  }

  // 3. Process Previous Spin Result if History Exists
  if (spinHistory && spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const lastNumber = lastSpin.winningNumber;

    // Define the 5 splits used in this strategy
    const splitPositions = [
      [1, 2],
      [5, 6],
      [7, 8],
      [11, 12],
      [17, 18]
    ];

    // Check if the last winning number hit any of our splits
    const isWin = splitPositions.some(split => split.includes(lastNumber));

    if (state.mode === 'base') {
      if (isWin) {
        state.mode = 'positive';
        state.units += 1;
      } else {
        state.mode = 'negative';
        state.units += 1;
      }
    } else if (state.mode === 'positive') {
      if (isWin) {
        state.units += 1; // Keep pressing on positive streak
      } else {
        // Lost during positive progression -> Reset to base
        state.mode = 'base';
        state.units = 1;
      }
    } else if (state.mode === 'negative') {
      if (isWin) {
        // Won during negative progression -> Reset to base
        state.mode = 'base';
        state.units = 1;
      } else {
        state.units += 1; // Step up on continued loss
      }
    }
  }

  // 4. Calculate Bet Amount Per Split & Clamp to Limits
  let betPerSplit = baseUnit * state.units;
  betPerSplit = Math.max(betPerSplit, config.betLimits.min);
  betPerSplit = Math.min(betPerSplit, config.betLimits.max);

  // 5. Construct Bets Array
  const splitsToBet = [
    [1, 2],
    [5, 6],
    [7, 8],
    [11, 12],
    [17, 18]
  ];

  const bets = splitsToBet.map(splitVal => ({
    type: 'split',
    value: splitVal,
    amount: betPerSplit
  }));

  return bets;
}