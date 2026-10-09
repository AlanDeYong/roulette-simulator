/**
 * Strategy: Corey's Cash Jar (Updated: Corner Bets Start at 1 Unit)
 * Source: The Roulette Master (https://youtu.be/fq0mZh0HvbA)
 *
 * Full Logic in Detail:
 * 1. Target Selection:
 *    - Tracks the last hit time for each of the 3 dozens (1st: 1-12, 2nd: 13-24, 3rd: 25-36).
 *    - Targets the coldest (longest dormant / sleeper) dozen.
 *
 * 2. Progression Steps:
 *    - Phase 1 (Single Dozen - 3 Attempts):
 *      - Step 1: Bet 1x Base Unit (default $15 / 3 outside units) on the coldest dozen.
 *      - Step 2: If Step 1 loses, repeat 1x Base Unit ($15) on the same dozen.
 *      - Step 3: If Step 2 loses, bet 2x Base Unit ($30) on the same dozen.
 *      - A win at Steps 1-3 yields net profit and resets to Step 1 on the newly coldest dozen.
 *
 *    - Phase 2 (Corner Recovery & Martingale Doubling):
 *      - If Step 3 loses:
 *        - Rebet the dozen at 4x Base Unit ($60).
 *        - Add two corner bets in the second coldest dozen starting at 1 unit each.
 *        - If this spin loses: Add another corner in the third dozen, then double all bets on the table.
 *        - Upon winning in Phase 2:
 *          - If net session profit / recovery baseline is achieved: Full reset back to Step 1.
 *          - If trailing session baseline: Remove the winning placement and continue with remaining bets.
 *
 * The Goal:
 * - Accumulate session profits and recover trailing drawdowns via structured multi-corner expansion.
 */

function bet(spinHistory, bankroll, config, state, utils) {
  const minOutside = config.betLimits.minOutside || 5;
  const minInside = config.betLimits.min || 1;
  const maxBet = config.betLimits.max || 1000;

  // Helper function to clamp bets
  function clamp(amount, minVal, maxVal) {
    return Math.min(Math.max(amount, minVal), maxVal);
  }

  // Helper to determine dozen of a number
  function getDozen(num) {
    if (num >= 1 && num <= 12) return 1;
    if (num >= 13 && num <= 24) return 2;
    if (num >= 25 && num <= 36) return 3;
    return 0;
  }

  // Initialize state
  if (!state.initialized) {
    state.initialized = true;
    state.stage = 'single_dozen'; // 'single_dozen' | 'recovery'
    state.singleStep = 1;         // 1, 2, or 3
    state.targetDozen = 1;
    state.recoveryLevel = 0;
    state.initialBankroll = bankroll;
    state.highWaterMark = bankroll;
    state.corners = [];
    state.dozenMultiplier = 1;
    state.cornerMultiplier = 1; // Corner bets start at 1 unit each
  }

  // Update high water mark
  if (bankroll > state.highWaterMark) {
    state.highWaterMark = bankroll;
  }

  // Calculate dormancy (spins since last hit) for each dozen
  const dozensDormancy = { 1: 999, 2: 999, 3: 999 };
  for (let d = 1; d <= 3; d++) {
    for (let i = spinHistory.length - 1; i >= 0; i--) {
      if (getDozen(spinHistory[i].winningNumber) === d) {
        dozensDormancy[d] = spinHistory.length - 1 - i;
        break;
      }
    }
  }

  // Sort dozens by dormancy descending (longest dormant first)
  const sortedDozens = [1, 2, 3].sort((a, b) => dozensDormancy[b] - dozensDormancy[a]);

  // Evaluate previous spin outcome if we had active bets
  if (spinHistory.length > 0 && state.lastBets && state.lastBets.length > 0) {
    const lastWinningNum = spinHistory[spinHistory.length - 1].winningNumber;
    const lastDozen = getDozen(lastWinningNum);

    let wonLastSpin = false;
    for (const b of state.lastBets) {
      if (b.type === 'dozen' && b.value === lastDozen) wonLastSpin = true;
      if (b.type === 'corner') {
        const cVal = b.value;
        const cornerNums = [cVal, cVal + 1, cVal + 3, cVal + 4];
        if (cornerNums.includes(lastWinningNum)) wonLastSpin = true;
      }
    }

    if (state.stage === 'single_dozen') {
      if (wonLastSpin) {
        state.stage = 'single_dozen';
        state.singleStep = 1;
        state.targetDozen = sortedDozens[0];
      } else {
        if (state.singleStep === 1) {
          state.singleStep = 2;
        } else if (state.singleStep === 2) {
          state.singleStep = 3;
        } else {
          // 3 single dozen attempts failed -> Transition to Recovery
          state.stage = 'recovery';
          state.recoveryLevel = 1;
          state.dozenMultiplier = 4;
          state.cornerMultiplier = 1; // Starts at 1 unit each on entry

          // Pick corners in second coldest dozen
          const secondColdest = sortedDozens[1];
          if (secondColdest === 1) state.corners = [2, 8];
          else if (secondColdest === 2) state.corners = [14, 20];
          else state.corners = [26, 32];
        }
      }
    } else if (state.stage === 'recovery') {
      if (wonLastSpin) {
        // If recovered back to or above high water mark baseline, reset
        if (bankroll >= state.highWaterMark - minOutside) {
          state.stage = 'single_dozen';
          state.singleStep = 1;
          state.targetDozen = sortedDozens[0];
          state.corners = [];
          state.recoveryLevel = 0;
          state.cornerMultiplier = 1;
        } else {
          // Trailing: re-spin with current setup to finish recovering
          state.dozenMultiplier = Math.max(1, Math.floor(state.dozenMultiplier / 2));
          state.cornerMultiplier = Math.max(1, Math.floor(state.cornerMultiplier / 2));
        }
      } else {
        // Loss during recovery: escalate
        state.recoveryLevel++;
        state.dozenMultiplier *= 2;
        state.cornerMultiplier *= 2;

        // Add additional corner if available
        if (state.corners.length < 5) {
          const thirdDozen = sortedDozens[2];
          const newCorner = thirdDozen === 1 ? 5 : thirdDozen === 2 ? 17 : 29;
          if (!state.corners.includes(newCorner)) {
            state.corners.push(newCorner);
          }
        }
      }
    }
  } else {
    // Session start
    state.targetDozen = sortedDozens[0];
  }

  // Construct bets array
  const bets = [];
  const baseUnit = minOutside * 3; // $15 when minOutside is $5

  if (state.stage === 'single_dozen') {
    let multiplier = 1;
    if (state.singleStep === 3) multiplier = 2;

    const amount = clamp(baseUnit * multiplier, minOutside, maxBet);
    bets.push({
      type: 'dozen',
      value: state.targetDozen,
      amount: amount
    });
  } else if (state.stage === 'recovery') {
    // Dozen bet
    const dozenAmount = clamp((baseUnit / 3) * state.dozenMultiplier * 3, minOutside, maxBet);
    bets.push({
      type: 'dozen',
      value: state.targetDozen,
      amount: dozenAmount
    });

    // Corner bets: start at 1 unit each (minInside * cornerMultiplier)
    for (const c of state.corners) {
      const cornerAmount = clamp(minInside * state.cornerMultiplier, minInside, maxBet);
      bets.push({
        type: 'corner',
        value: c,
        amount: cornerAmount
      });
    }
  }

  // Check total wager against bankroll
  const totalWager = bets.reduce((sum, b) => sum + b.amount, 0);
  if (totalWager > bankroll) {
    return []; // Insufficient bankroll
  }

  state.lastBets = bets;
  return bets;
}