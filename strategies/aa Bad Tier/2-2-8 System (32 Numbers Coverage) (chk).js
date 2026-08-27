/**
 * Strategy: The Modified 2-2-8 System (Corners Variation)
 * Source: https://youtu.be/1k7Ks417LTU (Modified)
 * YouTube Channel: Mastering The Wheel
 *
 * --- The Full Logic in Detail ---
 * This modified version covers the same 32 numbers across the wheel:
 * 1. 2 Dozens: 1st Dozen (1-12) and 2nd Dozen (13-24).
 * 2. 2 Columns: 1st Column and 2nd Column.
 * 3. 2 Corner Bets replacing the 8 single number bets:
 *    - Corner 25 covers: 25, 26, 28, 29 (top-left number: 25).
 *    - Corner 31 covers: 31, 32, 34, 35 (top-left number: 31).
 *
 * --- Sizing Ratio & 5-Level Progression ---
 * - Base Unit Sizing:
 *   - Dozen & Column bets: $5 each (or config.betLimits.minOutside).
 *   - Corner bets: 2 units each ($2 * inside min, clamped to config.betLimits.min).
 * - Multiplier sequence across 5 levels: [1, 3, 9, 27, 81] (tripling on loss).
 * - Progression Rule:
 *   - On Win: If bankroll reaches or exceeds session high, reset to Level 1. Otherwise, stay at current level.
 *   - On Loss / Partial Loss: Advance to the next level.
 *   - After Level 5 Loss: Stop placing bets.
 *
 * --- The Goal ---
 * - Target Profit (Stop Win): +10% of starting bankroll.
 * - Stop Loss: Loss at Level 5 or insufficient bankroll.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Target & Stop-loss bounds
  const targetProfit = config.startingBankroll * 0.10;
  const stopWinBankroll = config.startingBankroll + targetProfit;

  if (bankroll >= stopWinBankroll) {
    return [];
  }

  // 2. Initialize State
  if (state.sessionHigh === undefined) {
    state.sessionHigh = config.startingBankroll;
  }
  if (state.level === undefined) {
    state.level = 1;
  }
  if (state.stopped === undefined) {
    state.stopped = false;
  }

  if (state.stopped) {
    return [];
  }

  // 3. Process previous spin result to update progression
  if (spinHistory && spinHistory.length > 0 && state.lastBetPlaced) {
    const lastResult = spinHistory[spinHistory.length - 1];
    const num = lastResult.winningNumber;

    // Corner numbers in Dozen 3 (25, 26, 28, 29, 31, 32, 34, 35)
    const cornerCoveredNumbers = [25, 26, 28, 29, 31, 32, 34, 35];
    const isCornerWin = cornerCoveredNumbers.includes(num);

    // First and second dozen (1-24)
    const isDozen1or2 = num >= 1 && num <= 24;
    const isCol1or2 = (num % 3 === 1 || num % 3 === 2) && num > 0;

    // Full Win: (Dozens 1-2 & Col 1-2) OR Corner hits
    const isFullWin = (isDozen1or2 && isCol1or2) || isCornerWin;

    if (bankroll >= state.sessionHigh) {
      state.sessionHigh = bankroll;
      state.level = 1;
    } else if (isFullWin) {
      // Won, but not yet at new session high -> stay at current level
    } else {
      // Partial loss or total loss -> advance progression
      state.level += 1;
      if (state.level > 5) {
        state.stopped = true;
        return [];
      }
    }
  }

  // Update session high if current bankroll exceeds it
  if (bankroll > state.sessionHigh) {
    state.sessionHigh = bankroll;
    state.level = 1;
  }

  // 4. Progression Multipliers (1, 3, 9, 27, 81)
  const multipliers = [1, 3, 9, 27, 81];
  const currentMultiplier = multipliers[state.level - 1] || 1;

  // 5. Determine Bet Amounts based on parameters and config limits
  // Outside base: $5 (or config.betLimits.minOutside if higher)
  const outsideBase = Math.max(5, config.betLimits.minOutside);
  // Corner base: 2 units (2 * config.betLimits.min)
  const cornerBase = Math.max(config.betLimits.min * 2, config.betLimits.min);

  let outsideAmount = outsideBase * currentMultiplier;
  let cornerAmount = cornerBase * currentMultiplier;

  // Respect table limits
  outsideAmount = Math.max(config.betLimits.minOutside, Math.min(outsideAmount, config.betLimits.max));
  cornerAmount = Math.max(config.betLimits.min, Math.min(cornerAmount, config.betLimits.max));

  // Check total required bet against bankroll
  const totalBetCost = (outsideAmount * 4) + (cornerAmount * 2);
  if (bankroll < totalBetCost) {
    state.stopped = true;
    return [];
  }

  // 6. Construct Bet Placements
  const bets = [
    // 2 Dozens ($5 base)
    { type: 'dozen', value: 1, amount: outsideAmount },
    { type: 'dozen', value: 2, amount: outsideAmount },

    // 2 Columns ($5 base)
    { type: 'column', value: 1, amount: outsideAmount },
    { type: 'column', value: 2, amount: outsideAmount },

    // 2 Corners (2 units base each)
    // Corner 25 covers: 25, 26, 28, 29
    { type: 'corner', value: 25, amount: cornerAmount },
    // Corner 31 covers: 31, 32, 34, 35
    { type: 'corner', value: 31, amount: cornerAmount }
  ];

  state.lastBetPlaced = true;
  return bets;
}