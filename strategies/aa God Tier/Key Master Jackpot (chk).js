/**
 * Keymaster Jackpot Strategy
 * 
 * Source:
 * - YouTube Video: https://youtu.be/ufpVU1_TPi4
 * - Channel: The Roulette Master (Submitted by Randall Pratt)
 * 
 * Logic Overview:
 * 1. Bet Placement:
 *    - The system places 8 Corner bets across the roulette table to cover 20 numbers.
 *    - Corner 1  (covers 1, 2, 4, 5)
 *    - Corner 7  (covers 7, 8, 10, 11)
 *    - Corner 14 (covers 14, 15, 17, 18)
 *    - Corner 20 (covers 20, 21, 23, 24)
 *    - Corner 25 (covers 25, 26, 28, 29)
 *    - Corner 26 (covers 26, 27, 29, 30)
 *    - Corner 31 (covers 31, 32, 34, 35)
 *    - Corner 32 (covers 32, 33, 35, 36)
 * 
 * 2. Jackpot Concept:
 *    - Overlapping corners in the 3rd dozen create "Jackpot" numbers (26, 29, 32, 35).
 *    - When a jackpot number hits, it hits two corners simultaneously, yielding double payout (18:1 total return).
 *    - Standard winning numbers hit 1 corner (9:1 total return), giving a small net profit at base level.
 * 
 * 3. Progression:
 *    - Base bet: 1 unit on each of the 8 corners.
 *    - After a Loss: Increase the bet on every active corner position by 1 unit (+min unit).
 *    - After a Win: If overall bankroll is in session profit (above starting bankroll), reset progression back to base level (1 unit).
 *      Otherwise, stay at current level or reset upon reaching session profit / target.
 * 
 * 4. Goal:
 *    - Target Profit: Accumulate net session profit and reset to base level after recovering losses.
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Determine base unit for inside bets
  const baseUnit = config.betLimits.min || 2;

  // 2. Initialize persistent state variables
  if (state.units === undefined) {
    state.units = 1;
    state.startingBankroll = bankroll;
  }

  // 3. Process previous spin result (if history exists)
  if (spinHistory && spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];

    // Check session profit target condition to reset
    if (bankroll >= state.startingBankroll) {
      state.units = 1;
      state.startingBankroll = bankroll; // Update peak starting bankroll baseline
    } else {
      // Calculate previous total bet amount to determine win/loss
      let prevBetAmount = baseUnit * state.units;
      prevBetAmount = Math.max(prevBetAmount, config.betLimits.min);
      prevBetAmount = Math.min(prevBetAmount, config.betLimits.max);
      const totalPrevBet = prevBetAmount * 8;

      // Check last net payout from simulation state or evaluate win
      if (lastSpin.netWin !== undefined) {
        if (lastSpin.netWin < 0) {
          // Loss: Increase progression by 1 unit
          state.units += 1;
        } else if (bankroll >= state.startingBankroll) {
          // Win that brought us into profit: Reset to base
          state.units = 1;
        }
      } else {
        // Fallback if netWin is not provided directly in spin object:
        // Evaluate winning corners
        const cornerCorners = [1, 7, 14, 20, 25, 26, 31, 32];
        const num = lastSpin.winningNumber;
        
        let hits = 0;
        // Corner 1: 1,2,4,5
        if ([1, 2, 4, 5].includes(num)) hits++;
        // Corner 7: 7,8,10,11
        if ([7, 8, 10, 11].includes(num)) hits++;
        // Corner 14: 14,15,17,18
        if ([14, 15, 17, 18].includes(num)) hits++;
        // Corner 20: 20,21,23,24
        if ([20, 21, 23, 24].includes(num)) hits++;
        // Corner 25: 25,26,28,29
        if ([25, 26, 28, 29].includes(num)) hits++;
        // Corner 26: 26,27,29,30
        if ([26, 27, 29, 30].includes(num)) hits++;
        // Corner 31: 31,32,34,35
        if ([31, 32, 34, 35].includes(num)) hits++;
        // Corner 32: 32,33,35,36
        if ([32, 33, 35, 36].includes(num)) hits++;

        if (hits === 0) {
          state.units += 1; // Loss
        } else if (bankroll >= state.startingBankroll) {
          state.units = 1; // Win resulting in net session profit
        }
      }
    }
  }

  // 4. Calculate individual bet amount and clamp to bet limits
  let betAmount = baseUnit * state.units;
  betAmount = Math.max(betAmount, config.betLimits.min);
  betAmount = Math.min(betAmount, config.betLimits.max);

  // 5. Define the 8 target corner positions (top-left number of each corner)
  const cornerPositions = [1, 7, 14, 20, 25, 26, 31, 32];

  // 6. Build bet array
  const bets = cornerPositions.map((pos) => ({
    type: 'corner',
    value: pos,
    amount: betAmount
  }));

  return bets;
}