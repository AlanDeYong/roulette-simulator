/**
 * ============================================================================
 * Strategy: Dynamic Vortex (Nikola Tesla's 3-6-9 Roulette Secret)
 * Source:   The Lucky Felt (Todd Hoover)
 * Video:    https://youtu.be/4TPCxm5PyPs
 * ============================================================================
 * 
 * --- THE FULL LOGIC IN DETAIL ---
 * The Dynamic Vortex strategy partitions the roulette wheel into 3 distinct
 * mathematical frequency sectors based on vortex mathematics / digital roots:
 * 
 * 1. Helix Sector (22 Numbers):
 *    All numbers in Column 1 and Column 2 EXCEPT 19 and 28.
 *    Numbers: 1, 2, 4, 5, 7, 8, 10, 11, 13, 14, 16, 17, 20, 22, 23, 25, 26, 29, 31, 32, 34, 35.
 *    (Placed as straight-up number bets).
 * 
 * 2. Energy / 3-6-9 Sector (12 Numbers):
 *    Nikola Tesla's 3-6-9 sequence, which aligns with the entire 3rd Column:
 *    Numbers: 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36.
 *    (Placed directly as a 3rd Column bet).
 * 
 * 3. Void Sector (3 or 4 Numbers):
 *    The zeros and digits whose sum equals 10 (1+9=10, 2+8=10, reducing to 0):
 *    Numbers: 0, (00 if American), 19, 28.
 *    (Placed as straight-up number bets).
 * 
 * --- TRIGGER RULES ---
 * Real-time tracking of the wheel's momentum:
 * - Determine which sector the LAST winning number belonged to.
 * - Place the next bet on that EXACT sector (Helix, Energy/Column 3, or Void).
 * - If starting fresh (no history), default to the Helix sector.
 * 
 * --- THE FULL BET PROGRESSION ---
 * The strategy utilizes the custom "Helix Progression" sequence: [1, 2, 4, 8, 7, 5].
 * - Each step represents the multiplier per number position (1 unit, 2 units, 4 units, etc.).
 * - Energy (Column 3) bets use 12 * unit * multiplier.
 * - On a LOSS: Advance 1 step up the sequence (1 -> 2 -> 4 -> 8 -> 7 -> 5).
 * - On a WIN: Reset back to step 1 (multiplier = 1).
 * 
 * --- THE GOAL ---
 * - Target Profit: +100 units (e.g., +$100 on a $500 bankroll).
 * - When target profit is reached, stop betting and lock in session profit.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Initialize State and Target Goals
  const targetProfit = 10000;
  if (state.initialBankroll === undefined) {
    state.initialBankroll = bankroll;
  }

  // Check target profit condition
  if (bankroll >= state.initialBankroll + targetProfit) {
    return []; // Goal achieved; stop betting
  }

  // Helix Progression Sequence
  const progressionSequence = [1, 2, 4, 8, 7, 5];
  if (state.progressionIndex === undefined) {
    state.progressionIndex = 0;
  }

  // Base unit amounts
  const insideUnit = config.betLimits.min;
  const outsideUnit = config.betLimits.minOutside;

  // 2. Sector Definitions
  const helixNumbers = [
    1, 2, 4, 5, 7, 8, 10, 11, 13, 14, 16, 17,
    20, 22, 23, 25, 26, 29, 31, 32, 34, 35
  ];
  const energyNumbers = [
    3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36
  ];
  const voidNumbers = config.tableType === 'american' 
    ? [0, '00', 19, 28] 
    : [0, 19, 28];

  const getSector = (num) => {
    if (num === '00' || num === 0 || num === 19 || num === 28) return 'void';
    if (energyNumbers.includes(Number(num))) return 'energy';
    if (helixNumbers.includes(Number(num))) return 'helix';
    return 'helix';
  };

  // 3. Evaluate Previous Spin Result & Update Progression
  if (spinHistory && spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const lastNum = lastSpin.winningNumber;
    const lastSectorHit = getSector(lastNum);

    if (state.lastBetSector) {
      const won = (state.lastBetSector === lastSectorHit);
      if (won) {
        state.progressionIndex = 0; // Reset progression on win
      } else {
        state.progressionIndex = Math.min(
          state.progressionIndex + 1,
          progressionSequence.length - 1
        ); // Advance progression on loss
      }
    }

    // Set next sector to bet based on the last winning number
    state.currentSector = lastSectorHit;
  } else {
    // Initial default sector
    state.currentSector = 'helix';
  }

  state.lastBetSector = state.currentSector;
  const currentMultiplier = progressionSequence[state.progressionIndex];

  // 4. Build and Clamp Bets
  const bets = [];

  if (state.currentSector === 'helix') {
    // 22 straight-up inside bets
    const straightBetAmount = Math.min(
      Math.max(insideUnit * currentMultiplier, config.betLimits.min),
      config.betLimits.max
    );

    for (const num of helixNumbers) {
      bets.push({
        type: 'number',
        value: num,
        amount: straightBetAmount
      });
    }
  } else if (state.currentSector === 'energy') {
    // 3rd Column bet covering all 12 energy numbers
    let colBetAmount = 12 * insideUnit * currentMultiplier;
    colBetAmount = Math.min(
      Math.max(colBetAmount, config.betLimits.minOutside),
      config.betLimits.max
    );

    bets.push({
      type: 'column',
      value: 3,
      amount: colBetAmount
    });
  } else if (state.currentSector === 'void') {
    // Straight-up bets on void numbers: 0, (00), 19, 28
    const voidBetAmount = Math.min(
      Math.max(insideUnit * currentMultiplier, config.betLimits.min),
      config.betLimits.max
    );

    for (const num of voidNumbers) {
      bets.push({
        type: 'number',
        value: num,
        amount: voidBetAmount
      });
    }
  }

  // 5. Bankroll Safety Check
  const totalBetAmount = bets.reduce((sum, b) => sum + b.amount, 0);
  if (totalBetAmount > bankroll) {
    return []; // Stop if insufficient bankroll
  }

  return bets;
}