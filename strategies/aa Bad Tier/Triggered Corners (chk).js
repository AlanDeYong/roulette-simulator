/**
 * ============================================================================
 * Strategy: Triggered Corners (Lucky 7 * 3)
 * Source: YouTube - "Triggered Corners | Roulette Strategy" by Mastering The Wheel
 * URL: https://youtu.be/7n6uvbswlY4
 * ============================================================================
 * 
 * THE FULL LOGIC IN DETAIL:
 * 1. Sector Grouping:
 *    The roulette layout is partitioned into 3 independent Bet Groups of 7 overlapping
 *    corners each (a cluster reminiscent of the "Lucky 7" concept):
 *    - Group 1 (Dozen 1 Sector): Corners with top-left numbers [1, 2, 4, 5, 7, 8, 10].
 *    - Group 2 (Dozen 2 Sector): Corners with top-left numbers [13, 14, 16, 17, 19, 20, 22].
 *    - Group 3 (Dozen 3 Sector): Corners with top-left numbers [22, 23, 25, 26, 28, 29, 31].
 *    Because the corners overlap heavily, inner numbers hit multiple corners simultaneously
 *    (e.g., in Group 3, numbers 26 and 29 hit 4 corners at once, yielding massive bonus payouts).
 * 
 * 2. Bet Trigger:
 *    Each group independently monitors wheel spin history:
 *    - A group tracks consecutive "misses" (spins where none of its covered numbers hit).
 *    - Trigger Condition: When a group observes 4 consecutive misses, it activates and begins betting.
 * 
 * 3. Progression & Win/Loss Handling:
 *    - Each active group operates an 8-level progression: [1, 2, 3, 5, 8, 14, 25, 45] units per corner.
 *    - Loss (Zero corners hit): Advance progression level (level + 1).
 *    - Partial Hit / Outside Hit (Hit without reaching group profit/session high):
 *      When an outer edge number hits (e.g., numbers 22, 24, 31, 33, 34 in Group 3), only 1 corner
 *      hits. The payout produces minor gain but not enough to reach session high.
 *      In this event, the strategy REBETS at the same progression level ("bonus chance").
 *    - Win (Multiple hits reaching session high / profit):
 *      Reset the group back to inactive state and resume waiting for 4 consecutive misses.
 *    - Exceeded 8 levels: Group resets to protect bankroll.
 * 
 * 4. The Goal (Target Profit & Stop-Loss):
 *    - Target Profit: +100 units above starting bankroll. Once reached, session stops.
 *    - Stop-Loss: Complete 8-level exhaustion per group or bankroll depletion below minimum requirement.
 * ============================================================================
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Minimum inside bet unit clamped to table limits
  const baseUnit = Math.max(config.betLimits.min, 1);
  const maxBet = config.betLimits.max;

  // 2. Corner Groups Definitions
  // In roulette layout, a corner is designated by its top-left number.
  // Each corner covers 4 numbers: [n, n+1, n+3, n+4]
  const GROUPS = [
    { id: 1, corners: [1, 2, 4, 5, 7, 8, 10] },
    { id: 2, corners: [13, 14, 16, 17, 19, 20, 22] },
    { id: 3, corners: [22, 23, 25, 26, 28, 29, 31] }
  ];

  // Helper to compute numbers covered by a list of corners
  function getCoveredNumbers(cornerList) {
    const nums = new Set();
    cornerList.forEach(c => {
      nums.add(c);
      nums.add(c + 1);
      nums.add(c + 3);
      nums.add(c + 4);
    });
    return Array.from(nums);
  }

  // Pre-calculate covered numbers map
  const groupCovered = GROUPS.map(g => ({
    id: g.id,
    corners: g.corners,
    numbers: getCoveredNumbers(g.corners)
  }));

  // 8-Level progression multiplier table
  const PROGRESSION = [1, 2, 3, 5, 8, 14, 25, 45];
  const MISS_TRIGGER = 4;
  const TARGET_PROFIT = 10000 * baseUnit;

  // 3. Initialize State
  if (!state.initialized) {
    state.initialized = true;
    state.initialBankroll = bankroll;
    state.sessionHigh = bankroll;
    state.targetReached = false;
    state.groups = {
      1: { active: false, misses: 0, level: 0, groupBankroll: 0, peak: 0 },
      2: { active: false, misses: 0, level: 0, groupBankroll: 0, peak: 0 },
      3: { active: false, misses: 0, level: 0, groupBankroll: 0, peak: 0 }
    };
  }

  // Update session high
  if (bankroll > state.sessionHigh) {
    state.sessionHigh = bankroll;
  }

  // Check target profit
  if (bankroll - state.initialBankroll >= TARGET_PROFIT) {
    state.targetReached = true;
    return [];
  }

  // 4. Process Last Spin Result (if history exists)
  if (spinHistory && spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const winningNum = lastSpin.winningNumber;

    groupCovered.forEach(g => {
      const gState = state.groups[g.id];
      const hitsGroup = g.numbers.includes(winningNum);

      if (!gState.active) {
        // Group is monitoring misses
        if (hitsGroup) {
          gState.misses = 0;
        } else {
          gState.misses += 1;
          if (gState.misses >= MISS_TRIGGER) {
            gState.active = true;
            gState.level = 0;
            gState.groupBankroll = 0;
            gState.peak = 0;
          }
        }
      } else {
        // Group was actively betting on the previous spin
        const currentMultiplier = PROGRESSION[gState.level] || 1;
        const currentBetPerCorner = Math.min(Math.max(baseUnit * currentMultiplier, config.betLimits.min), maxBet);
        const totalWagered = currentBetPerCorner * g.corners.length;

        // Calculate payout from this group's corners
        let winningCornersCount = 0;
        g.corners.forEach(c => {
          if ([c, c + 1, c + 3, c + 4].includes(winningNum)) {
            winningCornersCount++;
          }
        });

        // Corner payout is 8:1 (total return 9x bet per winning corner)
        const payout = winningCornersCount * (currentBetPerCorner * 9);
        const netProfit = payout - totalWagered;
        gState.groupBankroll += netProfit;

        if (winningCornersCount > 0) {
          // A hit occurred
          if (gState.groupBankroll > gState.peak) {
            // New group high reached -> Win reset
            gState.active = false;
            gState.misses = 0;
            gState.level = 0;
          } else {
            // Rebet rule: outside/low-profit hit -> stay at current level
            // Do not advance level, give the bonus another chance
          }
        } else {
          // Complete miss -> advance progression level
          gState.level += 1;
          if (gState.level >= PROGRESSION.length) {
            // Reached stop-loss limit of progression -> reset group
            gState.active = false;
            gState.misses = 0;
            gState.level = 0;
          }
        }
      }
    });
  }

  // 5. Construct Bets
  const bets = [];

  GROUPS.forEach(g => {
    const gState = state.groups[g.id];
    if (gState.active) {
      const multiplier = PROGRESSION[gState.level] || PROGRESSION[PROGRESSION.length - 1];
      let amount = baseUnit * multiplier;

      // Clamp bet amount to limits
      amount = Math.max(amount, config.betLimits.min);
      amount = Math.min(amount, maxBet);

      g.corners.forEach(c => {
        bets.push({
          type: 'corner',
          value: c,
          amount: amount
        });
      });
    }
  });

  return bets;
}