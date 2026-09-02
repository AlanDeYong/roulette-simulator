/**
 * ============================================================================
 * ROULETTE STRATEGY: European Wheel Green Neighbors
 * ============================================================================
 * Source:
 *   - Video: "European Wheel? No Problem! | Green Neighbors Roulette Strategy"
 *   - Channel: Junko Bodie
 *   - URL: https://youtu.be/_uogGqiVQIk
 *
 * Strategy Overview & Bet Placements:
 *   - Designed for European single-zero roulette tables.
 *   - Covers 11 straight-up inside number positions centered around the green zero:
 *     Numbers: 0, 3, 4, 12, 15, 19, 21, 26, 28, 32, 35.
 *   - Each of the 11 numbers receives an equal straight-up bet according to the
 *     current tier in the betting progression.
 *
 * Betting Progression:
 *   - Uses a tiered progression sequence per number (in unit multipliers):
 *     [1, 1, 2, 3, 5, 6, 8, 10, 15, 20, 25, 35, 50, 75, 100, 150]
 *   - On Loss: Advance 1 step up the progression ladder.
 *   - On Win:
 *     - If the bankroll reaches or surpasses the session peak (new high), the
 *       progression immediately resets to Stage 1 (index 0).
 *     - If the win does not recover all losses to reach a new peak, the strategy
 *       drops back down to a safer intermediate tier (Stage 4 / 3 units) to continue
 *       the recovery climb without over-leveraging.
 *
 * Goal & Target:
 *   - Default session profit goal: +100 units / $100 profit per session.
 *   - Clamps all individual straight-up bets between config.betLimits.min and config.betLimits.max.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Define Target Numbers (11 Green Neighbors around 0 on European wheel)
  const TARGET_NUMBERS = [0, 3, 4, 12, 15, 19, 21, 26, 28, 32, 35];

  // 2. Progression Tier Multipliers
  const PROGRESSION_TIERS = [1, 1, 2, 3, 5, 6, 8, 10, 15, 20, 25, 35, 50, 75, 100, 150];

  // 3. Initialize Persistent State
  if (state.stageIndex === undefined) {
    state.stageIndex = 0;
    state.sessionPeak = bankroll;
    state.startBankroll = bankroll;
    state.targetProfit = 10000; // Target $100 profit per session
    state.sessionComplete = false;
  }

  // 4. Check for Session Target Profit
  if (bankroll >= state.startBankroll + state.targetProfit) {
    state.sessionComplete = true;
    return []; // Stop betting once profit target is reached
  }

  // 5. Update Progression State Based on Previous Spin Outcome
  if (spinHistory && spinHistory.length > 0) {
    const lastResult = spinHistory[spinHistory.length - 1];
    const isWin = TARGET_NUMBERS.includes(lastResult.winningNumber);

    if (isWin) {
      if (bankroll >= state.sessionPeak) {
        // Full recovery or new session high -> reset to stage 1
        state.sessionPeak = bankroll;
        state.stageIndex = 0;
      } else {
        // Partial recovery -> drop back to intermediate stage (Stage 4, 3 units)
        state.stageIndex = Math.min(3, state.stageIndex);
      }
    } else {
      // Loss -> advance to next progression stage
      state.stageIndex = Math.min(state.stageIndex + 1, PROGRESSION_TIERS.length - 1);
    }
  }

  // 6. Calculate Bet Amount per Number
  const baseUnit = config.betLimits && config.betLimits.min ? config.betLimits.min : 1;
  const multiplier = PROGRESSION_TIERS[state.stageIndex];
  let betPerNumber = baseUnit * multiplier;

  // 7. Clamp to Bet Limits
  if (config.betLimits) {
    if (config.betLimits.min !== undefined) {
      betPerNumber = Math.max(betPerNumber, config.betLimits.min);
    }
    if (config.betLimits.max !== undefined) {
      betPerNumber = Math.min(betPerNumber, config.betLimits.max);
    }
  }

  // 8. Construct & Return Bet Array
  const bets = TARGET_NUMBERS.map(num => ({
    type: 'number',
    value: num,
    amount: betPerNumber
  }));

  return bets;
}