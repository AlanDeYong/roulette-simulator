/**
 * Source: https://youtu.be/KJ2eKNUUrVU - Ninja Gamblers
 *
 * The Full Logic in details:
 * This strategy combines the low-volatility "666 Roulette System" (Base Bet) with a "5 Double Street Recovery" method.
 * - The Base Bet is the default state and covers 89% of the board using a mix of Red, Splits, and Straight-ups.
 * - If the Base Bet wins, a small profit is made and the strategy simply repeats the Base Bet.
 * - If the Base Bet loses (hitting 22, 24, 33, 35, or 00), it triggers the Recovery Phase.
 * - The Recovery Phase bets heavily on 5 non-overlapping double streets (lines) to cover 81% of the board.
 * 
 * The Full Bet Progression in details:
 * - Base Bet (State: 'base'): 
 *   - 18 units on Red
 *   - 2 units each on splits: [0,2], [8,11], [10,13], [17,20], [26,29], [28,31]
 *   - 1 unit each on straight-ups: 4, 6, 15
 *   - Total risk: 33 units.
 * - Recovery Bet (State: 'recovery'):
 *   - Triggered strictly after a Base Bet loss.
 *   - Places 33 units each on 5 line bets starting at 1, 7, 13, 19, and 25.
 *   - Total risk: 165 units.
 * - Progression Rules:
 *   - Base Bet Win -> Repeat Base Bet.
 *   - Base Bet Loss -> Switch to Recovery Bet.
 *   - Recovery Bet Win -> Recovers the loss. Reset to Base Bet.
 *   - Recovery Bet Loss -> The video strictly advises to "get outta there no questions asked". Accept the loss and reset to Base Bet.
 *
 * The Goal:
 * To grind small, highly consistent wins with massive board coverage, relying on a 1-step recovery bet if the 11% chance of losing occurs. 
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Initialize State
  if (!state.initialized) {
    state.phase = 'base';
    state.lastPhase = 'base';
    state.initialized = true;
  } else if (spinHistory.length > 0) {
    // 2. Determine State Transition based on the last spin outcome
    const lastSpin = spinHistory[spinHistory.length - 1];
    const num = lastSpin.winningNumber;
    
    if (state.lastPhase === 'base') {
      // The Base 666 strategy covers 33 numbers. The only losing numbers are:
      const losingNumbers = [22, 24, 33, 35, '00'];
      
      if (losingNumbers.includes(num)) {
        state.phase = 'recovery'; // Trigger Recovery on loss
      } else {
        state.phase = 'base'; // Continue Base Bet on win
      }
    } else if (state.lastPhase === 'recovery') {
      // After any recovery attempt (win or lose), reset to base immediately
      state.phase = 'base';
    }
  }

  // 3. Determine base unit scaling to respect limits safely
  const minInside = config.betLimits.min;
  const minOutside = config.betLimits.minOutside;
  
  // Base bet requires Red >= minOutside and Straight >= minInside
  let unit = Math.max(minInside, Math.ceil(minOutside / 18));
  
  // Clamp unit so the largest single bet (Recovery Line at 33x) does not exceed max limits
  unit = Math.min(unit, Math.floor(config.betLimits.max / 33));
  unit = Math.max(1, unit); // Failsafe

  // 4. Generate Bets based on Phase
  let currentBets = [];

  if (state.phase === 'base') {
    currentBets = [
      { type: 'red', amount: 18 * unit },
      { type: 'split', value: [0, 2], amount: 2 * unit },
      { type: 'split', value: [8, 11], amount: 2 * unit },
      { type: 'split', value: [10, 13], amount: 2 * unit },
      { type: 'split', value: [17, 20], amount: 2 * unit },
      { type: 'split', value: [26, 29], amount: 2 * unit },
      { type: 'split', value: [28, 31], amount: 2 * unit },
      { type: 'number', value: 4, amount: 1 * unit },
      { type: 'number', value: 6, amount: 1 * unit },
      { type: 'number', value: 15, amount: 1 * unit }
    ];
  } else if (state.phase === 'recovery') {
    currentBets = [
      { type: 'line', value: 1, amount: 33 * unit },
      { type: 'line', value: 7, amount: 33 * unit },
      { type: 'line', value: 13, amount: 33 * unit },
      { type: 'line', value: 19, amount: 33 * unit },
      { type: 'line', value: 25, amount: 33 * unit }
    ];
  }

  // 5. Persist phase for the next round's evaluation
  state.lastPhase = state.phase;

  return currentBets;
}