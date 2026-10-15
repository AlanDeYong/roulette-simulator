/**
 * Strategy: "#1 Roulette Gold" / "City of Gold"
 * Source: https://youtu.be/livyxAAovU8 (The Roulette Master / submitted by Patty)
 *
 * Full Logic in Detail:
 * - Constant two-dozen coverage: Bets are placed on the 1st Dozen (1-12) and 2nd Dozen (13-24).
 * - Operates continuously on every spin.
 *
 * Full Bet Progression in Detail:
 * - Progression ladder steps (in units per dozen):
 *   Step 0: 1 unit
 *   Step 1: 3 units (double + 1 unit)
 *   Step 2: 3 units (repeat)
 *   Step 3: 7 units (double + 1 unit: 3 * 2 + 1)
 *   Step 4: 7 units (repeat)
 *   Step 5: 15 units (double + 1 unit: 7 * 2 + 1)
 *   Step 6: 15 units (repeat)
 *   Step 7: 31 units ...
 * - After a LOSS:
 *   - Move up 1 step on the ladder (e.g., Step 0 -> Step 1 -> Step 2 -> Step 3 ...).
 * - After a WIN:
 *   - At Step 0: Stay at Step 0.
 *   - At Step 1: Return immediately to base level (Step 0).
 *   - At Step 2 or above: Move down 1 step (Step N -> Step N - 1).
 *
 * The Goal:
 * - Preserve bankroll while grinding profit on a 2/3 table coverage.
 * - Sizing slows down by repeating bet sizes at higher tiers rather than aggressively doubling every spin.
 * - Standard recommended session bankroll is 100 base units ($1,000 for $10 units).
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Initialize persistent state
  if (!state.initialized) {
    state.initialized = true;
    state.stepIndex = 0;
    state.ladder = [1, 3, 3, 7, 7, 15, 15, 31, 31, 63, 63, 127, 127];
  }

  // 2. Evaluate previous spin outcome if available
  if (spinHistory && spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const winningNum = lastSpin.winningNumber;
    const isWin = winningNum >= 1 && winningNum <= 24;

    if (isWin) {
      if (state.stepIndex <= 1) {
        state.stepIndex = 0;
      } else {
        state.stepIndex = Math.max(0, state.stepIndex - 1);
      }
    } else {
      state.stepIndex = Math.min(state.ladder.length - 1, state.stepIndex + 1);
    }
  }

  // 3. Determine bet sizing
  const baseUnit = config.betLimits.minOutside || 10;
  const currentMultiplier = state.ladder[state.stepIndex] || 1;

  let unitBet = baseUnit * currentMultiplier;
  unitBet = Math.max(unitBet, config.betLimits.minOutside);
  unitBet = Math.min(unitBet, config.betLimits.max);

  // 4. Verify bankroll sufficiency for two dozen bets
  const totalBetRequired = unitBet * 2;
  if (bankroll < totalBetRequired) {
    return [];
  }

  // 5. Place bets on 1st Dozen and 2nd Dozen
  return [
    { type: 'dozen', value: 1, amount: unitBet },
    { type: 'dozen', value: 2, amount: unitBet }
  ];
}