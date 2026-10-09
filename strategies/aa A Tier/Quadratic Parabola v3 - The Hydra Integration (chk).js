/**
 * Strategy: The Quadratic Parabola Version 3: The Hydra Integration
 * Source: The Lucky Felt (Todd Hoover) - https://youtu.be/1-S8hunTOMY
 *
 * Full Logic in Detail:
 * 1. Stalking & Triggers:
 *    - Tracks all 6 double streets (six-lines: 1-6, 7-12, 13-18, 19-24, 25-30, 31-36).
 *    - Requires at least 8 consecutive misses (ghost spins) on a double street before qualification.
 *    - To initiate a betting sequence, the Hydra algorithm identifies the two longest-sleeping
 *      double streets with >= 8 misses. If fewer than 2 qualify, no bets are placed.
 *    - Once locked, those two double streets are played throughout the progression until a win or eject.
 *
 * 2. Bet Progression (Quadratic Parabola):
 *    - Step 1A: 1 unit per double street (2 units total).
 *    - Step 1B (Buffer): 1 unit per double street (2 units total).
 *    - Step 2: 4 units (2^2) per double street (8 units total).
 *    - Step 3: 9 units (3^2) per double street (18 units total).
 *    - Step 4 (Eject Valve): 16 units (4^2) per double street (32 units total).
 *    - Win at any step: Cycle resets back to Step 1A, releasing the streets for Hydra re-scan.
 *    - Loss at Step 4: Hard Eject Valve triggers, capping sequence loss at 62 units (2+2+8+18+32).
 *
 * 3. The Goal & Session Stops:
 *    - Target Profit: +100 units above starting bankroll.
 *    - Session Stop-Loss: -186 units (3 eject cycles) or when bankroll cannot cover the next bet.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  const LINE_STARTS = [1, 7, 13, 19, 25, 31];
  const PROGRESSION_UNITS = [1, 1, 4, 9, 16]; // Step 1A, Step 1B (Buffer), Step 2, Step 3, Step 4
  const TARGET_PROFIT_UNITS = 10000;
  const MAX_LOSS_UNITS = 186; // 3 Step 4 eject hits (3 * 62 units)

  const unit = config.betLimits.min;

  // Initialize persistent session state
  if (!state.initialized) {
    state.initialized = true;
    state.startBankroll = config.startingBankroll || bankroll;
    state.targetBankroll = state.startBankroll + TARGET_PROFIT_UNITS * unit;
    state.stopLossBankroll = Math.max(0, state.startBankroll - MAX_LOSS_UNITS * unit);
    state.progressionStep = 0; // Index 0..4
    state.activeLines = null;  // [line1, line2]
    state.lastSpinCount = 0;
  }

  // Check overall session stop conditions
  if (bankroll >= state.targetBankroll || bankroll <= state.stopLossBankroll) {
    return [];
  }

  // Helper to determine which double street a number belongs to
  function getLineForNumber(num) {
    if (num < 1 || num > 36) return null;
    return LINE_STARTS[Math.floor((num - 1) / 6)];
  }

  // Update progression state based on previous outcome
  if (spinHistory && spinHistory.length > 0 && spinHistory.length > state.lastSpinCount) {
    state.lastSpinCount = spinHistory.length;
    const lastSpin = spinHistory[spinHistory.length - 1];
    const winningNum = lastSpin.winningNumber;

    if (state.activeLines) {
      const isWin = state.activeLines.some(lineStart => winningNum >= lineStart && winningNum <= lineStart + 5);

      if (isWin) {
        // Any win resets the sequence and frees the lines
        state.progressionStep = 0;
        state.activeLines = null;
      } else {
        // Loss advances to next progression step
        state.progressionStep += 1;

        // If Step 4 lost, trigger the hard eject valve
        if (state.progressionStep >= PROGRESSION_UNITS.length) {
          state.progressionStep = 0;
          state.activeLines = null;
        }
      }
    }
  }

  // If no lines currently locked, use Hydra engine to stalk wheel
  if (!state.activeLines) {
    if (!spinHistory || spinHistory.length < 8) {
      return []; // Need history to calculate sleeper streaks
    }

    // Calculate consecutive misses for all 6 double streets
    const missStreaks = LINE_STARTS.map(start => {
      let misses = 0;
      for (let i = spinHistory.length - 1; i >= 0; i--) {
        const num = spinHistory[i].winningNumber;
        if (num >= start && num <= start + 5) {
          break;
        }
        misses++;
      }
      return { start, misses };
    });

    // Hydra requirement: demand at least 8 consecutive misses
    const eligibleLines = missStreaks.filter(item => item.misses >= 10);

    if (eligibleLines.length < 2) {
      return []; // Wait silently (ghost spins) until 2 double streets qualify
    }

    // Select the 2 double streets with the highest miss counts
    eligibleLines.sort((a, b) => b.misses - a.misses);
    state.activeLines = [eligibleLines[0].start, eligibleLines[1].start];
    state.progressionStep = 0;
  }

  // Determine bet sizing for current step
  const unitsPerLine = PROGRESSION_UNITS[state.progressionStep];
  let betAmount = unitsPerLine * unit;

  // Clamp bet to table limits
  betAmount = Math.max(betAmount, config.betLimits.min);
  betAmount = Math.min(betAmount, config.betLimits.max);

  const totalRequired = betAmount * 2;
  if (bankroll < totalRequired) {
    return []; // Insufficient bankroll to place required bets
  }

  // Return the two line bets
  return [
    { type: 'line', value: state.activeLines[0], amount: betAmount },
    { type: 'line', value: state.activeLines[1], amount: betAmount }
  ];
}