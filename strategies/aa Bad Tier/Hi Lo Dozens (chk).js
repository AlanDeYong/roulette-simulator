/**
 * Strategy: Hi Lo Dozens (WillVegas Version)
 * Source: https://youtu.be/V-g9T_WH-ls (Channel: WillVegas)
 *
 * The Full Logic in details:
 * - The strategy requires establishing a "hot" area by waiting for the first non-zero spin.
 * - It plays "follow the winner", meaning it bets on the characteristic of the most recent non-zero winning number.
 * - If a zero hits, it ignores the zero for pattern purposes and continues betting based on the last known non-zero number.
 * - The bets alternate between betting on the corresponding Dozen (1st, 2nd, or 3rd) and betting on the corresponding High/Low side.
 * * The Full Bet Progression in details:
 * - The progression is a customized 6-step multiplier sequence aimed at recouping all previous losses plus securing a 1-unit profit on any win.
 * - Step 1: 1 unit on the Dozen of the last non-zero number.
 * - Step 2: 2 units on High/Low of the last non-zero number.
 * - Step 3: 2 units on the Dozen of the last non-zero number.
 * - Step 4: 6 units on High/Low of the last non-zero number.
 * - Step 5: 6 units on the Dozen of the last non-zero number.
 * - Step 6: 18 units on High/Low of the last non-zero number.
 * - After a win at any step, the progression resets to Step 1.
 * - After a loss at Step 6, the progression hard-resets to Step 1 (acting as a stop-loss to preserve bankroll).
 * * The Goal:
 * - Target profit: The creator targets $30 (6 base units) in the session. On a per-sequence level, the goal is +1 unit profit.
 * - Stop-loss: Built into the 6-step progression (a total loss of 35 units resets the sequence).
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Initialize State
  if (!state.initialized) {
    state.progressionLevel = 1;
    state.lastNonZero = null;
    state.currentBet = null;
    state.initialized = true;
  }

  // 2. Process History and Update Progression
  if (spinHistory.length > 0) {
    const lastResultObj = spinHistory[spinHistory.length - 1];
    const lastResult = lastResultObj.winningNumber;
    
    // Check outcome of previous bet
    if (state.currentBet) {
      let won = false;
      if (lastResult !== 0 && lastResult !== '00') {
        if (state.currentBet.type === 'dozen') {
          const dozen = Math.ceil(lastResult / 12);
          if (dozen === state.currentBet.value) won = true;
        } else if (state.currentBet.type === 'low') {
          if (lastResult >= 1 && lastResult <= 18) won = true;
        } else if (state.currentBet.type === 'high') {
          if (lastResult >= 19 && lastResult <= 36) won = true;
        }
      }

      if (won) {
        state.progressionLevel = 1;
      } else {
        state.progressionLevel++;
        if (state.progressionLevel > 6) {
          state.progressionLevel = 1; // Stop-loss hit, reset
        }
      }
      state.currentBet = null; // Clear it for this spin
    }

    // Update last non-zero number reference
    if (lastResult !== 0 && lastResult !== '00') {
      state.lastNonZero = lastResult;
    }
  }

  // 3. Determine if we can bet
  if (!state.lastNonZero) {
    // Waiting for the first non-zero number to follow
    return [];
  }

  // 4. Calculate Bet Amount
  const multipliers = [1, 2, 2, 6, 6, 18];
  const unit = config.betLimits.minOutside;
  let amount = unit * multipliers[state.progressionLevel - 1];

  // 5. CLAMP TO LIMITS
  amount = Math.max(amount, config.betLimits.minOutside); 
  amount = Math.min(amount, config.betLimits.max);

  // 6. Place the Bet
  let betObjects = [];
  if (state.progressionLevel === 1 || state.progressionLevel === 3 || state.progressionLevel === 5) {
    const dozen = Math.ceil(state.lastNonZero / 12);
    betObjects.push({ type: 'dozen', value: dozen, amount: amount });
    state.currentBet = { type: 'dozen', value: dozen, amount: amount };
  } else {
    const highLow = state.lastNonZero <= 18 ? 'low' : 'high';
    betObjects.push({ type: highLow, amount: amount });
    state.currentBet = { type: highLow, amount: amount };
  }

  return betObjects;
}