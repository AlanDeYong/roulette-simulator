/**
 * ============================================================================
 * Strategy: Devious Dozen Made Better (Aggressive Recovery)
 * Source:   WillVegas Roulette (https://youtu.be/vDgJQE26Itg)
 * ============================================================================
 * 
 * --- THE FULL LOGIC IN DETAIL ---
 * 1. Coverage:
 *    - Bets two dozens simultaneously for a 24-number coverage (approx. 64.8% on Single Zero).
 * 2. Board Positions:
 *    - 2nd Dozen (Center / Anchor): Always active on every spin and receives the larger bet.
 *    - Alternating Dozen (Moving Target): Alternates between 1st Dozen and 3rd Dozen
 *      on every spin (1st -> 3rd -> 1st -> 3rd -> ...).
 * 3. Base Bet Ratio:
 *    - Base unit distribution is 3 units on the 2nd Dozen and 2 units on the Moving Dozen
 *      (Total base bet = 5 units).
 * 
 * --- THE FULL BET PROGRESSION IN DETAIL ---
 * - Step 1 (Base): 3 units on 2nd Dozen, 2 units on Moving Dozen.
 * - After 1st Loss: Add +1 unit to both bets -> (4 units, 3 units).
 * - After 2nd Loss: Add +2 units to both bets -> (6 units, 5 units).
 * - After 3rd Loss: Add +3 units to both bets -> (9 units, 8 units).
 * - After 4th Loss: Add +4 units to both bets -> (13 units, 12 units).
 * - After k-th Loss: Add +k units to both bets from the previous step.
 * - On Win:
 *    - If session bankroll reaches or exceeds the profit target / starting baseline,
 *      reset progression back to Step 1 (Base).
 *    - If still in deficit during a recovery progression, hold the bet level steady
 *      (aiming for a 2-win recovery).
 * 
 * --- THE GOAL ---
 * - Target Profit: +$20 to +$30 on a standard $200 bankroll (10% - 15% gain).
 * - Stop Condition: Reached target profit or insufficient bankroll to place bets.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Establish unit size based on outside bet limits
  const baseUnit = config.betLimits.minOutside || 1;
  const maxBetLimit = config.betLimits.max || 500;
  const startingBankroll = config.startingBankroll || 200;
  const targetProfit = 25000; // Default target: $20 - $30 profit

  // 2. Initialize Persistent State
  if (!state.initialized) {
    state.initialized = true;
    state.step = 1;                     // Progression step index (1-based)
    state.movingDozen = 1;              // 1 = 1st Dozen, 3 = 3rd Dozen
    state.highestBankroll = bankroll;
    state.stepUnitsAnchor = 3;          // 2nd Dozen units
    state.stepUnitsMoving = 2;          // Moving Dozen units
  }

  // Check if session profit target reached
  if (bankroll >= startingBankroll + targetProfit) {
    return []; // Target reached, stop betting
  }

  // 3. Process Previous Spin Results (if any)
  if (spinHistory && spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const lastWinningNum = lastSpin.winningNumber;

    // Determine winning dozen (1: 1-12, 2: 13-24, 3: 25-36, 0: 0/00)
    let winningDozen = 0;
    if (lastWinningNum >= 1 && lastWinningNum <= 12) winningDozen = 1;
    else if (lastWinningNum >= 13 && lastWinningNum <= 24) winningDozen = 2;
    else if (lastWinningNum >= 25 && lastWinningNum <= 36) winningDozen = 3;

    // Check if the last round was a win (hit 2nd dozen or the active moving dozen)
    const wonLastSpin = (winningDozen === 2 || winningDozen === state.lastMovingDozen);

    if (wonLastSpin) {
      // If we recovered to or above our starting bankroll or baseline, reset progression
      if (bankroll >= startingBankroll) {
        state.step = 1;
        state.stepUnitsAnchor = 3;
        state.stepUnitsMoving = 2;
      }
      // Otherwise, hold current level to complete multi-spin recovery
    } else {
      // Loss: Advance progression aggressively (Step k adds +k units to both bets)
      const increment = state.step; // Add +1 after step 1, +2 after step 2, etc.
      state.step += 1;
      state.stepUnitsAnchor += increment;
      state.stepUnitsMoving += increment;
    }

    // Toggle the moving dozen for the next spin (1st -> 3rd -> 1st -> ...)
    state.movingDozen = (state.movingDozen === 1) ? 3 : 1;
  }

  // Record active moving dozen for next outcome check
  state.lastMovingDozen = state.movingDozen;

  // 4. Calculate and Clamp Bet Amounts
  let amountAnchor = state.stepUnitsAnchor * baseUnit;
  let amountMoving = state.stepUnitsMoving * baseUnit;

  // Clamp amounts to table limits
  amountAnchor = Math.max(config.betLimits.minOutside, Math.min(amountAnchor, maxBetLimit));
  amountMoving = Math.max(config.betLimits.minOutside, Math.min(amountMoving, maxBetLimit));

  // Check if bankroll supports both bets
  const totalRequired = amountAnchor + amountMoving;
  if (bankroll < totalRequired) {
    return []; // Insufficient bankroll to place full strategy bets
  }

  // 5. Return Bet Objects (2nd Dozen + Moving Dozen)
  return [
    { type: 'dozen', value: 2, amount: amountAnchor },
    { type: 'dozen', value: state.movingDozen, amount: amountMoving }
  ];
}