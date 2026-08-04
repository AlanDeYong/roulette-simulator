/**
 * Strategy: 11 Streets Never Lose
 * Source: https://youtu.be/3XkjLIKeiDs (Casino Matchmaker)
 * Strategy Creator: Francis Savard
 * 
 * THE FULL LOGIC:
 * 1. The layout has 12 distinct street bets (1-3, 4-6, 7-9, ..., 34-36).
 * 2. On standard play, place 1 base unit on 11 out of 12 streets (excluding the most recent winning street).
 * 3. On every win during standard play, move the excluded street to the street that just won (always maintaining 11 covered streets).
 * 
 * THE FULL BET PROGRESSION (Hybrid Progression):
 * 1. Standard Level (Base Bet):
 *    - Bet 1 base unit on 11 streets.
 * 2. Loss Recovery Sequence:
 *    - Triggered when a spin lands on an uncovered street or Zero (losing all placed street bets).
 *    - Step 1 (Double): Double the bet per street on the 11 streets.
 *    - Step 2+ (Continuous Reduction & Escalation):
 *      - Upon a win during recovery, remove the street that just won from coverage (reducing total covered streets: 10, then 9, then 8...) AND increase the bet on all remaining streets by 1 base unit.
 *      - If a loss occurs at any point during recovery, double the current unit amount and re-cover 11 streets (excluding the losing street).
 *    - CRITICAL RULE: The removal of winning streets and addition of base units continues sequentially until the session's peak bankroll (new high water mark) is fully restored.
 * 
 * THE GOAL:
 * - Target Profit: +100 units or overall session high.
 * - Stop Loss: Governed by max bet limits / table capacity.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Base Unit & Table Limits
  const baseUnit = config.betLimits.min;
  const maxBet = config.betLimits.max;

  // 12 Valid Street Starting Numbers
  const ALL_STREETS = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];

  // Helper function to map a winning number to its street starting number (1, 4, 7...)
  const getStreetStart = (num) => {
    if (num <= 0 || num > 36) return null; // Zero or invalid
    return Math.floor((num - 1) / 3) * 3 + 1;
  };

  // 2. Initialize State
  if (!state.isInitialized) {
    state.isInitialized = true;
    state.highestBankroll = bankroll;
    state.inRecovery = false;
    state.currentUnit = baseUnit;
    state.excludedStreets = [34]; // Default exclude street 34-36 on start
  }

  // Update session high water mark
  if (bankroll > state.highestBankroll) {
    state.highestBankroll = bankroll;
  }

  // 3. Process Spin History
  if (spinHistory && spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const lastNum = lastSpin.winningNumber;
    const lastStreet = getStreetStart(lastNum);

    // Determine if last spin was a win
    const wasCovered = lastStreet !== null && !state.excludedStreets.includes(lastStreet);

    // Peak Bankroll Reached -> Full Reset
    if (bankroll >= state.highestBankroll) {
      state.inRecovery = false;
      state.currentUnit = baseUnit;
      if (lastStreet !== null) {
        state.excludedStreets = [lastStreet];
      }
    } else if (!wasCovered) {
      // LOSS EVENT: Double current unit and reset to 11 streets
      state.inRecovery = true;
      state.currentUnit = Math.max(state.currentUnit * 2, baseUnit * 2);
      if (lastStreet !== null) {
        state.excludedStreets = [lastStreet];
      }
    } else if (state.inRecovery) {
      // WIN DURING RECOVERY: Continue reducing streets & adding +1 unit until session peak is hit
      let increment = config.incrementMode === 'base' ? baseUnit : (config.minIncrementalBet || 1);
      state.currentUnit += increment;

      // Add the winning street to excluded list (removes it from coverage)
      if (lastStreet !== null && !state.excludedStreets.includes(lastStreet)) {
        state.excludedStreets.push(lastStreet);
      }

      // Safety Guard: If exclusions remove almost all streets, reset to 11 streets at elevated unit
      if (state.excludedStreets.length >= 11) {
        state.excludedStreets = lastStreet !== null ? [lastStreet] : [34];
      }
    } else {
      // WIN DURING STANDARD PLAY
      state.currentUnit = baseUnit;
      if (lastStreet !== null) {
        state.excludedStreets = [lastStreet];
      }
    }
  }

  // 4. Construct Bets
  const activeStreets = ALL_STREETS.filter(s => !state.excludedStreets.includes(s));

  // Clamp bet amount to config limits
  let betAmount = Math.max(state.currentUnit, baseUnit);
  betAmount = Math.min(betAmount, maxBet);

  return activeStreets.map(streetStart => ({
    type: 'street',
    value: streetStart,
    amount: betAmount
  }));
}