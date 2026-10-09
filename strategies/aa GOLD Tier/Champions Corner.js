/**
 * Roulette Strategy: Champions Corner Roulette (Dynamic Non-Overlapping Corners)
 * 
 * Source: 
 * - Video URL: https://youtu.be/sZzYb7nn_B8
 * - Channel: The Roulette Master ("3 GREAT STRATEGIES FORM 1 NEW SYSTEM!")
 * 
 * Selection & Setup:
 * - Selects 6 mutually non-overlapping corner bets randomly at the start of a session.
 * - Corners remain strictly fixed throughout losing/winning progressions until a full reset.
 * - Upon reaching a new profit high-water mark / reset, a fresh set of 6 non-overlapping corners is generated.
 * 
 * Full Bet Progression:
 * - On reaching/exceeding session peak bankroll:
 *     - Reset all units to 1 and pick a fresh set of 6 non-overlapping corners.
 * - On total miss (loss):
 *     - Add +1 unit to all 6 active corners.
 * - On hit (win):
 *     - If not in session profit: Add +1 unit to all corners EXCEPT the corner that just hit.
 * 
 * The Goal:
 * - Preserve table coverage without overlap (24 distinct numbers) while working out of drawdowns.
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // All 22 valid corner bet identifiers (topLeftNumber) on a standard 3x12 board
  // A corner at topLeft covers [topLeft, topLeft+1, topLeft+3, topLeft+4]
  const allCorners = [
    { id: 1, numbers: [1, 2, 4, 5] },
    { id: 2, numbers: [2, 3, 5, 6] },
    { id: 4, numbers: [4, 5, 7, 8] },
    { id: 5, numbers: [5, 6, 8, 9] },
    { id: 7, numbers: [7, 8, 10, 11] },
    { id: 8, numbers: [8, 9, 11, 12] },
    { id: 10, numbers: [10, 11, 13, 14] },
    { id: 11, numbers: [11, 12, 14, 15] },
    { id: 13, numbers: [13, 14, 16, 17] },
    { id: 14, numbers: [14, 15, 17, 18] },
    { id: 16, numbers: [16, 17, 19, 20] },
    { id: 17, numbers: [17, 18, 20, 21] },
    { id: 19, numbers: [19, 20, 22, 23] },
    { id: 20, numbers: [20, 21, 23, 24] },
    { id: 22, numbers: [22, 23, 25, 26] },
    { id: 23, numbers: [23, 24, 26, 27] },
    { id: 25, numbers: [25, 26, 28, 29] },
    { id: 26, numbers: [26, 27, 29, 30] },
    { id: 28, numbers: [28, 29, 31, 32] },
    { id: 29, numbers: [29, 30, 32, 33] },
    { id: 31, numbers: [31, 32, 34, 35] },
    { id: 32, numbers: [32, 33, 35, 36] }
  ];

  // Helper to select exactly 6 non-overlapping corners randomly
  function selectRandomNonOverlappingCorners() {
    const rowPairs = [
      [1, 2],       // Rows 1 & 2
      [4, 5],       // Rows 2 & 3
      [7, 8],       // Rows 3 & 4
      [10, 11],     // Rows 4 & 5
      [13, 14],     // Rows 5 & 6
      [16, 17],     // Rows 6 & 7
      [19, 20],     // Rows 7 & 8
      [22, 23],     // Rows 8 & 9
      [25, 26],     // Rows 9 & 10
      [28, 29],     // Rows 10 & 11
      [31, 32]      // Rows 11 & 12
    ];

    // To ensure exactly 6 corners with 0 overlap, choose 6 non-adjacent row pairs
    // The only disjoint sets of 6 pairs out of 11 rows are even indices: [0, 2, 4, 6, 8, 10]
    // which represent rows (1-2), (3-4), (5-6), (7-8), (9-10), (11-12)
    const disjointPairs = [
      [1, 2],
      [7, 8],
      [13, 14],
      [19, 20],
      [25, 26],
      [31, 32]
    ];

    const chosen = [];
    for (const pair of disjointPairs) {
      // Pick left (column 1-2) or right (column 2-3) randomly for each pair
      const pickId = pair[Math.floor(Math.random() * pair.length)];
      const cornerObj = allCorners.find(c => c.id === pickId);
      chosen.push(cornerObj);
    }
    return chosen;
  }

  // Helper to re-initialize corners and reset multipliers
  function resetCorners() {
    state.activeCorners = selectRandomNonOverlappingCorners();
    state.cornerUnits = {};
    for (const corner of state.activeCorners) {
      state.cornerUnits[corner.id] = 1;
    }
  }

  // 1. Initialize persistent state
  if (!state.initialized) {
    state.initialized = true;
    state.unit = config.betLimits.min;
    state.highestBankroll = bankroll;
    resetCorners();
  }

  // 2. Process previous spin outcome
  if (spinHistory && spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const winningNum = lastSpin.winningNumber;

    // Check which active corner hit
    let hitCornerId = null;
    for (const corner of state.activeCorners) {
      if (corner.numbers.includes(winningNum)) {
        hitCornerId = corner.id;
        break;
      }
    }

    // Check if we reached a new profit peak
    if (bankroll >= state.highestBankroll) {
      state.highestBankroll = bankroll;
      // Reset multipliers and choose a fresh random non-overlapping set
      resetCorners();
    } else {
      if (hitCornerId !== null) {
        // Hit, but still in deficit: Add +1 unit to all corners EXCEPT the winning corner
        for (const corner of state.activeCorners) {
          if (corner.id !== hitCornerId) {
            state.cornerUnits[corner.id] += 1;
          }
        }
      } else {
        // Miss: Add +1 unit to all active corners
        for (const corner of state.activeCorners) {
          state.cornerUnits[corner.id] += 1;
        }
      }
    }
  }

  // 3. Assemble bets
  const bets = [];
  let totalBetAmount = 0;

  for (const corner of state.activeCorners) {
    let amount = state.cornerUnits[corner.id] * state.unit;
    amount = Math.max(amount, config.betLimits.min);
    amount = Math.min(amount, config.betLimits.max);

    totalBetAmount += amount;
    bets.push({
      type: 'corner',
      value: corner.id,
      amount: amount
    });
  }

  // 4. Bankroll sufficiency check
  if (bankroll < totalBetAmount) {
    return [];
  }

  return bets;
}