/**
 * ============================================================================
 * Strategy: COLUMN LOCK
 * Source: Casino Gamester (YouTube: https://youtu.be/OlqbBuu-ph0)
 * 
 * THE FULL LOGIC IN DETAIL:
 * 1. Tracking:
 *    The strategy monitors the winning columns of the roulette wheel.
 *    - Column 1: numbers 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34 (n % 3 === 1)
 *    - Column 2: numbers 2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35 (n % 3 === 2)
 *    - Column 3: numbers 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36 (n % 3 === 0, n > 0)
 *    - Zero (0 or 00) does not belong to any column.
 * 
 * 2. Trigger Condition ("Free Spin" / Waiting):
 *    - The player inspects the last 3 spins.
 *    - If all three columns (1, 2, and 3) have hit across the last 3 spins, take a
 *      "Free Spin" (wait and place no bets).
 *    - When looking at the last 3 spins, if a column has NOT appeared, that missing
 *      column is identified as the target.
 *    - The player "locks in" on that missing column and begins betting.
 * 
 * 3. Lock-In & Progression Rules:
 *    - Once locked onto a column, the player remains on that EXACT column for up to 8
 *      consecutive attempts until either a win occurs or all 8 steps are exhausted.
 *    - On a WIN:
 *      Reset the progression back to Step 0 (the beginning). Immediately check the
 *      last 3 spins to see if there is another missing column to lock into, or take
 *      a free spin if all 3 columns recently hit.
 *    - On a LOSS:
 *      Advance to the next step of the 8-step progression and bet on the same column.
 * 
 * 4. The Full Bet Progression:
 *    Because columns pay 2:1, the 8-step unit multiplier sequence ensures a net profit
 *    of 1 or 2 units upon winning at any step:
 *      Step 1: 1 unit   (Return 3x, net +2 units)
 *      Step 2: 1 unit   (Total bet 2, Return 3x, net +1 unit)
 *      Step 3: 2 units  (Total bet 4, Return 6x, net +2 units)
 *      Step 4: 3 units  (Total bet 7, Return 9x, net +2 units)
 *      Step 5: 4 units  (Total bet 11, Return 12x, net +1 unit)
 *      Step 6: 6 units  (Total bet 17, Return 18x, net +1 unit)
 *      Step 7: 9 units  (Total bet 26, Return 27x, net +1 unit)
 *      Step 8: 14 units (Total bet 40, Return 42x, net +2 units)
 *    If step 8 loses, the progression cycle resets.
 * 
 * 5. Goal & Stop-Loss:
 *    - Target Profit: 25% gain on starting bankroll (as targeted in the video session).
 *    - Stop-Loss: Bankroll exhausted or unable to afford the next table minimum.
 * ============================================================================
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // Helper: map a roulette number to its column (1, 2, 3) or null for zero
  function getColumn(num) {
    if (num <= 0 || num > 36) return null;
    const rem = num % 3;
    return rem === 1 ? 1 : rem === 2 ? 2 : 3;
  }

  // 1. Initialize State
  if (!state.initialized) {
    state.initialized = true;
    state.targetColumn = null;    // The column currently locked in (1, 2, or 3)
    state.progressionStep = 0;    // Index from 0 to 7
    state.initialBankroll = bankroll;
    state.targetBankroll = bankroll + (config.startingBankroll || bankroll) * 0.25;
  }

  // Progression unit multipliers (8 steps totaling 40 units)
  const progression = [1, 1, 2, 3, 4, 6, 9, 14];

  // 2. Goal check: Stop if profit target reached
  if (bankroll >= state.targetBankroll) {
    return [];
  }

  // 3. Process previous spin outcome if we were actively locked into a bet
  if (spinHistory && spinHistory.length > 0 && state.targetColumn !== null) {
    const lastResult = spinHistory[spinHistory.length - 1];
    const lastWinningNum = lastResult.winningNumber;
    const lastWinningCol = getColumn(lastWinningNum);

    if (lastWinningCol === state.targetColumn) {
      // WIN: Reset progression and unlock column
      state.progressionStep = 0;
      state.targetColumn = null;
    } else {
      // LOSS: Advance progression
      state.progressionStep += 1;
      if (state.progressionStep >= progression.length) {
        // Exceeded 8 attempts, reset cycle
        state.progressionStep = 0;
        state.targetColumn = null;
      }
    }
  }

  // 4. Trigger / Selection: If not currently locked into a progression, check last 3 spins
  if (state.targetColumn === null) {
    if (!spinHistory || spinHistory.length < 3) {
      // Not enough history, take a free spin
      return [];
    }

    const lastThree = spinHistory.slice(-3);
    const hitColumns = new Set();

    for (let i = 0; i < lastThree.length; i++) {
      const col = getColumn(lastThree[i].winningNumber);
      if (col !== null) {
        hitColumns.add(col);
      }
    }

    // If all 3 columns have hit in the last 3 spins, take a free spin
    if (hitColumns.has(1) && hitColumns.has(2) && hitColumns.has(3)) {
      return [];
    }

    // Find columns that did NOT hit in the last 3 spins
    const missingColumns = [1, 2, 3].filter(col => !hitColumns.has(col));

    if (missingColumns.length === 1) {
      // Exactly one column is missing: lock into it
      state.targetColumn = missingColumns[0];
      state.progressionStep = 0;
    } else if (missingColumns.length > 1) {
      // If multiple columns are missing (e.g. consecutive repeaters or zero),
      // lock into the one that has been absent the longest
      let candidate = missingColumns[0];
      let maxAbsence = -1;

      for (const col of missingColumns) {
        let absence = 0;
        for (let i = spinHistory.length - 1; i >= 0; i--) {
          if (getColumn(spinHistory[i].winningNumber) === col) {
            break;
          }
          absence++;
        }
        if (absence > maxAbsence) {
          maxAbsence = absence;
          candidate = col;
        }
      }

      state.targetColumn = candidate;
      state.progressionStep = 0;
    } else {
      return [];
    }
  }

  // 5. Calculate Bet Amount
  const baseUnit = config.betLimits.minOutside;
  const unitMultiplier = progression[state.progressionStep];
  let betAmount = baseUnit * unitMultiplier;

  // 6. Clamp to configured table limits
  betAmount = Math.max(betAmount, config.betLimits.minOutside);
  betAmount = Math.min(betAmount, config.betLimits.max);

  // If bankroll cannot cover the minimum required bet, stop
  if (bankroll < betAmount) {
    return [];
  }

  // 7. Return bet on the locked column
  return [
    {
      type: 'column',
      value: state.targetColumn,
      amount: betAmount
    }
  ];
}