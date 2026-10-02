/**
 * Source: https://youtu.be/gruTCsiCIAY (Native Digital Product)
 * 
 * The Full Logic in details:
 * The "Color Funnel" strategy is a 3-step parlay/funnel system.
 * - Step 1: Bet 1 unit on a Color. The strategy dynamically chooses the last spun color to follow trends (defaults to Red).
 * - Step 2: If Step 1 wins, it takes the 1 unit won (banking the original 1 unit risk) and places it on the Double Street (Line) that contains the winning number.
 * - Step 3: If Step 2 wins, it takes the 5 units won from the 5:1 payout and places it all on the single winning number from Step 2 (Straight Up).
 * 
 * The Full Bet Progression in details:
 * - Level 1: 1 unit on Red or Black.
 * - Level 2 (after Level 1 win): 1 unit on a Line (Double Street).
 * - Level 3 (after Level 2 win): 5 units on a Single Number.
 * - Any loss completely resets the progression back to Level 1.
 * - A win at Level 3 yields a huge payout (175 units) and completes the funnel, resetting back to Level 1.
 * 
 * The Goal:
 * To aggressively snowball a single color hit into a massive single-number payout, risking only the initial 1 unit per sequence. 
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Determine base unit
  const unit = config.betLimits.minOutside;

  // 2. Initialize State
  if (!state.step) {
    state.step = 1;
    state.lastBet = null;
  }

  // 3. Process Win/Loss from the last spin
  if (spinHistory.length > 0 && state.lastBet) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const lastNum = lastSpin.winningNumber;
    const lastColor = lastSpin.winningColor;
    
    let won = false;
    
    // Evaluate if our last bet won
    if (state.lastBet.type === 'red' && lastColor === 'red') {
      won = true;
    } else if (state.lastBet.type === 'black' && lastColor === 'black') {
      won = true;
    } else if (state.lastBet.type === 'line') {
      // A line bet covers 6 numbers starting from its value
      if (lastNum >= state.lastBet.value && lastNum < state.lastBet.value + 6) {
        won = true;
      }
    } else if (state.lastBet.type === 'number') {
      if (lastNum === state.lastBet.value) {
        won = true;
      }
    }

    // Step progression logic
    if (won) {
      state.step++;
      if (state.step > 3) {
        state.step = 1; // Cycle complete, reset funnel
      }
    } else {
      state.step = 1; // Reset funnel on any loss
    }
  }

  // 4. Calculate Current Bet
  let nextBet = null;

  if (state.step === 1) {
    // Level 1: Bet on Color
    let color = 'red'; // Default
    if (spinHistory.length > 0) {
      const lastColor = spinHistory[spinHistory.length - 1].winningColor;
      if (lastColor === 'red' || lastColor === 'black') {
        color = lastColor; // Follow the last valid color
      }
    }
    nextBet = { type: color, amount: unit };
  } 
  else if (state.step === 2) {
    // Level 2: Bet 1 unit on the Double Street (Line) containing the last hit
    const lastNum = spinHistory[spinHistory.length - 1].winningNumber;
    // Map 1-36 into line starts: 1, 7, 13, 19, 25, 31
    const lineStart = Math.floor((lastNum - 1) / 6) * 6 + 1;
    nextBet = { type: 'line', value: lineStart, amount: unit };
  } 
  else if (state.step === 3) {
    // Level 3: Bet 5 units Straight Up on the last hit
    const lastNum = spinHistory[spinHistory.length - 1].winningNumber;
    nextBet = { type: 'number', value: lastNum, amount: unit * 5 };
  }

  // 5. CLAMP TO LIMITS (Crucial)
  let minLimit = ['red', 'black'].includes(nextBet.type) ? config.betLimits.minOutside : config.betLimits.min;
  nextBet.amount = Math.max(nextBet.amount, minLimit);
  nextBet.amount = Math.min(nextBet.amount, config.betLimits.max);

  // Safely clamp against remaining bankroll to prevent errors
  nextBet.amount = Math.min(nextBet.amount, bankroll);

  // Save state to validate on the next spin
  state.lastBet = nextBet;

  // 6. Return Bet array
  return nextBet.amount > 0 ? [nextBet] : [];
}