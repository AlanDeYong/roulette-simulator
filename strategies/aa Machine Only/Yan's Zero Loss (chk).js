/**
 * Roulette Strategy: Yan's Zero Loss Method
 * Source: https://youtu.be/yyC5Ok8QmwM (The Roulette Master)
 * * The Full Logic:
 * - This strategy places 6 non-overlapping inside bets covering a total of 24 numbers.
 * - The bets consist of 1 Basket bet (0, 1, 2, 3) and 5 specific Corner bets.
 * - The chosen corners are carefully selected to not overlap with each other or the basket:
 * Corners on 4, 13, 20, 25, and 32.
 * - Bets are placed continuously on every spin.
 * * The Full Bet Progression:
 * - Start by placing 1 base unit on each of the 6 positions.
 * - If the spin is a LOSS (net profit <= 0): Do NOT increase any bets. Simply rebet the exact same amounts.
 * - If the spin is a WIN (net profit > 0) and the overall session is in a DRAWDOWN: 
 * Add 1 unit to ALL bets EXCEPT the one position that just won.
 * - If the spin is a WIN and the overall session is in PROFIT (profit > 0):
 * Reset all bets back to the initial 1 base unit, lock in the new bankroll 
 * high-water mark, and start a new session cycle.
 * * The Goal:
 * - Continuously grind and reach a new bankroll high (session profit > 0). Hitting a new
 * high automatically resets the progression safely. No explicit stop-loss is defined 
 * other than bankroll exhaustion.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Determine base unit and safe increment mode fallback
  const unit = config.betLimits.min || 1; 
  const increment = config.incrementMode === 'base' ? unit : (config.minIncrementalBet || 1);

  // 2. Initialize State
  if (!state.bets) {
    state.bets = [unit, unit, unit, unit, unit, unit];
    state.referenceBankroll = bankroll;
    state.lastBankroll = bankroll;
    state.lastSpinCount = spinHistory.length;
  }

  // 3. Process the last spin result to adjust the progression
  if (spinHistory.length > state.lastSpinCount) {
    let currentProfit = bankroll - state.referenceBankroll;
    let roundProfit = bankroll - state.lastBankroll;
    
    const lastNumStr = String(spinHistory[spinHistory.length - 1].winningNumber);
    const lastNum = Number(lastNumStr);

    // Map the winning number to our 6 positions
    let winningIndex = -1;
    if (['0', '00', '1', '2', '3'].includes(lastNumStr)) winningIndex = 0; // Basket
    else if ([4, 5, 7, 8].includes(lastNum)) winningIndex = 1;             // Corner 4
    else if ([13, 14, 16, 17].includes(lastNum)) winningIndex = 2;         // Corner 13
    else if ([20, 21, 23, 24].includes(lastNum)) winningIndex = 3;         // Corner 20
    else if ([25, 26, 28, 29].includes(lastNum)) winningIndex = 4;         // Corner 25
    else if ([32, 33, 35, 36].includes(lastNum)) winningIndex = 5;         // Corner 32

    // WIN LOGIC: Must hit a corner AND make a positive net profit for the round
    if (winningIndex !== -1 && roundProfit > 0) {
      if (currentProfit > 0) {
        // In session profit: Reset progression and lock in new reference bankroll
        state.bets = [unit, unit, unit, unit, unit, unit];
        state.referenceBankroll = bankroll;
      } else {
        // Still in a drawdown: Increase all bets EXCEPT the winning position
        for (let i = 0; i < 6; i++) {
          if (i !== winningIndex) {
            state.bets[i] += increment;
            state.bets[i] = Math.min(state.bets[i], config.betLimits.max);
          }
        }
      }
    } else if (currentProfit > 0) {
       // Failsafe: if we hit a new high water mark, always reset
       state.bets = [unit, unit, unit, unit, unit, unit];
       state.referenceBankroll = bankroll;
    }
    // LOSS LOGIC: If winningIndex === -1 OR roundProfit <= 0, we treat it as a loss. 
    // State remains completely unchanged (no increase on loss).
  }

  // Update trackers
  state.lastSpinCount = spinHistory.length;
  state.lastBankroll = bankroll;

  // 4. Build and return the bet array clamped to limits
  const betsToPlace = [];
  const positions = [
    { type: 'basket', value: 0 },
    { type: 'corner', value: 4 },
    { type: 'corner', value: 13 },
    { type: 'corner', value: 20 },
    { type: 'corner', value: 25 },
    { type: 'corner', value: 32 }
  ];

  for (let i = 0; i < 6; i++) {
    let amount = Number(state.bets[i]) || unit; 
    
    // Ensure absolute limits are respected
    amount = Math.max(amount, config.betLimits.min);
    amount = Math.min(amount, config.betLimits.max);

    betsToPlace.push({
      type: positions[i].type,
      value: positions[i].value,
      amount: amount
    });
  }

  return betsToPlace;
}