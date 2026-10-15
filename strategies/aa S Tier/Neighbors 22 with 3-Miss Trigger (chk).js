/**
 * ============================================================================
 * Roulette Strategy: Neighbors 22 with 3-Miss Trigger
 * ============================================================================
 * Source:
 *   - Video: "Do Triggers REALLY Make a Difference in Roulette? | How to Use Them"
 *   - Channel: Mastering The Wheel
 *   - URL: https://youtu.be/vQFZs_TS-aM
 *
 * Full Strategy Logic:
 *   1. Board Coverage (22 Numbers Total):
 *      - Based on the last winning number, calculate two symmetrical 11-number sectors
 *        on the European roulette wheel:
 *        a) The last winning number ± 5 wheel neighbors (11 numbers total).
 *        b) The diametrically opposite pocket on the wheel ± 5 wheel neighbors
 *           (11 numbers total).
 *      - Total coverage = 22 numbers (leaving 15 numbers uncovered).
 *
 *   2. Trigger Mechanism (3 Consecutive Misses):
 *      - The strategy monitors spins without risking capital until conditions align.
 *      - A "miss" occurs when the winning number lands outside the 22 numbers defined
 *        by the preceding spin.
 *      - When 3 consecutive misses occur in a row, the trigger is armed and the
 *        strategy enters active betting mode on the subsequent spin.
 *
 *   3. Progression (5 Levels):
 *      - Uses a 5-step tiered progression on all 22 inside straight-up numbers:
 *        Multipliers: [1, 2, 4, 9, 21] x baseUnit (where baseUnit = config.betLimits.min).
 *      - WIN: Resets progression level back to Level 1, disengages active betting,
 *        resets the miss trigger counter to 0, and returns to waiting mode.
 *      - LOSS: Advances to the next progression level (up to Level 5) and re-centers
 *        the 22-number coverage around the newest winning number.
 *      - PROGRESSION BUST: If Level 5 loses, progression resets and returns to waiting.
 *
 *   4. Goal / Exit Criteria:
 *      - Target Win: 5% profit above starting bankroll (session stop-win).
 *      - Stop Loss: Inability to cover progression level or full 5-level bust.
 * ============================================================================
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // 1. European wheel sequence (clockwise 0 to 26)
  const WHEEL_ORDER = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
    5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
  ];
  const WHEEL_LEN = WHEEL_ORDER.length; // 37

  // Helper: Get 22 numbers (last hit ± 5 neighbors and opposite ± 5 neighbors)
  function get22Neighbors(centerNum) {
    const centerIdx = WHEEL_ORDER.indexOf(centerNum);
    if (centerIdx === -1) return [];

    const covered = new Set();

    // 11 numbers around the last hit (center ± 5)
    for (let offset = -5; offset <= 5; offset++) {
      const idx = (centerIdx + offset + WHEEL_LEN) % WHEEL_LEN;
      covered.add(WHEEL_ORDER[idx]);
    }

    // 11 numbers diametrically opposite (offset by 18 pockets on 37-pocket wheel)
    const oppCenterIdx = (centerIdx + 18) % WHEEL_LEN;
    for (let offset = -5; offset <= 5; offset++) {
      const idx = (oppCenterIdx + offset + WHEEL_LEN) % WHEEL_LEN;
      covered.add(WHEEL_ORDER[idx]);
    }

    return Array.from(covered);
  }

  // 2. Initialize persistent state
  if (state.isBetting === undefined) state.isBetting = false;
  if (state.consecutiveMisses === undefined) state.consecutiveMisses = 0;
  if (state.progressionLevel === undefined) state.progressionLevel = 1;
  if (state.lastCoveredNumbers === undefined) state.lastCoveredNumbers = [];
  if (state.sessionInitialBankroll === undefined) {
    state.sessionInitialBankroll = bankroll;
  }

  // 3. Check Session Profit Goal (5% profit target)
  const targetProfit = state.sessionInitialBankroll * 10.05;
  if (bankroll >= state.sessionInitialBankroll + targetProfit) {
    return []; // Stop playing, profit goal achieved
  }

  // Need at least 1 prior spin to establish reference sectors
  if (!spinHistory || spinHistory.length === 0) {
    return [];
  }

  const lastSpin = spinHistory[spinHistory.length - 1];
  const lastNumber = lastSpin.winningNumber;

  // 4. Update State based on previous spin result
  if (state.lastCoveredNumbers.length > 0) {
    const hit = state.lastCoveredNumbers.includes(lastNumber);

    if (state.isBetting) {
      if (hit) {
        // Won bet: reset progression, disengage betting, reset trigger
        state.isBetting = false;
        state.progressionLevel = 1;
        state.consecutiveMisses = 0;
      } else {
        // Lost bet: advance progression level
        state.progressionLevel += 1;
        if (state.progressionLevel > 5) {
          // 5-level failure: reset progression and wait for new trigger
          state.isBetting = false;
          state.progressionLevel = 1;
          state.consecutiveMisses = 0;
        }
      }
    } else {
      // In tracking mode: monitor consecutive misses
      if (!hit) {
        state.consecutiveMisses += 1;
        if (state.consecutiveMisses >= 3) {
          // Trigger condition met: 3 misses in a row
          state.isBetting = true;
          state.progressionLevel = 1;
        }
      } else {
        // Hit resets miss counter
        state.consecutiveMisses = 0;
      }
    }
  }

  // 5. Update reference 22-number coverage based on the latest winning pocket
  const current22Numbers = get22Neighbors(lastNumber);
  state.lastCoveredNumbers = current22Numbers;

  // 6. If not actively betting, return no bets (wait for trigger)
  if (!state.isBetting) {
    return [];
  }

  // 7. Calculate Bet Amounts
  // 5-level progression multipliers for 22 straight-up bets
  const multipliers = [1, 2, 4, 9, 21];
  const levelIdx = Math.min(Math.max(state.progressionLevel - 1, 0), multipliers.length - 1);
  const baseUnit = config.betLimits.min;
  let unitBet = baseUnit * multipliers[levelIdx];

  // Clamp bet to limits
  unitBet = Math.max(unitBet, config.betLimits.min);
  unitBet = Math.min(unitBet, config.betLimits.max);

  // Total required capital for 22 numbers
  const totalBetRequired = unitBet * current22Numbers.length;
  if (bankroll < totalBetRequired) {
    // Insufficient bankroll to place full coverage
    state.isBetting = false;
    state.progressionLevel = 1;
    state.consecutiveMisses = 0;
    return [];
  }

  // 8. Construct inside straight-up bets for each of the 22 numbers
  const bets = current22Numbers.map((num) => ({
    type: 'number',
    value: num,
    amount: unitBet
  }));

  return bets;
}