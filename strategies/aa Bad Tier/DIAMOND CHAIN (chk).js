/**
 * ============================================================================
 * STRATEGY NAME: DIAMOND CHAIN ROULETTE SYSTEM (UPDATED WITH 4TH DIAMOND)
 * ============================================================================
 * 
 * 1. SOURCE:
 *    - YouTube Channel: Bet With Mo (featuring LunchMoneyMo)
 *    - Video URL: https://youtu.be/dHr8L7rp3JY
 *    - Title: "DIAMOND CHAIN - ROULETTE SYSTEM TUTORIAL"
 * 
 * 2. THE FULL LOGIC IN DETAIL:
 *    - The "Diamond Chain" system builds diamond formations down the roulette felt
 *      while hedging with Column 1 and Column 3.
 *    - Each diamond consists of:
 *      * Column 2 numbers: 2 straight-up bets (top and bottom points).
 *      * Column 1 split: 1 vertical split (left point).
 *      * Column 3 split: 1 vertical split (right point).
 *    - The flanking Column 1 & 3 outside bets absorb non-diamond column hits as 
 *      pushes or low-loss cushion, while split and straight-up hits pay out heavily.
 * 
 * 3. THE FULL BET PROGRESSION IN DETAIL:
 *    - Level 1 (Base - 1st Diamond - 12 units):
 *      * Diamond 1: Straight 2, 5 (1 unit each); Splits [1, 4], [3, 6] (1 unit each).
 *      * Columns: Col 1 (4 units), Col 3 (4 units).
 *      * Non-split Col 1/3 hit = PUSH. Inside hit = WIN. Total miss -> Level 2.
 * 
 *    - Level 2 (2nd Diamond Added - 24 units):
 *      * Diamond 1 + Diamond 2: Straight 8, 11 (1 unit each); Splits [7, 10], [9, 12] (1 unit each).
 *      * Columns: Col 1 (8 units), Col 3 (8 units).
 *      * Non-split Col 1/3 hit = PUSH. Inside hit = WIN. Total miss -> Level 3.
 * 
 *    - Level 3 (3rd Diamond Added & Straights Bumped - 42 units):
 *      * Diamond 1 + Diamond 2 + Diamond 3: Straight 14, 17; Splits [13, 16], [15, 18].
 *      * Straight-up bets bumped to 2 units each (6 numbers * 2 = 12 units).
 *      * All 6 splits stay at 1 unit each (6 * 1 = 6 units).
 *      * Columns: Col 1 (12 units), Col 3 (12 units).
 *      * Col 1/3 hit = Small Loss (-6 units). 2 small losses or 1 total miss -> Level 4.
 * 
 *    - Level 4 (4th Diamond Added, Columns +4 units, then Doubled - 112 units):
 *      * Add Diamond 4: Straight 20, 23 (2 units each); Splits [19, 22], [21, 24] (1 unit each).
 *      * Straight-ups: 8 numbers * 2 units = 16 units.
 *      * Splits: 8 splits * 1 unit = 8 units.
 *      * Columns: Add 4 units to each (12 + 4 = 16 units each -> 32 units).
 *      * Pre-double subtotal = 16 + 8 + 32 = 56 units.
 *      * DOUBLE ALL BETS (2x):
 *        - Straight-ups: 4 units each (8 * 4 = 32 units).
 *        - Splits: 2 units each (8 * 2 = 16 units).
 *        - Columns: 32 units each (Col 1 = 32, Col 3 = 32 -> 64 units).
 *        - Total = 112 units.
 * 
 *    - Level 5 (Double-Up 2 - 224 units):
 *      * Rebet double of Level 4:
 *        - Straight-ups: 8 units each.
 *        - Splits: 4 units each.
 *        - Columns: 64 units each.
 *        - Total = 224 units.
 * 
 *    - Level 6 (Double-Up 3 / Max Stage - 448 units):
 *      * Rebet double of Level 5:
 *        - Straight-ups: 16 units each.
 *        - Splits: 8 units each.
 *        - Columns: 128 units each.
 *        - Total = 448 units.
 * 
 *    - Reset Rule:
 *      * Reset to Level 1 whenever bankroll reaches a new high or targets are hit.
 * 
 * 4. THE GOAL:
 *    - Accumulate profit in $20-$25 increments toward session target ($100+).
 *    - Stop-loss: Reset after Level 6 exhaustion.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Initialize State
  if (!state.initialized) {
    state.initialized = true;
    state.level = 1;
    state.smallLossCount = 0;
    state.initialBankroll = bankroll;
    state.peakBankroll = bankroll;
  }

  if (bankroll > state.peakBankroll) {
    state.peakBankroll = bankroll;
  }

  // 2. Evaluate Previous Spin Outcome
  if (spinHistory && spinHistory.length > 0) {
    const lastResult = spinHistory[spinHistory.length - 1];
    const winningNum = lastResult.winningNumber;

    const straightsByDiamond = [
      [2, 5],
      [8, 11],
      [14, 17],
      [20, 23]
    ];

    const splitsByDiamond = [
      [[1, 4], [3, 6]],
      [[7, 10], [9, 12]],
      [[13, 16], [15, 18]],
      [[19, 22], [21, 24]]
    ];

    const activeDiamonds = state.level === 1 ? 1 : state.level === 2 ? 2 : state.level === 3 ? 3 : 4;

    let hitStraight = false;
    let hitSplit = false;

    for (let d = 0; d < activeDiamonds; d++) {
      if (straightsByDiamond[d].includes(winningNum)) hitStraight = true;
      if (splitsByDiamond[d].some(pair => pair.includes(winningNum))) hitSplit = true;
    }

    const isCol1 = winningNum > 0 && winningNum % 3 === 1;
    const isCol3 = winningNum > 0 && winningNum % 3 === 0;

    if (hitStraight || hitSplit) {
      // Inside win: reset to Level 1 if recovered or in profit
      if (bankroll >= state.initialBankroll) {
        state.level = 1;
        state.smallLossCount = 0;
      }
    } else if (isCol1 || isCol3) {
      // Outside column hit
      if (state.level <= 2) {
        // Push: remain on current level
      } else {
        // Small loss
        state.smallLossCount++;
        if (state.smallLossCount >= 2) {
          state.smallLossCount = 0;
          state.level = Math.min(state.level + 1, 6);
        }
      }
    } else {
      // Total miss (uncovered number or 0)
      state.smallLossCount = 0;
      if (state.level < 6) {
        state.level++;
      } else {
        state.level = 1; // Stop-loss reset
      }
    }
  }

  // 3. Bet Limits & Unit Scaling
  const minInside = config.betLimits.min || 1;
  const minOutside = config.betLimits.minOutside || 5;
  const maxBet = config.betLimits.max || 500;

  const insideUnit = Math.max(minInside, Math.ceil(minOutside / 4));
  const outsideUnit = Math.max(minOutside, insideUnit * 4);

  // 4. Progression Configurations
  const levelParams = {
    1: { colMult: 1,  straightMult: 1,  splitMult: 1, diamonds: 1 },
    2: { colMult: 2,  straightMult: 1,  splitMult: 1, diamonds: 2 },
    3: { colMult: 3,  straightMult: 2,  splitMult: 1, diamonds: 3 },
    4: { colMult: 8,  straightMult: 4,  splitMult: 2, diamonds: 4 }, // (16 col + 2 st + 1 sp) * 2
    5: { colMult: 16, straightMult: 8,  splitMult: 4, diamonds: 4 }, // 224 units
    6: { colMult: 32, straightMult: 16, splitMult: 8, diamonds: 4 }  // 448 units
  };

  const currentParams = levelParams[state.level] || levelParams[1];
  const bets = [];

  function addBet(type, value, calculatedAmount, isOutside) {
    const minLimit = isOutside ? minOutside : minInside;
    let clampedAmount = Math.max(calculatedAmount, minLimit);
    clampedAmount = Math.min(clampedAmount, maxBet);

    if (value !== undefined) {
      bets.push({ type: type, value: value, amount: clampedAmount });
    } else {
      bets.push({ type: type, amount: clampedAmount });
    }
  }

  // Flanking Columns
  const colBetAmount = outsideUnit * currentParams.colMult;
  addBet('column', 1, colBetAmount, true);
  addBet('column', 3, colBetAmount, true);

  const straightAmt = insideUnit * currentParams.straightMult;
  const splitAmt = insideUnit * currentParams.splitMult;

  // Diamond 1
  if (currentParams.diamonds >= 1) {
    addBet('number', 2, straightAmt, false);
    addBet('number', 5, straightAmt, false);
    addBet('split', [1, 4], splitAmt, false);
    addBet('split', [3, 6], splitAmt, false);
  }

  // Diamond 2
  if (currentParams.diamonds >= 2) {
    addBet('number', 8, straightAmt, false);
    addBet('number', 11, straightAmt, false);
    addBet('split', [7, 10], splitAmt, false);
    addBet('split', [9, 12], splitAmt, false);
  }

  // Diamond 3
  if (currentParams.diamonds >= 3) {
    addBet('number', 14, straightAmt, false);
    addBet('number', 17, straightAmt, false);
    addBet('split', [13, 16], splitAmt, false);
    addBet('split', [15, 18], splitAmt, false);
  }

  // Diamond 4
  if (currentParams.diamonds >= 4) {
    addBet('number', 20, straightAmt, false);
    addBet('number', 23, straightAmt, false);
    addBet('split', [19, 22], splitAmt, false);
    addBet('split', [21, 24], splitAmt, false);
  }

  return bets;
}