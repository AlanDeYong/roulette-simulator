/**
 * ============================================================================
 * STRATEGY: GET IN LINE - ROULETTE SYSTEM
 * ============================================================================
 * Source:
 *   - YouTube Channel: Bet With Mo
 *   - Video URL: https://youtu.be/Dk4fg4bYnEI
 *   - Video Title: GET IN LINE - ROULETTE SYSTEM TUTORIAL
 *
 * Description & Core Logic:
 *   The "Get In Line" strategy is a hybrid column and inside-number progression
 *   system designed to cover a specific column while stacking inside bets
 *   (splits and straight-ups) down the "line" of that chosen column.
 *
 *   1. Column Selection / Trigger:
 *      - Avoid the last column that hit (e.g., if column 2 just hit, choose
 *        column 1 or column 3).
 *      - The player sticks to the selected column during an active progression
 *        cycle until a cycle win/recovery occurs, after which the column switches
 *        to one that did not just hit.
 *
 *   2. Board Placements:
 *      - Column 1:
 *          - Dozen 1: Split [1, 4], Straight-up 7
 *          - Dozen 2: Split [10, 13], Straight-up 16
 *          - Dozen 3: Split [22, 25], Straight-up 28
 *      - Column 2:
 *          - Dozen 1: Split [2, 5], Straight-up 8
 *          - Dozen 2: Split [11, 14], Straight-up 17
 *          - Dozen 3: Split [23, 26], Straight-up 29
 *      - Column 3:
 *          - Dozen 1: Split [3, 6], Straight-up 9
 *          - Dozen 2: Split [12, 15], Straight-up 18
 *          - Dozen 3: Split [24, 27], Straight-up 30
 *
 *   3. Betting Progression:
 *      - Step 0 (Base / Start):
 *          - 1 unit on Dozen 1 Split of chosen column.
 *          - 2 units on the chosen Column.
 *      - Step 1 (After 1st Loss):
 *          - Keep Dozen 1 Split (1 unit).
 *          - Add Straight-up on Dozen 1 (1 unit).
 *          - Increase Column bet to 4 units (+2 units).
 *      - Step 2 (After 2nd Loss):
 *          - Keep previous bets (increase unit size by 1).
 *          - Add Dozen 2 Split (2 units).
 *          - Column bet increases proportionally (6 units).
 *      - Step 3 (After 3rd Loss):
 *          - Add Dozen 2 Straight-up (2 units).
 *          - Column bet increases to 8 units.
 *      - Step 4 (After 4th Loss):
 *          - Add Dozen 3 Split (3 units) and increase column.
 *      - Step 5 (After 5th Loss):
 *          - Add Dozen 3 Straight-up (3 units) and increase column.
 *
 *   4. Win & Reset Rules:
 *      - Inside hit (Straight-up or Split) yields a substantial payout (17:1 or 35:1)
 *        or whenever current bankroll reaches/surpasses the cycle high:
 *        -> Reset progression back to Step 0 and switch to a different non-hitting column.
 *      - Outside Column hit:
 *        -> If net positive for the cycle, reset to Step 0 and switch column.
 *        -> If still recovering, re-bet current level or reset upon reaching target.
 *
 *   5. Goals & Limits:
 *      - Target Profit: +$300 to +$400 units above starting bankroll.
 *      - Stop-loss: Clamped dynamically by bankroll and table bet limits.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Initialize State
  if (!state.initialized) {
    state.initialized = true;
    state.step = 0;
    state.activeColumn = 1;
    state.sessionHigh = bankroll;
    state.targetProfit = 40000; // Target profit inspired by the video session
  }

  // Check Stop-Loss / Take-Profit
  if (bankroll >= config.startingBankroll + state.targetProfit || bankroll <= 0) {
    return []; // Stop betting once profit target is achieved or bankroll depleted
  }

  // Update session high
  if (bankroll > state.sessionHigh) {
    state.sessionHigh = bankroll;
  }

  // 2. Helper Functions
  const getColumn = (num) => {
    if (num <= 0 || num > 36) return 0;
    const rem = num % 3;
    return rem === 0 ? 3 : rem;
  };

  const clampBet = (amount, isOutside) => {
    const minLimit = isOutside ? config.betLimits.minOutside : config.betLimits.min;
    const maxLimit = config.betLimits.max;
    return Math.min(Math.max(amount, minLimit), maxLimit);
  };

  // 3. Process Previous Spin Results (if any)
  if (spinHistory && spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const lastNum = lastSpin.winningNumber;
    const lastCol = getColumn(lastNum);

    // Check if the last spin resulted in a win on our active bets
    const hitColumn = lastCol === state.activeColumn;

    // Inside numbers defined for each column
    const insideMap = {
      1: {
        splits: [[1, 4], [10, 13], [22, 25]],
        straights: [7, 16, 28]
      },
      2: {
        splits: [[2, 5], [11, 14], [23, 26]],
        straights: [8, 17, 29]
      },
      3: {
        splits: [[3, 6], [12, 15], [24, 27]],
        straights: [9, 18, 30]
      }
    };

    const currentMapping = insideMap[state.activeColumn];
    let hitInside = false;

    // Check if winning number hit any active split or straight up based on step
    if (state.step >= 0 && currentMapping.splits[0].includes(lastNum)) hitInside = true;
    if (state.step >= 1 && currentMapping.straights[0] === lastNum) hitInside = true;
    if (state.step >= 2 && currentMapping.splits[1].includes(lastNum)) hitInside = true;
    if (state.step >= 3 && currentMapping.straights[1] === lastNum) hitInside = true;
    if (state.step >= 4 && currentMapping.splits[2].includes(lastNum)) hitInside = true;
    if (state.step >= 5 && currentMapping.straights[2] === lastNum) hitInside = true;

    // Decision logic on Win / Loss
    if (hitInside || (hitColumn && bankroll >= state.sessionHigh)) {
      // Big win or recovered to session high: Reset progression
      state.step = 0;
      // Switch column: avoid the last hit column
      const availableCols = [1, 2, 3].filter((c) => c !== lastCol);
      state.activeColumn = availableCols[0] || (lastCol === 1 ? 2 : 1);
    } else if (hitColumn) {
      // Column hit without full recovery, hold or decrease step
      if (state.step > 0) state.step -= 1;
    } else {
      // Complete loss: advance progression
      state.step = Math.min(state.step + 1, 5);
    }
  } else {
    // First spin: pick Column 1 or Column 3
    state.activeColumn = 1;
    state.step = 0;
  }

  // 4. Define Units Based on Bet Limits & Increment Configuration
  const baseInsideUnit = config.betLimits.min;
  const baseOutsideUnit = Math.max(config.betLimits.minOutside, baseInsideUnit * 2);
  const inc = config.incrementMode === 'base' ? baseInsideUnit : config.minIncrementalBet;

  // Multiplier scales with progression step
  const mult = 1 + Math.floor(state.step / 2) * inc;
  const insideAmount = clampBet(baseInsideUnit * mult, false);

  // Column bet scales proportionally to support inside bets
  const colAmount = clampBet(baseOutsideUnit * (state.step + 1) * mult, true);

  // 5. Construct Bets
  const bets = [];
  const col = state.activeColumn;

  // Bet on the selected Column
  bets.push({
    type: 'column',
    value: col,
    amount: colAmount
  });

  // Level-specific Inside Placements
  const colMap = {
    1: {
      s1: [1, 4],   str1: 7,
      s2: [10, 13], str2: 16,
      s3: [22, 25], str3: 28
    },
    2: {
      s1: [2, 5],   str1: 8,
      s2: [11, 14], str2: 17,
      s3: [23, 26], str3: 29
    },
    3: {
      s1: [3, 6],   str1: 9,
      s2: [12, 15], str2: 18,
      s3: [24, 27], str3: 30
    }
  }[col];

  // Step 0+: Dozen 1 Split
  bets.push({ type: 'split', value: colMap.s1, amount: insideAmount });

  // Step 1+: Dozen 1 Straight-up
  if (state.step >= 1) {
    bets.push({ type: 'number', value: colMap.str1, amount: insideAmount });
  }

  // Step 2+: Dozen 2 Split
  if (state.step >= 2) {
    bets.push({ type: 'split', value: colMap.s2, amount: insideAmount });
  }

  // Step 3+: Dozen 2 Straight-up
  if (state.step >= 3) {
    bets.push({ type: 'number', value: colMap.str2, amount: insideAmount });
  }

  // Step 4+: Dozen 3 Split
  if (state.step >= 4) {
    bets.push({ type: 'split', value: colMap.s3, amount: insideAmount });
  }

  // Step 5+: Dozen 3 Straight-up
  if (state.step >= 5) {
    bets.push({ type: 'number', value: colMap.str3, amount: insideAmount });
  }

  // Verify total bet does not exceed current bankroll
  const totalWager = bets.reduce((sum, b) => sum + b.amount, 0);
  if (totalWager > bankroll) {
    return []; // Bankroll preservation if limits exceeded
  }

  return bets;
}