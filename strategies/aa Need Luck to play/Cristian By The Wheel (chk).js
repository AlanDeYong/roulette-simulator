/**
 * ============================================================================
 * Roulette Strategy: Cristian By The Wheel
 * ============================================================================
 * 
 * - Source: https://youtu.be/5i-lVm6BViQ
 * - Channel: Ninja Gamblers
 * 
 * - The Full Logic in Details:
 *   This is a flat-betting layout strategy covering 18 numbers across two main
 *   clusters centered around numbers 17 and 26.
 *   
 *   Trigger / Condition:
 *   - Bets are placed on every single spin.
 *   
 *   Layout Structure (based on a base unit, standard $5 per unit = $150 total):
 *   Cluster 1 (Centered around 17):
 *     - Straight up on 17 (2 units)
 *     - 4 surrounding Corners: [13,14,16,17], [14,15,17,18], [16,17,19,20], [17,18,20,21] (2 units each)
 *     - Middle Street 16-18 (1 unit)
 *     - Flanking Streets 13-15 and 19-21 (2 units each)
 * 
 *   Cluster 2 (Centered around 26):
 *     - Straight up on 26 (2 units)
 *     - 4 surrounding Corners: [22,23,25,26], [23,24,26,27], [25,26,28,29], [26,27,29,30] (2 units each)
 *     - Middle Street 25-27 (1 unit)
 *     - Flanking Streets 22-24 and 28-30 (2 units each)
 * 
 * - The Full Bet Progression in Details:
 *   - Flat Betting: Bet amounts remain fixed across all spins. There is no doubling 
 *     or progression after a win or loss.
 * 
 * - The Goal:
 *   - Achieve consistent small-to-medium wins ($60, $90, $150 net profit on hits)
 *     while maintaining a ~48.6% overall hit frequency, while positioning for a 
 *     massive "jackpot" payout ($630 net profit) whenever 17 or 26 lands.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // Determine base unit based on minimum inside bet limits
  const unit = config && config.betLimits && config.betLimits.min ? config.betLimits.min : 5;
  const minBet = config && config.betLimits && config.betLimits.min ? config.betLimits.min : 2;
  const maxBet = config && config.betLimits && config.betLimits.max ? config.betLimits.max : 500;

  // Helper to clamp bet amounts to config table limits
  function clamp(amount) {
    return Math.max(minBet, Math.min(amount, maxBet));
  }

  const bets = [
    // --- Cluster 1: Centered on 17 ---
    { type: 'number', value: 17, amount: clamp(unit * 2) },
    { type: 'corner', value: 13, amount: clamp(unit * 2) }, // Covers 13, 14, 16, 17
    { type: 'corner', value: 14, amount: clamp(unit * 2) }, // Covers 14, 15, 17, 18
    { type: 'corner', value: 16, amount: clamp(unit * 2) }, // Covers 16, 17, 19, 20
    { type: 'corner', value: 17, amount: clamp(unit * 2) }, // Covers 17, 18, 20, 21
    { type: 'street', value: 13, amount: clamp(unit * 2) }, // Covers 13, 14, 15
    { type: 'street', value: 16, amount: clamp(unit * 1) }, // Covers 16, 17, 18
    { type: 'street', value: 19, amount: clamp(unit * 2) }, // Covers 19, 20, 21

    // --- Cluster 2: Centered on 26 ---
    { type: 'number', value: 26, amount: clamp(unit * 2) },
    { type: 'corner', value: 22, amount: clamp(unit * 2) }, // Covers 22, 23, 25, 26
    { type: 'corner', value: 23, amount: clamp(unit * 2) }, // Covers 23, 24, 26, 27
    { type: 'corner', value: 25, amount: clamp(unit * 2) }, // Covers 25, 26, 28, 29
    { type: 'corner', value: 26, amount: clamp(unit * 2) }, // Covers 26, 27, 29, 30
    { type: 'street', value: 22, amount: clamp(unit * 2) }, // Covers 22, 23, 24
    { type: 'street', value: 25, amount: clamp(unit * 1) }, // Covers 25, 26, 27
    { type: 'street', value: 28, amount: clamp(unit * 2) }  // Covers 28, 29, 30
  ];

  return bets;
}