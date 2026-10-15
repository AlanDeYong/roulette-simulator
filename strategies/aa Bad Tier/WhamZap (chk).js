/**
 * ============================================================================
 * Strategy Name: WhamZap Roulette Strategy (Corrected Layout)
 * Source URL: https://youtu.be/TjG5m89_6yI
 * YouTube Channel: Casino Matchmaker (Strategy created by Yield Harvest)
 * 
 * --- FULL LOGIC IN DETAILS ---
 * The strategy plays on every single spin using high table coverage (28 winning 
 * numbers, 9 losing numbers on European Wheel):
 * 
 * 1. Outside Bet:
 *    - 5 Units on Column 3 (numbers: 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36).
 * 2. Inside Bets (8 Vertical Splits, 1 Unit each):
 *    - [4, 7], [10, 13], [11, 14], [16, 19], [17, 20], [22, 25], [23, 26], [28, 31].
 * 
 * --- FULL BET PROGRESSION IN DETAILS ---
 * - Base Bets: Column 3 uses 5 units (e.g. $10 at $2/unit or minOutside limit),
 *   Splits use 1 unit each ($2 default inside min).
 * - On Loss: Double all bet amounts (Martingale progression multiplier: 1x -> 2x -> 4x -> 8x...).
 * - On Win:
 *   a) If session profit hits a new peak, RESET progression multiplier to 1x.
 *   b) If in progression (multiplier > 1x), track consecutive wins. When 2 consecutive wins occur
 *      where AT LEAST ONE win was on a Split bet, HALVE the progression multiplier (step back 1 level).
 * 
 * --- THE GOAL ---
 * - Target Profit: +$100 target profit within 37 spins or stop-loss bankroll exhaustion.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Corrected Split Bet Definitions
  const splitBets = [
    [4, 7],   [10, 13], [11, 14], [16, 19],
    [17, 20], [22, 25], [23, 26], [28, 31]
  ];
  const col3Numbers = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36];

  // 2. Initialize State Persistence
  if (!state.initialized) {
    state.initialized = true;
    state.multiplier = 1;
    state.startBankroll = bankroll;
    state.peakBankroll = bankroll;
    state.consecutiveWins = 0;
    state.hadSplitWinInProgression = false;
  }

  // 3. Process Last Spin Result (If history exists)
  if (spinHistory.length > 0) {
    const lastResult = spinHistory[spinHistory.length - 1];
    const lastNum = lastResult.winningNumber;

    const isCol3Win = col3Numbers.includes(lastNum);
    const isSplitWin = splitBets.some(pair => pair.includes(lastNum));
    const isWin = isCol3Win || isSplitWin;

    // Track peak bankroll for session profit resets
    if (bankroll > state.peakBankroll) {
      state.peakBankroll = bankroll;
    }

    // Goal Reached: Stop betting if target profit (+100) or spin limit reached
    const currentProfit = bankroll - state.startBankroll;
    if (currentProfit >= 100000 || spinHistory.length >= 37000) {
      return []; // Return no bets to end session
    }

    if (!isWin) {
      // LOSS: Double the progression multiplier
      state.multiplier *= 2;
      state.consecutiveWins = 0;
      state.hadSplitWinInProgression = false;
    } else {
      // WIN: Check for Session Profit Reset
      if (bankroll >= state.peakBankroll) {
        state.multiplier = 1;
        state.consecutiveWins = 0;
        state.hadSplitWinInProgression = false;
      } else if (state.multiplier > 1) {
        // In Progression: Track consecutive wins
        state.consecutiveWins += 1;
        if (isSplitWin) {
          state.hadSplitWinInProgression = true;
        }

        // Halve bets if 2 wins hit with at least 1 split win
        if (state.consecutiveWins >= 2 && state.hadSplitWinInProgression) {
          state.multiplier = Math.max(1, Math.floor(state.multiplier / 2));
          state.consecutiveWins = 0;
          state.hadSplitWinInProgression = false;
        }
      }
    }
  }

  // 4. Calculate Bet Amounts from Config Limits & Unit Sizes
  const insideBase = config.betLimits.min;                            // 1 unit for splits
  const outsideBase = Math.max(config.betLimits.minOutside, insideBase * 5); // 5 units for Column 3

  let colAmount = outsideBase * state.multiplier;
  let splitAmount = insideBase * state.multiplier;

  // Clamp amounts to table limits
  colAmount = Math.max(config.betLimits.minOutside, Math.min(colAmount, config.betLimits.max));
  splitAmount = Math.max(config.betLimits.min, Math.min(splitAmount, config.betLimits.max));

  // 5. Construct Bet Array
  const bets = [
    { type: 'column', value: 3, amount: colAmount }
  ];

  for (const pair of splitBets) {
    bets.push({ type: 'split', value: pair, amount: splitAmount });
  }

  return bets;
}