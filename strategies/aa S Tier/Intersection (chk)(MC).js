/**
 * Intersection Roulette Strategy
 * 
 * SOURCE:
 * - Channel: Gamblers University
 * - Video URL: https://youtu.be/G4ANDziHbjc
 * 
 * FULL LOGIC:
 * - The strategy combines street bets (inside) with a single column bet (outside).
 * - Numbers where covered streets intersect with the active column are "Jackpot Numbers"
 *   that pay out on both bets simultaneously.
 * - On each spin, if the current bankroll hits a new session high (or reaches target profit),
 *   the progression resets back to Stage 1.
 * - On a win that does not hit a new session high, the current bets are repeated.
 * - On a loss, the strategy advances to the next stage of progression by adding an additional 
 *   street bet (up to a max of 5 streets / 22 numbers covered) and increasing chip unit sizes.
 * 
 * BET PROGRESSION:
 * - Stage 1: 1 Street @ 1 unit, Column @ 1 unit (Column = Total Streets sum)
 * - Stage 2: 2 Streets @ 1 unit each ($2 total streets), Column @ 2 units
 * - Stage 3: 3 Streets @ 2 units each ($6 total streets), Column @ 6 units
 * - Stage 4: 4 Streets @ 3 units each ($12 total streets), Column @ 12 units
 * - Stage 5: 5 Streets @ 4 units each ($20 total streets), Column @ 20 units
 * - Stage 6+: 5 Streets @ (Stage - 1) units each, Column @ 5 * (Stage - 1) units
 * 
 * TARGET PROFIT / STOP LOSS:
 * - Target Profit: +$50 above starting bankroll (or reset on every new session bankroll high).
 * - Stop Loss: Total bankroll depletion.
 * 
 * @param {Array} spinHistory - Array of past spin results
 * @param {number} bankroll - Current available bankroll
 * @param {Object} config - System configuration and bet limits
 * @param {Object} state - Persistent state object across spins
 * @param {Object} utils - Utility helper functions
 * @returns {Array|null} Array of bet objects or empty array
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Initialize Base Units and Limits
  const minInside = config.betLimits.min;
  const minOutside = config.betLimits.minOutside;
  const maxBet = config.betLimits.max;

  // 2. Initialize State Variables
  if (!state.initialized) {
    state.initialized = true;
    state.startingBankroll = bankroll;
    state.peakBankroll = bankroll;
    state.stage = 1;
    state.targetProfit = 50000;
    
    // Default streets to select from (starting number of street rows)
    state.availableStreets = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];
    state.activeColumn = 3; // Column 3 by default
  }

  // 3. Process Previous Spin Result
  if (spinHistory && spinHistory.length > 0) {
    const lastResult = spinHistory[spinHistory.length - 1];
    
    // Check for session high / profit target reached
    if (bankroll > state.peakBankroll) {
      state.peakBankroll = bankroll;
      state.stage = 1; // Reset progression on new session high
    } else {
      // Evaluate if last spin was a loss (bankroll dropped)
      const prevBankroll = state.lastBankroll || bankroll;
      if (bankroll < prevBankroll) {
        state.stage += 1; // Advance progression on loss
      }
    }
  }

  // Record current bankroll for next turn comparison
  state.lastBankroll = bankroll;

  // Stop betting if overall target profit is met (e.g., +$50 over initial start)
  if (bankroll >= state.startingBankroll + state.targetProfit && spinHistory.length > 0) {
    return [];
  }

  // 4. Calculate Bets based on Progression Stage
  let numStreets = 1;
  let streetUnitMultiplier = 1;

  if (state.stage === 1) {
    numStreets = 1;
    streetUnitMultiplier = 1;
  } else if (state.stage === 2) {
    numStreets = 2;
    streetUnitMultiplier = 1;
  } else if (state.stage === 3) {
    numStreets = 3;
    streetUnitMultiplier = 2;
  } else if (state.stage === 4) {
    numStreets = 4;
    streetUnitMultiplier = 3;
  } else if (state.stage === 5) {
    numStreets = 5;
    streetUnitMultiplier = 4;
  } else {
    // Stage 6 and beyond
    numStreets = 5;
    streetUnitMultiplier = state.stage - 1;
  }

  // Calculate individual street bet amount
  let streetBetAmount = Math.max(minInside * streetUnitMultiplier, minInside);
  streetBetAmount = Math.min(streetBetAmount, maxBet);

  // Total street bet total
  const totalStreetAmount = streetBetAmount * numStreets;

  // Column bet amount equals the combined total of all active street bets
  let columnBetAmount = Math.max(totalStreetAmount, minOutside);
  columnBetAmount = Math.min(columnBetAmount, maxBet);

  // 5. Construct Bet Array
  const bets = [];

  // Place active Street bets
  for (let i = 0; i < numStreets; i++) {
    const streetStartNumber = state.availableStreets[i % state.availableStreets.length];
    bets.push({
      type: 'street',
      value: streetStartNumber,
      amount: streetBetAmount
    });
  }

  // Place Column bet
  bets.push({
    type: 'column',
    value: state.activeColumn,
    amount: columnBetAmount
  });

  return bets;
}