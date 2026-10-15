/**
 * ============================================================================
 * ROULETTE STRATEGY: Number Family Cluster System (1-2-7 / 4-5-8 / 3-6-9)
 * ============================================================================
 * Source:
 *   - Video: "Double Zeros Roulette - Understand Patterns Where Ball Will Land Next"
 *   - URL: https://youtu.be/Ys_jQhBXTIw
 *   - Channel: Native Digital Product
 *
 * Full Logic & Trigger Conditions:
 *   - The strategy categorizes roulette numbers (1-36) into single-digit "digital root"
 *     families based on adding the digits until a single digit (1-9) is obtained:
 *       Family 1: [1, 10, 19, 28]      Family 2: [2, 11, 20, 29]      Family 3: [3, 12, 21, 30]
 *       Family 4: [4, 13, 22, 31]      Family 5: [5, 14, 23, 32]      Family 6: [6, 15, 24, 33]
 *       Family 7: [7, 16, 25, 34]      Family 8: [8, 17, 26, 35]      Family 9: [9, 18, 27, 36]
 *   - These 9 families are combined into three macro-groups representing wheel sectors:
 *       - Group '127': Families 1, 2, and 7 (12 numbers total)
 *       - Group '458': Families 4, 5, and 8 (12 numbers total)
 *       - Group '369': Families 3, 6, and 9 (12 numbers total)
 *   - Trigger: Observe the last winning number:
 *       - Compute the digital root of the winning number.
 *       - If root is 1, 2, or 7 -> Target Group 1-2-7.
 *       - If root is 4, 5, or 8 -> Target Group 4-5-8.
 *       - If root is 3, 6, or 9 -> Target Group 3-6-9.
 *       - If 0 or 00 hits, repeat the last targeted family group.
 *
 * Bet Progression:
 *   - 12 straight-up inside bets are placed covering the target group.
 *   - Base bet per number is `config.betLimits.min`.
 *   - Progression rule:
 *       - On Win: Reset multiplier to 1 unit per number.
 *       - On Loss: Increase unit multiplier after consecutive misses according to
 *         `config.incrementMode` ('fixed' adds `config.minIncrementalBet`, 'base' adds base unit).
 *       - Bet size is strictly clamped between `config.betLimits.min` and `config.betLimits.max`.
 *
 * Goals & Stop Conditions:
 *   - Target Profit: Stop betting once net profit reaches +20% of `config.startingBankroll`.
 *   - Stop-Loss: Stop betting if bankroll drops 30% below `config.startingBankroll` or if
 *     bankroll is insufficient to place the required 12 inside bets.
 * ============================================================================
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Minimum spin history check
  if (!spinHistory || spinHistory.length === 0) {
    return [];
  }

  // 2. Define Macro Family Groups (12 numbers each)
  const GROUPS = {
    '127': [1, 10, 19, 28, 2, 11, 20, 29, 7, 16, 25, 34],
    '458': [4, 13, 22, 31, 5, 14, 23, 32, 8, 17, 26, 35],
    '369': [3, 12, 21, 30, 6, 15, 24, 33, 9, 18, 27, 36]
  };

  // Helper function to calculate digital root of a number (1-9)
  function getDigitalRoot(n) {
    if (typeof n !== 'number' || n <= 0) return 0;
    return ((n - 1) % 9) + 1;
  }

  // 3. Initialize Persistent State
  if (!state.initialized) {
    state.initialized = true;
    state.unitMultiplier = 1;
    state.consecutiveLosses = 0;
    state.lastTargetGroup = '127';
    state.startBankroll = bankroll || config.startingBankroll || 2000;
  }

  // 4. Target Profit and Stop-Loss Checks
  const targetProfit = state.startBankroll * 0.20;
  const stopLoss = state.startBankroll * 0.30;
  const currentProfit = bankroll - state.startBankroll;

  if (currentProfit >= targetProfit || currentProfit <= -stopLoss) {
    return [];
  }

  // 5. Evaluate Last Spin Result & Adjust Progression
  const lastSpin = spinHistory[spinHistory.length - 1];
  const lastNum = lastSpin.winningNumber;

  if (state.lastPlacedNumbers && state.lastPlacedNumbers.length > 0) {
    const wonLastSpin = state.lastPlacedNumbers.includes(lastNum);
    if (wonLastSpin) {
      state.unitMultiplier = 1;
      state.consecutiveLosses = 0;
    } else {
      state.consecutiveLosses += 1;
      // Increase bet after every 2 consecutive losses
      if (state.consecutiveLosses % 2 === 0) {
        const step = config.incrementMode === 'base'
          ? 1
          : Math.max(1, Math.floor(config.minIncrementalBet / config.betLimits.min));
        state.unitMultiplier += step;
      }
    }
  }

  // 6. Determine Next Target Group from Digital Root
  const root = getDigitalRoot(lastNum);
  let targetGroupKey = state.lastTargetGroup;

  if ([1, 2, 7].includes(root)) {
    targetGroupKey = '127';
  } else if ([4, 5, 8].includes(root)) {
    targetGroupKey = '458';
  } else if ([3, 6, 9].includes(root)) {
    targetGroupKey = '369';
  }
  // If lastNum was 0 or 00, targetGroupKey remains the previously selected group

  state.lastTargetGroup = targetGroupKey;
  const targetNumbers = GROUPS[targetGroupKey];

  // 7. Calculate Bet Amount per Number and Respect Table Limits
  const baseInsideBet = config.betLimits.min;
  let betPerNumber = baseInsideBet * state.unitMultiplier;

  // Clamp to min and max inside bet limits
  betPerNumber = Math.max(betPerNumber, config.betLimits.min);
  betPerNumber = Math.min(betPerNumber, config.betLimits.max);

  const totalBetRequired = betPerNumber * targetNumbers.length;
  if (bankroll < totalBetRequired) {
    // Insufficient funds to place the full 12-number group
    return [];
  }

  // 8. Construct Bets
  state.lastPlacedNumbers = targetNumbers;
  const bets = targetNumbers.map((num) => ({
    type: 'number',
    value: num,
    amount: betPerNumber
  }));

  return bets;
}