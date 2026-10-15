/**
 * ============================================================================
 * Strategy Name: Raptor Strategy (Romanovsky Multi-Phase Evolution)
 * Originator: Craig Watts
 * Source Channel: The Roulette Factory
 * Source URL: https://youtu.be/gEI26oRsIbM
 * ============================================================================
 * 
 * STRATEGY OVERVIEW:
 * The Raptor Strategy is a 3-phase high-coverage roulette recovery system
 * built upon the Romanovsky structure, covering up to 32+ numbers per spin.
 * 
 * --- PHASE 1 (Base Romanovsky Setup):
 * - Bet on 2 Dozens (e.g., Dozen 1 and Dozen 2): 3 units each.
 * - Bet on 2 Non-Overlapping Corners in the uncovered dozen (e.g., Dozen 3: Corners [25,26,28,29] and [32,33,35,36]): 1 unit each.
 * - Total Base Bet: 8 units. Covers 32 numbers.
 * - Win condition: Returns 9 units (Net +1 unit profit).
 * 
 * --- PHASE 2 (Independent Split Progression):
 * Triggered after any loss in Phase 1. Dozens and Corners decouple:
 * 1. Dozens:
 *    - Each time the winning number misses the active dozens, both dozen bets increase by 1 unit (+1 base unit each).
 * 2. Corners:
 *    - Corner Miss 1: Add 3rd corner bet (1 unit each, 3 corners total).
 *    - Corner Miss 2: Add 4th corner bet and double corner unit size to 2 units (4 corners @ 2 units each).
 *    - Corner Miss 3: Add 5th corner bet (5 corners @ 2 units each).
 *    - Corner Miss 4: Add 6th corner bet (6 corners @ 2 units each).
 * 
 * --- PHASE 3 (Overlapping Multi-Zone Escalation):
 * If the progression deepens past Phase 2:
 * - Add an overlapping Column bet (Column 2) starting at 4 units.
 * - From this point forward, every bet (Dozens, Column, Corners) increases linearly by +1 unit per miss to capitalize on massive overlapping hits.
 * 
 * --- RESET / GOAL:
 * - The session tracks the peak bankroll / session high.
 * - Any spin resulting in a new session profit high immediately resets all bets and phases back to Phase 1 Base.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Minimum unit references
  const minInside = config?.betLimits?.min || 1;
  const minOutside = config?.betLimits?.minOutside || 5;
  const maxBet = config?.betLimits?.max || 500;

  // 2. Initialize State
  if (!state.initialized) {
    state.initialized = true;
    state.peakBankroll = bankroll;
    state.phase = 1; // 1, 2, or 3
    state.dozenUnit = 3; // Initial 3 units for dozens
    state.cornerUnit = 1; // Initial 1 unit for corners
    state.numCorners = 2; // Initial 2 corners
    state.columnBet = 0; // Column bet amount for Phase 3
    state.dozenSelections = [1, 2]; // Primary active dozens
    state.emptyDozen = 3; // Uncovered dozen for corner placement
  }

  // 3. Process Previous Result (if any)
  if (spinHistory && spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const winningNum = lastSpin.winningNumber;

    // Check if new session high achieved
    if (bankroll > state.peakBankroll) {
      state.peakBankroll = bankroll;
      // Full reset back to Phase 1 Base
      state.phase = 1;
      state.dozenUnit = 3;
      state.cornerUnit = 1;
      state.numCorners = 2;
      state.columnBet = 0;
    } else {
      // Evaluate outcome of previous round
      const inDozens = (state.dozenSelections.includes(1) && winningNum >= 1 && winningNum <= 12) ||
                       (state.dozenSelections.includes(2) && winningNum >= 13 && winningNum <= 24) ||
                       (state.dozenSelections.includes(3) && winningNum >= 25 && winningNum <= 36);

      // Phase transitions on miss
      if (state.phase === 1) {
        // Any loss in Phase 1 enters Phase 2
        state.phase = 2;
        state.numCorners = 3;
        state.cornerUnit = 1;
        if (!inDozens) {
          state.dozenUnit += 1;
        }
      } else if (state.phase === 2) {
        // Independent dozens progression
        if (!inDozens) {
          state.dozenUnit += 1;
        }

        // Independent corner progression
        if (state.numCorners === 3) {
          state.numCorners = 4;
          state.cornerUnit = 2;
        } else if (state.numCorners === 4) {
          state.numCorners = 5;
        } else if (state.numCorners === 5) {
          state.numCorners = 6;
        } else if (state.numCorners >= 6) {
          // Escalate to Phase 3
          state.phase = 3;
          state.columnBet = 4;
          state.dozenUnit += 1;
          state.cornerUnit += 1;
        }
      } else if (state.phase === 3) {
        // Linear +1 unit progression across all active positions
        state.dozenUnit += 1;
        state.cornerUnit += 1;
        state.columnBet += 1;
      }
    }
  }

  // 4. Determine Corner Coordinates for the empty dozen (Dozen 3 standard: 25-36)
  // Non-overlapping corner anchors (top-left number of each 2x2 grid):
  // 25 covers (25,26,28,29), 26 covers (26,27,29,30), 28 covers (28,29,31,32), etc.
  const cornerPositions = [25, 32, 26, 29, 31, 28]; // Available corner starting numbers in 3rd dozen

  // 5. Construct Bets
  const bets = [];

  // (a) Dozen Bets (Outside)
  let dozenAmount = state.dozenUnit * minOutside;
  dozenAmount = Math.max(minOutside, Math.min(dozenAmount, maxBet));

  for (const doz of state.dozenSelections) {
    bets.push({
      type: 'dozen',
      value: doz,
      amount: dozenAmount
    });
  }

  // (b) Corner Bets (Inside)
  let cornerAmount = state.cornerUnit * minInside;
  cornerAmount = Math.max(minInside, Math.min(cornerAmount, maxBet));

  const activeCornersCount = Math.min(state.numCorners, cornerPositions.length);
  for (let i = 0; i < activeCornersCount; i++) {
    bets.push({
      type: 'corner',
      value: cornerPositions[i],
      amount: cornerAmount
    });
  }

  // (c) Phase 3 Overlapping Column Bet (Outside)
  if (state.phase === 3 && state.columnBet > 0) {
    let colAmount = state.columnBet * minOutside;
    colAmount = Math.max(minOutside, Math.min(colAmount, maxBet));
    bets.push({
      type: 'column',
      value: 2, // Second column (covers 2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35)
      amount: colAmount
    });
  }

  return bets;
}