/**
 * Strategy: Indestructible Low Roller Roulette System (by Mark Gannon / modified from the 1027)
 * Source: https://youtu.be/W_-nzAsMXmI (The Roulette Master)
 * 
 * Full Logic in Detail:
 * - Table coverage covers 18 numbers across two double streets (lines) and the 2nd Dozen:
 *   1. Line 10-15 (starts at 10)
 *   2. Line 22-27 (starts at 22)
 *   3. 2nd Dozen (numbers 13-24)
 * - Notice that numbers 13, 14, 15, 22, 23, and 24 overlap ("Jackpot Numbers"), yielding payouts
 *   from both the double street (5:1) and the dozen (2:1).
 * 
 * Full Bet Progression in Detail:
 * - Base bet ratio is 1 unit on Line 10, 1 unit on Line 22, and 2 units on 2nd Dozen (Total: 4 units).
 * - Tracks peak session profit reached so far.
 * - If the current session profit is greater than the previous peak profit (new session high):
 *   - Update peak profit.
 *   - Reset progression multiplier to 1 (base bet).
 * - If current session profit is LESS THAN or EQUAL to peak profit:
 *   - Increase the bet size after EVERY spin (win or loss) by adding 1 base set (+1 unit to Line 10,
 *     +1 unit to Line 22, and +2 units to 2nd Dozen) until a new session profit peak is reached.
 * 
 * The Goal:
 * - Steady grind with high coverage (approx. 48.6% on European, 47.4% on American), escalating
 *   methodically through drawdown runs and resetting immediately upon locking in fresh net profits.
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // Initialize persistent session state
  if (state.peakProfit === undefined) {
    state.startingBankroll = bankroll;
    state.peakProfit = 0;
    state.level = 1;
    state.lastTotalBet = 0;
  }

  // Calculate current session profit
  const currentProfit = bankroll - state.startingBankroll;

  if (spinHistory && spinHistory.length > 0) {
    // Check if we reached a new session profit peak
    if (currentProfit > state.peakProfit) {
      state.peakProfit = currentProfit;
      state.level = 1; // Reset to base upon achieving a new high
    } else {
      // Escalation rule: increase by 1 base set on EVERY spin until in new peak profit
      state.level += 1;
    }
  }

  // Base unit amounts
  const insideMin = config.betLimits.min;
  const outsideMin = config.betLimits.minOutside;

  // Sizing per progression level:
  // Level 1: 1 inside min on line 10, 1 inside min on line 22, 2 outside min (or 2x inside min) on dozen 2
  let lineUnit = insideMin * state.level;
  let dozenUnit = Math.max(outsideMin, insideMin * 2) * state.level;

  // Clamp bets to table limits
  lineUnit = Math.max(lineUnit, config.betLimits.min);
  lineUnit = Math.min(lineUnit, config.betLimits.max);

  dozenUnit = Math.max(dozenUnit, config.betLimits.minOutside);
  dozenUnit = Math.min(dozenUnit, config.betLimits.max);

  const totalRequired = (lineUnit * 2) + dozenUnit;

  // Bankroll protection check
  if (bankroll < totalRequired) {
    console.log(`Insufficient bankroll (${bankroll}) for required bet (${totalRequired}).`);
    return [];
  }

  state.lastTotalBet = totalRequired;

  return [
    { type: 'line', value: 10, amount: lineUnit },
    { type: 'line', value: 22, amount: lineUnit },
    { type: 'dozen', value: 2, amount: dozenUnit }
  ];
}