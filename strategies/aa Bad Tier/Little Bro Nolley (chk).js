/**
 * Strategy: Little Bro Nolley (Roulette Strategy Review)
 * Source: CEG Dealer School (https://youtu.be/EhItUXhclHY)
 *
 * Full Logic Details:
 * 1. Base Setup:
 *    - Played with a 100-unit bankroll target ($200 with $2 base units / $10 dozen bets).
 *    - Step 1: Place 5 units on two Dozens (e.g., 1st Dozen and 2nd Dozen). Total bet = 10 units.
 *    - On Loss at Step 1: Re-bet Step 1.
 *    - On Win at Step 1: Net profit is +5 units. Move to Step 2.
 *
 * 2. Step 2 Setup & Execution:
 *    - Re-bet 5 units on each of the same two Dozens.
 *    - Take the 5-unit profit from Step 1 and place 5 Split bets (1 unit each) within the covered dozens.
 *
 * 3. Step 2 Outcomes:
 *    - Jackpot Hit (Hits a split number): Lock up profit and repeat Step 2.
 *    - Non-Jackpot Hit (Hits a covered dozen number without a split): Break Even (Push), repeat Step 2.
 *    - Loss (Hits uncovered dozen or 0/00): Reset progression back to Step 1.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Defensively Extract Limits (Prevents NaN errors if config properties are missing)
  const limits = (config && config.betLimits) ? config.betLimits : {};
  const minInside = typeof limits.min === 'number' ? limits.min : 2;
  const minOutside = typeof limits.minOutside === 'number' ? limits.minOutside : 5;
  const maxLimit = typeof limits.max === 'number' ? limits.max : 5000;

  // Base unit for dozen bets is 5 units. Ensure it meets table minimums and maximums.
  let dozenBetAmount = Math.max(minOutside, 5);
  dozenBetAmount = Math.min(dozenBetAmount, maxLimit);

  // Base unit for split bets is 1 unit.
  let splitBetAmount = Math.max(minInside, 1);
  splitBetAmount = Math.min(splitBetAmount, maxLimit);

  // 2. Initialize State
  if (!state.step) {
    state.step = 1; // Step 1: 2 Dozens; Step 2: 2 Dozens + 5 Splits
  }

  // 3. Evaluate Previous Spin Results
  if (spinHistory && spinHistory.length > 0) {
    const lastResult = spinHistory[spinHistory.length - 1];
    
    // Safely parse the winning number (handles '00' string properly by turning it into 0)
    const lastNumber = parseInt(lastResult.winningNumber, 10);
    
    // Check if the hit was inside our covered dozens (Dozen 1: 1-12, Dozen 2: 13-24)
    // 0 and 00 evaluate to 0, which correctly falls outside these ranges.
    const inDozen1 = lastNumber >= 1 && lastNumber <= 12;
    const inDozen2 = lastNumber >= 13 && lastNumber <= 24;
    const isDozenCovered = inDozen1 || inDozen2;

    // Numbers covered by our 5 splits in Step 2: [1,2], [4,5], [7,8], [10,11], [2,3]
    const splitNumbers = [1, 2, 3, 4, 5, 7, 8, 10, 11]; 
    const isJackpotHit = splitNumbers.includes(lastNumber);

    if (state.step === 1) {
      if (isDozenCovered) {
        state.step = 2; // Win -> Advance
      } else {
        state.step = 1; // Loss -> Repeat
      }
    } else if (state.step === 2) {
      if (isJackpotHit || isDozenCovered) {
        state.step = 2; // Jackpot or Push -> Repeat Step 2
      } else {
        state.step = 1; // Loss -> Start Over
      }
    }
  }

  // 4. Validate Bankroll
  const requiredBankroll = (dozenBetAmount * 2) + (state.step === 2 ? (splitBetAmount * 5) : 0);
  if (bankroll < requiredBankroll) {
    // If we can't afford Step 2, drop down to Step 1. If we can't afford Step 1, return empty.
    state.step = 1;
    if (bankroll < dozenBetAmount * 2) {
      return []; 
    }
  }

  // 5. Construct Bets Array
  const bets = [];

  // Always bet the 2 Dozens
  bets.push({ type: 'dozen', value: 1, amount: dozenBetAmount });
  bets.push({ type: 'dozen', value: 2, amount: dozenBetAmount });

  // Add 5 split bets if on Step 2
  if (state.step === 2) {
    const splits = [
      [1, 2],
      [4, 5],
      [7, 8],
      [10, 11],
      [2, 3]
    ];

    splits.forEach(splitVal => {
      bets.push({ type: 'split', value: splitVal, amount: splitBetAmount });
    });
  }

  return bets;
}