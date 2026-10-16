/**
 * Strategy: Triple Triangles Roulette Strategy
 * Source: https://youtu.be/hI28AA1QBnc (Gamblers University - Professor Profit)
 *
 * Full Logic in Detail:
 * - This strategy builds "Triangle" bet formations inside the dozens.
 * - Each "Triangle" covers 9 numbers (3 contiguous streets) using 6 equal-sized inside bets:
 *   - 3 Street bets: S, S+3, S+6
 *   - 2 Corner bets: top-left at S (covers S, S+1, S+3, S+4) and S+3 (covers S+3, S+4, S+6, S+7)
 *   - 1 Split bet: [S+4, S+5] (middle and top number of the middle street)
 * - There are two alignment sets across the 3 dozens:
 *   - Alignment 0 (Left-aligned within each dozen): Triangles starting at streets [1, 13, 25]
 *   - Alignment 1 (Right-aligned within each dozen): Triangles starting at streets [4, 16, 28]
 * - At Level 1, 1 Triangle is placed at one end of the board (Dozen 1 or Dozen 3).
 *
 * Full Bet Progression in Detail:
 * - Level 1: 1 Triangle (6 bets) at 1 unit each (6 units total).
 * - Level 2: 2 Triangles (12 bets) at 2 units each (24 units total).
 * - Level 3: 3 Triangles (18 bets) at 3 units each (54 units total).
 * - Level 4+: All 3 Triangles (18 bets) at `level` units each (72, 90, 108... units total).
 * - Progression Rules:
 *   1. New Session High (`bankroll > state.sessionHigh` on a winning spin):
 *      - Update `sessionHigh = bankroll`.
 *      - Reset `level = 1`.
 *      - Flip board end (`direction` toggles between Low-to-High [Dozen 1->2->3] and High-to-Low [Dozen 3->2->1]).
 *      - Toggle alignment set between [1, 13, 25] and [4, 16, 28].
 *   2. Partial Loss or Win below Session High:
 *      - If at least one bet hits (e.g., hitting the un-reinforced top corner of a triangle for a partial loss, or a win that doesn't yet reach `sessionHigh`), stay at the current `level` and rebet the exact same layout.
 *   3. Full Loss (Complete Miss):
 *      - If no bets hit (net loss equals the full total bet), increment `level` by 1 (adding the next dozen's triangle up to 3 triangles, and adding 1 base unit to every bet).
 *
 * The Goal:
 * - Recover any drawdowns to reach a new session high bankroll ($100 profit target on a $1,000 buy-in in the video), then reset to base bet on the opposite end of the table.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  const minInside = config.betLimits.min;
  const maxBet = config.betLimits.max;
  const incrementUnit =
    config.incrementMode === 'fixed' && config.minIncrementalBet
      ? config.minIncrementalBet
      : minInside;

  // Initialize persistent state on first spin
  if (!state.initialized) {
    state.initialized = true;
    state.sessionHigh = bankroll;
    state.level = 1;
    state.direction = 1; // 1 = Dozen 1 -> 2 -> 3; -1 = Dozen 3 -> 2 -> 1
    state.alignment = 0; // 0 = [1, 13, 25], 1 = [4, 16, 28]
    state.lastBankroll = bankroll;
    state.lastBetTotal = 0;
  } else if (spinHistory.length > 0) {
    const netChange = bankroll - state.lastBankroll;

    if (bankroll > state.sessionHigh) {
      // Reached a new session high -> Reset to Level 1 and switch ends/alignment
      state.sessionHigh = bankroll;
      state.level = 1;
      state.direction *= -1;
      state.alignment = state.alignment === 0 ? 1 : 0;
    } else if (netChange <= -state.lastBetTotal && state.lastBetTotal > 0) {
      // Full loss (complete miss) -> Advance progression level
      state.level += 1;
    }
    // Note: On a partial loss (e.g. hitting 6 or 36 for -18/-36) or a win that
    // hasn't yet reached sessionHigh, state.level remains unchanged (rebet).
  }

  // Helper to build the 6 bets of a single Triangle starting at street S
  function buildTriangle(startStreet, rawUnitAmount) {
    let amount = Math.max(rawUnitAmount, minInside);
    amount = Math.min(amount, maxBet);

    return [
      // 3 Street bets
      { type: 'street', value: startStreet, amount: amount },
      { type: 'street', value: startStreet + 3, amount: amount },
      { type: 'street', value: startStreet + 6, amount: amount },
      // 2 Corner bets
      { type: 'corner', value: startStreet, amount: amount },
      { type: 'corner', value: startStreet + 3, amount: amount },
      // 1 Split bet (top two numbers of the middle street)
      { type: 'split', value: [startStreet + 4, startStreet + 5], amount: amount }
    ];
  }

  // Determine starting streets for the 3 dozens based on current alignment
  const baseStreets = state.alignment === 0 ? [1, 13, 25] : [4, 16, 28];
  const orderedStreets =
    state.direction === 1 ? baseStreets : [baseStreets[2], baseStreets[1], baseStreets[0]];

  // Number of active triangles is 1 at Level 1, 2 at Level 2, and 3 at Level 3+
  const numTriangles = Math.min(state.level, 3);

  // Calculate unit bet amount for the current level
  const rawUnitAmount = minInside + (state.level - 1) * incrementUnit;

  // Assemble all bets for active triangles
  const bets = [];
  for (let i = 0; i < numTriangles; i++) {
    const triangleBets = buildTriangle(orderedStreets[i], rawUnitAmount);
    bets.push(...triangleBets);
  }

  // Verify bankroll can cover the total bet
  const totalBetAmount = bets.reduce((sum, b) => sum + b.amount, 0);
  if (totalBetAmount > bankroll) {
    return [];
  }

  // Record state for next spin evaluation
  state.lastBankroll = bankroll;
  state.lastBetTotal = totalBetAmount;

  return bets;
}