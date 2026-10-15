/**
 * ============================================================================
 * ROULETTE STRATEGY: "No Boss Strategy" (Allan's No Boss Strategy)
 * ============================================================================
 * 
 * Source:
 * - Channel: WillVegas
 * - Video URL: https://youtu.be/eq5scNkgksY
 * - Strategy Origin: Allan's strategy featured via Roulette Masters
 * 
 * Strategy Logic & Triggers:
 * - The strategy operates on Dozen outside bets (1st 12 [1-12], 2nd 12 [13-24], 3rd 12 [25-36]).
 * - Trigger Condition: Wait patiently without placing any bets until three (3) consecutive 
 *   spins land in the exact same Dozen (e.g., three consecutive hits in the 3rd dozen: 25-36).
 * - Zeroes (0 / 00) break the sequence.
 * - Action: When 3 consecutive hits occur in Dozen X, immediately bet on the OTHER TWO 
 *   dozens (e.g., if Dozen 3 hits 3 times in a row, place bets on Dozen 1 and Dozen 2),
 *   betting against a 4th consecutive repeat.
 * 
 * Bet Progression (2-Bullet Recovery System):
 * - Level 1 (Initial Bet):
 *   * Place 100 units on each of the two non-repeating dozens (Total bet: 200 units).
 *   * If Win (2:1 payout): Net profit is +100 units. Reset progression to idle.
 * - Level 2 (Recovery Bet after a Loss):
 *   * If Level 1 loses (i.e., a 4th consecutive hit in the same dozen or zero), place 
 *     250 units on each of the two non-repeating dozens (Total bet: 500 units).
 *   * If Win: Returns 750 units. Total risked across Level 1 & 2 is 700 units, giving a 
 *     net profit of +50 units. Reset progression to idle.
 *   * If Loss (5th consecutive repeater or zero): Sequence ends with a stop loss of 
 *     700 units. Reset progression to idle.
 * 
 * The Goal:
 * - Target Profit: +200 units ($200 daily target, achieved via 2 successful cycles).
 * - Total Bankroll / Cycle Risk: 700 units (200 units Level 1 + 500 units Level 2).
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // Helper function to identify the dozen of a winning number (0 = zero/green)
  function getDozen(number) {
    if (number >= 1 && number <= 12) return 1;
    if (number >= 13 && number <= 24) return 2;
    if (number >= 25 && number <= 36) return 3;
    return 0; // 0 or 00
  }

  // Helper function to return the two opposite dozens
  function getOppositeDozens(dozen) {
    const allDozens = [1, 2, 3];
    return allDozens.filter(function (d) {
      return d !== dozen;
    });
  }

  // 1. Initialize State
  if (!state.initialized) {
    state.initialized = true;
    state.active = false;           // Active betting cycle flag
    state.progressionStep = 0;      // 0 = idle, 1 = Step 1 ($100x2), 2 = Step 2 ($250x2)
    state.targetDozens = [];        // The two non-repeating dozens to bet on
    state.initialBankroll = bankroll;
    state.targetProfit = 20000;       // Target profit of $200 / 200 units
  }

  // Stop if profit target has been achieved
  if (bankroll >= state.initialBankroll + state.targetProfit) {
    return [];
  }

  // 2. Evaluate Last Spin Result if Active in a Progression
  if (state.active && spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const lastDozen = getDozen(lastSpin.winningNumber);
    const won = state.targetDozens.indexOf(lastDozen) !== -1;

    if (won) {
      // Won the sequence - reset back to waiting
      state.active = false;
      state.progressionStep = 0;
      state.targetDozens = [];
    } else {
      // Lost the current step
      if (state.progressionStep === 1) {
        // Advance to Step 2 (Recovery)
        state.progressionStep = 2;
      } else {
        // Step 2 lost - cycle exhausted, reset to wait for a new pattern
        state.active = false;
        state.progressionStep = 0;
        state.targetDozens = [];
      }
    }
  }

  // 3. Trigger Condition Check (if currently idle)
  if (!state.active && spinHistory.length >= 3) {
    const d1 = getDozen(spinHistory[spinHistory.length - 1].winningNumber);
    const d2 = getDozen(spinHistory[spinHistory.length - 2].winningNumber);
    const d3 = getDozen(spinHistory[spinHistory.length - 3].winningNumber);

    // Check for 3 consecutive hits in the same valid dozen
    if (d1 !== 0 && d1 === d2 && d2 === d3) {
      state.active = true;
      state.progressionStep = 1;
      state.targetDozens = getOppositeDozens(d1);
    }
  }

  // 4. Calculate and Place Bets
  if (state.active && state.targetDozens.length === 2) {
    const minOutside = (config.betLimits && config.betLimits.minOutside) ? config.betLimits.minOutside : 5;
    const maxBet = (config.betLimits && config.betLimits.max) ? config.betLimits.max : 500;

    let betAmount = 0;
    if (state.progressionStep === 1) {
      betAmount = 100;
    } else if (state.progressionStep === 2) {
      betAmount = 250;
    }

    // Clamp bet amounts to table limits
    betAmount = Math.max(betAmount, minOutside);
    betAmount = Math.min(betAmount, maxBet);

    return [
      { type: 'dozen', value: state.targetDozens[0], amount: betAmount },
      { type: 'dozen', value: state.targetDozens[1], amount: betAmount }
    ];
  }

  // Idle state (waiting for 3 of the same dozen)
  return [];
}