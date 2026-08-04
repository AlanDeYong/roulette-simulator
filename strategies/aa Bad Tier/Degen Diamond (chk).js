/**
 * ============================================================================
 * Roulette Strategy: Degen Diamond (Updated)
 * ============================================================================
 * Source:
 *   - Video: "This Strat Will Give You A Break From Losing || Degen Diamond"
 *   - URL: https://youtu.be/2GL-MafiSCk
 *   - YouTube Channel: CEG Dealer School
 *
 * Full Logic in Details:
 *   - The "Degen Diamond" strategy (created by Adam) covers a major portion of
 *     the roulette board using 6 inside bets and 1 outside bet (2nd Dozen):
 *       1. Line bet (Double Street) on 1-6 (value: 1) -> 2 units
 *       2. Line bet (Double Street) on 31-36 (value: 31) -> 2 units
 *       3. Corner bet on 10, 11, 13, 14 (value: 10) -> 1 unit
 *       4. Corner bet on 17, 18, 20, 21 (value: 17) -> 1 unit
 *       5. Corner bet on 22, 23, 25, 26 (value: 22) -> 1 unit
 *       6. Corner bet on 23, 24, 26, 27 (value: 23) -> 1 unit
 *       7. Dozen bet on 2nd Dozen (value: 2) -> 1 unit (Outside bet)
 *   - The overlapping corners on 22-26 and 23-27 combined with the 2nd Dozen
 *     create a high-payout jackpot zone on numbers 23 and 26.
 *
 * Full Bet Progression in Details:
 *   - Martingale progression on net loss:
 *     - Start with progression multiplier = 1.
 *     - If the previous spin resulted in a net loss (bankroll decreased),
 *       double the progression multiplier (multiplier = multiplier * 2).
 *     - If the previous spin resulted in a net win (bankroll increased),
 *       reset the progression multiplier back to 1.
 *
 * Goal:
 *   - Grind out small, consistent profits or maximize table play time.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Initialize State
  if (state.multiplier === undefined) {
    state.multiplier = 1;
  }
  if (state.lastBankroll === undefined) {
    state.lastBankroll = bankroll;
  }

  // 2. Evaluate previous spin outcome for Martingale progression
  if (spinHistory && spinHistory.length > 0) {
    const netChange = bankroll - state.lastBankroll;
    if (netChange < 0) {
      // Net loss -> Double the bet progression multiplier
      state.multiplier *= 2;
    } else if (netChange > 0) {
      // Net win -> Reset progression multiplier
      state.multiplier = 1;
    }
  }

  // Update bankroll tracking for the next spin evaluation
  state.lastBankroll = bankroll;

  // 3. Define Base Units
  const insideBase = config.betLimits.min;
  const outsideBase = config.betLimits.minOutside;
  const currentMultiplier = state.multiplier;

  // Bet layout definition
  const betDefinitions = [
    { type: 'line', value: 1, units: 2, isOutside: false },
    { type: 'line', value: 31, units: 2, isOutside: false },
    { type: 'corner', value: 10, units: 1, isOutside: false },
    { type: 'corner', value: 17, units: 1, isOutside: false },
    { type: 'corner', value: 22, units: 1, isOutside: false },
    { type: 'corner', value: 23, units: 1, isOutside: false },
    { type: 'dozen', value: 2, units: 1, isOutside: true }
  ];

  // Calculate total required amount for current multiplier
  let totalBetAmount = betDefinitions.reduce((sum, b) => {
    const base = b.isOutside ? outsideBase : insideBase;
    return sum + (base * b.units * currentMultiplier);
  }, 0);

  // Fallback if bankroll cannot cover the progression bet
  let activeMultiplier = currentMultiplier;
  if (bankroll < totalBetAmount) {
    activeMultiplier = 1;
    state.multiplier = 1;
    totalBetAmount = betDefinitions.reduce((sum, b) => {
      const base = b.isOutside ? outsideBase : insideBase;
      return sum + (base * b.units * activeMultiplier);
    }, 0);

    if (bankroll < totalBetAmount) {
      return [];
    }
  }

  // 4. Construct and Clamp Bets
  const bets = betDefinitions.map(b => {
    const base = b.isOutside ? outsideBase : insideBase;
    const minLimit = b.isOutside ? config.betLimits.minOutside : config.betLimits.min;
    let rawAmount = base * b.units * activeMultiplier;

    // Clamp bet amount to minimum bet limit and maximum table limit
    let clampedAmount = Math.max(rawAmount, minLimit);
    clampedAmount = Math.min(clampedAmount, config.betLimits.max);

    return {
      type: b.type,
      value: b.value,
      amount: clampedAmount
    };
  });

  return bets;
}