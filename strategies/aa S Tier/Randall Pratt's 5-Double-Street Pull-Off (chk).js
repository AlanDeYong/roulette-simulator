/**
 * ============================================================================
 * STRATEGY: Randall Pratt's Double Street Recovery (Modified)
 * ============================================================================
 * Source:
 *   - Video: "THE SAFEST ROULETTE SYSTEM EVER?"
 *   - URL: https://youtu.be/w7qZeK3l6MA
 *   - Channel: The Roulette Master
 *
 * The Full Logic in Detail:
 *   - Initial Setup: Waits for 1 observation spin without betting to identify
 *     the double street to exclude.
 *   - Board Coverage: Plays double streets ('line'), excluding the most recent
 *     winning double street observed.
 *   - Pull-Off Constraint: Removes a maximum of 2 double streets during recovery
 *     (floored at 3 double streets / 18 numbers minimum, down from 5).
 *   - Flat Betting: After a win during non-recovery, rotates out the winning line
 *     and restores the previously excluded line.
 *
 * The Full Bet Progression in Detail:
 *   - On Loss: Enter recovery mode and increase bet size by 1 unit per loss.
 *   - On Win: Pull off the winning double street (up to 2 removals max).
 *   - The Goal & Reset:
 *     - Tracks the session's peak bankroll (`peakBankroll`).
 *     - Only resets when the bankroll reaches a new session high (`bankroll > peakBankroll`).
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
  const ALL_LINES = [1, 7, 13, 19, 25, 31];

  function getLineForNumber(num) {
    if (num < 1 || num > 36) return null;
    for (let i = ALL_LINES.length - 1; i >= 0; i--) {
      if (num >= ALL_LINES[i]) return ALL_LINES[i];
    }
    return null;
  }

  const baseUnit = config.betLimits.min;
  const incStep = config.incrementMode === 'base' ? baseUnit : (config.minIncrementalBet || 1);

  // Initialize State & Peak Bankroll Tracker
  if (state.peakBankroll === undefined) {
    state.peakBankroll = bankroll;
    state.currentUnitLevel = 1;
    state.activeLines = [];
    state.lastExcludedLine = null;
    state.inRecovery = false;
    state.initialized = false;
  }

  // Update session peak bankroll
  if (bankroll > state.peakBankroll) {
    state.peakBankroll = bankroll;
  }

  // 1. Wait 1 spin without betting to determine initial exclusion
  if (!state.initialized) {
    if (!spinHistory || spinHistory.length < 1) {
      return [];
    }
    const lastNum = spinHistory[spinHistory.length - 1].winningNumber;
    const hitLine = getLineForNumber(lastNum);
    state.lastExcludedLine = hitLine !== null ? hitLine : 31;
    state.activeLines = ALL_LINES.filter(l => l !== state.lastExcludedLine);
    state.initialized = true;
  } else if (spinHistory && spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const lastNum = lastSpin.winningNumber;
    const hitLine = getLineForNumber(lastNum);
    const wasWin = hitLine !== null && state.activeLines.includes(hitLine);

    // Reset strictly when a new session peak profit is reached
    if (bankroll >= state.peakBankroll && wasWin && state.inRecovery) {
      state.currentUnitLevel = 1;
      state.inRecovery = false;
      const excluded = hitLine !== null ? hitLine : state.lastExcludedLine;
      state.lastExcludedLine = excluded;
      state.activeLines = ALL_LINES.filter(l => l !== excluded);
    } else {
      if (wasWin) {
        if (state.inRecovery) {
          // Remove up to 2 double streets only (min 3 lines / 18 numbers)
          if (state.activeLines.length > 3) {
            state.activeLines = state.activeLines.filter(l => l !== hitLine);
          }
        } else {
          // Flat betting rotation
          const excluded = hitLine !== null ? hitLine : state.lastExcludedLine;
          state.lastExcludedLine = excluded;
          state.activeLines = ALL_LINES.filter(l => l !== excluded);
        }
      } else {
        // On loss, trigger recovery and increment bet size
        state.inRecovery = true;
        state.currentUnitLevel += 1;
      }
    }
  }

  // Calculate and clamp bet amount
  let betAmount = baseUnit + (state.currentUnitLevel - 1) * incStep;
  betAmount = Math.max(betAmount, config.betLimits.min);
  betAmount = Math.min(betAmount, config.betLimits.max);

  // Bankroll safeguard
  const totalRequired = betAmount * state.activeLines.length;
  if (totalRequired > bankroll) {
    const affordablePerLine = Math.floor(bankroll / state.activeLines.length);
    if (affordablePerLine < config.betLimits.min) {
      return [];
    }
    betAmount = affordablePerLine;
  }

  return state.activeLines.map(lineStart => ({
    type: 'line',
    value: lineStart,
    amount: betAmount
  }));
}