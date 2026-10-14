/**
 * Strategy: Hammer Time Roulette System
 * Source: https://youtu.be/HFmcbj3N7Tk (Bet With Mo)
 *
 * Full Logic in Detail:
 * - The strategy utilizes horizontal split bets laid out across the tableau forming
 *   a hammer shape that expands deeper into the numbers on consecutive misses.
 * - The base "Hammer" covers numbers 1-14 with 8 splits (6 forming the head across
 *   columns 1-3 and 2 forming the handle along the center line).
 * - On losses, the hammer progressively extends further along the layout:
 *   - Level 1: 8 splits @ 1 unit = 8 units ($8)
 *   - Level 2: 14 splits @ 1 unit = 14 units ($14)
 *   - Level 3: 20 splits @ 2 units = 40 units ($40)
 *   - Level 4: 26 splits @ 2 units = 52 units ($52)
 *   - Level 5: 26 splits @ 4 units = 104 units ($104)
 *   - Level 6: 26 splits @ 8 units = 208 units ($208)
 * - Required Bankroll: Exactly 426 units ($8 + $14 + $40 + $52 + $104 + $208).
 *
 * Full Bet Progression in Detail:
 * - Loss: Advance level (1 -> 2 -> 3 -> 4 -> 5 -> 6).
 * - Win:
 *   - If bankroll >= session peak, reset immediately to Level 1.
 *   - If recovering from high martingale levels (Level 6 or 5) and below peak, step down one level.
 *
 * The Goal:
 * - Lock in cumulative profits whenever a new session peak is established.
 * - Target profit: ~$100–$200+ per session.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // All 26 split pairs organized by tier
  const SPLIT_TIERS = {
    level1: [
      [1, 4], [2, 5], [3, 6],
      [4, 7], [5, 8], [6, 9],
      [8, 11], [11, 14]
    ],
    level2: [
      [9, 12], [12, 15],
      [7, 10], [10, 13],
      [14, 17], [17, 20]
    ],
    level3: [
      [15, 18], [18, 21],
      [13, 16], [16, 19],
      [20, 23], [23, 26]
    ],
    level4: [
      [21, 24], [24, 27],
      [19, 22], [22, 25],
      [26, 29], [29, 32]
    ]
  };

  const LEVEL_CONFIGS = [
    { count: 8, multiplier: 1 },   // Level 1: 8 splits * 1 = 8 units
    { count: 14, multiplier: 1 },  // Level 2: 14 splits * 1 = 14 units
    { count: 20, multiplier: 2 },  // Level 3: 20 splits * 2 = 40 units
    { count: 26, multiplier: 2 },  // Level 4: 26 splits * 2 = 52 units
    { count: 26, multiplier: 4 },  // Level 5: 26 splits * 4 = 104 units
    { count: 26, multiplier: 8 }   // Level 6: 26 splits * 8 = 208 units
  ];

  // Initialize persistent state
  if (!state.initialized) {
    state.initialized = true;
    state.level = 0; // Index 0 to 5 (Levels 1 to 6)
    state.sessionHigh = bankroll;
    state.targetProfit = 20000 * config.betLimits.min;
    state.lastBankroll = bankroll;
  }

  // Update session high and handle win/loss transitions
  if (spinHistory && spinHistory.length > 0) {
    const isWin = bankroll > state.lastBankroll;

    if (bankroll > state.sessionHigh) {
      state.sessionHigh = bankroll;
    }

    if (isWin) {
      if (bankroll >= state.sessionHigh) {
        state.level = 0; // Reset to Level 1 upon reaching new high
      } else if (state.level >= 4) {
        // Step down one level when recovering from high martingale stages
        state.level = Math.max(0, state.level - 1);
      }
    } else {
      // Progress to next level on loss
      if (state.level < LEVEL_CONFIGS.length - 1) {
        state.level += 1;
      }
    }
  }

  state.lastBankroll = bankroll;

  // Session stop criteria
  if (bankroll >= config.startingBankroll + state.targetProfit) {
    return [];
  }

  const currentLevelConfig = LEVEL_CONFIGS[state.level];
  const unit = config.betLimits.min;
  let splitAmount = unit * currentLevelConfig.multiplier;
  splitAmount = Math.max(splitAmount, config.betLimits.min);
  splitAmount = Math.min(splitAmount, config.betLimits.max);

  // Compile active splits up to the current level's count
  const allSplits = [
    ...SPLIT_TIERS.level1,
    ...SPLIT_TIERS.level2,
    ...SPLIT_TIERS.level3,
    ...SPLIT_TIERS.level4
  ];

  const activeSplits = allSplits.slice(0, currentLevelConfig.count);
  const totalCost = activeSplits.length * splitAmount;

  // Check if bankroll can afford the round
  if (bankroll < totalCost) {
    return [];
  }

  return activeSplits.map(pair => ({
    type: 'split',
    value: pair,
    amount: splitAmount
  }));
}