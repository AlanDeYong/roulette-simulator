/**
 * Source: This Will Pay Better Dividends than the Stock Market || Roulette Dividends - CEG Dealer School
 * URL: https://youtu.be/U6LsX21mgRk
 * 
 * The Full Logic in details:
 * This strategy aims to generate "dividends" by locking up unrisked profit at each sequence win. 
 * It revolves around a 3-step cycle. Bets are kept flat at each individual stage, and the player 
 * specifically avoids increasing bet sizes on a loss (No Martingale).
 * 
 * The Full Bet Progression in details:
 * Step 1: Bet 5 units on the 1st Dozen. 
 *         - Win: Pocket profit (dividend) and advance to Step 2.
 *         - Lose: Stay at Step 1 (rebet flat). Do not increase the bet.
 * Step 2: Bet 5 units on the 1st Dozen AND 1 unit on 5 different splits located in the 2nd and 3rd Dozens.
 *         - Win: Pocket profit (dividend) and advance to Step 3.
 *         - Lose: Reset sequence to Step 1.
 * Step 3: Bet 10 units on an Even Money bet (e.g., Red).
 *         - Win or Lose: End of the cycle. Reset sequence to Step 1.
 * 
 * The Goal:
 * Double the buy-in. Betting halts completely when bankroll is >= 2x the starting bankroll.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Check Goal Condition
  if (bankroll >= config.startingBankroll * 2) {
    return []; // Goal reached, stop betting
  }

  // 2. Initialize State
  if (state.step === undefined) {
    state.step = 1;
  }

  // Define the 5 splits used in Step 2 (These safely sit in Dozens 2 and 3)
  const splits = [[14, 15], [17, 18], [20, 21], [26, 27], [29, 30]];

  // 3. Process Previous Spin Results
  if (spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const winNum = lastSpin.winningNumber;
    
    // Evaluate if our covered areas hit
    const hitDozen1 = winNum >= 1 && winNum <= 12;
    const hitSplit = splits.some(split => split.includes(winNum));

    if (state.step === 1) {
      if (hitDozen1) {
        state.step = 2; // Move to Step 2 on Win
      } else {
        state.step = 1; // Repeat Step 1 on Loss
      }
    } else if (state.step === 2) {
      if (hitDozen1 || hitSplit) {
        state.step = 3; // Move to Step 3 on Win
      } else {
        state.step = 1; // Reset to Step 1 on Loss
      }
    } else if (state.step === 3) {
      // The cycle concludes here. Win or lose, go back to Step 1
      state.step = 1;
    }
  }

  // 4. Calculate Unit Sizing & Clamp to Limits
  // Base 'part' ensures 1 split unit respects inside mins, and 5 parts respects outside mins.
  const part = Math.max(config.betLimits.min, Math.ceil(config.betLimits.minOutside / 5));
  
  const dozenAmount = Math.min(part * 5, config.betLimits.max);
  const splitAmount = Math.min(part, config.betLimits.max);
  const evenMoneyAmount = Math.min(part * 10, config.betLimits.max);

  // 5. Safety Check: Verify Bankroll 
  let totalNeeded = 0;
  if (state.step === 1) totalNeeded = dozenAmount;
  else if (state.step === 2) totalNeeded = dozenAmount + (splitAmount * 5);
  else if (state.step === 3) totalNeeded = evenMoneyAmount;

  if (totalNeeded > bankroll) {
    state.step = 1; // Fallback to step 1
    totalNeeded = dozenAmount;
    if (totalNeeded > bankroll) {
      return []; // Cannot meet table minimums, halt play
    }
  }

  // 6. Return Bet Objects
  let bets = [];
  if (state.step === 1) {
    bets.push({ type: 'dozen', value: 1, amount: dozenAmount });
  } else if (state.step === 2) {
    bets.push({ type: 'dozen', value: 1, amount: dozenAmount });
    splits.forEach(split => {
      bets.push({ type: 'split', value: split, amount: splitAmount });
    });
  } else if (state.step === 3) {
    bets.push({ type: 'red', amount: evenMoneyAmount });
  }

  return bets;
}