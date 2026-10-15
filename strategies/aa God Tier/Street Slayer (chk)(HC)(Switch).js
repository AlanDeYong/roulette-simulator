/**
 * Strategy: Street Slayer Strategy (Dynamic 37-Spin Hot Variant)
 * Source: https://youtu.be/uOeZ16IfFJQ (The Roulette Factory) - Modified by request.
 * 
 * The Full Logic in details:
 * - The strategy waits for the first 37 spins without betting to build an initial heat map.
 * - After 37 spins, it places straight-up bets on the top 2 hottest Single Streets (3 numbers each) simultaneously.
 * - The heat map is evaluated strictly on a rolling window of the *last 37 spins*, and is recalculated *after every single spin*.
 * - The two active bet slots dynamically update their target street to always match the #1 and #2 hottest streets on every spin. 
 * - After a spin, the results are checked against the active streets that were just bet on:
 *   - WIN: If a slot's street hits, its progression index resets to the base level (0).
 *   - LOSS: If a slot's street misses, its progression index advances by 1.
 *   - MOVEMENT: Regardless of win or loss, the bets are immediately reassigned to the current top 2 hottest streets for the next spin, taking their newly updated progression index with them.
 * 
 * The Full Bet Progression in details:
 * - It uses a hardcoded 36-level custom progression built to optimize recovery on the 11:1 single street payout curve.
 * - Progression multipliers: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 23, 26, 29, 33, 37, 41, 46, 51, 57, 63, 70, 78, 86, 95, 105, 117, 131, 147, 165, 185, 210.
 * - If a bet slot loses beyond the 36th level, it caps at the maximum level.
 * 
 * The Goal:
 * - To dynamically chase the hottest sections of the board using a 37-spin rolling window, utilizing a deep mathematical progression curve to recover losses when the "hot" streaks finally hit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  const windowSize = 37;

  // Wait for 37 spins to gather data on hot/cold numbers
  if (spinHistory.length < windowSize) {
    return [];
  }

  const progression = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 23, 26, 29, 33, 
    37, 41, 46, 51, 57, 63, 70, 78, 86, 95, 105, 117, 131, 147, 165, 185, 210
  ];
  const validStreets = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];
  const unit = config.betLimits.min;

  // Helper function to rank streets by frequency (hot to cold) based on the rolling 37-spin window
  const getHotStreets = () => {
    const recentSpins = spinHistory.slice(-windowSize);
    let counts = {};
    validStreets.forEach(s => counts[s] = 0);

    recentSpins.forEach(spin => {
      let num = Number(spin.winningNumber);
      if (num > 0) {
        // Calculate the starting number of the street for any given number (e.g., 5 -> 4, 12 -> 10)
        let streetStart = Math.floor((num - 1) / 3) * 3 + 1;
        if (counts[streetStart] !== undefined) {
          counts[streetStart]++;
        }
      }
    });

    // Sort valid streets descending by hit count (hottest first)
    return validStreets.slice().sort((a, b) => counts[b] - counts[a]);
  };

  let hotStreets = getHotStreets();

  // Initialize State if not set
  if (!state.activeBets) {
    state.activeBets = [
      { street: hotStreets[0], index: 0 },
      { street: hotStreets[1], index: 0 }
    ];
  } else {
    // Evaluate the results of the last spin against our active bets
    const lastSpin = spinHistory[spinHistory.length - 1].winningNumber;
    const spinNum = Number(lastSpin);
    const isZero = lastSpin === 0 || lastSpin === '00';

    for (let i = 0; i < state.activeBets.length; i++) {
      let betState = state.activeBets[i];
      
      // A street covers `street`, `street+1`, `street+2`
      let isWin = !isZero && (spinNum >= betState.street && spinNum <= betState.street + 2);

      if (isWin) {
        // Win: Reset progression
        betState.index = 0;
      } else {
        // Loss: Advance progression
        betState.index++;
        if (betState.index >= progression.length) {
          betState.index = progression.length - 1; // Cap at max progression level
        }
      }

      // Move the entire bet (with its current progression index) to the newly evaluated hottest streets
      // Slot 0 gets the #1 hottest street, Slot 1 gets the #2 hottest street
      betState.street = hotStreets[i];
    }
  }

  // Generate the bets based on the updated state
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