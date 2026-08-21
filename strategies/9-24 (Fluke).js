/**
 * Roulette Strategy Implementation
 * 
 * Source: https://youtu.be/AKAZsZE5CF8
 * Channel Name: The Lucky Felt
 * Strategy Name: The 9/24 Strategy ("Turn The Roulette Table Into An ATM")
 * 
 * The Full Logic in details:
 * - Triggers / Conditions: Active on every spin.
 * - Bet Placement: The strategy covers 24 numbers across the layout using 9 bet units 
 *   placed across splits/corners/streets to establish a ~64.8% win coverage on the wheel.
 * - Layout Coverage: 
 *   Places inside bets (splits/corners) across the layout targeting 24 distinct numbers, 
 *   utilizing 9 bet units per base level.
 * 
 * The Full Bet Progression in details:
 * - Base Unit: Derived from config.betLimits.min.
 * - Progression Mode: Escalation after net losses.
 *   - On a loss (net balance decrease), increment progression level by 1.
 *   - On a win (net balance increase), decrease progression level by 1 or maintain.
 *   - Clamped between config.betLimits.min and config.betLimits.max.
 * 
 * The Goal:
 * - Target Profit: +10 base units over starting/peak bankroll.
 * - Reset Condition: Do not reset state progression until session peak profit target is met.
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Base Units & Limits
  const minInside = config.betLimits.min || 2;
  const maxBet = config.betLimits.max || 500;

  // 2. Persistent State Initialization
  if (state.progression === undefined) {
    state.progression = 1;
    state.initialBankroll = bankroll;
    state.lastBankroll = bankroll;
    state.peakBankroll = bankroll;
  }

  // Track Peak Bankroll (no reset until session peak profit reached)
  if (bankroll > state.peakBankroll) {
    state.peakBankroll = bankroll;
  }

  // 3. Process Spin Result
  if (spinHistory.length > 0) {
    const netProfit = bankroll - state.lastBankroll;

    if (netProfit < 0) {
      // Increase progression step on loss
      state.progression += 1;
    } else if (netProfit > 0) {
      // Decrease progression on win, but do not fully reset unless peak profit achieved
      if (bankroll >= state.peakBankroll) {
        state.progression = 1;
      } else {
        state.progression = Math.max(1, state.progression - 1);
      }
    }
  }

  state.lastBankroll = bankroll;

  // 4. Calculate Scaled Bet Unit
  let unit = minInside * state.progression;
  unit = Math.max(minInside, Math.min(maxBet, unit));

  // 5. Place 9 Inside Bets Covering 24 Numbers
  // (9 Corner/Split placements to cover 24 total distinct roulette numbers)
  const bets = [
    { type: 'corner', value: 1, amount: unit },   // covers 1, 2, 4, 5
    { type: 'corner', value: 7, amount: unit },   // covers 7, 8, 10, 11
    { type: 'corner', value: 13, amount: unit },  // covers 13, 14, 16, 17
    { type: 'corner', value: 19, amount: unit },  // covers 19, 20, 22, 23
    { type: 'corner', value: 25, amount: unit },  // covers 25, 26, 28, 29
    { type: 'corner', value: 31, amount: unit },  // covers 31, 32, 34, 35
    { type: 'split', value: [3, 6], amount: unit },   // covers 3, 6
    { type: 'split', value: [12, 15], amount: unit }, // covers 12, 15
    { type: 'split', value: [21, 24], amount: unit }  // covers 21, 24
  ];

  return bets;
}