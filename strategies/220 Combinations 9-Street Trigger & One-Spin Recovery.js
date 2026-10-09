/**
 * ============================================================================
 * Strategy: 220 Combinations 9-Street Trigger & One-Spin Recovery
 * Source: https://youtu.be/M2PY1WDkhk4 (TeKKa Tools & Tallk)
 * ============================================================================
 * 
 * FULL LOGIC IN DETAIL:
 * 1. The roulette board contains 12 individual streets (each covering 3 numbers):
 *    Street 0: 1-3   | Street 1: 4-6   | Street 2: 7-9   | Street 3: 10-12
 *    Street 4: 13-15 | Street 5: 16-18 | Street 6: 19-21 | Street 7: 22-24
 *    Street 8: 25-27 | Street 9: 28-30 | Street 10: 31-33| Street 11: 34-36
 * 
 * 2. Mathematically, choosing 9 streets out of 12 yields C(12, 9) = 220 possible
 *    9-street combinations. Each combination covers 27 numbers (72.97% on European wheel).
 * 
 * 3. Every spin, the state tracker updates the consecutive loss streak ("loss level")
 *    for all 220 combinations. A combination loses if the winning number lands on one
 *    of its 3 omitted streets or on 0/00.
 * 
 * 4. ENTRY TRIGGER:
 *    - Waiting threshold: Set by `lossLevelTrigger` (default: 5 losses, or 3 for continuous play).
 *    - When no bet is currently active, the system scans all 220 combinations.
 *    - If any combination has consecutive losses >= `lossLevelTrigger`, the one with
 *      the highest loss streak is locked in as the active combination.
 * 
 * FULL BET PROGRESSION IN DETAIL:
 * - Style: "One-Spin Recovery" (4x aggressive multiplier).
 * - Street payout: 11 to 1. One winning street returns 12x the single-street bet.
 * - Sizing per step (multiplier * base inside bet unit):
 *     Level 1: 1 unit per street   (9 units total)  -> Win net: +3 units
 *     Level 2: 4 units per street  (36 units total) -> Win net: +3 units cumulative
 *     Level 3: 16 units per street (144 units total)-> Win net: +3 units cumulative
 *     Level 4: 64 units per street (576 units total)-> Win net: +3 units cumulative
 * - Win Rule: On any win, all previous losses in the cycle are fully recovered plus
 *   the original +3 unit target. Reset progression to Level 1 and release the active bet.
 * - Loss Rule: Increase multiplier to next level (4x). If Level 4 loses, cycle resets
 *   (stop-loss) to prevent bankroll ruin.
 * 
 * THE GOAL:
 * - Session Target: +33 base profit cycles (+99 units).
 * - Stop when profit target is reached or bankroll cannot fund the next progression tier.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // Street starting row values (1 to 34)
  const STREET_STARTS = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];
  const PROGRESSION_MULTIPLIERS = [1, 4, 16, 64];
  const LOSS_LEVEL_TRIGGER = 5; // Default: 5 for fast wheel, 3 for high-frequency live play
  const TARGET_PROFIT_UNITS = 9900; // 33 winning cycles * 3 units

  // 1. Initialize persistent state
  if (!state.initialized) {
    state.initialized = true;
    state.startingBankroll = bankroll;
    state.progressionIndex = 0;
    state.activeCombinationIndex = null;
    state.lastProcessedSpinCount = 0;
    state.targetReached = false;

    // Generate all 220 combinations of 9 streets out of 12
    state.combinations = [];
    function generateCombos(startIdx, currentCombo) {
      if (currentCombo.length === 9) {
        state.combinations.push([...currentCombo]);
        return;
      }
      for (let i = startIdx; i < 12; i++) {
        currentCombo.push(i);
        generateCombos(i + 1, currentCombo);
        currentCombo.pop();
      }
    }
    generateCombos(0, []);

    // Track consecutive miss count for each of the 220 combinations
    state.lossStreaks = new Array(state.combinations.length).fill(0);
  }

  // Check session target
  const unit = config.betLimits.min;
  const currentProfit = bankroll - state.startingBankroll;
  if (currentProfit >= TARGET_PROFIT_UNITS * unit) {
    state.targetReached = true;
    return [];
  }

  // 2. Process incoming spins and update loss streaks
  if (spinHistory && spinHistory.length > state.lastProcessedSpinCount) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const winningNum = lastSpin.winningNumber;
    state.lastProcessedSpinCount = spinHistory.length;

    // Determine which street won (0-11) or -1 for 0/00
    let winningStreetIdx = -1;
    if (winningNum > 0 && winningNum <= 36) {
      winningStreetIdx = Math.floor((winningNum - 1) / 3);
    }

    // Evaluate active bet win/loss if one was placed
    if (state.activeCombinationIndex !== null) {
      const activeCombo = state.combinations[state.activeCombinationIndex];
      const isWin = activeCombo.includes(winningStreetIdx);

      if (isWin) {
        // Recovery achieved: reset progression and release locked combination
        state.progressionIndex = 0;
        state.activeCombinationIndex = null;
      } else {
        // Progression step after a loss
        state.progressionIndex++;
        if (state.progressionIndex >= PROGRESSION_MULTIPLIERS.length) {
          // Stop-loss hit for current sequence
          state.progressionIndex = 0;
          state.activeCombinationIndex = null;
        }
      }
    }

    // Update consecutive loss streaks across all 220 combinations
    for (let i = 0; i < state.combinations.length; i++) {
      const combo = state.combinations[i];
      if (combo.includes(winningStreetIdx)) {
        state.lossStreaks[i] = 0;
      } else {
        state.lossStreaks[i]++;
      }
    }
  }

  // 3. Trigger check: If not in an active progression, search for qualifying trigger
  if (state.activeCombinationIndex === null) {
    let highestLossStreak = -1;
    let selectedIndex = null;

    for (let i = 0; i < state.lossStreaks.length; i++) {
      const streak = state.lossStreaks[i];
      if (streak >= LOSS_LEVEL_TRIGGER && streak > highestLossStreak) {
        highestLossStreak = streak;
        selectedIndex = i;
      }
    }

    if (selectedIndex !== null) {
      state.activeCombinationIndex = selectedIndex;
      state.progressionIndex = 0;
    } else {
      // Waiting for trigger
      return [];
    }
  }

  // 4. Calculate bet sizing
  const currentMultiplier = PROGRESSION_MULTIPLIERS[state.progressionIndex];
  let streetBetAmount = unit * currentMultiplier;

  // Clamp within table limits
  streetBetAmount = Math.max(streetBetAmount, config.betLimits.min);
  streetBetAmount = Math.min(streetBetAmount, config.betLimits.max);

  const totalRequired = streetBetAmount * 9;
  if (bankroll < totalRequired) {
    // Insufficient bankroll to place all 9 street bets
    state.activeCombinationIndex = null;
    state.progressionIndex = 0;
    return [];
  }

  // 5. Build and return the 9 street bets
  const activeStreets = state.combinations[state.activeCombinationIndex];
  const bets = activeStreets.map(streetIdx => ({
    type: 'street',
    value: STREET_STARTS[streetIdx],
    amount: streetBetAmount
  }));

  return bets;
}