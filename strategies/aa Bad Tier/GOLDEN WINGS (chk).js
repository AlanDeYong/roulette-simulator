/**
 * ============================================================================
 * Strategy Name: Golden Wings
 * Source: YouTube - "GOLDEN WINGS - ONE OF MY FAVORITE ROULETTE SYSTEMS"
 * Channel: Bet With Mo (https://youtu.be/jWtiT_UztC0)
 * ============================================================================
 *
 * FULL LOGIC & BET POSITIONS:
 * The "Golden Wings" strategy covers 30 out of 37 (or 38) numbers using a combination
 * of 6 street bets and 1 dozen bet:
 * 1. First Dozen (Wing 1): First 3 streets (1-3, 4-6, 7-9) - 1 unit each.
 *    (Numbers 10, 11, 12 remain unbet).
 * 2. Second Dozen (Body): Bet placed directly on Dozen 2 (13-24) - 3 units.
 *    (This serves as an insurance/push zone that returns 3 * 3 = 9 units, breaking even).
 * 3. Third Dozen (Wing 2): Last 3 streets (28-30, 31-33, 34-36) - 1 unit each.
 *    (Numbers 25, 26, 27 remain unbet).
 *
 * OUTCOMES PER BASE SPIN (9 units total):
 * - Win on covered Streets (1-9 or 28-36): Street pays 11:1 (+11 units profit on the street,
 *   -8 units lost elsewhere = net +3 units profit).
 * - Push on Dozen 2 (13-24): Dozen pays 2:1 (+6 units profit on dozen, -6 units lost on
 *   streets = net 0 break-even).
 * - Loss on uncovered numbers (0, 00, 10, 11, 12, 25, 26, 27): Full bet lost.
 *
 * BET PROGRESSION:
 * Total units scale across progression levels based on spin outcomes:
 * - Level 0: 1x multiplier  (9 units total)
 * - Level 1: 2x multiplier  (18 units total)
 * - Level 2: 3x multiplier  (27 units total)
 * - Level 3: 4x multiplier  (36 units total)
 * - Level 4: 5x multiplier  (45 units total)  -> Requires 2 consecutive wins to reset
 * - Level 5: 10x multiplier (90 units total)  -> Requires 2 consecutive wins to reset
 * - Level 6: 20x multiplier (180 units total) -> Requires 2 consecutive wins to reset
 * - Level 7: 40x multiplier (360 units total) -> Requires 2 consecutive wins to reset
 *
 * WIN / LOSS / PUSH RULES:
 * - On Push (Dozen 2): Maintain current level and consecutive win count.
 * - On Win:
 *   - At Levels 0 to 3: A single win resets the progression back to Level 0.
 *   - At Levels 4 to 7: Requires 2 consecutive street wins. The first win holds the level;
 *     the second consecutive win resets the progression to Level 0.
 * - On Loss:
 *   - Reset consecutive win counter to 0 and advance to the next progression level (capped at Level 7).
 *
 * THE GOAL:
 * - Target Profit: +100 units / dollars (or session stop-target set by user).
 * - Stop Loss: Recommended bankroll of 765 - 800 units to safely withstand deep progressions.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Progression multiplier ladder as demonstrated by Bet With Mo
  const MULTIPLIERS = [1, 2, 3, 4, 5, 10, 20, 40];

  // 2. Initialize state
  if (state.level === undefined) state.level = 0;
  if (state.consecutiveWins === undefined) state.consecutiveWins = 0;
  if (state.initialBankroll === undefined) state.initialBankroll = bankroll;

  // 3. Process previous spin if history exists
  if (spinHistory && spinHistory.length > 0) {
    const lastResult = spinHistory[spinHistory.length - 1];
    const winningNum = lastResult.winningNumber;

    const isStreetWin =
      (winningNum >= 1 && winningNum <= 9) ||
      (winningNum >= 28 && winningNum <= 36);

    const isPush = winningNum >= 13 && winningNum <= 24;

    if (isPush) {
      // Dozen 2 hit: Net break-even. Maintain current progression level and streak.
    } else if (isStreetWin) {
      // Street hit: Win
      if (state.level <= 3) {
        // Levels 0 to 3 reset immediately on any win
        state.level = 0;
        state.consecutiveWins = 0;
      } else {
        // Levels 4 to 7 require 2 consecutive wins to reset
        state.consecutiveWins += 1;
        if (state.consecutiveWins >= 2) {
          state.level = 0;
          state.consecutiveWins = 0;
        }
      }
    } else {
      // Loss (0, 00, 10, 11, 12, 25, 26, 27)
      state.consecutiveWins = 0;
      if (state.level < MULTIPLIERS.length - 1) {
        state.level += 1;
      }
    }
  }

  // 4. Determine base unit sizes respecting table limits
  // Inside bet (streets) vs Outside bet (dozen = 3 * inside unit)
  let unit = Math.max(
    config.betLimits.min,
    Math.ceil(config.betLimits.minOutside / 3)
  );

  const multiplier = MULTIPLIERS[state.level];

  // Calculate individual bet amounts
  let streetBetAmount = unit * multiplier;
  let dozenBetAmount = unit * 3 * multiplier;

  // Clamp bets to table limits
  streetBetAmount = Math.max(streetBetAmount, config.betLimits.min);
  streetBetAmount = Math.min(streetBetAmount, config.betLimits.max);

  dozenBetAmount = Math.max(dozenBetAmount, config.betLimits.minOutside);
  dozenBetAmount = Math.min(dozenBetAmount, config.betLimits.max);

  // Check if bankroll can afford the full bet setup (6 streets + 1 dozen)
  const totalRequired = streetBetAmount * 6 + dozenBetAmount;
  if (bankroll < totalRequired) {
    // Insufficient funds: stop betting
    return [];
  }

  // 5. Construct Golden Wings bet positions
  // Streets: 1 (1-3), 4 (4-6), 7 (7-9), 28 (28-30), 31 (31-33), 34 (34-36)
  // Dozen: 2 (13-24)
  return [
    { type: 'street', value: 1, amount: streetBetAmount },
    { type: 'street', value: 4, amount: streetBetAmount },
    { type: 'street', value: 7, amount: streetBetAmount },
    { type: 'dozen', value: 2, amount: dozenBetAmount },
    { type: 'street', value: 28, amount: streetBetAmount },
    { type: 'street', value: 31, amount: streetBetAmount },
    { type: 'street', value: 34, amount: streetBetAmount }
  ];
}