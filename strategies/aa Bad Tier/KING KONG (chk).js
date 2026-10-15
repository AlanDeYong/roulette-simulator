/**
 * KING KONG ROULETTE STRATEGY
 *
 * Source:
 * - YouTube Channel: Bet With Mo
 * - Video URL: https://youtu.be/6uKO-j6i6I0
 *
 * Full Logic in Detail:
 * - System Name: "King Kong"
 * - Entry Trigger: Placed continuously on every spin.
 * - Table Coverage:
 *     1. 3rd Column (numbers 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36)
 *     2. Straight-up bets placed on black numbers located OUTSIDE the 3rd Column.
 *        The candidate black numbers are selected in numerical order:
 *        [2, 4, 8, 10, 11, 13, 17, 20, 22, 26, 28, 29, 31, 35].
 *
 * Full Bet Progression in Detail (Scaled to Base Unit):
 * - Level 1 (Base - 6 units):
 *     - Col 3: 4 units
 *     - 2 Numbers ([2, 4]): 1 unit each
 * - Level 2 (12 units):
 *     - Col 3: 8 units
 *     - 4 Numbers ([2, 4, 8, 10]): 1 unit each
 * - Level 3 (36 units):
 *     - Col 3: 24 units
 *     - 6 Numbers ([2, 4, 8, 10, 11, 13]): 2 units each
 * - Level 4 (48 units):
 *     - Col 3: 32 units
 *     - 8 Numbers ([2, 4, 8, 10, 11, 13, 17, 20]): 2 units each
 * - Level 5 (120 units):
 *     - Col 3: 80 units
 *     - 10 Numbers ([2, 4, 8, 10, 11, 13, 17, 20, 22, 26]): 4 units each
 * - Level 6 (140 units):
 *     - Col 3: 90 units
 *     - 10 Numbers ([2, 4, 8, 10, 11, 13, 17, 20, 22, 26]): 5 units each
 * - Level 7 (280 units):
 *     - Col 3: 180 units
 *     - 10 Numbers ([2, 4, 8, 10, 11, 13, 17, 20, 22, 26]): 10 units each
 *
 * Win Handling:
 * - Whenever bankroll reaches or surpasses sessionHigh, reset to Level 1.
 * - If a win occurs but bankroll remains below sessionHigh:
 *     - If at Level 6 or 7, drop back to Level 5 (120 units).
 *     - Otherwise, repeat the current winning level.
 *
 * The Goal:
 * - Bankroll recovery and steady accumulation toward session profit milestones.
 * - Recommended bankroll: 642 base units.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  const BLACK_OUTSIDE_COL3 = [2, 4, 8, 10, 11, 13, 17, 20, 22, 26, 28, 29, 31, 35];

  const LEVELS = [
    { colMult: 4, numCount: 2, numUnit: 1 },    // L1: 6 units
    { colMult: 8, numCount: 4, numUnit: 1 },    // L2: 12 units
    { colMult: 24, numCount: 6, numUnit: 2 },   // L3: 36 units
    { colMult: 32, numCount: 8, numUnit: 2 },   // L4: 48 units
    { colMult: 80, numCount: 10, numUnit: 4 },  // L5: 120 units
    { colMult: 90, numCount: 10, numUnit: 5 },  // L6: 140 units
    { colMult: 180, numCount: 10, numUnit: 10 } // L7: 280 units
  ];

  // Initialize persistent state
  if (!state.initialized) {
    state.initialized = true;
    state.level = 0;
    state.sessionHigh = bankroll;
    state.lastBankroll = bankroll;
  }

  // Update session high
  if (bankroll > state.sessionHigh) {
    state.sessionHigh = bankroll;
  }

  // Evaluate outcome from previous spin
  if (spinHistory && spinHistory.length > 0) {
    const netLastSpin = bankroll - state.lastBankroll;

    if (netLastSpin > 0) {
      // Won last spin
      if (bankroll >= state.sessionHigh) {
        state.level = 0; // Reset to base
      } else {
        // Drop down if recovering from deep progression (Levels 6 or 7)
        if (state.level >= 5) {
          state.level = 4; // Drop back to Level 5 (120 units)
        }
        // Otherwise repeat current level to reach session high
      }
    } else if (netLastSpin < 0) {
      // Lost last spin -> advance progression
      if (state.level < LEVELS.length - 1) {
        state.level += 1;
      } else {
        state.level = 0; // Bankroll preservation reset if beyond Level 7
      }
    }
  }

  state.lastBankroll = bankroll;

  const currentLevelConfig = LEVELS[state.level];
  const unit = config.betLimits.min;
  const outsideMin = config.betLimits.minOutside;
  const maxLimit = config.betLimits.max;

  // Calculate 3rd Column bet amount
  let colAmount = unit * currentLevelConfig.colMult;
  colAmount = Math.max(colAmount, outsideMin);
  colAmount = Math.min(colAmount, maxLimit);

  // Calculate Straight-up bet amount
  let straightAmount = unit * currentLevelConfig.numUnit;
  straightAmount = Math.max(straightAmount, unit);
  straightAmount = Math.min(straightAmount, maxLimit);

  const selectedNumbers = BLACK_OUTSIDE_COL3.slice(0, currentLevelConfig.numCount);
  const totalRequired = colAmount + (straightAmount * selectedNumbers.length);

  // Check bankroll availability
  if (bankroll < totalRequired) {
    return [];
  }

  const bets = [];

  // 1. Column 3 bet
  bets.push({
    type: 'column',
    value: 3,
    amount: colAmount
  });

  // 2. Straight-up black number bets
  for (let i = 0; i < selectedNumbers.length; i++) {
    bets.push({
      type: 'number',
      value: selectedNumbers[i],
      amount: straightAmount
    });
  }

  return bets;
}