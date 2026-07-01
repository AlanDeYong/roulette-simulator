/*
 * Strategy: Charlie's Best Strategy
 * Source: https://youtu.be/KahzQFIq2yw (The Roulette Master)
 * * The Full Logic:
 * This strategy aims to safely grind out a profit by covering a large portion of the board.
 * It places a base total of 110 units distributed as follows:
 * - $25 on the 2nd Dozen
 * - $15 each on the Double Streets (Lines) 10-15 and 22-27
 * - $5 each on Vertical Splits inside those lines: 10/13, 11/14, 12/15, 22/25, 23/26, 24/27
 * - $5 each on Horizontal Splits "to the side": 7/8, 28/29
 * - $5 each on Single Numbers (Jackpots/Zero): 0, 4, 31
 * * The Full Bet Progression:
 * The progression uses a flat multiplier on the base bets.
 * - If a spin results in a FULL LOSS (0 chips hit, Net Loss == Total Bet): The multiplier increases by 1.
 * - If a spin results in a PARTIAL LOSS (Some chips hit, Net Loss < Total Bet): The multiplier remains unchanged.
 * - If a spin results in a WIN (Net Win > 0):
 * - If the current bankroll is in Session Profit (>= Starting Bankroll), reset multiplier back to 1.
 * - If the current bankroll is NOT in Session Profit (< Starting Bankroll), set multiplier to 2 ("one step higher").
 * * The Goal:
 * - The session target is $200 profit. Once the bankroll is >= Starting Bankroll + 200, betting stops.
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Goal Check: Target is $200 profit
  if (bankroll >= config.startingBankroll + 200) {
    return []; // Stop betting
  }

  // 2. Initialize State Variables
  if (state.multiplier === undefined) {
    state.multiplier = 1;
    state.lastTotalBet = 0;
    state.bankrollBeforeLastSpin = bankroll;
  }

  // 3. Evaluate Progression Logic based on the last spin
  if (spinHistory.length > 0 && state.lastTotalBet > 0) {
    // Calculate Net Win from the perspective of the bankroll before the previous spin's bets were placed
    const netWin = bankroll - state.bankrollBeforeLastSpin;

    if (netWin > 0) {
      // WIN Condition
      if (bankroll >= config.startingBankroll) {
        state.multiplier = 1; // In session profit, reset to base
      } else {
        state.multiplier = 2; // Not in profit, start one step higher
      }
    } else if (netWin < 0) {
      // LOSS Condition
      if (Math.abs(netWin) === state.lastTotalBet) {
        // Full loss (nothing hit) -> Increase multiplier
        state.multiplier += 1;
      } else {
        // Partial loss (e.g., hit 2nd dozen but missed others) -> Do not increase
        // Multiplier remains the same
      }
    }
  }

  // Ensure multiplier never drops below 1
  state.multiplier = Math.max(1, state.multiplier);

  // 4. Define Base Bets and Apply Multiplier
  const m = state.multiplier;
  
  // We specify the base proportions and multiply them by the current progression state
  let plannedBets = [
    { type: 'dozen', value: 2, amount: 25 * m },
    { type: 'line', value: 10, amount: 15 * m }, // Double Street 10-15
    { type: 'line', value: 22, amount: 15 * m }, // Double Street 22-27
    { type: 'split', value: [10, 13], amount: 5 * m },
    { type: 'split', value: [11, 14], amount: 5 * m },
    { type: 'split', value: [12, 15], amount: 5 * m },
    { type: 'split', value: [22, 25], amount: 5 * m },
    { type: 'split', value: [23, 26], amount: 5 * m },
    { type: 'split', value: [24, 27], amount: 5 * m },
    { type: 'split', value: [7, 8], amount: 5 * m }, 
    { type: 'split', value: [28, 29], amount: 5 * m },
    { type: 'number', value: 0, amount: 5 * m },
    { type: 'number', value: 4, amount: 5 * m },
    { type: 'number', value: 31, amount: 5 * m }
  ];

  // 5. Clamp Bets to Table Limits
  let validBets = [];
  let totalBet = 0;

  for (let b of plannedBets) {
    let limitMin = ['dozen', 'column', 'red', 'black', 'even', 'odd', 'low', 'high'].includes(b.type) 
      ? config.betLimits.minOutside 
      : config.betLimits.min;

    // Apply strict clamping limits
    let finalAmount = Math.max(b.amount, limitMin);
    finalAmount = Math.min(finalAmount, config.betLimits.max);

    b.amount = finalAmount;
    validBets.push(b);
    totalBet += finalAmount;
  }

  // 6. Save State for Next Evaluation
  // Store the current bankroll BEFORE the simulator subtracts the placed bets
  state.bankrollBeforeLastSpin = bankroll; 
  state.lastTotalBet = totalBet;

  return validBets;
}