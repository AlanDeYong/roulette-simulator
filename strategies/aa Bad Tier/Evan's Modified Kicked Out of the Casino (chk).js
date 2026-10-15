/**
 * Strategy: Evan's Modified "Kicked Out of the Casino"
 * Source: "The Roulette Master" (https://youtu.be/hQepRE3-QV8)
 * 
 * Full Logic:
 * - Monitors recent spin history to compare hits between Column 1 (1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34)
 *   and Column 3 (3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36).
 * - Ignores Column 2 (2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35) and green zeroes when determining dominance.
 * - Places the heavy side on whichever column (Col 1 vs Col 3) has had FEWER hits in recent spins.
 * 
 * Bet Setup & Sizing:
 * - Heavy Side:
 *   - 1 Column bet (2.5x base unit, $25)
 *   - 5 Split bets covering adjacent pairs in the chosen column (2.5x base unit each, $125 total)
 * - Light Side:
 *   - 5 Corner bets hedging the opposite side (1x base unit each, $50 total)
 * - Zero Hedge:
 *   - 1 Straight-up bet on 0 (1x base unit, $10)
 * Total Bet: 21 units ($210 at $10 base unit).
 * 
 * Progression:
 * - Flat betting across spins.
 * 
 * Goal:
 * - Target profit: +$500 to +$1,000 per session.
 * - Recommended session bankroll: $2,000.
 */

function bet(spinHistory, bankroll, config, state, utils) {
  const COL_1 = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];
  const COL_3 = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36];

  // Base unit sizing scaled to table limits
  const baseUnit = Math.max(config.betLimits.min || 10, 10);
  const heavyUnit = Math.round(baseUnit * 2.5); // $25 when base is $10

  // Total required bankroll check: 5 splits (heavy) + 1 column (heavy) + 5 corners (base) + 1 zero (base)
  const totalCost = (6 * heavyUnit) + (6 * baseUnit);
  if (bankroll < totalCost) {
    return [];
  }

  // Determine dominant column by looking back through history
  let col1Hits = 0;
  let col3Hits = 0;
  let lookback = 0;

  for (let i = spinHistory.length - 1; i >= 0 && lookback < 5; i--) {
    const num = spinHistory[i].winningNumber;
    if (COL_1.includes(num)) {
      col1Hits++;
      lookback++;
    } else if (COL_3.includes(num)) {
      col3Hits++;
      lookback++;
    }
  }

  // If tied after 5 decisions, look further back to break tie
  if (col1Hits === col3Hits && spinHistory.length > 5) {
    for (let i = spinHistory.length - 6; i >= 0; i--) {
      const num = spinHistory[i].winningNumber;
      if (COL_1.includes(num)) {
        col1Hits++;
        break;
      } else if (COL_3.includes(num)) {
        col3Hits++;
        break;
      }
    }
  }

  // Bet against the dominant column; default to Column 1 if no history
  const targetHeavyCol = (col3Hits > col1Hits) ? 1 : 3;

  const clampInside = (amt) => Math.min(Math.max(amt, config.betLimits.min), config.betLimits.max);
  const clampOutside = (amt) => Math.min(Math.max(amt, config.betLimits.minOutside), config.betLimits.max);

  const bets = [];

  // Zero hedge
  bets.push({
    type: 'number',
    value: 0,
    amount: clampInside(baseUnit)
  });

  if (targetHeavyCol === 1) {
    // Column 1 Outside Bet
    bets.push({
      type: 'column',
      value: 1,
      amount: clampOutside(heavyUnit)
    });

    // 5 Splits along Column 1
    const splitsCol1 = [[4, 7], [10, 13], [16, 19], [22, 25], [28, 31]];
    splitsCol1.forEach(pair => {
      bets.push({
        type: 'split',
        value: pair,
        amount: clampInside(heavyUnit)
      });
    });

    // 5 Hedging Corners on Column 2 & 3
    const cornersCol3 = [5, 11, 17, 23, 29];
    cornersCol3.forEach(topLeft => {
      bets.push({
        type: 'corner',
        value: topLeft,
        amount: clampInside(baseUnit)
      });
    });

  } else {
    // Column 3 Outside Bet
    bets.push({
      type: 'column',
      value: 3,
      amount: clampOutside(heavyUnit)
    });

    // 5 Splits along Column 3
    const splitsCol3 = [[6, 9], [12, 15], [18, 21], [24, 27], [30, 33]];
    splitsCol3.forEach(pair => {
      bets.push({
        type: 'split',
        value: pair,
        amount: clampInside(heavyUnit)
      });
    });

    // 5 Hedging Corners on Column 1 & 2
    const cornersCol1 = [4, 10, 16, 22, 28];
    cornersCol1.forEach(topLeft => {
      bets.push({
        type: 'corner',
        value: topLeft,
        amount: clampInside(baseUnit)
      });
    });
  }

  return bets;
}