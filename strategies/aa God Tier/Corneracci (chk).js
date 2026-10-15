/**
 * Roulette Strategy: Corneracci ("Follow the Corners")
 * 
 * Source:
 * - Channel: CEG Dealer School
 * - Video URL: https://youtu.be/0kRKC96d6rw
 * 
 * Strategy Logic:
 * 1. On initial spin, observe the winning number and place 1 Corner bet touching that number.
 * 2. On subsequent spins, continue adding active Corner positions touching new winning numbers
 *    until reaching a maximum of 4 active corners on the table.
 * 3. Corner selection chooses valid top-left numbers (1-32, excluding rightmost column numbers 3,6,9...)
 *    that cover the target winning number. If multiple valid corners are available, one is RANDOMLY selected.
 * 
 * Bet Progression (Modified Fibonacci across corner count and units):
 * - Level 1: 1 unit on 1 corner
 * - Level 2: 1 unit on 2 corners
 * - Level 3: 2 units on 3 corners
 * - Level 4: 3 units on 4 corners
 * - Level 5: 5 units on 4 corners
 * - Level 6: 8 units on 4 corners
 * - Level 7: 13 units on 4 corners
 * - Level 8: 21 units on 4 corners
 * 
 * Progression Rules:
 * - On LOSS: Advance step (+1 in progression table).
 * - On WIN: Reset back to Level 1 and clear/re-initialize corners based on latest spin.
 * 
 * Goal:
 * - Target Profit: +100 units or +$100 bankroll gain per session, resetting or stopping upon target.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Minimum unit for inside bets (Corner)
  const unit = config.betLimits.min || 2;
  const maxBet = config.betLimits.max || 500;

  // Progression schedule: { units: multiplier, corners: count }
  const progression = [
    { units: 1, corners: 1 },
    { units: 1, corners: 2 },
    { units: 2, corners: 3 },
    { units: 3, corners: 4 },
    { units: 5, corners: 4 },
    { units: 8, corners: 4 },
    { units: 13, corners: 4 },
    { units: 21, corners: 4 }
  ];

  // 2. Initialize State
  if (state.level === undefined) {
    state.level = 0;
    state.activeCorners = [];
    state.initialBankroll = bankroll;
    state.lastBankroll = bankroll;
  }

  // 3. Process Previous Spin Result
  if (spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const lastNum = lastSpin.winningNumber;
    const profit = bankroll - state.lastBankroll;

    // Check if previous spin won any of our placed corner bets
    const wasWin = profit > 0;

    if (wasWin) {
      // Reset progression on win
      state.level = 0;
      state.activeCorners = [];
    } else if (state.activeCorners.length > 0) {
      // Advance progression on loss
      state.level = Math.min(state.level + 1, progression.length - 1);
    }

    // Helper: Find valid corner top-left number randomly from available choices touching lastNum
    if (lastNum >= 1 && lastNum <= 36) {
      const validCorner = getRandomCornerForNumber(lastNum, state.activeCorners);
      if (validCorner !== null && !state.activeCorners.includes(validCorner)) {
        state.activeCorners.push(validCorner);
      }
    }
  }

  state.lastBankroll = bankroll;

  // If no spin history yet, return no bet to observe first spin
  if (spinHistory.length === 0) {
    return [];
  }

  // Target profit check ($100 profit target)
  if (bankroll - state.initialBankroll >= 100) {
    state.level = 0;
    state.activeCorners = [];
    state.initialBankroll = bankroll;
  }

  // 4. Calculate Current Step Parameters
  const currentStep = progression[state.level];
  const targetCornerCount = currentStep.corners;
  const unitMultiplier = currentStep.units;

  // Ensure we have enough active corners selected from past spins
  const selectedCorners = state.activeCorners.slice(-targetCornerCount);
  if (selectedCorners.length === 0) {
    // Default fallback corner if none tracked yet
    selectedCorners.push(1);
  }

  // 5. Build Bet Objects & Clamp Amounts
  const bets = selectedCorners.map((cornerVal) => {
    let rawAmount = unit * unitMultiplier;
    // Clamp to configured bet limits
    let clampedAmount = Math.max(rawAmount, config.betLimits.min);
    clampedAmount = Math.min(clampedAmount, maxBet);

    return {
      type: 'corner',
      value: cornerVal,
      amount: clampedAmount
    };
  });

  return bets;
}

/**
 * Helper function to randomly pick a valid top-left number for a corner bet touching `num`
 * from all available non-duplicate choices.
 */
function getRandomCornerForNumber(num, existingCorners) {
  // A corner 'c' (top-left) covers [c, c+1, c+3, c+4]
  // Top-left numbers must be 1..32 and c % 3 !== 0
  const candidates = [num - 4, num - 3, num - 1, num];
  
  // Filter candidates to valid corner anchors covering `num`
  const validCorners = candidates.filter((c) => {
    if (c >= 1 && c <= 32 && c % 3 !== 0) {
      const covers = [c, c + 1, c + 3, c + 4];
      return covers.includes(num);
    }
    return false;
  });

  if (validCorners.length === 0) return 1;

  // Prefer corners that are NOT already in our active corners list
  const unusedChoices = validCorners.filter((c) => !existingCorners.includes(c));

  // Select randomly from unused choices if available, otherwise randomly from all valid choices
  const pool = unusedChoices.length > 0 ? unusedChoices : validCorners;
  const randomIndex = Math.floor(Math.random() * pool.length);
  
  return pool[randomIndex];
}