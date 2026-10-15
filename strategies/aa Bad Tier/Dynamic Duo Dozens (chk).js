/**
 * ============================================================================
 * STRATEGY: The Dynamic Duo Roulette System
 * ============================================================================
 * Source:
 * - YouTube Channel: The Roulette Master
 * - Video URL: https://youtu.be/1gS7UGsgxTQ
 * - Originator: Fred (Subscriber submission)
 *
 * FULL LOGIC & RULES:
 * 1. Initial Bet Placement:
 *    - Always covers two dozens simultaneously (24 out of 37 numbers on European roulette).
 *    - On the very first spin, bets are placed on Dozen 1 and Dozen 2 at base unit.
 *    - Subsequently, bets cover the two dozens other than the last winning dozen.
 *
 * 2. Bet Progression & State Management:
 *    - Base Unit: Determined by `config.betLimits.minOutside`.
 *    - Case A: Base Level Win (both bets at 1 unit):
 *      - Remove bet from the winning dozen.
 *      - Place 1 base unit on the inactive (unbet) dozen.
 *      - Keep the other dozen at 1 base unit.
 *    - Case B: In-Progression Hit (at least one bet > 1 unit and net != 0):
 *      - The dozen that hit resets and moves to the inactive dozen with 1 base unit.
 *      - The other active dozen (which did not hit) increases by 1 unit (+config.minIncrementalBet).
 *    - Case C: Exact Break-Even (Net Win == 0, e.g., 1 unit vs 2 units where 1 unit hits):
 *      - Rebet and spin: Maintain the exact same dozen selections and amounts.
 *    - Case D: Total Loss (Neither dozen hits or 0/00 lands):
 *      - Keep the current two dozens.
 *      - Increase both dozen bets by 1 unit (+config.minIncrementalBet).
 *
 * 3. The Goal:
 *    - Grind consistent profits with high table coverage (64.8% on European roulette).
 *    - Session profit target typically ranges between +20 to +50 units (e.g., $200 - $500).
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Determine base unit and incremental bet
  const baseUnit = Math.max(config.betLimits.minOutside || 5, 1);
  const increment = config.incrementMode === 'base'
    ? baseUnit
    : (config.minIncrementalBet || baseUnit);

  // Helper to clamp bets to table limits
  function clamp(amount) {
    let clamped = Math.max(amount, config.betLimits.minOutside);
    clamped = Math.min(clamped, config.betLimits.max);
    return clamped;
  }

  // Helper to identify dozen (1: 1-12, 2: 13-24, 3: 25-36, 0: Green/Zero)
  function getDozen(number) {
    if (number >= 1 && number <= 12) return 1;
    if (number >= 13 && number <= 24) return 2;
    if (number >= 25 && number <= 36) return 3;
    return 0;
  }

  // 2. Initialize State
  if (!state.initialized) {
    state.initialized = true;
    state.activeDozens = [1, 2];
    state.bets = {
      1: baseUnit,
      2: baseUnit,
      3: baseUnit
    };
  }

  // 3. Process Previous Spin Result (if history exists)
  if (spinHistory && spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const winningDozen = getDozen(lastSpin.winningNumber);
    const [d1, d2] = state.activeDozens;

    const bet1 = state.bets[d1] || baseUnit;
    const bet2 = state.bets[d2] || baseUnit;
    const totalBet = bet1 + bet2;

    const hitD1 = (winningDozen === d1);
    const hitD2 = (winningDozen === d2);

    if (hitD1 || hitD2) {
      const winningBetAmount = hitD1 ? bet1 : bet2;
      const netPayout = (winningBetAmount * 3) - totalBet;

      if (netPayout === 0) {
        // Break-Even: Rebet and spin (keep exact same dozens and amounts)
      } else {
        // One dozen hit (Win or Partial Loss)
        const winningD = hitD1 ? d1 : d2;
        const losingD = hitD1 ? d2 : d1;
        const inactiveD = [1, 2, 3].find(d => d !== d1 && d !== d2);

        // Check if both bets were at base level
        const wasAtBase = (bet1 === baseUnit && bet2 === baseUnit);

        if (wasAtBase) {
          state.bets[inactiveD] = baseUnit;
          state.bets[losingD] = baseUnit;
        } else {
          state.bets[inactiveD] = baseUnit;
          state.bets[losingD] = clamp(state.bets[losingD] + increment);
        }

        state.activeDozens = [losingD, inactiveD];
      }
    } else {
      // Total Loss (Missed both dozens or hit 0/00)
      state.bets[d1] = clamp(state.bets[d1] + increment);
      state.bets[d2] = clamp(state.bets[d2] + increment);
      // activeDozens remain unchanged
    }
  }

  // 4. Construct and return bet array
  const [targetDozen1, targetDozen2] = state.activeDozens;
  const amount1 = clamp(state.bets[targetDozen1]);
  const amount2 = clamp(state.bets[targetDozen2]);

  return [
    { type: 'dozen', value: targetDozen1, amount: amount1 },
    { type: 'dozen', value: targetDozen2, amount: amount2 }
  ];
}