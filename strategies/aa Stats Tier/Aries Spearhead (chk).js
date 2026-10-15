/**
 * ============================================================================
 * Strategy: The Aries Spearhead
 * Source:
 *   - Video URL: https://youtu.be/ysUofqcJDvc
 *   - Channel: The Lucky Felt (by Todd Hoover)
 *
 * The Full Logic:
 *   The Aries Spearhead shifts away from defensive, grinding systems and acts as
 *   an aggressive inside-bet ambush focused on the second column of the roulette
 *   layout. It uses high payout leverage by betting 4 key vertical splits along
 *   the center column and 2 straight-up numbers ("the horns"):
 *     1. Split [5, 8]
 *     2. Split [14, 17]
 *     3. Split [23, 26]
 *     4. Split [32, 35]
 *     5. Straight Up 2
 *     6. Straight Up 0
 *   Total positions = 6 (covering numbers 0, 2, 5, 8, 14, 17, 23, 26, 32, 35).
 *
 * The Full Bet Progression:
 *   - Pure Positive Progression (Paroli / 3-Stage Press):
 *     - Stage 1 (Base): 1 unit per position (total 6 units).
 *     - Loss at any stage: Reset immediately to Stage 1 (1 unit per position).
 *       Never increase bets after a loss; absorb cold streaks at minimum risk.
 *     - Win at Stage 1: Press bet to 2 units per position (total 12 units).
 *     - Win at Stage 2: Press bet to 4 units per position (total 24 units).
 *     - Win at Stage 3: Target sequence complete (3 consecutive hits in the cluster).
 *       Lock in profit and reset back to Stage 1 (1 unit per position).
 *
 * The Goal:
 *   - Target Profit: +20% of the starting bankroll (e.g., +$400 on a $2,000 roll).
 *   - Stop-Loss: Cease betting if the bankroll cannot cover the minimum required bet.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Initialize persistent state variables
  if (!state.initialized) {
    state.initialBankroll = bankroll;
    state.targetProfit = bankroll * 0.20; // 20% profit target
    state.progressionMultiplier = 1;      // 1 -> 2 -> 4
    state.consecutiveWins = 0;
    state.initialized = true;
  }

  // 2. Target profit check
  if (bankroll >= state.initialBankroll + state.targetProfit) {
    return []; // Goal reached; secure session profit
  }

  // 3. Evaluate previous spin outcome (if history exists)
  const coveredNumbers = new Set([0, 2, 5, 8, 14, 17, 23, 26, 32, 35]);

  if (spinHistory && spinHistory.length > 0) {
    const lastResult = spinHistory[spinHistory.length - 1];
    const lastWon = coveredNumbers.has(lastResult.winningNumber);

    if (lastWon) {
      state.consecutiveWins += 1;
      if (state.consecutiveWins === 1) {
        state.progressionMultiplier = 2; // First press: 2 units per position
      } else if (state.consecutiveWins === 2) {
        state.progressionMultiplier = 4; // Second press: 4 units per position
      } else {
        // 3 consecutive hits reached; bank profits and reset
        state.progressionMultiplier = 1;
        state.consecutiveWins = 0;
      }
    } else {
      // Loss: strictly drop back to base unit (zero defensive chasing)
      state.progressionMultiplier = 1;
      state.consecutiveWins = 0;
    }
  }

  // 4. Calculate unit size based on table inside bet limits
  const baseUnit = config.betLimits.min;
  let unitBet = baseUnit * state.progressionMultiplier;

  // Clamp individual bet to table limits
  unitBet = Math.max(unitBet, config.betLimits.min);
  unitBet = Math.min(unitBet, config.betLimits.max);

  // 5. Check if total bankroll can afford all 6 bets
  const totalRequired = unitBet * 6;
  if (bankroll < totalRequired) {
    return []; // Insufficient funds to maintain balanced spearhead footprint
  }

  // 6. Return the 6 bet placements
  return [
    { type: 'split', value: [5, 8], amount: unitBet },
    { type: 'split', value: [14, 17], amount: unitBet },
    { type: 'split', value: [23, 26], amount: unitBet },
    { type: 'split', value: [32, 35], amount: unitBet },
    { type: 'number', value: 2, amount: unitBet },
    { type: 'number', value: 0, amount: unitBet }
  ];
}