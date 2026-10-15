/**
 * Strategy: Nine Neighbor Death
 * Source: https://youtu.be/OzKHtqSx7uE (YouTube Channel: Casino Matchmaker)
 *
 * Full Logic in Detail:
 * - This strategy dynamically targets the last winning roulette number along with its 9 physical 
 *   neighbors to the left and 9 physical neighbors to the right on a European roulette wheel.
 * - Selecting 1 target number + 9 left neighbors + 9 right neighbors covers a total of 19 
 *   out of 37 wheel numbers (51.35% table coverage).
 * - Straight-up inside bets ('number') are placed on each of these 19 numbers.
 * - On the initial spin (or when history is empty), the strategy defaults to targeting number 0.
 *
 * Full Bet Progression in Detail:
 * - Starting Bet: 1 base unit (config.betLimits.min) on each of the 19 numbers.
 * - Progression Rule:
 *   - On LOSS: Increase the bet size on each number by +2 base units (+2 units progression).
 *   - On WIN:
 *     - If the overall session is in net profit (bankroll > initial bankroll), RESET progression back to 1 base unit per number.
 *     - If NOT in overall session profit, decrease the bet size by -1 base unit per number (minimum 1 base unit).
 *
 * Goal:
 * - Capitalize on wheel sector streaks while maintaining over 50% coverage.
 * - Reset back to minimum bet units whenever overall session profit is achieved.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // 1. European wheel layout order (clockwise)
  const EUROPEAN_WHEEL = [
    0, 26, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23,
    10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3
  ];

  // 2. State Initialization
  if (!state.initialized) {
    state.initialBankroll = bankroll;
    state.units = 1;
    state.lastBetNumbers = [];
    state.initialized = true;
  }

  // 3. Evaluate previous spin result and adjust progression
  let targetNumber = 0;

  if (spinHistory && spinHistory.length > 0) {
    const lastResult = spinHistory[spinHistory.length - 1];
    const lastWinningNum = lastResult.winningNumber;

    if (state.lastBetNumbers && state.lastBetNumbers.length > 0) {
      const isWin = state.lastBetNumbers.includes(lastWinningNum);

      if (isWin) {
        // If in session profit, reset progression level
        if (bankroll > state.initialBankroll) {
          state.units = 1;
        } else {
          // Otherwise decrease by 1 unit (minimum 1)
          state.units = Math.max(1, state.units - 1);
        }
      } else {
        // Increase by 2 units on a loss
        state.units += 2;
      }
    }

    // Follow the winner: target the last winning number
    targetNumber = lastWinningNum;
  }

  // 4. Determine 19 target numbers (1 center + 9 left neighbors + 9 right neighbors)
  const targetIdx = EUROPEAN_WHEEL.indexOf(targetNumber);
  const betNumbers = [];

  for (let i = -9; i <= 9; i++) {
    const num = EUROPEAN_WHEEL[(targetIdx + i + 37) % 37];
    betNumbers.push(num);
  }

  // Store active numbers for next spin evaluation
  state.lastBetNumbers = betNumbers;

  // 5. Calculate and clamp bet amounts per number
  const baseUnit = config.betLimits.min;
  let amountPerNumber = baseUnit * state.units;

  // Clamp bet size to table limits
  amountPerNumber = Math.max(amountPerNumber, config.betLimits.min);
  amountPerNumber = Math.min(amountPerNumber, config.betLimits.max);

  // 6. Return straight-up bets array
  return betNumbers.map(num => ({
    type: 'number',
    value: num,
    amount: amountPerNumber
  }));
}