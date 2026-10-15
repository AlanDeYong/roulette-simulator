/**
 * ============================================================================
 * ROULETTE STRATEGY: Nine Street Nightmare
 * ============================================================================
 * Source:
 *   - YouTube Video: https://youtu.be/DGt5DFHFsXA
 *   - Channel: The Roulette Master
 *   - Original System Creator: Charles Morris
 *
 * The Full Logic in Detail:
 *   1. Coverage:
 *      The board is covered using 9 street bets (27 numbers total out of 37/38).
 *      Across each dozen, the first street is left open and the other three are bet:
 *        - Dozen 1: Skip 1-3.   Bet Street 4 (4-6), Street 7 (7-9), Street 10 (10-12).
 *        - Dozen 2: Skip 13-15. Bet Street 16 (16-18), Street 19 (19-21), Street 22 (22-24).
 *        - Dozen 3: Skip 25-27. Bet Street 28 (28-30), Street 31 (31-33), Street 34 (34-36).
 *
 *   2. Trigger & Conditions:
 *      - Every spin, bets are placed across all 9 designated streets.
 *      - A win occurs when the winning number falls inside any of the 9 streets.
 *      - A loss occurs if 0, 00, or any of the 3 uncovered streets hit.
 *
 * The Full Bet Progression in Detail:
 *   - Base Mode (Positive Progression - "The Trifecta"):
 *       - Spin 1: Bet 1 base unit per street.
 *       - Win 1: Increase by +1 unit per street (to 2 units).
 *       - Win 2: Increase by +1 unit per street (to 3 units).
 *       - Win 3 ("Trifecta"): Target reached. Reset back to base level (1 unit).
 *
 *   - Loss Mode (Martingale Double):
 *       - On any loss: Double the bet size per street (amount * 2).
 *       - On consecutive losses: Continue doubling.
 *
 *   - Win in Recovery Mode:
 *       - If the win restores net session profit: Reset immediately back to base level (1 unit).
 *       - If still in deficit: Increase bet by (consecutiveLosses + 1) units per street to
 *         accelerate reaching session profit, resetting as soon as profit is recovered.
 *
 * The Goal:
 *   - Primary Target: Achieve +$200 to +$300 session profit (or +15% of starting bankroll).
 *   - Reset Target: Reset to base whenever the 3-win "Trifecta" is hit or new session profit is made.
 *   - Stop-Loss: Cease betting if total required bet exceeds remaining bankroll or limits.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Street definitions (starting number for each of the 9 streets)
  const STREET_START_NUMBERS = [4, 7, 10, 16, 19, 22, 28, 31, 34];

  // Helper to determine if a number falls within our 9 covered streets
  function isWinningStreetNumber(num) {
    if (num === 0 || num === '00' || num === 37) return false;
    for (let i = 0; i < STREET_START_NUMBERS.length; i++) {
      const start = STREET_START_NUMBERS[i];
      if (num >= start && num <= start + 2) {
        return true;
      }
    }
    return false;
  }

  // 2. Initialize State
  if (!state.initialized) {
    state.initialized = true;
    state.initialBankroll = bankroll;
    state.peakBankroll = bankroll;
    state.targetProfit = 250; // Standard $200 - $300 session target
    state.currentUnit = 1;     // Current unit multiplier
    state.winStreak = 0;       // Consecutive wins during positive progression
    state.consecutiveLosses = 0;
    state.inRecovery = false;
    state.lastTotalBet = 0;
  }

  // 3. Process previous spin result if available
  if (spinHistory && spinHistory.length > 0) {
    const lastResult = spinHistory[spinHistory.length - 1];
    const wonLastSpin = isWinningStreetNumber(lastResult.winningNumber);

    // Update bankroll tracking
    if (bankroll > state.peakBankroll) {
      state.peakBankroll = bankroll;
    }

    const netSessionProfit = bankroll - state.initialBankroll;

    if (wonLastSpin) {
      if (state.inRecovery) {
        // If recovered back to profit or close to target, reset to base
        if (netSessionProfit >= 0 || bankroll >= state.peakBankroll) {
          state.inRecovery = false;
          state.consecutiveLosses = 0;
          state.currentUnit = 1;
          state.winStreak = 0;
        } else {
          // Accelerate recovery by stepping up units based on lost levels
          const stepUp = Math.max(2, state.consecutiveLosses + 1);
          state.currentUnit += stepUp;
        }
      } else {
        // Normal positive progression ("Trifecta" attempt)
        state.winStreak += 1;
        if (state.winStreak >= 3) {
          // Completed 3-win trifecta -> reset to base level
          state.winStreak = 0;
          state.currentUnit = 1;
        } else {
          // Go up 1 unit on win
          const unitIncrement = (config.incrementMode === 'base') ? 1 : (config.minIncrementalBet || 1);
          state.currentUnit += unitIncrement;
        }
      }
    } else {
      // Loss occurred -> enter recovery mode and double
      state.inRecovery = true;
      state.winStreak = 0;
      state.consecutiveLosses += 1;
      state.currentUnit *= 2;
    }
  }

  // 4. Determine base unit value respecting inside bet limits
  const baseUnitValue = config.betLimits.min || 2;
  let unitAmount = baseUnitValue * state.currentUnit;

  // Clamp per-street bet within table boundaries
  unitAmount = Math.max(unitAmount, config.betLimits.min);
  unitAmount = Math.min(unitAmount, config.betLimits.max);

  // 5. Bankroll protection & stop check
  const totalBetRequired = unitAmount * STREET_START_NUMBERS.length;
  if (bankroll < totalBetRequired) {
    // If bankroll cannot fund full bets, scale down to maximum affordable or stop
    const affordableUnit = Math.floor(bankroll / STREET_START_NUMBERS.length);
    if (affordableUnit >= config.betLimits.min) {
      unitAmount = affordableUnit;
    } else {
      return []; // Stop betting if below table minimums
    }
  }

  state.lastTotalBet = unitAmount * STREET_START_NUMBERS.length;

  // 6. Return array of 9 street bets
  return STREET_START_NUMBERS.map(function(startNum) {
    return {
      type: 'street',
      value: startNum,
      amount: unitAmount
    };
  });
}