/**
 * ============================================================================
 * THE RETIREMENT PLAN (RETIREMENT ROULETTE)
 * ============================================================================
 * Source:
 *   - Video: "HOW TO MAKE CONSISTENT DAILY PROFIT"
 *   - URL: https://youtu.be/W6kqMNJmIk8
 *   - Channel: The Roulette Master (Strategy developed by "The Roulette Surgeon")
 *
 * The Full Logic in Details:
 *   - Wheel Layout & Selection: Designed for American Roulette wheels (0 and 00).
 *     The system targets 14 specific straight-up numbers based on wheel sector
 *     proximity to both zeros (7 numbers around 0 and 7 numbers around 00):
 *       • 0 Sector (0 + 3 on each side): [26, 9, 28, 0, 2, 14, 35]
 *       • 00 Sector (00 + 3 on each side): [10, 25, 27, '00', 1, 13, 36]
 *     Combined 14 numbers: [0, '00', 1, 2, 9, 10, 13, 14, 25, 26, 27, 28, 35, 36].
 *     (Note: If executed on a European wheel, '00' is omitted and the remaining
 *     13 numbers are played).
 *
 * The Full Bet Progression in Details:
 *   - Initial Bet: 1 base unit placed on each of the 14 numbers (total 14 units).
 *   - On Loss: Increase the bet size on every number by 1 unit (+config.minIncrementalBet).
 *   - On Win:
 *       • If the win recovers the session into net profit (bankroll >= startingBankroll):
 *         RESET all bets back to base level (1 unit per position).
 *       • If the win does NOT return the session to net profit (still in drawdown):
 *         INCREASE all bets by 1 unit (+1 unit on wins), maintaining upward leverage
 *         to accelerate recovery across back-to-back hits without extreme Martingale doubling.
 *
 * The Goal:
 *   - Target Profit: Default +$200 profit target (or configurable milestone).
 *   - Stop condition: Cash out when bankroll >= startingBankroll + targetProfit.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Initialize State
  if (state.initialBankroll === undefined) {
    state.initialBankroll = bankroll;
    state.targetProfit = 20000; // Target goal as featured in the video
    state.unit = config.betLimits.min || 1;
    state.currentMultiplier = 1;
  }

  // 2. Target check - Stop betting once target is reached
  if (bankroll >= state.initialBankroll + state.targetProfit) {
    return []; // Reached goal, cash out
  }

  // 3. Define the 14 Sector Proximity Numbers
  const numbersAroundZero = [0, 2, 9, 14, 26, 28, 35];
  const numbersAroundDoubleZero = [1, 10, 13, 25, 27, 36];
  
  let targetNumbers = [...numbersAroundZero, ...numbersAroundDoubleZero];
  if (config.tableType === 'american') {
    targetNumbers.push('00');
  }

  // 4. Update Progression based on last spin outcome
  if (spinHistory && spinHistory.length > 0) {
    const lastResult = spinHistory[spinHistory.length - 1];
    const winningNum = lastResult.winningNumber;

    // Check if the last winning number was in our bet list
    const won = targetNumbers.some(num => {
      if (typeof num === 'string' && typeof winningNum === 'string') {
        return num.toLowerCase() === winningNum.toLowerCase();
      }
      return Number(num) === Number(winningNum);
    });

    if (won) {
      // If we are back in session profit, reset progression
      if (bankroll >= state.initialBankroll) {
        state.currentMultiplier = 1;
      } else {
        // Not yet in session profit: increase by 1 unit on wins
        state.currentMultiplier += 1;
      }
    } else {
      // On Loss: increase by 1 unit
      state.currentMultiplier += 1;
    }
  }

  // 5. Calculate and clamp bet amounts
  const increment = config.incrementMode === 'base'
    ? state.unit
    : (config.minIncrementalBet || 1);

  let betPerNumber = state.unit + (state.currentMultiplier - 1) * increment;

  // Clamp to inside bet limits
  betPerNumber = Math.max(betPerNumber, config.betLimits.min);
  betPerNumber = Math.min(betPerNumber, config.betLimits.max);

  // 6. Return array of straight-up bets
  return targetNumbers.map(numberVal => ({
    type: 'number',
    value: numberVal,
    amount: betPerNumber
  }));
}