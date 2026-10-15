/**
 * Prodigy Roulette Strategy (Corrected)
 * * Source: https://youtu.be/nqVVaJcs33A (The Roulette Master) - User Corrected
 * * The Full Logic in details: 
 * - Spin without betting until 2 different columns hit in the history.
 * - Identify the last 2 winning numbers from those 2 different columns.
 * - For each number: Determine its column and its half (Low 1-18 or High 19-36). Place 1 base unit on every number in that exact column and half, EXCLUDING the winning number itself.
 * - Count the colors of the chosen inside bets. If there are more Red numbers, place 15 base units on Black. If more Black numbers (or equal), place 15 base units on Red.
 * * The Full Bet Progression in details:
 * - On a total loss (0 payout), rebet and double up all bets (Martingale).
 * - On a win, evaluate session profit:
 * - If NOT at the session's peak profit (Session Profit <= 0), rebet the exact same amounts.
 * - If at the session's peak profit (New High Watermark / Session Profit > 0), reset all bets and wait for the 2-column trigger again.
 * * The Goal:
 * - Target steady session profits and reset upon breaking into new positive profit margins.
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Initialize State
  if (state.sessionProfit === undefined) {
    state.sessionProfit = 0;
    state.multiplier = 1;
    state.isActive = false; // Tracks if we are actively betting or waiting
    state.targetNumbers = [];
    state.outsideColor = null;
    state.lastBets = [];
    state.lastBetAmount = 0;
  }

  const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
  const getCol = (num) => (num % 3 === 0) ? 3 : (num % 3);
  const isLow = (num) => num >= 1 && num <= 18;

  // 2. Track Session Profit & Adjust Progression
  if (state.isActive && spinHistory.length > 0 && state.lastBetAmount > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    let payout = 0;
    
    for (let b of state.lastBets) {
      if (b.type === 'black' && lastSpin.winningColor === 'black') payout += b.amount * 2;
      else if (b.type === 'red' && lastSpin.winningColor === 'red') payout += b.amount * 2;
      else if (b.type === 'number' && b.value === lastSpin.winningNumber) payout += b.amount * 36;
    }
    
    const spinProfit = payout - state.lastBetAmount;
    state.sessionProfit += spinProfit;
    
    if (state.sessionProfit > 0) {
      // Win AND at session's peak profit -> Reset
      state.isActive = false;
      state.sessionProfit = 0;
      state.multiplier = 1;
      state.targetNumbers = [];
      state.lastBetAmount = 0;
    } else {
      if (payout === 0) {
        // Loss -> Double up
        state.multiplier *= 2;
      }
      // If Win but NOT at peak profit -> Rebet (multiplier stays the same, do nothing)
    }
  }

  // 3. Scan for Trigger if Inactive
  if (!state.isActive) {
    let col1 = null, num1 = null;
    let col2 = null, num2 = null;
    
    // Scan backwards to find the last 2 numbers in different columns
    for (let i = spinHistory.length - 1; i >= 0; i--) {
      let n = spinHistory[i].winningNumber;
      if (n === 0) continue;
      
      let c = getCol(n);
      if (col1 === null) {
        col1 = c;
        num1 = n;
      } else if (c !== col1) {
        col2 = c;
        num2 = n;
        break;
      }
    }

    if (col1 !== null && col2 !== null) {
      state.isActive = true;
      
      // Helper to generate layout for a specific number based on its Column & Half
      const getTargetGroup = (targetNum, targetCol) => {
        let group = [];
        let targetIsLow = isLow(targetNum);
        for (let i = 1; i <= 36; i++) {
          if (getCol(i) === targetCol && isLow(i) === targetIsLow && i !== targetNum) {
            group.push(i);
          }
        }
        return group;
      };

      state.targetNumbers = [...getTargetGroup(num1, col1), ...getTargetGroup(num2, col2)];

      // Count colors to balance the outside bet
      let redCount = 0;
      let blackCount = 0;
      state.targetNumbers.forEach(n => {
        redNumbers.includes(n) ? redCount++ : blackCount++;
      });

      if (redCount > blackCount) {
        state.outsideColor = 'black';
      } else if (blackCount > redCount) {
        state.outsideColor = 'red';
      } else {
        state.outsideColor = 'black'; // Fallback for equal distribution
      }
    } else {
      // Waiting for trigger
      return []; 
    }
  }

  // 4. Calculate Limits and Bets
  let bets = [];
  let baseMultiplier = Math.max(1, config.betLimits.min);
  
  let colorAmt = 15 * baseMultiplier * state.multiplier;
  colorAmt = Math.max(colorAmt, config.betLimits.minOutside);
  colorAmt = Math.min(colorAmt, config.betLimits.max);
  
  let insideAmt = 1 * baseMultiplier * state.multiplier;
  insideAmt = Math.max(insideAmt, config.betLimits.min);
  insideAmt = Math.min(insideAmt, config.betLimits.max);
  
  // 5. Place Bets
  bets.push({ type: state.outsideColor, amount: colorAmt });
  for (let n of state.targetNumbers) {
    bets.push({ type: 'number', value: n, amount: insideAmt });
  }
  
  state.lastBets = bets;
  state.lastBetAmount = bets.reduce((sum, b) => sum + b.amount, 0);
  
  return bets;
}