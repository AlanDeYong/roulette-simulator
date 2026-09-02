/**
 * Strategy: Three's Company Roulette System
 * 
 * Source:
 * - URL: https://youtu.be/Qcpep5gkzQs
 * - Channel: The Roulette Master
 * 
 * Full Logic in Detail:
 * - Bets are placed simultaneously across 3 outside positions:
 *   1. Even-Money Bet: 3 units on 'even' (or 'odd').
 *   2. Column Bet A: 1 unit on 1st Column (or 2nd Column).
 *   3. Column Bet B: 1 unit on 2nd Column (or 3rd Column).
 * - Total base layout = 5 units (3 units on Even-Money, 1 unit on each of 2 Columns).
 * - This provides high table coverage (~26-27 numbers covered).
 * 
 * Full Bet Progression:
 * - Full Win (Both Even-Money & 1 Column hit): Reset progression back to base level (1x).
 * - Partial Win (Even-Money hits, Columns miss): Rebet flat at current progression level.
 * - Partial Loss (Column hits, Even-Money misses): Increase bet by +1 base unit step (additive / D'Alembert).
 * - Total Loss (Both Even-Money & Columns miss, or 0/00): Double the current bet level (Martingale step).
 * - Session Reset: Any time bankroll reaches a new session high / profit target, reset to base level.
 * 
 * The Goal:
 * - Steady bankroll growth by exploiting multi-sector coverage with hybrid additive-martingale recovery.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Determine Unit Sizing based on table limits
  const minOutside = config.betLimits.minOutside || 5;
  const maxBet = config.betLimits.max || 500;
  const baseUnit = minOutside; // 1 unit = minOutside (e.g., $5 or $10)

  // 2. Initialize State
  if (!state.initialized) {
    state.initialized = true;
    state.progressionMultiplier = 1;
    state.evenMoneySide = 'even'; // 'even' or 'odd'
    state.columns = [1, 2];       // Default covering 1st and 2nd columns
    state.peakBankroll = bankroll;
    state.lastWagerTotal = 0;
    state.lastEvenMoneyAmount = 0;
    state.lastCol1Amount = 0;
    state.lastCol2Amount = 0;
  }

  // Update Peak Bankroll
  if (bankroll > state.peakBankroll) {
    state.peakBankroll = bankroll;
    state.progressionMultiplier = 1; // Reset on new session high
  }

  // 3. Evaluate Previous Spin Result (if any)
  if (spinHistory && spinHistory.length > 0 && state.lastWagerTotal > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const winningNum = lastSpin.winningNumber;

    // Check Even-Money win
    const isZero = winningNum === 0 || winningNum === '0' || winningNum === '00';
    const isEven = !isZero && winningNum % 2 === 0;
    const isOdd = !isZero && winningNum % 2 !== 0;
    const evenMoneyWon = !isZero && ((state.evenMoneySide === 'even' && isEven) || (state.evenMoneySide === 'odd' && isOdd));

    // Check Column win (Column 1: 1,4,7...; Column 2: 2,5,8...; Column 3: 3,6,9...)
    let winningCol = 0;
    if (!isZero) {
      winningCol = ((winningNum - 1) % 3) + 1;
    }
    const colWon = !isZero && state.columns.includes(winningCol);

    // Calculate Outcome
    if (evenMoneyWon && colWon) {
      // Full Win -> Reset to base
      state.progressionMultiplier = 1;
    } else if (evenMoneyWon && !colWon) {
      // Partial Win (Even-Money won, Column missed) -> Flat rebet
      // Keep state.progressionMultiplier unchanged
    } else if (!evenMoneyWon && colWon) {
      // Partial Loss (Column won, Even-Money missed) -> Increment by 1 base unit
      state.progressionMultiplier += 1;
    } else {
      // Total Loss (Both missed or Zero) -> Double current progression
      state.progressionMultiplier *= 2;
    }
  }

  // 4. Calculate Individual Bet Amounts
  let evenMoneyAmount = baseUnit * 3 * state.progressionMultiplier;
  let col1Amount = baseUnit * 1 * state.progressionMultiplier;
  let col2Amount = baseUnit * 1 * state.progressionMultiplier;

  // Clamp to table limits
  evenMoneyAmount = Math.max(minOutside, Math.min(evenMoneyAmount, maxBet));
  col1Amount = Math.max(minOutside, Math.min(col1Amount, maxBet));
  col2Amount = Math.max(minOutside, Math.min(col2Amount, maxBet));

  // Bankroll Safeguard (scale down proportionally if total bet exceeds bankroll)
  let totalBet = evenMoneyAmount + col1Amount + col2Amount;
  if (totalBet > bankroll) {
    const scale = bankroll / totalBet;
    evenMoneyAmount = Math.floor(evenMoneyAmount * scale);
    col1Amount = Math.floor(col1Amount * scale);
    col2Amount = Math.floor(col2Amount * scale);
    totalBet = evenMoneyAmount + col1Amount + col2Amount;

    // If unable to satisfy minimum table outside bet, reset or stop
    if (evenMoneyAmount < minOutside || col1Amount < minOutside || col2Amount < minOutside) {
      state.progressionMultiplier = 1;
      return [];
    }
  }

  // Store wager details in state for next spin resolution
  state.lastWagerTotal = totalBet;
  state.lastEvenMoneyAmount = evenMoneyAmount;
  state.lastCol1Amount = col1Amount;
  state.lastCol2Amount = col2Amount;

  // 5. Construct and Return Bet Array
  return [
    { type: state.evenMoneySide, amount: evenMoneyAmount },
    { type: 'column', value: state.columns[0], amount: col1Amount },
    { type: 'column', value: state.columns[1], amount: col2Amount }
  ];
}