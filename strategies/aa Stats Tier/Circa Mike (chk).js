/**
 * CIRCA MIKE ROULETTE STRATEGY
 * 
 * Source: https://youtu.be/XgXq6JQ9-QU
 * Channel: The Roulette Master
 * Strategy: Circa Mike Strategy (Mike Miller's Roulette Strategy)
 * 
 * Full Logic Details:
 * - The strategy places three outside/multiplier bets simultaneously on every spin:
 *   1. Column 1 ('column', value: 1)
 *   2. Column 2 ('column', value: 2)
 *   3. Black ('black')
 * - These positions are chosen because Column 1 and Column 2 contain a heavy concentration
 *   of Black numbers, creating frequent double-win scenarios when a Black number hits in Column 1 or 2.
 * 
 * Full Bet Progression Details:
 * - Starts at 1 base unit per position (`config.betLimits.minOutside`).
 * - After a Net Loss spin: Increase bet size by 1 unit on ALL 3 positions (+1 unit progression).
 * - After a Break-Even spin (0 net result): Maintain current bet level.
 * - After a Net Win spin:
 *   - If session target / net session profit is reached, reset progression level back to 1 base unit.
 *   - If still recovering previous losses, keep current bet level.
 * 
 * Goal:
 * - Capitalize on double-payout hits (Black + Col 1/2) to recover losses and lock in session profit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Base unit strictly set to 1 unit of minimum outside bet
  const baseUnit = config.betLimits.minOutside;

  // 2. Initialize State
  if (state.unitLevel === undefined) {
    state.unitLevel = 1;
    state.initialBankroll = bankroll;
    state.peakBankroll = bankroll;
  }

  // Update peak bankroll
  if (bankroll > state.peakBankroll) {
    state.peakBankroll = bankroll;
  }

  // 3. Process Spin History to Update Progression
  if (spinHistory && spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const num = lastSpin.winningNumber;
    const color = lastSpin.winningColor;

    // Determine column of winning number
    let winningColumn = 0;
    if (num > 0) {
      if (num % 3 === 1) winningColumn = 1;
      else if (num % 3 === 2) winningColumn = 2;
      else if (num % 3 === 0) winningColumn = 3;
    }

    const previousUnit = state.lastUnitLevel || state.unitLevel;
    const previousBetPerPos = previousUnit * baseUnit;
    const totalBet = previousBetPerPos * 3;

    let totalReturn = 0;
    if (winningColumn === 1) totalReturn += previousBetPerPos * 3;
    if (winningColumn === 2) totalReturn += previousBetPerPos * 3;
    if (color === 'black') totalReturn += previousBetPerPos * 2;

    const netResult = totalReturn - totalBet;

    if (netResult < 0) {
      // Net Loss -> Increase unit level by 1
      state.unitLevel += 1;
    } else if (netResult > 0) {
      // Net Win -> Reset to 1 unit if overall session profit is reached
      if (bankroll >= state.initialBankroll) {
        state.unitLevel = 1;
      }
    }
  }

  // 4. Calculate Current Bet Amount
  let betAmount = baseUnit * state.unitLevel;

  // Clamp bet amount to config limits
  betAmount = Math.max(betAmount, config.betLimits.minOutside);
  betAmount = Math.min(betAmount, config.betLimits.max);

  // Store unit level used for this spin
  state.lastUnitLevel = state.unitLevel;

  // 5. Return Bet Objects
  return [
    { type: 'column', value: 1, amount: betAmount },
    { type: 'column', value: 2, amount: betAmount },
    { type: 'black', amount: betAmount }
  ];
}