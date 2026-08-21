/**
 * Strategy Name: "Trust Me Bro" (by Allan 58)
 * Source: https://youtu.be/ycPuAkMbg7U
 * YouTube Channel: Casino Matchmaker
 *
 * THE FULL LOGIC IN DETAIL:
 * 1. Covered Positions:
 *    - The strategy covers 9 Streets on the European/American roulette wheel,
 *      specifically the first 3 streets in each of the 3 dozens (27 numbers total, ~73% wheel coverage).
 *    - Covered street starting numbers: [1, 4, 7, 13, 16, 19, 25, 28, 31].
 *
 * 2. Starting / Base Level:
 *    - Base bet starts at 3 units per street (Total 27 units per spin).
 *    - Base bet level is the floor (never drops below 3 units per street).
 *
 * 3. Progression Logic (Loss / Win):
 *    - On Loss: Increase bet size by +2 units per street (e.g., 3 -> 5 -> 7 -> 9 -> 11...).
 *      Reset consecutive wins counter to 0.
 *    - On Win:
 *      - Increment consecutive wins counter.
 *      - If net profit > 0 (in session profit relative to start), reset completely to base level (3 units per street).
 *      - If 2 consecutive wins occur at the current level, step down by 1 unit per street (e.g., 13 -> 12)
 *        and reset the consecutive win counter to 0.
 *
 * 4. The Goal:
 *    - Target profit is $100 profit or session net positive. Resets to base level whenever in profit.
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Define base unit size for inside bets
  const unitSize = config.betLimits.min;
  const baseUnitsPerStreet = 3; // Base level is 3 units per street

  // 2. Initialize State
  if (state.initialBankroll === undefined) {
    state.initialBankroll = bankroll;
    state.unitsPerStreet = baseUnitsPerStreet;
    state.consecutiveWins = 0;
  }

  // 3. Evaluate previous spin if history exists
  if (spinHistory && spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const winningNumber = lastSpin.winningNumber;

    // Covered street starting numbers: [1, 4, 7, 13, 16, 19, 25, 28, 31]
    const coveredStreets = [1, 4, 7, 13, 16, 19, 25, 28, 31];
    
    // Check if winning number falls in any covered street
    const isWin = coveredStreets.some(startNum => 
      winningNumber >= startNum && winningNumber <= startNum + 2
    );

    if (isWin) {
      state.consecutiveWins = (state.consecutiveWins || 0) + 1;

      // Reset to base level if session is in net profit
      if (bankroll > state.initialBankroll) {
        state.unitsPerStreet = baseUnitsPerStreet;
        state.consecutiveWins = 0;
      } 
      // Drop down 1 unit after 2 consecutive wins
      else if (state.consecutiveWins >= 2) {
        state.unitsPerStreet = Math.max(baseUnitsPerStreet, state.unitsPerStreet - 1);
        state.consecutiveWins = 0;
      }
    } else {
      // On Loss: Add 2 units per street and reset consecutive win streak
      state.unitsPerStreet += 2;
      state.consecutiveWins = 0;
    }
  }

  // 4. Calculate individual bet amount per street and clamp to table limits
  let betAmount = unitSize * state.unitsPerStreet;
  betAmount = Math.max(betAmount, config.betLimits.min);
  betAmount = Math.min(betAmount, config.betLimits.max);

  // 5. Construct and return array of street bets
  const streetsToBet = [1, 4, 7, 13, 16, 19, 25, 28, 31];
  return streetsToBet.map(streetValue => ({
    type: 'street',
    value: streetValue,
    amount: betAmount
  }));
}