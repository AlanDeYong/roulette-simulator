/**
 * Profit Stacker Strategy
 * 
 * Source:
 * - Video URL: https://youtu.be/TKeKrmMVtgA
 * - Channel: The Roulette Master (Strategy submitted by subscriber Jason)
 * 
 * Strategy Logic in Detail:
 * - The strategy plays two simultaneous bets: an even-money bet on Low (1-18) and a 2:1 multiplier bet on 1st 12 (Dozen 1).
 * - Base betting ratio is 2 units on Low (1-18) and 1 unit on First 12.
 * - On the first loss, only the Low bet increases (from 2 units to 4 units) while the 1st 12 bet stays at 1 unit.
 * - On subsequent consecutive losses, both bets advance independently following Fibonacci progression sequences:
 *   - Low Bet Sequence (Units): [2, 4, 6, 10, 16, 26, 42, 68, 110, 178, ...]
 *   - 1st 12 Sequence (Units): [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, ...]
 * - Progression / Recovery Rules:
 *   - If a specific bet wins, its progression steps back 2 levels in its Fibonacci sequence (or resets to level 0 if at/below start).
 *   - If Low wins on step 1 (4 units) or if a win brings the session bankroll back to/above the starting bankroll or net profit, both bets reset to base level (2 units / 1 unit).
 * 
 * Goal:
 * - Target profit per session or reset back to base level upon achieving positive net recovery/profit.
 * 
 * @param {Array} spinHistory - Array of past spin objects [{ winningNumber, winningColor }, ...]
 * @param {number} bankroll - Current available bankroll
 * @param {Object} config - Configuration object containing betLimits
 * @param {Object} state - Persistent state object between spins
 * @param {Object} utils - Helper utilities
 * @returns {Array} Array of bet objects
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Determine base unit from config limits
  const minOutside = (config && config.betLimits && config.betLimits.minOutside) ? config.betLimits.minOutside : 5;
  const maxBet = (config && config.betLimits && config.betLimits.max) ? config.betLimits.max : 500;
  const baseUnit = minOutside;

  // 2. Fibonacci Progression Sequences (in units)
  const lowSequence = [2, 4, 6, 10, 16, 26, 42, 68, 110, 178, 288, 466];
  const dozenSequence = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];

  // 3. Initialize persistent state
  if (state.peakBankroll === undefined) {
    state.peakBankroll = bankroll;
    state.lowIndex = 0;
    state.dozenIndex = 0;
    state.consecutiveLosses = 0;
  }

  // Update peak bankroll if we hit a new high
  if (bankroll > state.peakBankroll) {
    state.peakBankroll = bankroll;
  }

  // 4. Update state based on previous spin result
  if (spinHistory && spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const num = lastSpin.winningNumber;

    const hitLow = (num >= 1 && num <= 18);
    const hitDozen1 = (num >= 1 && num <= 12);

    // Reset fully only when the session's peak profit is reached
    if (bankroll >= state.peakBankroll) {
      state.lowIndex = 0;
      state.dozenIndex = 0;
      state.consecutiveLosses = 0;
    } else {
      if (!hitLow && !hitDozen1) {
        // Both lost
        state.consecutiveLosses++;
        if (state.consecutiveLosses === 1) {
          // First loss: Low increases to step 1 (4 units), Dozen stays at step 0 (1 unit)
          state.lowIndex = 1;
          state.dozenIndex = 0;
        } else {
          // Subsequent losses: advance both Fibonacci indexes
          state.lowIndex = Math.min(state.lowIndex + 1, lowSequence.length - 1);
          state.dozenIndex = Math.min(state.dozenIndex + 1, dozenSequence.length - 1);
        }
      } else {
        // At least one won
        if (hitLow) {
          if (state.lowIndex <= 1) {
            state.lowIndex = 0;
          } else {
            state.lowIndex = Math.max(0, state.lowIndex - 2);
          }
        } else {
          // Low lost on this spin
          state.lowIndex = Math.min(state.lowIndex + 1, lowSequence.length - 1);
        }

        if (hitDozen1) {
          state.dozenIndex = Math.max(0, state.dozenIndex - 2);
        } else {
          // Dozen lost on this spin
          if (state.consecutiveLosses > 0) {
            state.dozenIndex = Math.min(state.dozenIndex + 1, dozenSequence.length - 1);
          }
        }

        if (hitLow && hitDozen1) {
          state.consecutiveLosses = 0;
        }
      }
    }
  }

  // 5. Calculate Bet Amounts
  let lowUnits = lowSequence[state.lowIndex];
  let dozenUnits = dozenSequence[state.dozenIndex];

  let lowBetAmount = lowUnits * baseUnit;
  let dozenBetAmount = dozenUnits * baseUnit;

  // Clamp bet amounts to table limits
  lowBetAmount = Math.max(minOutside, Math.min(maxBet, lowBetAmount));
  dozenBetAmount = Math.max(minOutside, Math.min(maxBet, dozenBetAmount));

  // 6. Return Bet Array
  return [
    { type: 'low', amount: lowBetAmount },
    { type: 'dozen', value: 1, amount: dozenBetAmount }
  ];
}