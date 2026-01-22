/**
 * Strategy: The Big Kahuna (Greg's System)
 * Source: https://www.youtube.com/watch?v=rOJh4VX9RSQ (Greg's System)
 * Channel: CEG Dealer School
 *
 * The Logic:
 * - This is a high-coverage "grind" strategy.
 * - It places bets on the 1st Dozen and 3rd Dozen to cover the outsides.
 * - It places 8 specific Straight-Up bets on numbers within the 2nd Dozen (13, 14, 16, 17, 19, 20, 22, 23).
 * - This leaves only 4 numbers in the 2nd Dozen and the Zeros as losing outcomes.
 *
 * The Progression:
 * 1. Win on Straight-Up (Inside): The specific number that hit is REMOVED from the active betting list for future spins. 
 * (This "banks" the profit and reduces exposure).
 * 2. Win on Dozen (Outside): Maintain the current bets.
 * 3. Loss (Zero or Uncovered Number): Double the bet multiplier (Martingale style) for ALL remaining bets.
 *
 * The Goal:
 * - Reach a session profit of +$300 (or a scaled target based on bankroll).
 * - Upon reaching the target, RESET the system: restore all 8 numbers and reset the multiplier to 1.
 */

function bet(spinHistory, bankroll, config, state) {
  // --- Constants ---
  const INITIAL_NUMBERS = [13, 14, 16, 17, 19, 20, 22, 23];
  const DOZEN_1_NUMS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const DOZEN_3_NUMS = [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36];
  const PROFIT_TARGET = 300; // Value to trigger a full reset
  
  // --- 1. State Initialization ---
  if (!state.initialized) {
    state.activeNumbers = [...INITIAL_NUMBERS];
    state.multiplier = 1;
    state.startBankroll = bankroll;
    state.initialized = true;
  }

  // --- 2. Process Previous Spin (if exists) ---
  if (spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const winningNum = lastSpin.winningNumber;
    
    // Calculate Session Profit to check for Reset
    const currentProfit = bankroll - state.startBankroll;

    // RULE: Reset if Profit Target Reached
    if (currentProfit >= PROFIT_TARGET) {
      state.activeNumbers = [...INITIAL_NUMBERS];
      state.multiplier = 1;
      state.startBankroll = bankroll; // Reset profit baseline
    } else {
      // Analyze Win/Loss Logic
      let isWin = false;
      let hitInside = false;

      // Check Dozen Win
      if (DOZEN_1_NUMS.includes(winningNum) || DOZEN_3_NUMS.includes(winningNum)) {
        isWin = true;
        // Dozen wins just maintain status quo
      }
      
      // Check Straight Up Win
      if (state.activeNumbers.includes(winningNum)) {
        isWin = true;
        hitInside = true;
        // RULE: Remove the winning number from active bets
        state.activeNumbers = state.activeNumbers.filter(n => n !== winningNum);
        
        // Edge Case: If we cleared all numbers, reset the list? 
        // Strategy usually implies we keep grinding dozens, but let's reset if empty to be safe.
        if (state.activeNumbers.length === 0) {
           state.activeNumbers = [...INITIAL_NUMBERS];
           state.multiplier = 1; // Treat clearing the board as a "session win"
        }
      }

      // Check Loss
      if (!isWin) {
        // RULE: Double on Loss
        state.multiplier *= 2;
      }
    }
  }

  // --- 3. Calculate Bet Amounts (Respecting Limits) ---
  const bets = [];

  // Determine Unit Sizes
  // Strategy uses 1 unit inside : 12 units outside ratio.
  // We base the "Unit" on the config's minimum inside bet.
  const baseUnit = config.betLimits.min; 
  
  // Calculate Raw Amounts based on Multiplier
  let insideAmountRaw = baseUnit * state.multiplier;
  let outsideAmountRaw = (baseUnit * 12) * state.multiplier;

  // CLAMP: Respect Minimums
  const insideAmount = Math.max(insideAmountRaw, config.betLimits.min);
  const outsideAmount = Math.max(outsideAmountRaw, config.betLimits.minOutside);

  // CLAMP: Respect Maximums (Crucial for Martingale safety)
  const finalInside = Math.min(insideAmount, config.betLimits.max);
  const finalOutside = Math.min(outsideAmount, config.betLimits.max);

  // --- 4. Construct Bet Objects ---

  // A. Dozen Bets (1st and 3rd)
  bets.push({
    type: 'dozen',
    value: 1, // 1st Dozen
    amount: finalOutside
  });

  bets.push({
    type: 'dozen',
    value: 3, // 3rd Dozen
    amount: finalOutside
  });

  // B. Straight Up Bets (Active 2nd Dozen numbers)
  state.activeNumbers.forEach(num => {
    bets.push({
      type: 'number',
      value: num,
      amount: finalInside
    });
  });

  return bets;
}