/**
 * ============================================================================
 * Six-Split Spread Roulette Strategy (Randomized Selection)
 * ============================================================================
 * Source:
 *   - Video URL: https://youtu.be/OfScZToHBEE
 *   - Channel: Roulette Strategy Hub / Casino Systems
 * 
 * The Full Logic in Detail:
 *   - Strategy Concept: The Six-Split Spread places equal split bets across six
 *     distinct two-number combinations. 
 *   - Randomization: Whenever a new step in the progression is triggered (on initial
 *     setup, after a win reset, or after a loss advancement), 6 splits are randomly 
 *     selected from the pool of all valid roulette split pairs.
 *   - Trigger / Conditions:
 *     Bets are placed on every active spin as long as target profit or stop-loss limits
 *     have not been hit, and sufficient funds exist.
 * 
 * The Full Bet Progression:
 *   - Base Bet: 1 base unit placed on each of the 6 splits.
 *   - Win Outcome:
 *     Hitting any covered number pays 17:1 on that split. The progression resets
 *     back to Level 0 (base unit) and a new set of 6 random splits is chosen.
 *   - Loss Outcome:
 *     Upon a missed spin, progression advances along the multiplier ladder
 *     [1, 2, 4, 6, 8, 12] and a new set of 6 random splits is selected.
 * 
 * The Goal:
 *   - Target Profit: +20 units profit relative to starting bankroll.
 *   - Stop-Loss: Cease wagering if bankroll drops below 50% of initial bankroll.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // Helper: Generate all valid roulette split pairs
  function getAllValidSplits() {
    const splits = [];
    // Horizontal splits (e.g., [1, 2], [2, 3])
    for (let r = 0; r < 12; r++) {
      const rowStart = r * 3 + 1;
      splits.push([rowStart, rowStart + 1]);
      splits.push([rowStart + 1, rowStart + 2]);
    }
    // Vertical splits (e.g., [1, 4], [2, 5] ... [33, 36])
    for (let n = 1; n <= 33; n++) {
      splits.push([n, n + 3]);
    }
    // Splits with 0
    splits.push([0, 1], [0, 2], [0, 3]);
    return splits;
  }

  // Helper: Randomly pick N distinct splits from the pool
  function getRandomSplits(count) {
    const pool = getAllValidSplits();
    const chosen = [];
    while (chosen.length < count && pool.length > 0) {
      const index = Math.floor(Math.random() * pool.length);
      chosen.push(pool.splice(index, 1)[0]);
    }
    return chosen;
  }

  // 1. Initialize State
  if (!state.initialized) {
    state.initialized = true;
    state.initialBankroll = bankroll;
    state.progressionIndex = 0;
    state.targetProfitUnits = 20000;
    state.currentSplits = getRandomSplits(6);
  }

  // 2. Base Unit Sizing and Progression Multipliers
  const baseUnit = Math.max(config.betLimits.min || 1, 1);
  const progressionLadder = [1, 2, 4, 6, 8, 12];

  // 3. Update Progression & Randomize Splits Based on Previous Result
  if (spinHistory && spinHistory.length > 0) {
    const lastResult = spinHistory[spinHistory.length - 1];
    const lastWinningNumber = lastResult.winningNumber;
    const coveredNumbers = new Set((state.currentSplits || []).flat());

    if (coveredNumbers.has(lastWinningNumber)) {
      // WIN: Reset progression ladder and pick new random splits
      state.progressionIndex = 0;
      state.currentSplits = getRandomSplits(6);
    } else {
      // LOSS: Advance progression ladder and pick new random splits
      if (state.progressionIndex < progressionLadder.length - 1) {
        state.progressionIndex += 1;
      }
      state.currentSplits = getRandomSplits(6);
    }
  }

  // 4. Check Target Profit and Stop-Loss Rules
  const currentProfit = bankroll - state.initialBankroll;
  const targetProfitAmount = state.targetProfitUnits * baseUnit;
  const stopLossAmount = -(state.initialBankroll * 0.5);

  if (currentProfit >= targetProfitAmount || currentProfit <= stopLossAmount) {
    return []; // Cease betting
  }

  // 5. Calculate Bet Amount per Split
  let unitMultiplier;
  if (config.incrementMode === 'fixed' && config.minIncrementalBet) {
    unitMultiplier = 1 + (state.progressionIndex * (config.minIncrementalBet / baseUnit));
  } else {
    unitMultiplier = progressionLadder[state.progressionIndex];
  }

  let betAmountPerSplit = Math.round(baseUnit * unitMultiplier);

  // Clamp bet amount to configured table limits
  betAmountPerSplit = Math.max(betAmountPerSplit, config.betLimits.min);
  betAmountPerSplit = Math.min(betAmountPerSplit, config.betLimits.max);

  // 6. Verify Bankroll Coverage for all 6 Bets
  const totalRequired = betAmountPerSplit * state.currentSplits.length;
  if (bankroll < totalRequired) {
    return []; // Insufficient funds to maintain full spread
  }

  // 7. Generate Bet Objects
  return state.currentSplits.map(splitPair => ({
    type: 'split',
    value: splitPair,
    amount: betAmountPerSplit
  }));
}