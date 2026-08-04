/**
 * ROULETTE STRATEGY: THE TANK (Corrected Bet Layout)
 * 
 * Source:
 * - Video URL: https://youtu.be/SNgKrvbzUl4
 * - Channel: The Roulette Master
 * - Strategy Author: Roger
 * 
 * Strategy Logic Details:
 * 1. Covered Positions (11 Splits / 22 Numbers):
 *    - 0/2, 2/5, 8/11, 10/13, 16/19, 22/25, 28/31, 12/15, 18/21, 24/27, 30/33
 * 
 * 2. Progression System:
 *    - Base Level: 1 unit per active split position.
 *    - On Loss: Advance progression level and restore all 11 splits:
 *      * Level 1: 1 unit per split
 *      * Level 2: 3 units per split (+2 units)
 *      * Level 3: 5 units per split (+2 units)
 *      * Level 4: 7 units per split (+2 units)
 *      * Level 5+: Increase by +5 units per split on each consecutive loss (12, 17, 22... units)
 *    - On Win:
 *      * If bankroll >= starting/target bankroll (overall profit): Reset unit level to 1 and restore all 11 splits.
 *      * If still in drawdown: Maintain unit amount, but REMOVE the winning split position from active bets for the next spin.
 * 
 * 3. Goal:
 *    Achieve fast session profit targets using 22-number coverage and aggressive tiered unit progression on drawdowns.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  const minInside = config.betLimits.min || 1;
  const maxBet = config.betLimits.max || 500;

  // Corrected 11-split board positions
  const allSplits = [
    [0, 2],
    [2, 5],
    [8, 11],
    [10, 13],
    [12, 15],
    [16, 19],
    [18, 21],
    [22, 25],
    [24, 27],
    [28, 31],
    [30, 33]
  ];

  const getSplitKey = (s) => `${s[0]}-${s[1]}`;

  // Initialize persistent state
  if (!state.init) {
    state.init = true;
    state.startBankroll = bankroll;
    state.highestBankroll = bankroll;
    state.units = 1;
    state.activeSplitKeys = allSplits.map(getSplitKey);
    state.lastBetSplits = [];
  }

  // Track peak bankroll
  if (bankroll > state.highestBankroll) {
    state.highestBankroll = bankroll;
  }

  // Process previous spin result
  if (spinHistory && spinHistory.length > 0) {
    const lastResult = spinHistory[spinHistory.length - 1];
    const winningNum = lastResult.winningNumber;

    // Check if any placed split hit
    let hitSplitKey = null;
    for (const split of state.lastBetSplits) {
      if (split[0] === winningNum || split[1] === winningNum) {
        hitSplitKey = getSplitKey(split);
        break;
      }
    }

    if (hitSplitKey) {
      // WIN LOGIC
      if (bankroll >= state.startBankroll) {
        // Reset back to base level & reinstate all 11 splits
        state.units = 1;
        state.activeSplitKeys = allSplits.map(getSplitKey);
        state.startBankroll = bankroll; // Lock in session profit
      } else {
        // In drawdown: Remove the hit split and keep bet unit size same
        state.activeSplitKeys = state.activeSplitKeys.filter(key => key !== hitSplitKey);
        
        // Safety check: restore all if all splits were removed
        if (state.activeSplitKeys.length === 0) {
          state.activeSplitKeys = allSplits.map(getSplitKey);
        }
      }
    } else {
      // LOSS LOGIC: Restore all 11 splits & advance progression level
      state.activeSplitKeys = allSplits.map(getSplitKey);

      if (state.units === 1) {
        state.units = 3;
      } else if (state.units === 3) {
        state.units = 5;
      } else if (state.units === 5) {
        state.units = 7;
      } else {
        state.units += 5; // +5 units for losses after level 7
      }
    }
  }

  // Calculate clamped bet amount per split
  const currentUnit = state.units * minInside;
  const clampedAmount = Math.min(Math.max(currentUnit, minInside), maxBet);

  const bets = [];
  state.lastBetSplits = [];

  // Place active split bets
  for (const split of allSplits) {
    const key = getSplitKey(split);
    if (state.activeSplitKeys.includes(key)) {
      bets.push({
        type: 'split',
        value: split,
        amount: clampedAmount
      });
      state.lastBetSplits.push(split);
    }
  }

  return bets;
}