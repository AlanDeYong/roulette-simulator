/**
 * Strategy: THE REAL ONE
 * Source: Bet With Mo (https://youtu.be/A_QVY6ZpKcs)
 *
 * Full Logic:
 * - Base setup places 6 corner bets covering the top two rows (24 numbers):
 *   Corners on [2, 8, 14, 20, 26, 32].
 * - When an uncovered number hits (Total Loss), progression tier advances by 1 and
 *   2 adjacent streets flanking the losing street are added (capped at 4 streets maximum).
 * - If a hit occurs that pays out less than the total outlay (Small Loss), the current bet
 *   is repeated. If 3 consecutive small losses occur, the tier advances by 1.
 * - Profitable wins that reach a new session high trigger a full reset to Level 0 (6 corners, 1 unit).
 * - Profitable wins below the session high drop down 1 progression tier.
 *
 * Progression Tiers (Units per active bet):
 * - Level 0: 1 unit  (6 corners, 0 streets  = 6 units total)
 * - Level 1: 2 units (6 corners, 2 streets  = 16 units total)
 * - Level 2: 3 units (6 corners, 4 streets  = 30 units total)
 * - Level 3: 4 units (6 corners, 4 streets  = 40 units total)
 * - Level 4: 6 units (6 corners, 4 streets  = 60 units total)
 * - Level 5: 10 units (6 corners, 4 streets = 100 units total)
 * - Level 6: 20 units (6 corners, 4 streets = 200 units total)
 * - Level 7: 40 units (6 corners, 4 streets = 400 units total)
 *
 * The Goal:
 * - Lock in profits at session highs and reset to base stake. Stop upon bankroll exhaustion.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  const PROGRESSION_UNITS = [1, 2, 3, 4, 6, 10, 20, 40];
  const BASE_CORNERS = [2, 8, 14, 20, 26, 32];
  const ALL_STREETS = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];

  // Helper to add flanking streets based on the winning number
  function addFlankingStreets(winningNumber) {
    if (!state.activeStreets) state.activeStreets = [];
    if (state.activeStreets.length >= 4) return;

    let hitStreet = 1;
    if (winningNumber > 0) {
      hitStreet = Math.floor((winningNumber - 1) / 3) * 3 + 1;
    }

    const getLeft = (s) => (s - 3 < 1 ? 34 : s - 3);
    const getRight = (s) => (s + 3 > 34 ? 1 : s + 3);

    let leftCandidate = getLeft(hitStreet);
    let rightCandidate = getRight(hitStreet);

    // Find next available left street
    while (state.activeStreets.includes(leftCandidate) && state.activeStreets.length < 4) {
      leftCandidate = getLeft(leftCandidate);
      if (leftCandidate === hitStreet) break;
    }
    if (!state.activeStreets.includes(leftCandidate) && state.activeStreets.length < 4) {
      state.activeStreets.push(leftCandidate);
    }

    // Find next available right street
    while (state.activeStreets.includes(rightCandidate) && state.activeStreets.length < 4) {
      rightCandidate = getRight(rightCandidate);
      if (rightCandidate === hitStreet) break;
    }
    if (!state.activeStreets.includes(rightCandidate) && state.activeStreets.length < 4) {
      state.activeStreets.push(rightCandidate);
    }
  }

  // Initialize persistent state
  if (!state.initialized) {
    state.initialized = true;
    state.sessionHigh = bankroll;
    state.level = 0;
    state.activeStreets = [];
    state.consecutiveSmallLosses = 0;
    state.lastBets = null;
  }

  // Process outcome from previous spin
  if (spinHistory && spinHistory.length > 0 && state.lastBets) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const winningNum = lastSpin.winningNumber;

    let totalCost = 0;
    let totalReturn = 0;

    for (const b of state.lastBets) {
      totalCost += b.amount;
      if (b.type === 'corner') {
        const covered = [b.value, b.value + 1, b.value + 3, b.value + 4];
        if (covered.includes(winningNum)) {
          totalReturn += b.amount * 9; // Corner pays 8:1 (return = amount * 9)
        }
      } else if (b.type === 'street') {
        const covered = [b.value, b.value + 1, b.value + 2];
        if (covered.includes(winningNum)) {
          totalReturn += b.amount * 12; // Street pays 11:1 (return = amount * 12)
        }
      }
    }

    const netWin = totalReturn - totalCost;

    if (netWin > 0) {
      // Profitable spin
      state.consecutiveSmallLosses = 0;
      if (bankroll >= state.sessionHigh) {
        // Session high reset
        state.sessionHigh = bankroll;
        state.level = 0;
        state.activeStreets = [];
      } else {
        // Drop down one tier
        state.level = Math.max(0, state.level - 1);
        if (state.level === 0) {
          state.activeStreets = [];
        }
      }
    } else if (totalReturn === 0) {
      // Total loss: advance tier and add streets
      state.consecutiveSmallLosses = 0;
      state.level = Math.min(PROGRESSION_UNITS.length - 1, state.level + 1);
      addFlankingStreets(winningNum);
    } else {
      // Small loss (partial return): advance only after 3 consecutive occurrences
      state.consecutiveSmallLosses += 1;
      if (state.consecutiveSmallLosses >= 3) {
        state.level = Math.min(PROGRESSION_UNITS.length - 1, state.level + 1);
        state.consecutiveSmallLosses = 0;
        addFlankingStreets(winningNum);
      }
    }
  }

  // Compute bet unit size
  const minInside = config.betLimits.min;
  const unitMultiplier = PROGRESSION_UNITS[state.level];
  let betUnit = minInside * unitMultiplier;
  betUnit = Math.max(betUnit, config.betLimits.min);
  betUnit = Math.min(betUnit, config.betLimits.max);

  // Construct bets
  const bets = [];

  // 6 base corners
  for (const cornerVal of BASE_CORNERS) {
    bets.push({
      type: 'corner',
      value: cornerVal,
      amount: betUnit
    });
  }

  // Active streets (up to 4)
  if (state.activeStreets && state.activeStreets.length > 0) {
    for (const streetVal of state.activeStreets) {
      bets.push({
        type: 'street',
        value: streetVal,
        amount: betUnit
      });
    }
  }

  // Bankroll verification
  const requiredTotal = bets.reduce((sum, b) => sum + b.amount, 0);
  if (requiredTotal > bankroll) {
    return []; // Preserve remaining bankroll if unable to satisfy bet
  }

  state.lastBets = bets;
  return bets;
}