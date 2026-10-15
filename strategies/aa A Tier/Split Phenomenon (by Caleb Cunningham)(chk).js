/**
 * Strategy: The Split Phenomenon (by Caleb Cunningham)
 * Source: https://youtu.be/_GIqta-vvZ0 (The Roulette Master)
 * 
 * Logic:
 * - Selects 6 mutually exclusive, non-overlapping split bets at random (12 distinct numbers).
 * - Multiplier sequence per split: [1, 1, 2, 3, 4, 6, 9, 14, 21, 31, 47, 70, 105].
 * - Total bankroll needed for full 13-step sequence: 1,884 base units.
 * - Win condition: Reset to step 0 and re-roll 6 random non-overlapping splits upon reaching new session high.
 * - Loss condition: Step up to the next multiplier level.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // Generate all valid standard board splits (horizontal and vertical)
  function getAllValidSplits() {
    const splits = [];
    // Horizontal splits within columns (e.g., [1,2], [2,3], [4,5], [5,6]...)
    for (let r = 0; r < 12; r++) {
      const base = r * 3;
      splits.push([base + 1, base + 2]);
      splits.push([base + 2, base + 3]);
    }
    // Vertical splits between rows (e.g., [1,4], [2,5], [3,6]...)
    for (let n = 1; n <= 33; n++) {
      splits.push([n, n + 3]);
    }
    return splits;
  }

  // Randomly select 6 splits that share zero numbers (12 distinct numbers)
  function pickRandomNonOverlappingSplits() {
    const allSplits = getAllValidSplits();
    // Fisher-Yates shuffle
    for (let i = allSplits.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allSplits[i], allSplits[j]] = [allSplits[j], allSplits[i]];
    }

    const selected = [];
    const usedNumbers = new Set();

    for (const split of allSplits) {
      const [n1, n2] = split;
      if (!usedNumbers.has(n1) && !usedNumbers.has(n2)) {
        selected.push(split);
        usedNumbers.add(n1);
        usedNumbers.add(n2);
        if (selected.length === 6) break;
      }
    }
    return selected;
  }

  // 1. Initial State Setup
  if (!state.initialized) {
    state.initialized = true;
    state.progression = [1, 1, 2, 3, 4, 6, 9, 14, 21, 31, 47, 70, 105];
    state.stepIndex = 0;
    state.peakBankroll = bankroll;
    state.activeSplits = pickRandomNonOverlappingSplits();
  }

  // 2. Evaluate previous spin outcome
  if (spinHistory && spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const hit = state.activeSplits.some(pair => pair.includes(lastSpin.winningNumber));

    if (bankroll > state.peakBankroll) {
      // New session high profit: reset progression and choose fresh non-overlapping splits
      state.peakBankroll = bankroll;
      state.stepIndex = 0;
      state.activeSplits = pickRandomNonOverlappingSplits();
    } else if (hit) {
      // Mid-progression win: step back 2 levels
      state.stepIndex = Math.max(0, state.stepIndex - 2);
    } else {
      // Loss: step up
      state.stepIndex = Math.min(state.stepIndex + 1, state.progression.length - 1);
    }
  }

  // 3. Compute Chip Amounts
  const baseUnit = config.betLimits.min;
  const multiplier = state.progression[state.stepIndex];
  let chipAmount = baseUnit * multiplier;

  chipAmount = Math.max(chipAmount, config.betLimits.min);
  chipAmount = Math.min(chipAmount, config.betLimits.max);

  const totalRequired = chipAmount * state.activeSplits.length;
  if (bankroll < totalRequired) {
    return [];
  }

  // 4. Return Bet Array
  return state.activeSplits.map(splitPair => ({
    type: 'split',
    value: splitPair,
    amount: chipAmount
  }));
}