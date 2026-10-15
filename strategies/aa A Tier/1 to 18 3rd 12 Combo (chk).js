/**
 * Source: https://youtu.be/Mo4u7xWeglg ("Mastering The Wheel")
 * System Name: "1 to 18 3rd 12 Combo"
 * 
 * Full Logic in Detail:
 * - A 31-number coverage system (83.8% table coverage on European wheel) that places bets across:
 *   1. Low (1-18) - Outside bet
 *   2. 3rd Dozen (25-36) - Outside dozen bet
 *   3. Straight up on 0 - Inside single number bet
 * - Numbers 19-24 are the only losing numbers (6 numbers out of 37).
 * - On winning spins:
 *   - Any number 1-18: Low pays 1:1, covering losses on 3rd Dozen and 0 for a +1 base unit net profit.
 *   - Any number 25-36: 3rd Dozen pays 2:1, covering losses on Low and 0 for a +1 base unit net profit.
 *   - Number 0: Single number pays 35:1 for a large windfall profit (+25 base units).
 * - If bankroll hits a new session high (or target profit), progression immediately resets to Level 1.
 * 
 * Full Bet Progression in Detail (5 Levels):
 * Base ratio per level:
 * - Level 1: Low = 6 units, 3rd Dozen = 4 units, Number 0 = 1 unit (Total = 11 units, $110 at $10/unit)
 * - Level 2: Low = 18 units, 3rd Dozen = 12 units, Number 0 = 2 units (Total = 32 units, $320)
 * - Level 3: Low = 30 units, 3rd Dozen = 20 units, Number 0 = 3 units (Total = 53 units, $530)
 * - Level 4: Low = 42 units, 3rd Dozen = 28 units, Number 0 = 4 units (Total = 74 units, $740)
 * - Level 5: Low = 54 units, 3rd Dozen = 36 units, Number 0 = 5 units (Total = 95 units, $950)
 * 
 * Total Progression Bankroll Required: 265 units ($2,650 at $10 unit).
 * 
 * Transitions:
 * - On Win:
 *   - Level 1: Stays at Level 1.
 *   - Level 2: Requires 3 consecutive wins to recover and reset to Level 1.
 *   - Level 3: Requires 4 consecutive wins to recover and reset to Level 1.
 *   - Level 4: Requires 5 consecutive wins to recover and reset to Level 1.
 *   - Level 5: Requires 5 consecutive wins to recover and reset to Level 1.
 *   - Immediate Reset: If at any point the bankroll reaches or exceeds a new session peak, reset to Level 1.
 * - On Loss:
 *   - Move to next level (Level 1 -> 2 -> 3 -> 4 -> 5).
 *   - If Level 5 loses, stop betting (stop-loss reached).
 * 
 * The Goal:
 * - Profit Target: 5% of starting bankroll (e.g., +$130 on $2,650 bankroll / +13 units).
 * - Stop Loss: Complete loss of the 5-step progression ($2,650 / 265 units).
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // Initialize state on first run
  if (!state.initialized) {
    state.initialized = true;
    state.startingBankroll = bankroll;
    state.peakBankroll = bankroll;
    state.targetProfit = config.startingBankroll ? config.startingBankroll * 100.05 : 130;
    state.currentLevel = 1;
    state.consecutiveWinsAtLevel = 0;
    state.stopped = false;
  }

  if (state.stopped) {
    return [];
  }

  // Update peak bankroll and check targets
  if (bankroll > state.peakBankroll) {
    state.peakBankroll = bankroll;
    state.currentLevel = 1;
    state.consecutiveWinsAtLevel = 0;
  }

  // Stop condition: Target achieved (5% gain)
  if (bankroll >= state.startingBankroll + state.targetProfit) {
    state.stopped = true;
    return [];
  }

  // Evaluate previous spin outcome if history exists
  if (spinHistory && spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const winningNum = lastSpin.winningNumber;

    // Check if winning number hit our coverage (1-18, 25-36, or 0)
    const isWin = (winningNum >= 1 && winningNum <= 18) ||
                  (winningNum >= 25 && winningNum <= 36) ||
                  (winningNum === 0);

    if (isWin) {
      state.consecutiveWinsAtLevel++;
      const requiredWins = {
        1: 1,
        2: 3,
        3: 4,
        4: 5,
        5: 5
      }[state.currentLevel] || 1;

      if (state.currentLevel === 1) {
        state.consecutiveWinsAtLevel = 0;
      } else if (state.consecutiveWinsAtLevel >= requiredWins) {
        // Recovery complete, reset to Level 1
        state.currentLevel = 1;
        state.consecutiveWinsAtLevel = 0;
      }
    } else {
      // Missed (numbers 19-24)
      state.consecutiveWinsAtLevel = 0;
      if (state.currentLevel < 5) {
        state.currentLevel++;
      } else {
        // Exhausted level 5 - stop loss triggered
        state.stopped = true;
        return [];
      }
    }
  }

  // Progression Multipliers: [lowMultiplier, dozenMultiplier, zeroMultiplier]
  // Base unit sizing ratio: Low (6 units), Dozen 3 (4 units), Zero (1 unit)
  const progressionTable = {
    1: { low: 6, dozen: 4, zero: 1 },
    2: { low: 18, dozen: 12, zero: 2 },
    3: { low: 30, dozen: 20, zero: 3 },
    4: { low: 42, dozen: 28, zero: 4 },
    5: { low: 54, dozen: 36, zero: 5 }
  };

  const levelConfig = progressionTable[state.currentLevel];
  const unit = config.betLimits ? config.betLimits.min : 1;
  const unitOutside = config.betLimits ? config.betLimits.minOutside : 1;

  // Calculate and clamp bet amounts
  let lowAmount = unitOutside * levelConfig.low;
  let dozenAmount = unitOutside * levelConfig.dozen;
  let zeroAmount = unit * levelConfig.zero;

  // Apply table limits
  if (config.betLimits) {
    lowAmount = Math.max(lowAmount, config.betLimits.minOutside);
    lowAmount = Math.min(lowAmount, config.betLimits.max);

    dozenAmount = Math.max(dozenAmount, config.betLimits.minOutside);
    dozenAmount = Math.min(dozenAmount, config.betLimits.max);

    zeroAmount = Math.max(zeroAmount, config.betLimits.min);
    zeroAmount = Math.min(zeroAmount, config.betLimits.max);
  }

  const totalRequired = lowAmount + dozenAmount + zeroAmount;
  if (bankroll < totalRequired) {
    state.stopped = true;
    return [];
  }

  return [
    { type: 'low', amount: lowAmount },
    { type: 'dozen', value: 3, amount: dozenAmount },
    { type: 'number', value: 0, amount: zeroAmount }
  ];
}