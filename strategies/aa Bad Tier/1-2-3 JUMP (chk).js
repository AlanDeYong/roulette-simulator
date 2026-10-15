/**
 * -----------------------------------------------------------------------------
 * Strategy: "1-2-3 JUMP" Roulette Strategy
 * Source: Casino Gamester (YouTube: https://youtu.be/ImiEd-AjeCM)
 * -----------------------------------------------------------------------------
 * The Full Logic in Details:
 * 1. Always bet on the 2nd Dozen (numbers 13-24).
 * 2. Simultaneously bet on either the 1st Dozen (1-12) OR 3rd Dozen (25-36).
 * 3. The companion dozen "jumps" based on the previous spin:
 *    - Hit 1-12 (1st Dozen)   -> Companion switches to Dozen 1.
 *    - Hit 25-36 (3rd Dozen)  -> Companion switches to Dozen 3.
 *    - Hit 13-18 (Low Mid)    -> Companion jumps/points towards Dozen 1.
 *    - Hit 19-24 (High Mid)   -> Companion jumps/points towards Dozen 3.
 *    - Hit 0 / 00 (Green)     -> Companion remains on the previous selection.
 *
 * The Full Bet Progression in Details:
 * - Base bet is 1 unit (config.betLimits.minOutside) on each of the two selected dozens.
 * - On consecutive losses (e.g., hitting the uncovered dozen or 0): Add 1 unit / increment to both dozens.
 * - On a win: Reduce bet by 1 unit (or reset to 1 unit once target / session profit is reached).
 *
 * The Goal:
 * - Target profit is a 20-25% gain on session bankroll, or stop when bankroll drops below minimum playable balance.
 * -----------------------------------------------------------------------------
 */

function bet(spinHistory, bankroll, config, state, utils) {
  const minOutside = config.betLimits.minOutside || 5;
  const maxLimit = config.betLimits.max || 500;
  const incrementStep = config.minIncrementalBet || 1;

  // Initialize state
  if (state.companionDozen === undefined) {
    state.companionDozen = 1; // Default to Dozen 1 initially
  }
  if (!state.unitMultiplier) {
    state.unitMultiplier = 1;
  }
  if (state.consecutiveLosses === undefined) {
    state.consecutiveLosses = 0;
  }

  // Process the last spin outcome if history exists
  if (spinHistory && spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const lastNum = lastSpin.winningNumber;

    // Determine if the last spin was a win
    const activeDozens = [2, state.companionDozen];
    let hitDozen = 0;
    if (lastNum >= 1 && lastNum <= 12) hitDozen = 1;
    else if (lastNum >= 13 && lastNum <= 24) hitDozen = 2;
    else if (lastNum >= 25 && lastNum <= 36) hitDozen = 3;

    const won = activeDozens.includes(hitDozen);

    if (won) {
      state.consecutiveLosses = 0;
      state.unitMultiplier = Math.max(1, state.unitMultiplier - 1);
    } else {
      state.consecutiveLosses += 1;
      state.unitMultiplier += 1;
    }

    // Determine the next companion dozen jump
    if (lastNum >= 1 && lastNum <= 12) {
      state.companionDozen = 1;
    } else if (lastNum >= 25 && lastNum <= 36) {
      state.companionDozen = 3;
    } else if (lastNum >= 13 && lastNum <= 18) {
      state.companionDozen = 1;
    } else if (lastNum >= 19 && lastNum <= 24) {
      state.companionDozen = 3;
    }
    // If 0 / 00, companionDozen retains its current position
  }

  // Calculate bet amount per dozen
  let baseAmount = minOutside;
  let betAmount;

  if (config.incrementMode === 'base') {
    betAmount = baseAmount * state.unitMultiplier;
  } else {
    betAmount = baseAmount + (state.unitMultiplier - 1) * incrementStep;
  }

  // Clamp bet amount to configured table limits
  betAmount = Math.max(betAmount, minOutside);
  betAmount = Math.min(betAmount, maxLimit);

  // Return bets: 2nd Dozen is always active + current companion dozen
  return [
    { type: 'dozen', value: 2, amount: betAmount },
    { type: 'dozen', value: state.companionDozen, amount: betAmount }
  ];
}