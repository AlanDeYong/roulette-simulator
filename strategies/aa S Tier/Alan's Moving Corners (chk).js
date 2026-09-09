/**
 * ============================================================================
 * ROULETTE STRATEGY: Alan's Moving Corners (Non-Overlapping Variant)
 * ============================================================================
 * 
 * Source:
 * - YouTube Video: https://youtu.be/uZT63YrlpUw ("HOW ALAN MADE $600 FAST AND EASY!")
 * - Channel: The Roulette Master
 * 
 * ----------------------------------------------------------------------------
 * The Full Logic in Detail:
 * ----------------------------------------------------------------------------
 * 1. Base Setup:
 *    - Base bet per corner is configured to $1 (clamped to table minimum).
 *    - Starts with 3 non-overlapping corners randomly selected from the board.
 *    - Once selected, active corners remain fixed until a cycle reset.
 *    - Any newly added corner during progression must also be non-overlapping 
 *      with all currently active corners.
 * 
 * 2. Progression Rules & Loss Handling:
 *    - Loss 1 (from 3 corners):
 *      Add a 4th non-overlapping corner and double the bet on all active corners 
 *      (e.g., 4 corners @ $2 each = $8 total).
 *    - Loss 2 (from 4 corners):
 *      Add a 5th non-overlapping corner and double all active corners 
 *      (e.g., 5 corners @ $4 each = $20 total).
 *    - Loss 3 (from 5 corners):
 *      Add a 6th non-overlapping corner and double all active corners 
 *      for the final time (e.g., 6 corners @ $8 each = $48 total).
 *    - Loss 4+ (at 6 corners):
 *      Stop doubling to protect the bankroll. Add a fixed linear increment 
 *      (2 base units = +$2) per corner on each subsequent loss.
 * 
 * 3. Recovery & Win Handling:
 *    - If a win occurs and total bankroll is at or above the cycle starting bankroll 
 *      plus base profit:
 *      Full reset! Select 3 fresh random non-overlapping corners and reset bet 
 *      amount to the base unit ($1).
 *    - If a win occurs during a deeper progression stage but overall profit has 
 *      NOT yet been achieved:
 *      Remove the specific winning corner that hit, add the linear increment 
 *      (+$2) to each remaining active corner, and continue spinning until 
 *      full recovery is reached.
 * 
 * ----------------------------------------------------------------------------
 * The Goal:
 * ----------------------------------------------------------------------------
 * - Lock in net profit upon winning cycles using strict non-overlapping corner 
 *   coverage, capping exponential growth at 6 corners, and using stepped linear 
 *   recovery.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. All valid corner anchor numbers (top-left number of each 2x2 box)
  const ALL_CORNERS = [
    1, 2, 4, 5, 7, 8, 10, 11, 13, 14, 16, 17, 19, 20, 22, 23, 25, 26, 28, 29, 31, 32
  ];

  // Helper: Returns the 4 numbers covered by a given corner top-left value
  function getCornerNumbers(corner) {
    return [corner, corner + 1, corner + 3, corner + 4];
  }

  // Helper: Checks if two corners share any numbers
  function doCornersOverlap(c1, c2) {
    const nums1 = getCornerNumbers(c1);
    const nums2 = getCornerNumbers(c2);
    return nums1.some(num => nums2.includes(num));
  }

  // Helper: Checks if a corner overlaps with any corner in a list
  function overlapsWithAny(corner, cornerList) {
    return cornerList.some(existing => doCornersOverlap(corner, existing));
  }

  // Helper: Pick N mutually non-overlapping corners randomly from scratch
  function pickFreshNonOverlappingCorners(count) {
    const shuffled = [...ALL_CORNERS].sort(() => Math.random() - 0.5);
    const selected = [];
    for (const c of shuffled) {
      if (!overlapsWithAny(c, selected)) {
        selected.push(c);
        if (selected.length === count) break;
      }
    }
    return selected;
  }

  // Helper: Pick 1 additional corner non-overlapping with currently active corners
  function pickAdditionalNonOverlappingCorner(existingCorners) {
    const candidates = ALL_CORNERS.filter(c => !overlapsWithAny(c, existingCorners));
    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  // 2. Base bet parameters ($1 base per corner, clamped to limits)
  const minInside = config.betLimits && config.betLimits.min ? config.betLimits.min : 1;
  const maxBet = config.betLimits && config.betLimits.max ? config.betLimits.max : 500;
  
  const baseBet = Math.max(minInside, 1);
  const linearIncrement = config.minIncrementalBet !== undefined
    ? Math.max(config.minIncrementalBet, baseBet * 2)
    : baseBet * 2; // +$2 increment per corner

  // 3. Initialize state on the first spin
  if (state.stage === undefined) {
    state.stage = 0; // 0: 3 corners, 1: 4 corners, 2: 5 corners, 3: 6 corners, 4+: linear add
    state.activeCorners = pickFreshNonOverlappingCorners(3);
    state.currentBetPerCorner = baseBet;
    state.cycleStartBankroll = bankroll;
  }

  // 4. Process previous spin result if available
  if (spinHistory && spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const lastWinningNum = lastSpin.winningNumber;

    // Determine if any active corner hit
    let winningCornerHit = null;
    if (state.activeCorners && state.activeCorners.length > 0) {
      for (const corner of state.activeCorners) {
        if (getCornerNumbers(corner).includes(lastWinningNum)) {
          winningCornerHit = corner;
          break;
        }
      }
    }

    const wonLastSpin = winningCornerHit !== null;

    if (wonLastSpin) {
      // Check if we reached a net profit relative to cycle start
      if (bankroll >= state.cycleStartBankroll + baseBet) {
        // Full cycle reset: choose 3 new random non-overlapping corners
        state.stage = 0;
        state.activeCorners = pickFreshNonOverlappingCorners(3);
        state.currentBetPerCorner = baseBet;
        state.cycleStartBankroll = bankroll;
      } else {
        // Partial recovery: remove only the corner that hit, keep the rest
        state.activeCorners = state.activeCorners.filter(c => c !== winningCornerHit);

        if (state.activeCorners.length === 0) {
          // Exhausted all corners; reset cycle
          state.stage = 0;
          state.activeCorners = pickFreshNonOverlappingCorners(3);
          state.currentBetPerCorner = baseBet;
          state.cycleStartBankroll = bankroll;
        } else {
          // Add linear increment to remaining active corners
          state.currentBetPerCorner += linearIncrement;
          state.stage = Math.max(state.stage, 4);
        }
      }
    } else {
      // Loss Progression
      if (state.stage === 0) {
        // Add 4th non-overlapping corner and double
        const newCorner = pickAdditionalNonOverlappingCorner(state.activeCorners);
        if (newCorner !== null) state.activeCorners.push(newCorner);
        state.currentBetPerCorner *= 2;
        state.stage = 1;
      } else if (state.stage === 1) {
        // Add 5th non-overlapping corner and double
        const newCorner = pickAdditionalNonOverlappingCorner(state.activeCorners);
        if (newCorner !== null) state.activeCorners.push(newCorner);
        state.currentBetPerCorner *= 2;
        state.stage = 2;
      } else if (state.stage === 2) {
        // Add 6th non-overlapping corner and double (final double)
        const newCorner = pickAdditionalNonOverlappingCorner(state.activeCorners);
        if (newCorner !== null) state.activeCorners.push(newCorner);
        state.currentBetPerCorner *= 2;
        state.stage = 3;
      } else {
        // Deep recovery: Stop doubling, add linear increment per corner
        state.currentBetPerCorner += linearIncrement;
        state.stage++;
      }
    }
  }

  // 5. Enforce limits and bankroll boundaries
  let betAmount = state.currentBetPerCorner;
  betAmount = Math.max(betAmount, minInside);
  betAmount = Math.min(betAmount, maxBet);

  // Proportional downscale if bankroll cannot cover all active corners
  if (betAmount * state.activeCorners.length > bankroll) {
    betAmount = Math.floor(bankroll / state.activeCorners.length);
  }

  if (betAmount < minInside) {
    return []; // Insufficient bankroll to place minimum bet
  }

  // 6. Return bet objects for all persistent active corners
  return state.activeCorners.map(corner => ({
    type: 'corner',
    value: corner,
    amount: betAmount
  }));
}