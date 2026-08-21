/**
 * Roulete Strategy: Junko Bodie's Corner Bet Progression Strategy
 * 
 * SOURCE:
 * - Channel: Junko Bodie
 * - Video URL: https://youtu.be/AjNQpw0M6b4
 * - Video Title: "Roulette Corner Bets: Focus on the Future, Not the Next Spin!"
 * 
 * FULL LOGIC IN DETAILS:
 * - The strategy focuses on Corner Bets (inside bets covering 4 numbers each, paying 8:1).
 * - It places bets on a selected spread of corner positions forming a balanced coverage ("zigzag pattern")
 *   across the table board (e.g., 4 corners covering 16 numbers total: 1, 11, 19, 28).
 * - Target Goal: Achieve a target profit (default $300 or 15% of bankroll) within a session.
 * 
 * FULL BET PROGRESSION IN DETAILS:
 * - Base Unit: Derived from `config.betLimits.min` (Inside bet minimum).
 * - Initial Bet: 1 unit placed on each active corner position.
 * - On Loss: Increase the bet size per corner by +1 unit (or increment based on config).
 * - On Win: 
 *   - If session profit target is reached, reset the progression level back to 1 unit.
 *   - If in recovery after losses, drop the bet level back by 1 unit (or reset to base level if net profit for the cycle is achieved).
 * - Bet limits are strictly enforced via clamping between `config.betLimits.min` and `config.betLimits.max`.
 * 
 * GOAL:
 * - Target Profit: +$300 above session start bankroll.
 * - Stop Loss: Standard bankroll exhaustion guard.
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Initialize session state on first spin
  if (!state.initialized) {
    state.initialized = true;
    state.startingBankroll = bankroll;
    state.progressionLevel = 1;
    state.targetProfit = 300;
  }

  // 2. Target profit check
  const currentProfit = bankroll - state.startingBankroll;
  if (currentProfit >= state.targetProfit) {
    // Target profit reached - reset progression or stop
    state.progressionLevel = 1;
  }

  // 3. Evaluate previous spin result if history exists
  if (spinHistory && spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const winningNum = lastSpin.winningNumber;

    // Active corner positions (top-left number of each 2x2 corner grid)
    // Corner 1  -> [1, 2, 4, 5]
    // Corner 11 -> [11, 12, 14, 15]
    // Corner 19 -> [19, 20, 22, 23]
    // Corner 28 -> [28, 29, 31, 32]
    const cornerGrids = [
      [1, 2, 4, 5],
      [11, 12, 14, 15],
      [19, 20, 22, 23],
      [28, 29, 31, 32]
    ];

    // Check if winning number landed on any covered corner
    const isWin = cornerGrids.some(grid => grid.includes(winningNum));

    if (isWin) {
      // Step down progression level on win or reset if back at profit
      if (currentProfit >= 0) {
        state.progressionLevel = 1;
      } else {
        state.progressionLevel = Math.max(1, state.progressionLevel - 1);
      }
    } else {
      // Increment progression level on loss
      state.progressionLevel += 1;
    }
  }

  // 4. Calculate unit bet size for inside bets
  const baseUnit = config.betLimits.min;
  let rawAmount = baseUnit * state.progressionLevel;

  // 5. Enforce bet limits (Clamping)
  let betAmount = Math.max(rawAmount, config.betLimits.min);
  betAmount = Math.min(betAmount, config.betLimits.max);

  // Ensure bankroll can cover the total bets (4 corners)
  const totalBetNeeded = betAmount * 4;
  if (bankroll < totalBetNeeded) {
    betAmount = Math.max(Math.floor(bankroll / 4), config.betLimits.min);
    if (bankroll < config.betLimits.min * 4) {
      return []; // Not enough funds to place minimum bets
    }
  }

  // 6. Return array of corner bets
  const activeCorners = [1, 11, 19, 28];
  
  return activeCorners.map(cornerValue => ({
    type: 'corner',
    value: cornerValue,
    amount: betAmount
  }));
}