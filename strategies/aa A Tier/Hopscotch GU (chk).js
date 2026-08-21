/**
 * Modified Hopscotch Roulette Strategy
 * 
 * Source: https://youtu.be/n_3ufU9o_D0
 * YouTube Channel: Gamblers University
 * 
 * The Full Logic in Details:
 * - The strategy uses a 4-level progression system ("Hopscotch") that hops between 
 *   high-coverage Corner bets and Street bets.
 * - Target Profit Goal: $50 profit on a $500 recommended buy-in.
 * 
 * Dynamic Rules & Adjustments:
 * - Corner Bets (Levels 1 & 3): 6 non-overlapping corners are chosen randomly.
 *   Corners covering any of the LAST 2 UNIQUE WINNING NUMBERS are strictly avoided.
 * - Street Bets (Levels 2 & 4): 9 total streets (3 randomly selected in each dozen).
 *   Streets corresponding to the LAST 3 UNIQUE WINNING STREETS are strictly avoided.
 * 
 * The Full Bet Progression in Details:
 * - Level 1: 6 non-overlapping Corner bets (1 base unit each).
 * - Level 2: 9 Street bets (1 base unit each).
 * - Level 3: 6 non-overlapping Corner bets (2 base units each).
 * - Level 4: 9 Street bets (2 base units each).
 * - Progression: Win -> Advance level (1 -> 2 -> 3 -> 4 -> reset to 1). Loss -> Reset to Level 1.
 * 
 * The Goal:
 * - Target profit of +$50 over the initial bankroll.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // Initialize state tracking
  if (state.level === undefined) state.level = 1;
  if (state.initialBankroll === undefined) state.initialBankroll = bankroll;

  // Target profit check
  const targetProfit = 5000;
  if (bankroll >= state.initialBankroll + targetProfit) {
    return []; // Stop betting once profit target is hit
  }

  // Update progression level based on previous spin result
  if (spinHistory && spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const winningNum = lastSpin.winningNumber;

    const wasWin = checkWin(state.lastBets, winningNum);

    if (wasWin) {
      if (state.level === 4) {
        state.level = 1; // Sequence completed, reset
      } else {
        state.level += 1; // Hop to next level
      }
    } else {
      state.level = 1; // Reset to Level 1 on loss
    }
  }

  // Base unit for inside bets
  const unit = Math.max(5, config.betLimits.min);
  let bets = [];

  if (state.level === 1 || state.level === 3) {
    const multiplier = state.level === 1 ? 1 : 2;
    const amount = clampBet(unit * multiplier, config);

    // Get last 2 unique winning numbers (1-36)
    const avoidedNumbers = getRecentUniqueWinningNumbers(spinHistory, 2);

    // Select 6 random non-overlapping corners avoiding recent winning numbers
    const selectedCorners = getDynamicCorners(avoidedNumbers);
    bets = selectedCorners.map(pos => ({ type: 'corner', value: pos, amount }));

  } else if (state.level === 2 || state.level === 4) {
    const multiplier = state.level === 2 ? 1 : 2;
    const amount = clampBet(unit * multiplier, config);

    // Get last 3 unique winning street start numbers
    const avoidedStreets = getRecentUniqueWinningStreets(spinHistory, 3);

    // Select 3 random streets per dozen avoiding recent winning streets
    const selectedStreets = getDynamicStreets(avoidedStreets);
    bets = selectedStreets.map(pos => ({ type: 'street', value: pos, amount }));
  }

  state.lastBets = bets;
  return bets;
}

/**
 * Retrieves the last N unique winning numbers (1-36) from spin history.
 */
function getRecentUniqueWinningNumbers(spinHistory, count) {
  const recent = [];
  if (!spinHistory) return recent;

  for (let i = spinHistory.length - 1; i >= 0; i--) {
    const num = Number(spinHistory[i].winningNumber);
    if (!isNaN(num) && num >= 1 && num <= 36) {
      if (!recent.includes(num)) {
        recent.push(num);
        if (recent.length === count) break;
      }
    }
  }
  return recent;
}

/**
 * Retrieves the last N unique winning street start numbers (1, 4, 7... 34) from spin history.
 */
