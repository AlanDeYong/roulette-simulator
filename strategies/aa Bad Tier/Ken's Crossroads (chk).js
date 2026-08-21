/**
 * Strategy: Ken's Crossroads Strategy
 * Source: https://youtu.be/PWA4hjgl0JQ (Channel: The Roulette Master)
 * Creator: Ken Dipple
 *
 * The Full Logic in Details:
 * - Ken's Crossroads is a high-coverage strategy combining columns, dozens, and split bets.
 * - Base Bets (Total 12 units):
 *   - 5 units on 3rd Column
 *   - 5 units on 2nd Dozen
 *   - 1 unit Split on 17/20
 *   - 1 unit Split on 32/35
 * - Numbers covered hit overlapping payouts, especially 17, 20, 32, and 35 which hit both
 *   the split and the corresponding dozen/column for a "jackpot" payout.
 *
 * The Full Bet Progression in Details:
 * - Initial Bet Level:
 *   - 3rd Column: 5 units
 *   - 2nd Dozen: 5 units
 *   - Split 17/20: 1 unit
 *   - Split 32/35: 1 unit
 * - Loss 1 (First Loss from Base):
 *   - Double all initial bets ONCE.
 *   - 3rd Column: 10 units
 *   - 2nd Dozen: 10 units
 *   - Split 17/20: 2 units
 *   - Split 32/35: 2 units
 * - Loss 2+ (Subsequent Consecutive Losses):
 *   - Add 2 units ($10) to 2nd Dozen.
 *   - Introduce and add 2 units ($10) to 2nd Column (`column: 2`).
 *   - Keep 3rd Column and Split bets at their doubled amounts (10 units & 2 units).
 *   - On each additional loss, add another 2 units to both 2nd Dozen and 2nd Column.
 * - Wins during Progression:
 *   - Maintain current bet levels if bankroll is still below the session high/target.
 *   - Reset back to base level bets immediately when bankroll recovers back to or exceeds
 *     the highest bankroll of the session.
 *
 * The Goal:
 * - Accumulate steady session profit while relying on high coverage and progression recovery.
 * - Target: Reset on reaching new peak bankroll.
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Initialize State
  if (state.startingBankroll === undefined) {
    state.startingBankroll = bankroll;
    state.highestBankroll = bankroll;
    state.consecutiveLosses = 0;
    state.secondDozenUnits = 5;
    state.secondColumnUnits = 0;
    state.thirdColumnUnits = 5;
    state.split1720Units = 1;
    state.split3235Units = 1;
  }

  // Update session high-water mark
  if (bankroll > state.highestBankroll) {
    state.highestBankroll = bankroll;
  }

  // 2. Process Result of Previous Spin
  if (spinHistory.length > 0) {
    // Reset to base level when overall profit target / session high is reached or recovered
    if (bankroll >= state.highestBankroll) {
      state.consecutiveLosses = 0;
      state.secondDozenUnits = 5;
      state.secondColumnUnits = 0;
      state.thirdColumnUnits = 5;
      state.split1720Units = 1;
      state.split3235Units = 1;
    } else {
      const prevBankroll = state.lastBankroll !== undefined ? state.lastBankroll : bankroll;
      const profit = bankroll - prevBankroll;

      if (profit < 0) {
        // Net Loss on last spin
        state.consecutiveLosses++;

        if (state.consecutiveLosses === 1) {
          // First Loss: Double all initial bets
          state.thirdColumnUnits = 10;
          state.secondDozenUnits = 10;
          state.split1720Units = 2;
          state.split3235Units = 2;
          state.secondColumnUnits = 0;
        } else {
          // Loss 2+: Add 2 units each to 2nd Dozen and 2nd Column
          state.secondDozenUnits += 2;
          state.secondColumnUnits += 2;
        }
      }
      // If profit > 0 but hasn't reached session high yet, keep existing progression levels
    }
  }

  // Store bankroll for next turn's profit comparison
  state.lastBankroll = bankroll;

  // 3. Determine Unit Size respecting limits
  // Base unit ratio: Outside bets = 5 units ($25), Inside splits = 1 unit ($5)
  const minInside = config.betLimits.min || 2;
  const minOutside = config.betLimits.minOutside || 5;
  const unitSize = Math.max(minInside, Math.ceil(minOutside / 5));

  // Helper function to clamp bet amounts to configured table limits
  function clamp(amount, isOutside) {
    const minLimit = isOutside ? minOutside : minInside;
    const maxLimit = config.betLimits.max || 500;
    return Math.min(Math.max(amount, minLimit), maxLimit);
  }

  // 4. Construct Return Array
  const bets = [];

  // 3rd Column
  if (state.thirdColumnUnits > 0) {
    bets.push({
      type: 'column',
      value: 3,
      amount: clamp(state.thirdColumnUnits * unitSize, true)
    });
  }

  // 2nd Column (Active during loss progression level 2+)
  if (state.secondColumnUnits > 0) {
    bets.push({
      type: 'column',
      value: 2,
      amount: clamp(state.secondColumnUnits * unitSize, true)
    });
  }

  // 2nd Dozen
  if (state.secondDozenUnits > 0) {
    bets.push({
      type: 'dozen',
      value: 2,
      amount: clamp(state.secondDozenUnits * unitSize, true)
    });
  }

  // Split 17/20
  if (state.split1720Units > 0) {
    bets.push({
      type: 'split',
      value: [17, 20],
      amount: clamp(state.split1720Units * unitSize, false)
    });
  }

  // Split 32/35
  if (state.split3235Units > 0) {
    bets.push({
      type: 'split',
      value: [32, 35],
      amount: clamp(state.split3235Units * unitSize, false)
    });
  }

  return bets;
}