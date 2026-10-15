/**
 * ROULETTE STRATEGY: Smoke Show Strategy (V5 - Alternating Columns Shifted)
 * 
 * Source:
 * - URL: https://youtu.be/jtixjXGOHBk
 * - Channel: The Roulette Master (Submitted by Steve Unknown)
 * 
 * The Full Logic in Detail:
 * - The strategy places 6 non-overlapping Corner bets covering 24 numbers total.
 * - Corner anchors (top-left numbers): [2, 7, 14, 19, 26, 31]
 *   - Corner 2:  [2, 3, 5, 6]
 *   - Corner 7:  [7, 8, 10, 11]
 *   - Corner 14: [14, 15, 17, 18]
 *   - Corner 19: [19, 20, 22, 23]
 *   - Corner 26: [26, 27, 29, 30]
 *   - Corner 31: [31, 32, 34, 35]
 * - Base setup starts with 1 unit ($5) across all 6 corners.
 * - On a Win at base level: Reset and rebet all 6 corners.
 * - On a Loss: Enter recovery progression. 
 * - In Recovery:
 *   - Progression: < $45 (+10), < $115 (+20), >= $115 (+50).
 *   - Upon hitting a winning number during recovery:
 *     - If overall bankroll >= starting bankroll: Full reset.
 *     - Otherwise: Remove (pull off) the specific corner bet that hit.
 * 
 * The Goal:
 * - Session Target: Net session profit.
 */

function bet(spinHistory, bankroll, config, state, utils) {
  const baseUnit = Math.max(config.betLimits.min, 5);
  const initialCorners = [2, 7, 14, 19, 26, 31];

  // FORCE STATE RESET: Bumping version to 5 so the simulator drops the old array and uses the new one.
  const STRATEGY_VERSION = 5; 

  if (state.version !== STRATEGY_VERSION) {
    state.version = STRATEGY_VERSION;
    state.sessionStartBankroll = bankroll;
    state.currentUnit = baseUnit;
    state.activeCorners = [...initialCorners];
    state.inRecovery = false;
  }

  // Evaluate previous spin result if history exists
  if (spinHistory && spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const lastNum = lastSpin.winningNumber;

    // Helper to check if a winning number falls in a corner anchored by top-left number 'c'
    const isNumInCorner = (num, c) => [c, c + 1, c + 3, c + 4].includes(num);
    const hitCorner = state.activeCorners.find(c => isNumInCorner(lastNum, c));

    if (hitCorner !== undefined) {
      // WIN DETECTED
      if (bankroll >= state.sessionStartBankroll) {
        // Full Reset if back in net session profit
        state.currentUnit = baseUnit;
        state.activeCorners = [...initialCorners];
        state.inRecovery = false;
      } else {
        // Recovery Win: Pull off the corner that just hit
        state.activeCorners = state.activeCorners.filter(c => c !== hitCorner);
        if (state.activeCorners.length === 0) {
          state.currentUnit = baseUnit;
          state.activeCorners = [...initialCorners];
          state.inRecovery = false;
        }
      }
    } else {
      // LOSS DETECTED
      state.inRecovery = true;

      // Tiered progression increase on loss
      if (state.currentUnit < 45) {
        state.currentUnit += 10;
      } else if (state.currentUnit < 115) {
        state.currentUnit += 20;
      } else {
        state.currentUnit += 50;
      }
    }
  }

  // Construct and clamp bet objects
  const bets = [];
  for (const cornerVal of state.activeCorners) {
    let betAmount = state.currentUnit;
    betAmount = Math.max(betAmount, config.betLimits.min);
    betAmount = Math.min(betAmount, config.betLimits.max);

    bets.push({
      type: 'corner',
      value: cornerVal,
      amount: betAmount
    });
  }

  return bets;
}