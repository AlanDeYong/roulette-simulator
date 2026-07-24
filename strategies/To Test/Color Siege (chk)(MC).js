/**
 * Roulette Strategy: The Color Siege
 * Source: https://youtu.be/LTTMoZuArtE (The Lucky Felt)
 * * Logic:
 * This strategy "lays siege" to a specific color (Red or Black) by betting heavily 
 * on the outside color bet while simultaneously placing "sniper" inside bets 
 * (splits and straight-ups) on numbers of that exact same color. 
 * - When Red is targeted: 10 units on Red, 1 unit on splits (9/12, 16/19, 18/21, 27/30), 
 * and 1 unit straight-up on 5 and 32. (Total 16 units)
 * - When Black is targeted: 10 units on Black, 1 unit on splits (8/11, 10/13, 17/20, 26/29, 28/31). (Total 15 units)
 * - The strategy plays "Follow the Last Color". If Red hits, the next bet is on Red.
 * * Bet Progression (Linear / Tiered):
 * - Base level starts at 1. The amounts are multiplied by the current level.
 * - On a loss: Progression level increases by 1 (e.g., base unit amounts double, triple, etc.).
 * - On a small win (color hits but no inside bet): Level is maintained to recover.
 * - On a jackpot win (color + inside bet hits) OR when Session Profit > 0: 
 * Progression resets to Level 1. If a jackpot hits but session is still negative, 
 * the bet level is reduced by half.
 * * Goal:
 * - Generate overlapping "jackpot" payouts where a 1:1 color win stacks with a 17:1 
 * or 35:1 inside win.
 * - Target profit is typically 20% of the starting bankroll (soft stop goal).
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Initialize State and Track Profit
  if (typeof state.level === 'undefined') {
    state.level = 1;
    state.sessionProfit = 0;
    state.lastBankroll = bankroll;
    state.targetColor = 'red'; // Default start
  }

  // Calculate profit from the last spin
  if (spinHistory.length > 0) {
    const profit = bankroll - state.lastBankroll;
    state.sessionProfit += profit;

    // Adjust Progression Level based on results
    if (profit > 0) {
      if (state.sessionProfit >= 0) {
        // Session is in profit, reset to base level
        state.level = 1;
        state.sessionProfit = 0; 
      } else if (profit > (config.betLimits.min * 10 * state.level)) {
        // Hit an inside jackpot but session still negative: reduce level by half
        state.level = Math.max(1, Math.floor(state.level / 2));
      }
      // If it's a small win (just color, no inside), level stays the same
    } else if (profit < 0) {
      // On a loss, increase the progression level
      state.level++;
    }

    // Determine target color: "Follow the Last Color"
    const lastColor = spinHistory[spinHistory.length - 1].winningColor;
    if (lastColor === 'red' || lastColor === 'black') {
      state.targetColor = lastColor;
    }
  }

  // Update bankroll tracking for the next spin
  state.lastBankroll = bankroll;

  // 2. Determine Base Units and Clamp to Limits
  const insideUnit = config.betLimits.min;
  let outsideUnit = insideUnit * 10;
  
  // Ensure the outside bet base meets the table minimums
  outsideUnit = Math.max(outsideUnit, config.betLimits.minOutside);

  // Apply Progression Multiplier
  let amountInside = insideUnit * state.level;
  let amountOutside = outsideUnit * state.level;

  // Clamp max limits
  amountInside = Math.min(amountInside, config.betLimits.max);
  amountOutside = Math.min(amountOutside, config.betLimits.max);

  // If hitting max limit is preventing the ratio, fallback to max allowed safely
  if (amountOutside > config.betLimits.max) {
      amountOutside = config.betLimits.max;
  }

  // 3. Construct Bets based on Target Color
  const bets = [];

  if (state.targetColor === 'red') {
    bets.push({ type: 'red', amount: amountOutside });
    // All-Red Splits (European Layout)
    bets.push({ type: 'split', value: [9, 12], amount: amountInside });
    bets.push({ type: 'split', value: [16, 19], amount: amountInside });
    bets.push({ type: 'split', value: [18, 21], amount: amountInside });
    bets.push({ type: 'split', value: [27, 30], amount: amountInside });
    // Isolated Red Straight-Ups
    bets.push({ type: 'number', value: 5, amount: amountInside });
    bets.push({ type: 'number', value: 32, amount: amountInside });
  } else {
    bets.push({ type: 'black', amount: amountOutside });
    // All-Black Splits (European Layout)
    bets.push({ type: 'split', value: [8, 11], amount: amountInside });
    bets.push({ type: 'split', value: [10, 13], amount: amountInside });
    bets.push({ type: 'split', value: [17, 20], amount: amountInside });
    bets.push({ type: 'split', value: [26, 29], amount: amountInside });
    bets.push({ type: 'split', value: [28, 31], amount: amountInside });
  }

  // 4. Return the constructed bets array
  return bets;
}