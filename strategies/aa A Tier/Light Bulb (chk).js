/**
 * ============================================================================
 * STRATEGY: The Light Bulb Roulette Strategy
 * SOURCE:
 *   - YouTube Channel: The Roulette Master
 *   - Video URL: https://youtu.be/WTbpwdNtZsU
 *   - Strategy Creator: Rick (subscriber submission)
 *
 * FULL LOGIC & BOARD PLACEMENTS:
 *   The Light Bulb Strategy is an 84.21% wheel-coverage system (32 of 38 numbers
 *   on an American double-zero wheel). Its foundational premise is that 27 of
 *   these numbers form a continuous, uninterrupted physical arc on the wheel
 *   without a single gap.
 *
 *   Positions Covered (Total 32 numbers):
 *     1. First Dozen (numbers 1-12)   -> Outside Dozen Bet
 *     2. Third Dozen (numbers 25-36)  -> Outside Dozen Bet
 *     3. Inside Straight-Up Numbers   -> 0, '00', 13, 15, 17, 20, 22, 24
 *        (Note: On European single-zero wheels, '00' is omitted).
 *     Uncovered numbers: 14, 16, 18, 19, 21, 23 (only 6 numbers).
 *
 *   Betting Ratio & Mathematical Harmony:
 *     - Inside Straight-Up Bet = 1 unit each (8 bets = 8 units)
 *     - Outside Dozen Bets     = 12 units each (2 bets = 24 units)
 *     - Total Base Bet         = 32 units (e.g., $160 at $5/unit).
 *     Every winning spin—whether hitting Dozen 1, Dozen 3, or any of the 8
 *     straight-up numbers—pays out exactly +4 units net profit (+24 units on a
 *     dozen win minus 12-dozen and 8-inside bets; +35 units on a straight-up
 *     win minus 24-dozen and 7-inside bets).
 *
 * FULL BET PROGRESSION:
 *   - Initial Bet: Start at Level 1 (1x base units).
 *   - After a Loss: Increase bet size by 1 base unit for every position
 *     (Level = Level + 1: 1x -> 2x -> 3x -> 4x -> 5x...).
 *   - After a Win:
 *     - If at Level 1: Flat bet at Level 1 and accumulate profit.
 *     - If in a recovery cycle (Level > 1): Keep betting at the current level
 *       to rapidly regain ground (+4 units * Level per win). Once the bankroll
 *       recovers back to the cycle starting peak, immediately reset to Level 1.
 *
 * GOAL & STOP LOSS:
 *   - Goal: Capitalize on consecutive wins across 32 numbers, systematically
 *     recovering losses via unit step-ups before resetting to baseline.
 *   - Stop Condition: Stop betting if the bankroll cannot cover the minimum bets.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Initialize State
  if (state.level === undefined) {
    state.level = 1;
    state.cycleStartBankroll = bankroll;
    state.lastBankroll = bankroll;
  }

  const isAmerican = config.tableType !== 'european';

  // 2. Define Straight-Up Target Numbers
  const straightUpNumbers = isAmerican
    ? [0, '00', 13, 15, 17, 20, 22, 24]
    : [0, 13, 15, 17, 20, 22, 24];

  // 3. Process Previous Spin Result (if history exists)
  if (spinHistory && spinHistory.length > 0) {
    const lastResult = spinHistory[spinHistory.length - 1];
    const winningNum = lastResult.winningNumber;

    // Check if the winning number was covered by our bets
    const isDozen1 = typeof winningNum === 'number' && winningNum >= 1 && winningNum <= 12;
    const isDozen3 = typeof winningNum === 'number' && winningNum >= 25 && winningNum <= 36;
    const isStraightUp = straightUpNumbers.some((n) => String(n) === String(winningNum));

    const won = isDozen1 || isDozen3 || isStraightUp;

    if (won) {
      if (state.level > 1) {
        // In recovery: if we reached or exceeded the pre-loss bankroll, reset to base level
        if (bankroll >= state.cycleStartBankroll) {
          state.level = 1;
          state.cycleStartBankroll = bankroll;
        }
      } else {
        // At base level: update bankroll benchmark
        state.cycleStartBankroll = bankroll;
      }
    } else {
      // On Loss: increment progression level by 1
      state.level += 1;
    }
  }

  // 4. Calculate Unit Sizes Respecting Limits
  // Base unit calculation: 1 inside unit, 12 outside units
  const minInside = config.betLimits.min;
  const minOutside = config.betLimits.minOutside;
  const maxBet = config.betLimits.max;

  // Ensure inside unit satisfies minInside and 12 * unit satisfies minOutside
  let baseUnit = Math.max(minInside, Math.ceil(minOutside / 12));

  // Determine multiplier according to progression level
  const multiplier = Math.max(1, state.level);

  // Compute unscaled bet amounts
  let insideAmount = baseUnit * multiplier;
  let dozenAmount = (baseUnit * 12) * multiplier;

  // Clamp amounts to table limits
  insideAmount = Math.max(minInside, Math.min(maxBet, insideAmount));
  dozenAmount = Math.max(minOutside, Math.min(maxBet, dozenAmount));

  // Calculate total bet required for this round
  const totalBetRequired = (dozenAmount * 2) + (insideAmount * straightUpNumbers.length);

  // Bankroll sufficiency check
  if (bankroll < totalBetRequired) {
    // Attempt fallback to base level if bankroll cannot afford elevated progression
    if (state.level > 1) {
      state.level = 1;
      const baseInside = Math.max(minInside, Math.min(maxBet, baseUnit));
      const baseDozen = Math.max(minOutside, Math.min(maxBet, baseUnit * 12));
      const baseTotal = (baseDozen * 2) + (baseInside * straightUpNumbers.length);

      if (bankroll < baseTotal) {
        return []; // Bankroll depleted below minimum full placement
      }
      insideAmount = baseInside;
      dozenAmount = baseDozen;
    } else {
      return [];
    }
  }

  // 5. Construct and Return the Bet Objects
  const bets = [
    { type: 'dozen', value: 1, amount: dozenAmount },
    { type: 'dozen', value: 3, amount: dozenAmount }
  ];

  for (let i = 0; i < straightUpNumbers.length; i++) {
    bets.push({
      type: 'number',
      value: straightUpNumbers[i],
      amount: insideAmount
    });
  }

  state.lastBankroll = bankroll;
  return bets;
}