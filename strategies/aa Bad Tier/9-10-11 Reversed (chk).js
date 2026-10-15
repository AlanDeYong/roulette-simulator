/**
 * ============================================================================
 * Strategy Documentation
 * ============================================================================
 * Source:
 *   - Video: https://youtu.be/xYDq82-kqJs
 *   - Channel: WillVegas
 *
 * The Full Logic in Detail:
 *   The "9-10-11 Reversed" roulette strategy relies on high layout coverage 
 *   using Street bets (3-number inside bets starting at 1, 4, 7, 10, etc.).
 *   - Step 1 (9 Streets): Cover 27 numbers (9 streets x 1 unit each = 9 units total).
 *   - Step 2 (10 Streets): Upon winning Step 1, reinvest winnings to add 
 *     1 additional street, covering 30 numbers (10 streets x 1 unit each = 10 units total).
 *   - Step 3 (11 Streets): Upon winning Step 2, reinvest winnings to add 
 *     1 more street, covering 33 numbers (11 streets x 1 unit each = 11 units total).
 *
 * The Full Bet Progression in Detail:
 *   - Step 1 (9 Streets)  + Win  -> Move to Step 2 (10 Streets).
 *   - Step 2 (10 Streets) + Win  -> Move to Step 3 (11 Streets).
 *   - Step 3 (11 Streets) + Win  -> Cycle complete; reset to Step 1 (9 Streets).
 *   - Loss at ANY Step           -> Reset back to Step 1 (9 Streets).
 *
 * The Goal:
 *   - Target profit: $60 (or user-defined profit target) per session.
 *   - Stop betting once target profit is reached or bankroll is depleted.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // Available street starting numbers (12 possible streets)
  const STREET_STARTS = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];

  // 1. Initialize State
  if (!state.init) {
    state.init = true;
    state.step = 1; // 1: 9 streets, 2: 10 streets, 3: 11 streets
    state.initialBankroll = bankroll;
    state.targetProfit = 60; // Profit target ($60)
    state.lastPlayedStreetsCount = 0;
  }

  // 2. Evaluate previous spin outcome against the exact bets placed
  if (spinHistory && spinHistory.length > 0) {
    const lastResult = spinHistory[spinHistory.length - 1];
    const winningNum = lastResult.winningNumber;

    // Retrieve the exact number of streets played in the last spin
    const playedCount = state.lastPlayedStreetsCount || 9;
    const playedStreets = STREET_STARTS.slice(0, playedCount);

    // Check if the winning number hit one of the placed streets
    const won = playedStreets.some(start => winningNum >= start && winningNum <= start + 2);

    if (won) {
      if (state.step === 1) {
        state.step = 2; // Advance to 10 streets
      } else if (state.step === 2) {
        state.step = 3; // Advance to 11 streets
      } else if (state.step === 3) {
        state.step = 1; // Completed 9-10-11 progression cycle -> reset to 9 streets
      }
    } else {
      state.step = 1; // Loss at any stage -> reset to 9 streets
    }
  }

  // 3. Profit Target Check
  const currentProfit = bankroll - state.initialBankroll;
  if (currentProfit >= state.targetProfit) {
    return []; // Stop betting upon reaching session profit target
  }

  // 4. Determine Streets Count to Place for Current Turn
  let streetsToBetCount = 9;
  if (state.step === 2) streetsToBetCount = 10;
  if (state.step === 3) streetsToBetCount = 11;

  // Persist current street count so next turn knows exactly what was placed
  state.lastPlayedStreetsCount = streetsToBetCount;

  // 5. Calculate Bet Amount per Street Respecting Limits
  let unit = config.betLimits.min;
  unit = Math.max(unit, config.betLimits.min);
  unit = Math.min(unit, config.betLimits.max);

  const totalBetNeeded = unit * streetsToBetCount;
  if (bankroll < totalBetNeeded) {
    return []; // Insufficient funds
  }

  // 6. Generate Bet Array
  const bets = [];
  for (let i = 0; i < streetsToBetCount; i++) {
    bets.push({
      type: 'street',
      value: STREET_STARTS[i],
      amount: unit
    });
  }

  return bets;
}