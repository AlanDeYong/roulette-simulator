/**
 * Roulette Strategy: Tim's Magic Strategy (Platform 9)
 * 
 * ==============================================================================
 * STRATEGY DOCUMENTATION
 * ==============================================================================
 * Source:
 *   - Video URL: https://youtu.be/edkS_Tggb-Y
 *   - YouTube Channel: CEG Dealer School
 * 
 * The Full Logic in Detail:
 *   - This is a high-coverage, short-session strategy designed to capture 
 *     quick profit targets with minimal spins.
 *   - Every spin places bets covering two distinct areas of the wheel simultaneously:
 *       1. High (19-36): 5 Base Units
 *       2. 1st Dozen (1-12): 4 Base Units
 *   - The numbers 13-18 and 0/00 act as the "Dead Zone" (loss condition).
 *   - Outcome breakdown per spin:
 *       • Spin lands on 1st Dozen (1-12): Net win of +3 Units.
 *       • Spin lands on High (19-36): Net win of +1 Unit.
 *       • Spin lands in Dead Zone (13-18, 0, 00): Net loss of -9 Units.
 * 
 * The Full Bet Progression in Detail:
 *   - Flat betting scheme (no Martingale/increase after losses).
 *   - Each spin places a fixed 9-unit total bet (5 units on High, 4 units on 1st Dozen).
 *   - The base unit is determined by the table's minimum outside bet limit (config.betLimits.minOutside).
 * 
 * The Goal:
 *   - Target Profit: +6 Base Units above initial starting bankroll.
 *   - Stop Condition: Reaching target profit (+6 units) or if bankroll is insufficient to cover the 9-unit bet.
 * ==============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Initialize State Persistence Variables
  if (state.initialBankroll === undefined) {
    state.initialBankroll = bankroll;
  }
  if (state.targetReached === undefined) {
    state.targetReached = false;
  }

  // 2. Define Base Unit & Target Profit Goal (+6 Units)
  const baseUnit = config.betLimits.minOutside;
  const targetProfit = 6000 * baseUnit;
  const currentProfit = bankroll - state.initialBankroll;

  // 3. Check Stop Conditions (Target Profit or Target Reached)
  if (state.targetReached || currentProfit >= targetProfit) {
    state.targetReached = true;
    return []; // Stop betting
  }

  // 4. Calculate Bet Amounts (5 Units on High, 4 Units on 1st Dozen)
  let highBetAmount = 5 * baseUnit;
  let dozenBetAmount = 4 * baseUnit;

  // 5. Clamp Bet Amounts to Table Limits
  highBetAmount = Math.max(highBetAmount, config.betLimits.minOutside);
  highBetAmount = Math.min(highBetAmount, config.betLimits.max);

  dozenBetAmount = Math.max(dozenBetAmount, config.betLimits.minOutside);
  dozenBetAmount = Math.min(dozenBetAmount, config.betLimits.max);

  const totalRequiredBet = highBetAmount + dozenBetAmount;

  // 6. Bankroll Check
  if (bankroll < totalRequiredBet) {
    return []; // Insufficient funds for the full strategy
  }

  // 7. Construct & Return Bet Array
  return [
    {
      type: 'high',
      amount: highBetAmount
    },
    {
      type: 'dozen',
      value: 1,
      amount: dozenBetAmount
    }
  ];
}