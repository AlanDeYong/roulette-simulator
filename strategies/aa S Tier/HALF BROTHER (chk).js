/**
 * Strategy: HALF BROTHER Roulette System
 * Source: YouTube - "HALF BROTHER - ROULETTE SYSTEM TUTORIAL" by Bet With Mo
 * URL: https://youtu.be/h2_yP_Muij8
 *
 * Full Logic Details:
 * -------------------
 * The strategy places 5 specific bets across the roulette layout totaling 10 base units:
 * 1. Street 1 (covers 1, 2, 3) -> 2 units (Inside bet)
 * 2. Street 4 (covers 4, 5, 6) -> 2 units (Inside bet)
 * 3. Split [2, 5]              -> 1 unit  (Inside bet)
 * 4. Split [3, 6]              -> 1 unit  (Inside bet)
 * 5. 3rd Dozen (covers 25-36)  -> 4 units (Outside bet)
 *
 * This setup covers the low streets (with double coverage on 2, 3, 5, 6 via splits)
 * and the entire third dozen (25-36).
 *
 * Progression Rules:
 * ------------------
 * - Multiplier Levels: [1, 2, 4, 8, 12, 16, 24, 36, ...]
 * - Level Loss Tolerance: Allows 2 total attempts (1 initial bet + 1 rebet) per level.
 * - Loss: If 2 consecutive full losses occur at the current level, move up to the next progression level.
 * - Win / Recovery: Whenever the current bankroll hits a new session high (exceeds previous peak),
 *   the progression resets back to Level 1.
 *
 * Goal:
 * -----
 * Achieve consistent profit via high hit-frequency coverage and reset upon every new session peak.
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Initialize State
  if (state.sessionHigh === undefined) {
    state.sessionHigh = bankroll;
  }
  if (state.levelIndex === undefined) {
    state.levelIndex = 0;
  }
  if (state.lossesAtLevel === undefined) {
    state.lossesAtLevel = 0;
  }
  if (state.lastBankroll === undefined) {
    state.lastBankroll = bankroll;
  }

  const progressionLevels = [1, 2, 4, 8, 12, 16, 24, 36, 48, 64];

  // 2. Evaluate Outcome of Previous Spin
  if (spinHistory && spinHistory.length > 0) {
    const lastResult = spinHistory[spinHistory.length - 1];
    const winNum = lastResult.winningNumber;

    // Check if new session high is reached
    if (bankroll >= state.sessionHigh) {
      state.sessionHigh = bankroll;
      state.levelIndex = 0;
      state.lossesAtLevel = 0;
    } else {
      // Determine if the last spin was a win or loss
      const isDozen3 = winNum >= 25 && winNum <= 36;
      const isStreet1 = winNum >= 1 && winNum <= 3;
      const isStreet4 = winNum >= 4 && winNum <= 6;
      const isCovered = isDozen3 || isStreet1 || isStreet4;

      if (!isCovered) {
        // Complete loss on uncovered numbers (0, 00, 7-24)
        state.lossesAtLevel++;
        if (state.lossesAtLevel >= 2) {
          state.levelIndex = Math.min(state.levelIndex + 1, progressionLevels.length - 1);
          state.lossesAtLevel = 0;
        }
      } else {
        // Partial or full win: reset level loss counter for re-bets at current level
        state.lossesAtLevel = 0;
      }
    }
  }

  state.lastBankroll = bankroll;

  // 3. Determine Unit Sizes
  const minInside = config.betLimits.min || 1;
  const minOutside = config.betLimits.minOutside || 5;
  const maxLimit = config.betLimits.max || 500;

  // Base unit scaled so minimum outside bet constraint is respected (4 units >= minOutside)
  const baseUnit = Math.max(minInside, Math.ceil(minOutside / 4));
  const mult = progressionLevels[state.levelIndex];

  // Calculate Bet Amounts
  let street1Amount = Math.max(minInside, Math.min(maxLimit, 2 * baseUnit * mult));
  let street4Amount = Math.max(minInside, Math.min(maxLimit, 2 * baseUnit * mult));
  let split25Amount = Math.max(minInside, Math.min(maxLimit, 1 * baseUnit * mult));
  let split36Amount = Math.max(minInside, Math.min(maxLimit, 1 * baseUnit * mult));
  let dozen3Amount  = Math.max(minOutside, Math.min(maxLimit, 4 * baseUnit * mult));

  // 4. Return Bet Array
  return [
    { type: 'street', value: 1, amount: street1Amount },
    { type: 'street', value: 4, amount: street4Amount },
    { type: 'split', value: [2, 5], amount: split25Amount },
    { type: 'split', value: [3, 6], amount: split36Amount },
    { type: 'dozen', value: 3, amount: dozen3Amount }
  ];
}