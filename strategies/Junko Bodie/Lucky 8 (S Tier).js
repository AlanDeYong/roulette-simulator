/**
 * Lucky 8 Roulette Strategy
 * 
 * - Source: https://youtu.be/R5ie1_e4tEA
 * - YouTube Channel: Junko Bodie
 * 
 * - The Full Logic in details:
 *   The Lucky 8 system is a set rotation strategy targeting 8 specific straight-up numbers on the board:
 *   [2, 3, 7, 17, 22, 27, 32, 35]. Bets are placed simultaneously on all 8 numbers every spin.
 * 
 * - The Full Bet Progression in details:
 *   The system operates over an 18-spin rotation cycle divided into stages. Every 3 spins, the bet 
 *   amount per number doubles if no win occurs:
 *     - Spins 1-3   (Stages 1-3)  : 1 x Base Unit per number
 *     - Spins 4-6   (Stages 4-6)  : 2 x Base Unit per number
 *     - Spins 7-9   (Stages 7-9)  : 4 x Base Unit per number
 *     - Spins 10-12 (Stages 10-12): 8 x Base Unit per number
 *     - Spins 13-15 (Stages 13-15): 16 x Base Unit per number
 *     - Spins 16-18 (Stages 16-18): 32 x Base Unit per number
 *   When any of the 8 numbers hits, the progression resets back to Stage 1 (1 unit per number).
 *   If 18 consecutive spins pass without a hit, the cycle breaks and resets to Stage 1.
 * 
 * - The Goal:
 *   Achieve steady hit-and-run wins within each 18-spin window and capitalize on short multi-hit streaks.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Target Numbers
  const targetNumbers = [2, 3, 7, 17, 22, 27, 32, 35];

  // 2. Initialize State
  if (state.stage === undefined) {
    state.stage = 1;
  }

  // 3. Process previous spin result to update progression
  if (spinHistory.length > 0) {
    const lastResult = spinHistory[spinHistory.length - 1];
    const isWin = targetNumbers.includes(lastResult.winningNumber);

    if (isWin) {
      // Reset progression on a win
      state.stage = 1;
    } else {
      // Advance stage on a loss
      state.stage += 1;
      if (state.stage > 18) {
        // Reset after completing full 18-spin cycle
        state.stage = 1;
      }
    }
  }

  // 4. Calculate unit multiplier based on 3-spin blocks
  // Stages 1-3 -> multiplier 1 (2^0)
  // Stages 4-6 -> multiplier 2 (2^1)
  // Stages 7-9 -> multiplier 4 (2^2)
  // Stages 10-12 -> multiplier 8 (2^3)
  // Stages 13-15 -> multiplier 16 (2^4)
  // Stages 16-18 -> multiplier 32 (2^5)
  const blockIndex = Math.floor((state.stage - 1) / 3);
  const multiplier = Math.pow(2, blockIndex);

  // 5. Determine base unit and clamp bet amount to limits
  const baseUnit = config.betLimits.min;
  let unitAmount = baseUnit * multiplier;
  unitAmount = Math.max(config.betLimits.min, Math.min(unitAmount, config.betLimits.max));

  // 6. Generate array of bet objects
  const bets = targetNumbers.map(num => ({
    type: 'number',
    value: num,
    amount: unitAmount
  }));

  return bets;
}