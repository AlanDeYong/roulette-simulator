/**
 * ============================================================================
 * Strategy: Advantage Us! (Reward Points Strategy)
 * ----------------================================================------------
 * Source:
 *   - Video URL: https://youtu.be/N3A4K7-wyHg
 *   - YouTube Channel: WillVegas
 *
 * The Full Logic in Details:
 *   - Designed primarily for Single-Zero (European) Roulette tables to establish
 *     a positive mathematical ratio of winning numbers (4) vs losing numbers (3).
 *   - Bet positions cover 34 out of 37 numbers on a single-zero table:
 *     1. Low (1-18): 3 units (18 numbers -> PUSH)
 *     2. Six Line (19-24): 1 unit (6 numbers -> PUSH)
 *     3. Six Line (25-30): 1 unit (6 numbers -> PUSH)
 *     4. Corner (31, 32, 34, 35): 1 unit (4 numbers -> WIN +3 units)
 *   - Uncovered Numbers (Losses): 0, 33, and 36 (plus 00 if played on American).
 *
 * The Full Bet Progression in Details:
 *   - Base Unit Calculation:
 *     The strategy uses 6 units in total per spin (3 units Low, 1 unit Line 19-24,
 *     1 unit Line 25-30, 1 unit Corner 31-35).
 *     Base unit is derived from `config.betLimits.minOutside`.
 *   - Progression Mechanics:
 *     - PUSH ($0 net profit): Maintain current progression level.
 *     - WIN (+3 units profit): Reset progression level back to 1.
 *     - LOSS (-6 units loss): Double the progression level (Martingale progression
 *       multiplier: 1 -> 2 -> 4 -> 8 -> ...).
 *
 * The Goal:
 *   - Achieve slow, steady profits (+3 units per win) while generating maximum
 *     table action / wagering volume to accumulate casino reward points.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Determine unit size based on outside bet limits
  const baseUnit = config.betLimits.minOutside || 5;
  const minInside = config.betLimits.min || 2;

  // 2. Initialize State
  if (!state.level) {
    state.level = 1;
    state.previousBankroll = bankroll;
  }

  // 3. Evaluate previous spin outcome to adjust progression level
  if (spinHistory && spinHistory.length > 0) {
    const profit = bankroll - state.previousBankroll;

    if (profit < -1) {
      // LOSS: Double up progression to recover losses
      state.level *= 2;
    } else if (profit > 1) {
      // WIN: Reset back to base level
      state.level = 1;
    }
    // If profit is around 0 (PUSH), state.level remains unchanged
  }

  // Save current bankroll for next spin evaluation
  state.previousBankroll = bankroll;

  // 4. Calculate individual bet amounts according to progression multiplier
  let lowAmount = baseUnit * 3 * state.level;
  let line19Amount = Math.max(baseUnit * state.level, minInside);
  let line25Amount = Math.max(baseUnit * state.level, minInside);
  let corner31Amount = Math.max(baseUnit * state.level, minInside);

  // Clamp bet amounts to table limits
  const maxLimit = config.betLimits.max || 500;
  lowAmount = Math.min(Math.max(lowAmount, config.betLimits.minOutside), maxLimit);
  line19Amount = Math.min(line19Amount, maxLimit);
  line25Amount = Math.min(line25Amount, maxLimit);
  corner31Amount = Math.min(corner31Amount, maxLimit);

  // 5. Construct and return bet placements
  return [
    { type: 'low', amount: lowAmount },
    { type: 'line', value: 19, amount: line19Amount },
    { type: 'line', value: 25, amount: line25Amount },
    { type: 'corner', value: 31, amount: corner31Amount }
  ];
}