/**
 * ============================================================================
 * ROUTLETTE STRATEGY: FEED THE BOX
 * ============================================================================
 * Source:
 * - Video: "No Flashy Title Just Watch The Video || Feed the Box"
 * - Channel: CEG Dealer School
 * - URL: https://youtu.be/pQtVc8wazrc
 *
 * Full Logic Details:
 * 1. Phase 1 - Triple Entry:
 *    - The strategy begins by placing three $20 (or scaled base units) 1:1 outside 
 *      bets (e.g., Red, Even, High [19-36]).
 *    - The goal in Phase 1 is to accumulate $60 in total net profit to fund a single 
 *      "bullet" for Phase 2.
 *    - The system continues re-betting Phase 1 on losses until $60 net profit is secured.
 *
 * 2. Phase 2 - Feed the Box:
 *    - Once $60 profit is secured from Phase 1, the player transitions to Phase 2.
 *    - $60 is placed across an inside layout covering the middle section ("The Box", 
 *      specifically 13-24):
 *      - Line Bet (13-18): $15
 *      - Line Bet (19-24): $15
 *      - Corner Bet (14, 15, 17, 18): $10
 *      - Split Bet (16, 17): $10
 *      - Split Bet (17, 20): $10
 *    - If an inside number hits, the payout ranges from $15 up to $360 depending on coverage overlap.
 *
 * Bet Progression Details:
 * - Phase 1: Flat betting three $20 outside bets until +$60 profit target is achieved.
 * - Phase 2: Single $60 inside "Box" shot funded purely by Phase 1 winnings.
 *   - On Win: Winnings are collected/pocketed, and the system continues in Phase 2 or resets to Phase 1.
 *   - On Loss: System returns to Phase 1 to build another $60 bullet.
 *
 * Goal / Stop-Loss:
 * - Bankroll Target: Profit progression targeting 6x returns on the inside box hits.
 * - Stop Loss: Standard bankroll protection or when bankroll falls below minimum required bet.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Initialize State
  if (!state.phase) {
    state.phase = 'TRIPLE_ENTRY';
    state.accumulatedProfit = 0;
    state.lastBankroll = bankroll;
  }

  // Determine limits and base unit multipliers
  const minOutside = config.betLimits.minOutside || 5;
  const minInside = config.betLimits.min || 2;
  const maxBet = config.betLimits.max || 500;

  // Scale base amounts relative to table min limits
  const p1Unit = Math.max(20, minOutside);
  const p1TargetProfit = p1Unit * 3; // $60 target when unit is $20

  // Update profit tracking if we have spin history
  if (spinHistory.length > 0) {
    const lastProfit = bankroll - state.lastBankroll;
    state.lastBankroll = bankroll;

    if (state.phase === 'TRIPLE_ENTRY') {
      state.accumulatedProfit += lastProfit;
      if (state.accumulatedProfit >= p1TargetProfit) {
        state.phase = 'FEED_THE_BOX';
        state.accumulatedProfit = 0;
      }
    } else if (state.phase === 'FEED_THE_BOX') {
      // After 1 spin in Phase 2, return to Phase 1 to rebuild or re-feed
      if (lastProfit <= 0) {
        state.phase = 'TRIPLE_ENTRY';
        state.accumulatedProfit = 0;
      }
    }
  } else {
    state.lastBankroll = bankroll;
  }

  // 2. Execute Phase 1: Triple Entry (3x 1:1 Outside Bets)
  if (state.phase === 'TRIPLE_ENTRY') {
    let betAmount = Math.min(Math.max(p1Unit, minOutside), maxBet);

    // Verify sufficient bankroll for 3 outside bets
    if (bankroll < betAmount * 3) {
      betAmount = Math.max(Math.floor(bankroll / 3), minOutside);
      if (betAmount < minOutside) return [];
    }

    return [
      { type: 'red', amount: betAmount },
      { type: 'even', amount: betAmount },
      { type: 'high', amount: betAmount }
    ];
  }

  // 3. Execute Phase 2: Feed the Box ($60 inside box coverage on 13-24)
  if (state.phase === 'FEED_THE_BOX') {
    // Standard $60 distribution scaled if needed
    let line1 = Math.min(Math.max(15, minInside), maxBet);
    let line2 = Math.min(Math.max(15, minInside), maxBet);
    let corner = Math.min(Math.max(10, minInside), maxBet);
    let split1 = Math.min(Math.max(10, minInside), maxBet);
    let split2 = Math.min(Math.max(10, minInside), maxBet);

    const totalBoxBet = line1 + line2 + corner + split1 + split2;
    if (bankroll < totalBoxBet) {
      // Fallback if bankroll cannot support full box
      state.phase = 'TRIPLE_ENTRY';
      return [];
    }

    return [
      { type: 'line', value: 13, amount: line1 },        // Line 13-18
      { type: 'line', value: 19, amount: line2 },        // Line 19-24
      { type: 'corner', value: 14, amount: corner },     // Corner 14, 15, 17, 18
      { type: 'split', value: [16, 17], amount: split1 }, // Split 16-17
      { type: 'split', value: [17, 20], amount: split2 }  // Split 17-20
    ];
  }

  return [];
}