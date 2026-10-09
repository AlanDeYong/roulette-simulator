/**
 * ============================================================================
 * MAKE IT RAIN ROULETTE STRATEGY
 * ============================================================================
 * Source:
 *   - Video URL: https://youtu.be/BpdxYP69e3A
 *   - Channel: Bet With Mo
 *
 * Full Logic in Detail:
 *   1. Trigger & Qualification:
 *      - Observes the most recent winning number N.
 *      - Street calculation: s = Math.floor((N - 1) / 3) * 3 + 1.
 *      - Edge Case Filter: N must have a street below (s - 3 >= 1) and a street
 *        above (s + 3 <= 34). Numbers in {0, 1, 2, 3, 34, 35, 36} cannot be
 *        played because they cannot support two flanking streets.
 *      - If an invalid number hits, the system skips spinning without placing bets
 *        until a valid qualifying number appears.
 *   2. Bet Setup (3 bets per setup):
 *      - Street below: { type: 'street', value: s - 3 }
 *      - Street above: { type: 'street', value: s + 3 }
 *      - Inside Split: Split between the remaining adjacent numbers in street s
 *        (e.g., if N = s, split [s+1, s+2]; if N = s+2, split [s, s+1]; if N = s+1,
 *        split [s, s+1]).
 *
 * Full Bet Progression in Detail:
 *   - Step 0 (Base): 1 setup (3 bets) at 1 unit each (Total: 3 units).
 *   - Step 1 (Loss on Step 0): Retain Setup 1, add Setup 2 on the new winning number
 *     (Total: 6 bets at 1 unit each = 6 units).
 *   - Step 2 (Loss on Step 1): Increase each bet by +1 unit -> 2 units each (Total: 12 units).
 *   - Step 3 (Loss on Step 2): Increase each bet by +2 units -> 4 units each (Total: 24 units).
 *   - Step 4 (Loss on Step 3): Increase each bet by +3 units -> 7 units each (Total: 42 units).
 *   - Step 5 (Loss on Step 4): Increase each bet by +4 units -> 11 units each (Total: 66 units).
 *   - Step 6 (Loss on Step 5): Increase each bet by +5 units -> 16 units each (Total: 96 units).
 *   - Step 7 (Loss on Step 6): Increase each bet by +10 units -> 26 units each (Total: 156 units).
 *   - Win Handling: If a win achieves a new session high (bankroll >= sessionHigh),
 *     reset completely back to Step 0 with a single fresh setup.
 *
 * The Goal:
 *   - Target profit recovery with incremental unit multipliers.
 *   - Bankroll preservation by resetting upon new session peaks.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
  const unit = config.betLimits.min;

  // Progression unit multiplier table
  const MULTIPLIERS = [1, 1, 2, 4, 7, 11, 16, 26];

  // Helper: check if a number can support flanking streets
  function isValidTarget(num) {
    if (num === null || num === undefined || num <= 3 || num >= 34) {
      return false;
    }
    const streetStart = Math.floor((num - 1) / 3) * 3 + 1;
    return streetStart - 3 >= 1 && streetStart + 3 <= 34;
  }

  // Helper: construct the 3-bet setup for a given number
  function createSetup(num, betAmount) {
    const s = Math.floor((num - 1) / 3) * 3 + 1;
    let splitVal;

    if (num === s) {
      splitVal = [s + 1, s + 2];
    } else if (num === s + 2) {
      splitVal = [s, s + 1];
    } else {
      splitVal = [s, s + 1];
    }

    return [
      { type: 'street', value: s - 3, amount: betAmount },
      { type: 'street', value: s + 3, amount: betAmount },
      { type: 'split', value: splitVal, amount: betAmount }
    ];
  }

  // Helper: check if a winning number is covered by a setup
  function isCoveredBySetup(setupNumber, winningNum) {
    if (!setupNumber || winningNum === null || winningNum === undefined) return false;
    const s = Math.floor((setupNumber - 1) / 3) * 3 + 1;
    const lowerStreet = [s - 3, s - 2, s - 1];
    const upperStreet = [s + 3, s + 4, s + 5];

    if (lowerStreet.includes(winningNum) || upperStreet.includes(winningNum)) {
      return true;
    }

    if (winningNum === s && setupNumber !== s) return true;
    if (winningNum === s + 2 && setupNumber !== s + 2) return true;
    if (winningNum === s + 1) return true;

    return false;
  }

  // Initialize persistent state
  if (!state.initialized) {
    state.initialized = true;
    state.sessionHigh = config.startingBankroll || bankroll;
    state.step = 0;
    state.target1 = null;
    state.target2 = null;
  }

  // Update session high if bankroll increased
  if (bankroll > state.sessionHigh) {
    state.sessionHigh = bankroll;
  }

  // Need at least one previous spin to determine placement
  if (!spinHistory || spinHistory.length === 0) {
    return [];
  }

  const lastSpin = spinHistory[spinHistory.length - 1];
  const lastNumber = lastSpin.winningNumber;

  // Determine win / loss of previous active bets
  if (state.target1 !== null) {
    const wonSetup1 = isCoveredBySetup(state.target1, lastNumber);
    const wonSetup2 = state.target2 ? isCoveredBySetup(state.target2, lastNumber) : false;
    const wasWin = wonSetup1 || wonSetup2;

    if (wasWin) {
      // If we recovered and reached a new session high, reset to base
      if (bankroll >= state.sessionHigh) {
        state.step = 0;
        state.target1 = null;
        state.target2 = null;
      }
    } else {
      // Progress to next step on loss
      if (state.step < MULTIPLIERS.length - 1) {
        state.step += 1;
      }
    }
  }

  // Assign or refresh Target 1
  if (state.target1 === null) {
    if (isValidTarget(lastNumber)) {
      state.target1 = lastNumber;
    } else {
      return []; // Skip spin until a valid number lands
    }
  }

  // Assign Target 2 if at Step 1 or above
  if (state.step >= 1 && state.target2 === null) {
    const s1 = Math.floor((state.target1 - 1) / 3) * 3 + 1;
    const lastS = Math.floor((lastNumber - 1) / 3) * 3 + 1;

    // Must be valid and non-overlapping with Target 1's street or flanked streets
    if (isValidTarget(lastNumber) && Math.abs(s1 - lastS) > 3) {
      state.target2 = lastNumber;
    } else {
      // Wait for a clean non-overlapping number before expanding
      return [];
    }
  }

  // Determine current unit size clamped within table limits
  const currentMultiplier = MULTIPLIERS[state.step] || 1;
  let betAmount = unit * currentMultiplier;
  betAmount = Math.max(betAmount, config.betLimits.min);
  betAmount = Math.min(betAmount, config.betLimits.max);

  // Build bet array
  let bets = createSetup(state.target1, betAmount);

  if (state.step >= 1 && state.target2 !== null) {
    bets = bets.concat(createSetup(state.target2, betAmount));
  }

  // Bankroll sanity check
  const totalBetRequired = bets.reduce((sum, b) => sum + b.amount, 0);
  if (bankroll < totalBetRequired) {
    return [];
  }

  return bets;
}