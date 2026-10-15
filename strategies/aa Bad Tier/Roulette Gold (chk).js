/**
 * Strategy: #1 Roulette Gold
 * Source: https://youtu.be/0855jbmbfAs (Roulette Strategy Lab)
 *
 * Full Logic in Detail:
 * - Simultaneously bets on two dozens: 1st Dozen (1-12) and 2nd Dozen (13-24).
 * - Equal stake placed on both dozen 1 and dozen 2.
 *
 * Full Bet Progression in Detail:
 * - Base Level (Level 0): 1 unit on Dozen 1, 1 unit on Dozen 2.
 * - Sizing escalates by doubling and adding 1 unit: Level L units = 2^(L+1) - 1
 *   (e.g., Level 0 = 1 unit, Level 1 = 3 units, Level 2 = 7 units, Level 3 = 15 units, etc.).
 * - Level 0 has 1 attempt. Levels >= 1 have 2 attempts (Attempt 1 and Attempt 2).
 * - Progression rules:
 *   - On Loss:
 *     - If at Level 0: escalate to Level 1, Attempt 1.
 *     - If at Level L (>= 1), Attempt 1: rebet same amount at Level L, Attempt 2.
 *     - If at Level L (>= 1), Attempt 2: escalate to Level L + 1, Attempt 1.
 *   - On Win:
 *     - If at Level L, Attempt 2: regress to Level L, Attempt 1.
 *     - If at Level L, Attempt 1:
 *       - If L === 1: regress to Level 0 (Base).
 *       - If L > 1: regress to Level L - 1, Attempt 2.
 *     - If at Level 0: remain at Level 0.
 *
 * The Goal:
 * - Walk away upon reaching the session target profit (default +10 base units, e.g. +$100 on $10 units).
 * - Stop when bankroll is insufficient to place the scheduled bets.
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Initialize persistent state
  if (!state.initialized) {
    state.initialized = true;
    state.level = 0;          // 0 = base bet, 1 = 3 units, 2 = 7 units, etc.
    state.attempt = 1;        // Attempt within current level (1 or 2)
    state.lastBetAmount = 0;
    state.targetProfit = (config.targetProfit !== undefined)
      ? config.targetProfit
      : (config.betLimits.minOutside * 10000);
    state.initialBankroll = bankroll;
  }

  // 2. Evaluate outcome of previous spin if any bet was placed
  if (spinHistory.length > 0 && state.lastBetAmount > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const winningNum = lastSpin.winningNumber;
    const won = winningNum >= 1 && winningNum <= 24;

    if (won) {
      if (state.level === 0) {
        state.attempt = 1;
      } else if (state.attempt === 2) {
        state.attempt = 1;
      } else {
        // Won at Attempt 1 of Level L >= 1
        if (state.level === 1) {
          state.level = 0;
          state.attempt = 1;
        } else {
          state.level -= 1;
          state.attempt = 2;
        }
      }
    } else {
      // Loss
      if (state.level === 0) {
        state.level = 1;
        state.attempt = 1;
      } else if (state.attempt === 1) {
        state.attempt = 2;
      } else {
        // Lost attempt 2 -> double and add 1 unit to next level
        state.level += 1;
        state.attempt = 1;
      }
    }
  }

  // 3. Check Session Goal / Stop Conditions
  const currentProfit = bankroll - state.initialBankroll;
  if (currentProfit >= state.targetProfit) {
    return [];
  }

  // 4. Calculate unit multiplier for current level: 2^(level + 1) - 1
  const unitMultiplier = Math.pow(2, state.level + 1) - 1;
  const baseUnit = config.betLimits.minOutside;

  let dozenBetAmount = baseUnit * unitMultiplier;
  dozenBetAmount = Math.max(dozenBetAmount, config.betLimits.minOutside);
  dozenBetAmount = Math.min(dozenBetAmount, config.betLimits.max);

  const totalRequired = dozenBetAmount * 2;
  if (bankroll < totalRequired) {
    return [];
  }

  // 5. Place bets on 1st Dozen and 2nd Dozen
  state.lastBetAmount = dozenBetAmount;

  return [
    { type: 'dozen', value: 1, amount: dozenBetAmount },
    { type: 'dozen', value: 2, amount: dozenBetAmount }
  ];
}