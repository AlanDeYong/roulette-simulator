/**
 * Strategy: Tag Team Roulette (by Stuart)
 * Source: https://www.youtube.com/watch?v=fkLHu5WB08E (Channel: The Roulette Master)
 *
 * Full Logic in Detail:
 * - The strategy operates in two phases without requiring any initial spin history wait:
 *   1. Phase 1 (Base Phase): Place a single 1-unit bet on an Even-Money outside position (e.g., Even).
 *      - If the bet wins, remain in Phase 1 with a 1-unit bet.
 *      - If the bet loses, enter Phase 2 ("Tag Team" recovery mode).
 *   2. Phase 2 (Tag Team Mode): Combine the Even-Money outside bet with two Dozen bets (1st Dozen and 3rd Dozen).
 *      - Both the Even-Money bet and each of the two Dozens start Phase 2 at 2 units each.
 *      - The two bet groups (Even-Money vs. Dozens) operate as independent legs that only reset when BOTH win on the exact same spin.
 *
 * Full Bet Progression in Detail:
 * - Base Unit: `config.betLimits.minOutside` ($10 in video).
 * - Phase 1 -> Phase 2 Trigger (Loss on Phase 1):
 *   - Even-Money bet increases to 2 units.
 *   - Dozen 1 and Dozen 3 are added at 2 units each.
 * - Phase 2 Progression Rules:
 *   - If BOTH the Even-Money bet AND one of the Dozens win on the same spin:
 *     - Reset completely back to Phase 1 (1 unit on Even-Money, remove Dozens).
 *   - If the Even-Money bet wins, but the Dozens lose:
 *     - Even-Money bet stays at its current amount.
 *     - Both Dozen bets double (2x).
 *   - If one of the Dozens wins, but the Even-Money bet loses:
 *     - Both Dozen bets stay at their current amount.
 *     - Even-Money bet doubles (2x).
 *   - If BOTH the Even-Money bet AND the Dozens lose (e.g., 0 or unbet Dozen opposite parity):
 *     - Both the Even-Money bet and the Dozen bets double (2x).
 *
 * The Goal:
 * - Accumulate steady wins in Phase 1 and use the dual-leg "Tag Team" overlap in Phase 2 to recover losses and generate a surge in profit as soon as an overlapping number (e.g., an Even number in the 1st or 3rd Dozen) hits, resetting immediately upon a dual hit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  const baseUnit = config.betLimits.minOutside;

  // Initialize persistent state on first spin
  if (!state.initialized) {
    state.initialized = true;
    state.phase = 1; // 1 = Single Even-Money Bet, 2 = Tag Team (Even-Money + 2 Dozens)
    state.evenMultiplier = 1;
    state.dozenMultiplier = 0;
    state.outsideType = 'even'; // Default 1:1 bet used in the video
    state.dozens = [1, 3]; // 1st and 3rd Dozens
  }

  // Evaluate previous spin if history exists
  if (spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const num = lastSpin.winningNumber;
    const color = lastSpin.winningColor;

    // Helper to evaluate 1:1 outside bet win
    const didOutsideWin = (n, c, type) => {
      if (n === 0 || n === '00' || n === 37) return false;
      if (type === 'even') return n % 2 === 0;
      if (type === 'odd') return n % 2 !== 0;
      if (type === 'red') return c === 'red';
      if (type === 'black') return c === 'black';
      if (type === 'low') return n >= 1 && n <= 18;
      if (type === 'high') return n >= 19 && n <= 36;
      return false;
    };

    // Helper to evaluate Dozens win
    const didDozensWin = (n, activeDozens) => {
      if (n === 0 || n === '00' || n === 37) return false;
      const hitDozen = Math.ceil(n / 12);
      return activeDozens.includes(hitDozen);
    };

    const outsideWon = didOutsideWin(num, color, state.outsideType);

    if (state.phase === 1) {
      if (outsideWon) {
        // Stay at 1 unit in Phase 1
        state.evenMultiplier = 1;
        state.dozenMultiplier = 0;
      } else {
        // Enter Phase 2 (Tag Team mode) at 2 units on all positions
        state.phase = 2;
        state.evenMultiplier = 2;
        state.dozenMultiplier = 2;
      }
    } else if (state.phase === 2) {
      const dozensWon = didDozensWin(num, state.dozens);

      if (outsideWon && dozensWon) {
        // Both legs hit simultaneously -> Reset to Phase 1
        state.phase = 1;
        state.evenMultiplier = 1;
        state.dozenMultiplier = 0;
      } else if (outsideWon && !dozensWon) {
        // Outside won (stays same), Dozens lost (double)
        state.dozenMultiplier *= 2;
      } else if (!outsideWon && dozensWon) {
        // Dozens won (stay same), Outside lost (doubles)
        state.evenMultiplier *= 2;
      } else {
        // Both lost -> Both double
        state.evenMultiplier *= 2;
        state.dozenMultiplier *= 2;
      }
    }
  }

  // Construct bets and clamp to table limits
  const bets = [];

  let evenAmount = baseUnit * state.evenMultiplier;
  evenAmount = Math.max(evenAmount, config.betLimits.minOutside);
  evenAmount = Math.min(evenAmount, config.betLimits.max);

  if (state.phase === 1) {
    if (bankroll < evenAmount) return null;
    bets.push({ type: state.outsideType, amount: evenAmount });
  } else {
    let dozenAmount = baseUnit * state.dozenMultiplier;
    dozenAmount = Math.max(dozenAmount, config.betLimits.minOutside);
    dozenAmount = Math.min(dozenAmount, config.betLimits.max);

    const totalRequired = evenAmount + dozenAmount * 2;
    if (bankroll < totalRequired) {
      // If bankroll cannot support the full Tag Team progression, stop or reset
      return null;
    }

    bets.push({ type: state.outsideType, amount: evenAmount });
    bets.push({ type: 'dozen', value: state.dozens[0], amount: dozenAmount });
    bets.push({ type: 'dozen', value: state.dozens[1], amount: dozenAmount });
  }

  return bets;
}