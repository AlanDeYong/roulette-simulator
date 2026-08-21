/**
 * Strategy Name: 5 Winning Corners Strategy (Random Non-Overlapping Selection)
 * Source Video: https://youtu.be/2xc1M-QmcCc
 * YouTube Channel: WillVegas
 *
 * Full Logic in Details:
 * - Selects 5 non-overlapping corner bets randomly from the 22 valid standard corner positions.
 * - 5 non-overlapping corners cover exactly 20 numbers (5 * 4 = 20), providing ~54% (EU) / ~52.6% (US) wheel coverage.
 * - The selected 5 corners remain fixed during progression and are only re-rolled upon a strategy reset (new session / reaching session profit).
 *
 * Full Bet Progression in Details:
 * - Starts at Level 1 (1 base unit per corner, derived from config.betLimits.min).
 * - On a LOSS: Increase progression level by 1 unit (+1 per corner).
 * - On a WIN:
 *   - If in overall session profit (bankroll > initialBankroll): Reset level to 1, reset profit baseline, and re-roll 5 new non-overlapping corners.
 *   - If NOT in session profit: Decrease progression level by 1 (minimum Level 1), keeping the same corners.
 *
 * Goal:
 * - Target Profit: +20% of starting bankroll (stops betting when achieved).
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // Helper: Get the 4 covered numbers given the top-left number of a corner
  function getCornerNumbers(topLeft) {
    return [topLeft, topLeft + 1, topLeft + 3, topLeft + 4];
  }

  // Helper: Generate 5 random non-overlapping corners covering exactly 20 unique numbers
  function pick5NonOverlappingCorners() {
    // All 22 valid corner top-left values on a standard 36-number roulette grid:
    // Rows 1-11, top column (1, 4, 7... 31) and middle column (2, 5, 8... 32)
    const allCornerTopLefts = [];
    for (let rowStart = 1; rowStart <= 31; rowStart += 3) {
      allCornerTopLefts.push(rowStart);     // covers [r, r+1, r+3, r+4]
      allCornerTopLefts.push(rowStart + 1); // covers [r+1, r+2, r+4, r+5]
    }

    // Shuffle and pick 5 mutually disjoint corners
    let attempts = 0;
    while (attempts < 1000) {
      attempts++;
      const shuffled = [...allCornerTopLefts].sort(() => Math.random() - 0.5);
      const chosenCorners = [];
      const usedNumbers = new Set();

      for (const corner of shuffled) {
        const nums = getCornerNumbers(corner);
        const overlaps = nums.some((n) => usedNumbers.has(n));
        if (!overlaps) {
          chosenCorners.push(corner);
          nums.forEach((n) => usedNumbers.add(n));
          if (chosenCorners.length === 5) {
            return chosenCorners;
          }
        }
      }
    }

    // Fallback deterministic 5 non-overlapping corners if shuffle exceeds iterations
    return [1, 7, 13, 19, 25];
  }

  // 1. Initialize State
  if (state.initialBankroll === undefined) {
    state.initialBankroll = bankroll;
  }
  if (state.level === undefined) {
    state.level = 1;
  }
  if (!state.selectedCorners || state.selectedCorners.length !== 5) {
    state.selectedCorners = pick5NonOverlappingCorners();
  }

  // 2. Profit Target Check
  const profitTarget = state.initialBankroll * 0.20;
  const currentProfit = bankroll - state.initialBankroll;
  if (currentProfit >= profitTarget) {
    return [];
  }

  // 3. Process Progression & Reset on Spin Outcome
  if (spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const winningNum = lastSpin.winningNumber;

    // Check if winning number hit any of the currently tracked 5 corners
    const coveredNumbers = new Set();
    state.selectedCorners.forEach((c) => {
      getCornerNumbers(c).forEach((n) => coveredNumbers.add(n));
    });

    const isWin = coveredNumbers.has(winningNum);

    if (isWin) {
      if (bankroll > state.initialBankroll) {
        // Session profit reached -> Reset progression and pick new random corners
        state.level = 1;
        state.selectedCorners = pick5NonOverlappingCorners();
      } else {
        // Win but still recovering losses -> Step down 1 level, keep existing corners
        state.level = Math.max(1, state.level - 1);
      }
    } else {
      // Loss -> Step up 1 level, keep existing corners
      state.level += 1;
    }
  }

  // 4. Calculate and Clamp Unit Bet
  const baseUnit = config.betLimits.min;
  let unitBet = baseUnit * state.level;

  unitBet = Math.max(unitBet, config.betLimits.min);
  unitBet = Math.min(unitBet, config.betLimits.max);

  const totalRequired = unitBet * 5;
  if (bankroll < totalRequired) {
    unitBet = Math.floor(bankroll / 5);
    if (unitBet < config.betLimits.min) {
      return [];
    }
  }

  // 5. Construct Bets Array
  return state.selectedCorners.map((cornerTopLeft) => ({
    type: 'corner',
    value: cornerTopLeft,
    amount: unitBet
  }));
}