/**
 * Strategy: Cruising Da Lanes
 * Source: https://youtu.be/Qow8oa2D_E0 (WillVegas)
 * Creator: David Elliott
 * * Logic:
 * The strategy covers 26 numbers using inside bets around specific "lanes" or zones.
 * - 1 unit is placed on 0.
 * - 1 unit is placed on 00 (if playing on an American wheel).
 * - 3 units are placed on 8 specific streets: 1, 7, 10, 16, 19, 25, 28, and 34.
 * * A win on any of these numbers results in a net profit of 10 units. A loss 
 * costs the entire 26-unit bet (or 25 units on a European wheel).
 * * Bet Progression:
 * Flat betting. The bet size never changes after a win or a loss. The strategy 
 * relies entirely on the extensive 26-number board coverage to slowly build 
 * profit and recover from losses without risking large multiplier swings.
 * * Goal:
 * Target profit is 30 to 50 units (e.g., $30-$50 on a $300 bankroll).
 * There is no strict stop-loss defined; the strategy continues flat betting.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Determine base unit using the minimum inside bet limit
  const baseUnit = config.betLimits.min;

  // 2. Calculate bet amounts (1 unit for greens, 3 units for streets)
  let greenAmt = baseUnit;
  let streetAmt = baseUnit * 3;

  // 3. Clamp amounts to absolute max limits to respect constraints
  greenAmt = Math.min(greenAmt, config.betLimits.max);
  streetAmt = Math.min(streetAmt, config.betLimits.max);

  let bets = [];

  // 4. Place Green Bets
  bets.push({ type: 'number', value: 0, amount: greenAmt });
  if (config.tableType === 'american') {
    bets.push({ type: 'number', value: '00', amount: greenAmt }); // '00' string handles American double zero
  }

  // 5. Place Street Bets
  const targetStreets = [1, 7, 10, 16, 19, 25, 28, 34];
  for (let i = 0; i < targetStreets.length; i++) {
    bets.push({ type: 'street', value: targetStreets[i], amount: streetAmt });
  }

  // 6. Verify sufficient bankroll for the spread
  const totalBetAmount = bets.reduce((sum, b) => sum + b.amount, 0);
  if (bankroll < totalBetAmount) {
    return []; // Insufficient bankroll to place the flat bet spread, stop betting
  }

  return bets;
}