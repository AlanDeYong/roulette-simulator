/**
 * Roulette Strategy: The Parity Void System
 * 
 * Source:
 * - Channel: The Lucky Felt (Todd Hoover)
 * - Video URL: https://youtu.be/2W_Sfg8usJI
 * 
 * The Full Logic in Details:
 * - The system covers 12 straight-up numbers (a 12-number footprint) to leverage
 *   the 35:1 payout.
 * - Trigger / Selection Rules:
 *   1. Evaluate the last non-zero winning number.
 *   2. Identify its Dozen (1st: 1-12, 2nd: 13-24, 3rd: 25-36) and Parity (Even or Odd).
 *   3. Exclude the Dozen of the last winning number.
 *   4. From the remaining two Dozens, place straight-up bets on ALL 12 numbers 
 *      matching the Parity (Even/Odd) of the last winning number.
 *   5. If 0 (or 00) hits, treat it as a "ghost spin": maintain the exact same bet
 *      selection and progression level without advancing or resetting.
 * 
 * The Full Bet Progression in Details (Smart Clutch Recovery):
 * - Initial Bet: 1 base unit per straight-up number (total 12 units placed).
 * - Base Attempt Phase: Flat bet 1 unit per number for up to 3 consecutive attempts (1-1-1).
 * - Smart Clutch Recovery Phase: If 3 consecutive losses occur, calculate the net 
 *   deficit relative to the peak bankroll.
 *   Unit Multiplier = Math.ceil( Deficit / (24 * Base Unit) )
 *   (Winning a 12-number straight-up bet yields a net profit of +24 units per base unit).
 * - Win Reset: When a win brings the bankroll back to or above the peak bankroll, 
 *   reset the unit multiplier back to 1.
 * 
 * The Goal:
 * - Target Profit: +20% gain over starting bankroll (e.g., +$100 on a $500 bankroll).
 * - Stop-Loss: Complete bankroll depletion.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Initialize State
  if (!state.initialized) {
    state.initialized = true;
    state.startingBankroll = bankroll;
    state.peakBankroll = bankroll;
    state.unitMultiplier = 1;
    state.consecutiveLosses = 0;
    state.targetNumbers = [];
  }

  // Target profit check (+20% of starting bankroll)
  const targetProfit = state.startingBankroll * 0.20;
  if (bankroll >= state.startingBankroll + targetProfit || bankroll <= 0) {
    return []; // Stop betting if goal reached or bankroll depleted
  }

  // Track peak bankroll
  if (bankroll > state.peakBankroll) {
    state.peakBankroll = bankroll;
  }

  // Base unit for inside bets (straight-up numbers)
  const baseUnit = config.betLimits.min;

  // 2. Process Spin History
  if (spinHistory && spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const lastNum = lastSpin.winningNumber;

    // Evaluate previous bet outcome if targets were set
    if (state.targetNumbers.length > 0) {
      if (lastNum === 0 || lastNum === '00') {
        // Ghost spin: zero leaves progression state untouched
      } else if (state.targetNumbers.includes(lastNum)) {
        // Win
        if (bankroll >= state.peakBankroll) {
          state.unitMultiplier = 1;
          state.consecutiveLosses = 0;
        } else {
          // Dynamic adjustment for partial recovery
          const deficit = state.peakBankroll - bankroll;
          state.unitMultiplier = Math.max(1, Math.ceil(deficit / (24 * baseUnit)));
        }
      } else {
        // Loss
        state.consecutiveLosses++;
        const deficit = state.peakBankroll - bankroll;

        if (state.consecutiveLosses >= 3) {
          // Apply Smart Clutch recovery calculation
          const requiredMultiplier = Math.ceil(deficit / (24 * baseUnit));
          state.unitMultiplier = Math.max(state.unitMultiplier + 1, requiredMultiplier);
        } else {
          state.unitMultiplier = 1;
        }
      }
    }

    // Determine new 12-number target footprint if last spin was non-zero
    if (lastNum !== 0 && lastNum !== '00' && typeof lastNum === 'number') {
      const isEven = lastNum % 2 === 0;
      let excludedDozen = 1;
      if (lastNum >= 13 && lastNum <= 24) excludedDozen = 2;
      else if (lastNum >= 25 && lastNum <= 36) excludedDozen = 3;

      const activeDozens = [1, 2, 3].filter(d => d !== excludedDozen);

      const newTargets = [];
      for (let n = 1; n <= 36; n++) {
        let nDozen = 1;
        if (n >= 13 && n <= 24) nDozen = 2;
        else if (n >= 25 && n <= 36) nDozen = 3;

        if (activeDozens.includes(nDozen)) {
          if (isEven && n % 2 === 0) newTargets.push(n);
          else if (!isEven && n % 2 !== 0) newTargets.push(n);
        }
      }
      state.targetNumbers = newTargets;
    }
  }

  // If no targets established yet (e.g. before initial spin), skip betting
  if (!state.targetNumbers || state.targetNumbers.length === 0) {
    return [];
  }

  // 3. Calculate Bet Amount per Number
  let amountPerBet = baseUnit * state.unitMultiplier;

  // Clamp to bet limits
  amountPerBet = Math.max(config.betLimits.min, Math.min(amountPerBet, config.betLimits.max));

  // 4. Return Bet Objects
  return state.targetNumbers.map(num => ({
    type: 'number',
    value: num,
    amount: amountPerBet
  }));
}