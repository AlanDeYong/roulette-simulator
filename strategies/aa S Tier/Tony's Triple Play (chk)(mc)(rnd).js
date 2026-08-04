/**
 * Strategy: Tony's Triple Play
 * Source: https://youtu.be/fxA9YxYYObw (YouTube Channel: The Roulette Factory)
 * 
 * --- FULL LOGIC ---
 * Tony's Triple Play is a street bet strategy built on a multi-tier, 22-level progression.
 * At the start of a session (or after any win), 3 random streets are selected and held fixed 
 * throughout the progression until a win resets the cycle.
 * 
 * - Streets Covered:
 *   - Level 1: 1 Street covered (randomly picked from active set).
 *   - Levels 2 - 4: 2 Streets covered (randomly picked from active set).
 *   - Levels 5 - 22: 3 Streets covered (all 3 active streets).
 * 
 * --- BET PROGRESSION ---
 * - Base Unit: `config.betLimits.min` (Inside bet minimum).
 * - Level 1: Bet 1 base unit on 1 street.
 * - Levels 2-4: Bet 1 base unit on each of 2 streets.
 * - Levels 5-22: Bet $u_k$ base units on each of 3 streets, where:
 *   $u_k = \lfloor \frac{\text{Accumulated Losses}}{9 \times \text{baseUnit}} \rfloor + 1$
 * 
 * - Win Condition: Pick 3 new random streets, reset progression level back to Level 1.
 * - Loss Condition: Advance to the next progression level (Level 2 to 22), keeping the same streets.
 * 
 * --- GOAL ---
 * Lock in profit upon every hit, reset to base bet with fresh random streets, and survive long drawdowns.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // Helper to pick 3 random unique street start numbers (1, 4, 7, ..., 34)
  function getRandomStreets() {
    const availableStreets = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];
    const selected = [];
    while (selected.length < 3) {
      const randomIndex = Math.floor(Math.random() * availableStreets.length);
      selected.push(availableStreets.splice(randomIndex, 1)[0]);
    }
    return selected;
  }

  // 1. Initialize Base Unit for Inside bets
  const baseUnit = config.betLimits.min || 2;

  // 2. Initialize State and select initial random streets
  if (state.level === undefined) {
    state.level = 1;
    state.accumulatedLoss = 0;
    state.selectedStreets = getRandomStreets();
  }

  // 3. Update state based on previous spin result
  if (spinHistory && spinHistory.length > 0) {
    const lastResult = spinHistory[spinHistory.length - 1];
    const lastWinningNumber = lastResult.winningNumber;

    // Active streets used in the previous spin
    let activeStreets = [];
    if (state.lastLevel === 1) {
      activeStreets = [state.selectedStreets[0]];
    } else if (state.lastLevel >= 2 && state.lastLevel <= 4) {
      activeStreets = [state.selectedStreets[0], state.selectedStreets[1]];
    } else {
      activeStreets = state.selectedStreets;
    }

    const won = activeStreets.some(streetStart => {
      return lastWinningNumber >= streetStart && lastWinningNumber <= streetStart + 2;
    });

    if (won) {
      // Reset progression and select 3 NEW random streets for the next cycle
      state.level = 1;
      state.accumulatedLoss = 0;
      state.selectedStreets = getRandomStreets();
    } else {
      // Accumulate loss and increment level on loss (streets remain fixed)
      state.accumulatedLoss += state.lastTotalBet || 0;
      state.level = Math.min(state.level + 1, 22);
    }
  }

  // 4. Determine Streets Covered and Units Per Street for current level
  let streetsToCover = [];
  let unitsPerStreet = 1;

  if (state.level === 1) {
    streetsToCover = [state.selectedStreets[0]];
    unitsPerStreet = 1;
  } else if (state.level >= 2 && state.level <= 4) {
    streetsToCover = [state.selectedStreets[0], state.selectedStreets[1]];
    unitsPerStreet = 1;
  } else {
    // Levels 5 to 22: All 3 selected streets covered
    streetsToCover = state.selectedStreets;
    unitsPerStreet = Math.floor(state.accumulatedLoss / (9 * baseUnit)) + 1;
  }

  // Calculate individual street bet amount and clamp to limits
  let amountPerStreet = unitsPerStreet * baseUnit;
  amountPerStreet = Math.max(amountPerStreet, config.betLimits.min);
  amountPerStreet = Math.min(amountPerStreet, config.betLimits.max);

  // 5. Record last bet details for state tracking next spin
  state.lastLevel = state.level;
  state.lastTotalBet = amountPerStreet * streetsToCover.length;

  // 6. Generate Bet Objects
  const bets = streetsToCover.map(streetValue => ({
    type: 'street',
    value: streetValue,
    amount: amountPerStreet
  }));

  return bets;
}