/**
 * Strategy: Street Slayer Strategy (Hot Numbers Variant)
 * Source: https://youtu.be/uOeZ16IfFJQ (The Roulette Factory) - Modified by request.
 * 
 * The Full Logic in details:
 * - The strategy waits for the first 37 spins without betting to track number frequencies and determine "hot" and "cold" streets.
 * - After 37 spins, it places straight-up bets on the top 2 hottest Single Streets (3 numbers each) simultaneously.
 * - The two streets are treated as completely independent bets, each tracking its own progression state.
 * - After a spin, the results are checked against the active streets:
 *   - WIN: If a street hits, that street's bet is cleared. A new street replaces it by looking at past spins and picking the hottest available street (avoiding the coldest). Its progression resets to the base level (index 0).
 *   - LOSS: If a street misses, its progression index advances by 1 to the next level in the custom array.
 * 
 * The Full Bet Progression in details:
 * - It uses a hardcoded 36-level custom progression built to optimize recovery on the 11:1 single street payout curve.
 * - Progression multipliers: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 23, 26, 29, 33, 37, 41, 46, 51, 57, 63, 70, 78, 86, 95, 105, 117, 131, 147, 165, 185, 210.
 * - If a street loses beyond the 36th level, it caps at the maximum level.
 * 
 * The Goal:
 * - To bend the odds in the player's favor by covering 6 numbers (2 streets) using historical heat maps, while utilizing a deep, custom mathematical progression curve that yields massive payouts upon a delayed hit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // Wait for 37 spins to gather data on hot/cold numbers
  if (spinHistory.length < 37) {
    return [];
  }

  const progression = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 23, 26, 29, 33, 
    37, 41, 46, 51, 57, 63, 70, 78, 86, 95, 105, 117, 131, 147, 165, 185, 210
  ];
  const validStreets = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];
  const unit = config.betLimits.min;

  // Helper function to rank streets by frequency (hot to cold) based on all past spins
  const getHotStreets = () => {
    let counts = {};
    validStreets.forEach(s => counts[s] = 0);

    spinHistory.forEach(spin => {
      let num = Number(spin.winningNumber);
      if (num > 0) {
        // Calculate the starting number of the street for any given number (e.g., 5 -> 4, 12 -> 10)
        let streetStart = Math.floor((num - 1) / 3) * 3 + 1;
        if (counts[streetStart] !== undefined) {
          counts[streetStart]++;
        }
      }
    });

    // Sort valid streets descending by hit count (hottest first, coldest last)
    return validStreets.slice().sort((a, b) => counts[b] - counts[a]);
  };

  // Initialize State: Pick the 2 hottest streets after the 37-spin wait
  if (!state.activeBets) {
    let hotStreets = getHotStreets();
    state.activeBets = [
      { street: hotStreets[0], index: 0 },
      { street: hotStreets[1], index: 0 }
    ];
  } else {
    // Process the last spin to update progressions and swap winning streets
    const lastSpin = spinHistory[spinHistory.length - 1].winningNumber;
    const spinNum = Number(lastSpin);
    const isZero = lastSpin === 0 || lastSpin === '00';

    let newActiveBets = [];
    let neededNewStreets = 0;

    for (let betState of state.activeBets) {
      // A street covers `street`, `street+1`, `street+2`
      let isWin = !isZero && (spinNum >= betState.street && spinNum <= betState.street + 2);

      if (isWin) {
        neededNewStreets++;
      } else {
        // Loss: advance progression
        betState.index++;
        if (betState.index >= progression.length) {
          betState.index = progression.length - 1; // Cap at max progression level
        }
        newActiveBets.push(betState);
      }
    }

    // Replace any streets that won with new hottest available streets
    if (neededNewStreets > 0) {
      let currentStreets = newActiveBets.map(b => b.street);
      let hotStreets = getHotStreets();
      
      // Filter out streets we are currently betting on to avoid duplicates
      let availableStreets = hotStreets.filter(s => !currentStreets.includes(s));

      for (let i = 0; i < neededNewStreets; i++) {
        // By picking from the start of availableStreets, we bet the hottest and avoid the coldest
        newActiveBets.push({ street: availableStreets[i], index: 0 });
      }
    }

    state.activeBets = newActiveBets;
  }

  // Generate the bets based on updated state
  let bets = [];

  for (let betState of state.activeBets) {
    let unitsToBet = progression[betState.index];
    let amount = unitsToBet * unit;

    // Clamp to table limits
    amount = Math.max(amount, config.betLimits.min);
    amount = Math.min(amount, config.betLimits.max);

    bets.push({
      type: 'street',
      value: betState.street,
      amount: amount
    });
  }

  return bets;
}