/**
 * Strategy: Tony's Triple Play
 * Source: https://youtu.be/fxA9YxYYObw (YouTube Channel: The Roulette Factory)
 * 
 * --- FULL LOGIC ---
 * Tony's Triple Play is a street bet strategy built on a multi-tier, 22-level progression.
 * It incrementally expands board coverage while scaling bet sizes to ensure that a single win
 * on any level recoups all prior accumulated losses in the session plus a profit.
 * 
 * - Streets Covered:
 *   - Level 1: 1 Street covered.
 *   - Levels 2 - 4: 2 Streets covered.
 *   - Levels 5 - 22: 3 Streets covered (Triple Play).
 * 
 * --- BET PROGRESSION ---
 * - Base Unit: `config.betLimits.min` (Inside bet minimum).
 * - Level 1: Bet 1 base unit on 1 street.
 * - Levels 2-4: Bet 1 base unit on each of 2 streets (2 units total bet).
 * - Levels 5-22: Bet $u_k$ base units on each of 3 streets (3 * $u_k$ total bet), where:
 *   $u_k = \lfloor \frac{\text{Accumulated Losses}}{9 \times \text{baseUnit}} \rfloor + 1$
 * 
 * - Win Condition: Reset progression back to Level 1 on any win.
 * - Loss Condition: Advance to the next progression level (Level 2 to 22).
 * 
 * --- GOAL ---
 * Lock in profit upon every hit, reset to base bet, and survive long drawdown streaks.
 * Stop-loss occurs if Level 22 is reached and lost, or bankroll is depleted.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Initialize Base Unit for Inside bets
  const baseUnit = config.betLimits.min || 2;

  // 2. Default target street positions (starting numbers of streets: 1, 4, 7)
  const targetStreets = [1, 4, 7];

  // 3. Initialize State
  if (state.level === undefined) {
    state.level = 1;
    state.accumulatedLoss = 0;
  }

  // 4. Update state based on previous spin result
  if (spinHistory && spinHistory.length > 0) {
    const lastResult = spinHistory[spinHistory.length - 1];
    const lastWinningNumber = lastResult.winningNumber;

    // Check if the last winning number fell into any of our active bet streets
    let activeStreets = [];
    if (state.lastLevel === 1) {
      activeStreets = [targetStreets[0]];
    } else if (state.lastLevel >= 2 && state.lastLevel <= 4) {
      activeStreets = [targetStreets[0], targetStreets[1]];
    } else {
      activeStreets = targetStreets;
    }

    const won = activeStreets.some(streetStart => {
      return lastWinningNumber >= streetStart && lastWinningNumber <= streetStart + 2;
    });

    if (won) {
      // Reset progression on win
      state.level = 1;
      state.accumulatedLoss = 0;
    } else {
      // Accumulate loss and increment level on loss
      state.accumulatedLoss += state.lastTotalBet || 0;
      state.level = Math.min(state.level + 1, 22);
    }
  }

  // 5. Determine Streets Covered and Units Per Street for current level
  let streetsToCover = [];
  let unitsPerStreet = 1;

  if (state.level === 1) {
    streetsToCover = [targetStreets[0]];
    unitsPerStreet = 1;
  } else if (state.level >= 2 && state.level <= 4) {
    streetsToCover = [targetStreets[0], targetStreets[1]];
    unitsPerStreet = 1;
  } else {
    // Levels 5 to 22: 3 streets covered
    streetsToCover = targetStreets;
    // Calculate required units per street to cover total loss + profit
    // Payout for street is 11:1 (12x unit). With 3 streets, net win on hit = 12*u - 3*u - accumulatedLoss = 9*u - accumulatedLoss
    unitsPerStreet = Math.floor(state.accumulatedLoss / (9 * baseUnit)) + 1;
  }

  // Calculate individual street bet amount and clamp to limits
  let amountPerStreet = unitsPerStreet * baseUnit;
  amountPerStreet = Math.max(amountPerStreet, config.betLimits.min);
  amountPerStreet = Math.min(amountPerStreet, config.betLimits.max);

  // 6. Record last bet details for state tracking next spin
  state.lastLevel = state.level;
  state.lastTotalBet = amountPerStreet * streetsToCover.length;

  // 7. Generate Bet Objects
  const bets = streetsToCover.map(streetValue => ({
    type: 'street',
    value: streetValue,
    amount: amountPerStreet
  }));

  return bets;
}