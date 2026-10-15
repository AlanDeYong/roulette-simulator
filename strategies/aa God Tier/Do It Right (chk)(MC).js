/**
 * ============================================================================
 * Strategy Name: Do It Right Roulette Strategy
 * Source URL:    https://youtu.be/pABGSUK9VW0
 * Channel Name:  The Roulette Master
 *
 * FULL LOGIC & CONDITIONS:
 * ------------------------
 * 1. Mode Selection (Dozens vs. Columns):
 *    - Analyzes past spin history to measure how many spins ago the last 
 *      consecutive repeat occurred for Dozens vs. Columns (ignoring 0/00).
 *    - Selects the category (Dozens or Columns) that has gone the LONGEST 
 *      without repeating.
 *    - If a repeat occurred too recently (gap < 2 spins), the system skips
 *      betting until a sufficient gap without repeats is established.
 *
 * 2. Bet Placement (Follow the Winner):
 *    - Places bets on the MOST RECENT winning Dozen or Column.
 *    - On a loss (non-zero), moves the next bet to the newly landed 
 *      Dozen/Column to follow the winner.
 *    - On 0 or 00, holds the bet target on the last valid non-zero position.
 *
 * FULL BET PROGRESSION (Fibonacci 12):
 * ------------------------------------
 * - Base unit = config.betLimits.minOutside.
 * - Sequence multiplier: 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144...
 * - On LOSS: Advance 1 step forward in the Fibonacci sequence.
 * - On WIN: Reset to step 1 (multiplier 1) and re-evaluate mode selection.
 *
 * THE GOAL:
 * ---------
 * - Secure consistent session profits (~20 base units) while using repeater 
 *   statistical gaps to protect the bankroll from long dry spells.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // --------------------------------------------------------------------------
  // 1. Helper Functions
  // --------------------------------------------------------------------------
  function getDozen(num) {
    if (num === null || num === undefined || num === 0 || num === 37 || num === 38) return null;
    if (num >= 1 && num <= 12) return 1;
    if (num >= 13 && num <= 24) return 2;
    if (num >= 25 && num <= 36) return 3;
    return null;
  }

  function getColumn(num) {
    if (num === null || num === undefined || num === 0 || num === 37 || num === 38) return null;
    if (num % 3 === 1) return 1;
    if (num % 3 === 2) return 2;
    if (num % 3 === 0) return 3;
    return null;
  }

  // Calculate spins since last consecutive repeat for a given extraction function
  function getSpinsSinceLastRepeat(history, getCategoryFn) {
    const validSpins = [];
    for (let i = 0; i < history.length; i++) {
      const cat = getCategoryFn(history[i].winningNumber);
      if (cat !== null) {
        validSpins.push({ category: cat, originalIndex: i });
      }
    }

    for (let i = validSpins.length - 1; i >= 1; i--) {
      if (validSpins[i].category === validSpins[i - 1].category) {
        // Distance in total spins from the end of history
        return history.length - 1 - validSpins[i].originalIndex;
      }
    }
    return 999; // Default large number if no repeat found
  }

  // --------------------------------------------------------------------------
  // 2. State Initialization
  // --------------------------------------------------------------------------
  if (state.fibIndex === undefined) state.fibIndex = 0;
  if (!state.fibSequence) {
    state.fibSequence = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377];
  }
  if (!state.mode) state.mode = null; // 'dozen' or 'column'
  if (!state.lastTarget) state.lastTarget = null; // 1, 2, or 3
  if (state.inProgression === undefined) state.inProgression = false;

  // Need at least 2 spins to evaluate history
  if (!spinHistory || spinHistory.length < 2) {
    return [];
  }

  const lastSpin = spinHistory[spinHistory.length - 1];
  const lastNum = lastSpin.winningNumber;
  const baseUnit = config.betLimits.minOutside;

  // --------------------------------------------------------------------------
  // 3. Evaluate Previous Outcome & Progression
  // --------------------------------------------------------------------------
  if (state.inProgression && state.lastTarget !== null && state.mode !== null) {
    const lastWinCategory = state.mode === 'dozen' ? getDozen(lastNum) : getColumn(lastNum);
    
    if (lastWinCategory !== null) {
      if (lastWinCategory === state.lastTarget) {
        // WIN: Reset progression
        state.fibIndex = 0;
        state.inProgression = false;
        state.mode = null;
        state.lastTarget = null;
      } else {
        // LOSS (Non-zero): Advance Fibonacci progression & update target to follow winner
        state.fibIndex = Math.min(state.fibIndex + 1, state.fibSequence.length - 1);
        state.lastTarget = lastWinCategory;
      }
    } else {
      // Zero hit: Advance Fibonacci sequence, hold last target position
      state.fibIndex = Math.min(state.fibIndex + 1, state.fibSequence.length - 1);
    }
  }

  // --------------------------------------------------------------------------
  // 4. Mode & Target Selection (if not currently in active progression)
  // --------------------------------------------------------------------------
  if (!state.inProgression) {
    const dozenRepeatGap = getSpinsSinceLastRepeat(spinHistory, getDozen);
    const columnRepeatGap = getSpinsSinceLastRepeat(spinHistory, getColumn);

    // Minimum gap required (must be >= 2 spins since last repeat to enter)
    const minGap = 2;

    if (dozenRepeatGap >= minGap || columnRepeatGap >= minGap) {
      if (dozenRepeatGap >= columnRepeatGap) {
        state.mode = 'dozen';
      } else {
        state.mode = 'column';
      }

      // Set target to follow the most recent non-zero outcome
      let lastValidCategory = null;
      for (let i = spinHistory.length - 1; i >= 0; i--) {
        const cat = state.mode === 'dozen' 
          ? getDozen(spinHistory[i].winningNumber) 
          : getColumn(spinHistory[i].winningNumber);
        if (cat !== null) {
          lastValidCategory = cat;
          break;
        }
      }

      if (lastValidCategory !== null) {
        state.lastTarget = lastValidCategory;
        state.inProgression = true;
        state.fibIndex = 0;
      } else {
        return []; // No valid non-zero result found
      }
    } else {
      // Repeat occurred too recently; wait for a larger gap
      return [];
    }
  }

  // --------------------------------------------------------------------------
  // 5. Calculate Bet Amount & Clamp to Limits
  // --------------------------------------------------------------------------
  const multiplier = state.fibSequence[state.fibIndex];
  let betAmount = baseUnit * multiplier;

  // Clamp to configured bet limits
  betAmount = Math.max(betAmount, config.betLimits.minOutside);
  betAmount = Math.min(betAmount, config.betLimits.max);

  // --------------------------------------------------------------------------
  // 6. Return Bet Object
  // --------------------------------------------------------------------------
  return [
    {
      type: state.mode,
      value: state.lastTarget,
      amount: betAmount
    }
  ];
}