function getRecentUniqueWinningStreets(spinHistory, count) {
  const recentStreets = [];
  if (!spinHistory) return recentStreets;

  for (let i = spinHistory.length - 1; i >= 0; i--) {
    const num = Number(spinHistory[i].winningNumber);
    if (!isNaN(num) && num >= 1 && num <= 36) {
      const streetStart = Math.floor((num - 1) / 3) * 3 + 1;
      if (!recentStreets.includes(streetStart)) {
        recentStreets.push(streetStart);
        if (recentStreets.length === count) break;
      }
    }
  }
  return recentStreets;
}

/**
 * Generates 6 random non-overlapping corner bets avoiding specified numbers.
 */
function getDynamicCorners(avoidedNumbers) {
  // All possible valid 2x2 corner top-left numbers
  // Grid layout: column 1 (1,4,7..31), column 2 (2,5,8..32)
  const allCorners = [];
  for (let row = 0; row < 11; row++) {
    const r1 = row * 3 + 1;
    const r2 = row * 3 + 2;
    allCorners.push(r1, r2);
  }

  // Filter out corners that contain any avoided numbers
  const validCorners = allCorners.filter(cornerVal => {
    const covered = [cornerVal, cornerVal + 1, cornerVal + 3, cornerVal + 4];
    return !covered.some(num => avoidedNumbers.includes(num));
  });

  // Shuffle candidate corners
  const shuffled = shuffleArray([...validCorners]);

  // Greedy selection of up to 6 non-overlapping corners
  const chosenCorners = [];
  const occupiedNumbers = new Set();

  for (const cornerVal of shuffled) {
    const covered = [cornerVal, cornerVal + 1, cornerVal + 3, cornerVal + 4];
    const overlaps = covered.some(num => occupiedNumbers.has(num));

    if (!overlaps) {
      chosenCorners.push(cornerVal);
      covered.forEach(num => occupiedNumbers.add(num));
      if (chosenCorners.length === 6) break;
    }
  }

  // Fallback: If strict avoidance resulted in fewer than 6 corners, fill remaining from shuffled allCorners
  if (chosenCorners.length < 6) {
    const backupShuffled = shuffleArray([...allCorners]);
    for (const cornerVal of backupShuffled) {
      if (chosenCorners.includes(cornerVal)) continue;
      const covered = [cornerVal, cornerVal + 1, cornerVal + 3, cornerVal + 4];
      const overlaps = covered.some(num => occupiedNumbers.has(num));
      if (!overlaps) {
        chosenCorners.push(cornerVal);
        covered.forEach(num => occupiedNumbers.add(num));
        if (chosenCorners.length === 6) break;
      }
    }
  }

  return chosenCorners;
}

/**
 * Generates 3 random street bets per dozen avoiding specified recent streets.
 */
function getDynamicStreets(avoidedStreets) {
  const dozen1 = [1, 4, 7, 10];
  const dozen2 = [13, 16, 19, 22];
  const dozen3 = [25, 28, 31, 34];

  const select3FromDozen = (dozenStreets) => {
    const allowed = dozenStreets.filter(st => !avoidedStreets.includes(st));
    const hit = dozenStreets.filter(st => avoidedStreets.includes(st));

    const shuffledAllowed = shuffleArray([...allowed]);
    const shuffledHit = shuffleArray([...hit]);

    // Pick allowed streets first, then backfill if needed
    const picked = shuffledAllowed.concat(shuffledHit);
    return picked.slice(0, 3);
  };

  return [
    ...select3FromDozen(dozen1),
    ...select3FromDozen(dozen2),
    ...select3FromDozen(dozen3)
  ];
}

/**
 * Utility to shuffle an array in place (Fisher-Yates).
 */
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Ensures bet amounts stay within table limits.
 */
function clampBet(amount, config) {
  let clamped = Math.max(amount, config.betLimits.min);
  clamped = Math.min(clamped, config.betLimits.max);
  return clamped;
}

/**
 * Checks if the winning number was covered by any active bet.
 */
function checkWin(bets, num) {
  if (!bets || bets.length === 0) return false;
  if (num === 0 || num === '0' || num === '00') return false;

  const n = Number(num);

  for (const b of bets) {
    if (b.type === 'corner') {
      const v = b.value;
      if (n === v || n === v + 1 || n === v + 3 || n === v + 4) {
        return true;
      }
    } else if (b.type === 'street') {
      const v = b.value;
      if (n === v || n === v + 1 || n === v + 2) {
        return true;
      }
    }
  }
  return false;
}