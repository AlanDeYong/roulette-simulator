/**
 * Roulette Strategy: 3-2-1 Strategy
 * 
 * Source: https://youtu.be/VF9ALlQFEjc
 * Channel: The Roulette Master (Strategy by David at Scouse House Roulette)
 * 
 * --- FULL LOGIC IN DETAIL ---
 * On every spin, bets are placed across all three dozens using a 3-2-1 ratio:
 *   - 3 Corner Bets (1 unit each):
 *       - Corner [11, 12, 14, 15]
 *       - Corner [17, 18, 20, 21]
 *       - Corner [23, 24, 26, 27]
 *   - 2 Double Street / Six Line Bets (2 units each):
 *       - Line 1-6
 *       - Line 31-36
 *   - 1 Dozen Bet (1 unit):
 *       - 2nd Dozen (numbers 13-24)
 * 
 * --- BET PROGRESSION ---
 *   - Base Level (Level 1):
 *       - Corner bets: 1 * Inside Min Unit
 *       - Line bets:   2 * Inside Min Unit
 *       - Dozen bet:   1 * Outside Min Unit
 *   - On Loss: Increase progression level by +2 (Level = Level + 2).
 *   - On Win: 
 *       - If net profit higher than initial bankroll or target reached, reset to Level 1.
 *       - Otherwise, stay at current level to recover losses before resetting.
 * 
 * --- GOAL & STOP CONDITION ---
 * Target profit is typically 50 units (e.g., $250 with $5 units or $50 with $1 units).
 * Once session profit target is reached, reset progression or cash out.
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Initialize State Persistence Variables
  if (!state.initialBankroll) {
    state.initialBankroll = bankroll;
  }
  if (!state.level) {
    state.level = 1;
  }
  if (!state.lastBankroll) {
    state.lastBankroll = bankroll;
  }

  // Target profit threshold (e.g., $250 profit target for standard bankroll)
  const targetProfit = 250;
  const currentNetProfit = bankroll - state.initialBankroll;

  // 2. Evaluate Last Spin Result to Update Progression Level
  if (spinHistory && spinHistory.length > 0) {
    const netSpinChange = bankroll - state.lastBankroll;

    if (netSpinChange < 0) {
      // On Loss: Add +2 units level
      state.level += 2;
    } else if (netSpinChange > 0) {
      // On Win: Reset to base level if in overall profit or target reached
      if (currentNetProfit >= targetProfit || bankroll >= state.initialBankroll) {
        state.level = 1;
        state.initialBankroll = bankroll; // Lock in profit benchmark
      }
    }
  }

  // Update last recorded bankroll
  state.lastBankroll = bankroll;

  // 3. Determine Base Bet Units with Bet Limits
  const insideMin = config.betLimits.min || 2;
  const outsideMin = config.betLimits.minOutside || 5;
  const maxBet = config.betLimits.max || 500;

  // Calculate Unit Amounts for current Progression Level
  let cornerAmount = insideMin * state.level;
  let lineAmount = (insideMin * 2) * state.level;
  let dozenAmount = outsideMin * state.level;

  // Clamp bet amounts to respect table limits
  cornerAmount = Math.min(Math.max(cornerAmount, insideMin), maxBet);
  lineAmount = Math.min(Math.max(lineAmount, insideMin), maxBet);
  dozenAmount = Math.min(Math.max(dozenAmount, outsideMin), maxBet);

  // 4. Construct and Return the 3-2-1 Bet Array
  return [
    // 3 Corner Bets (Inside)
    { type: 'corner', value: 11, amount: cornerAmount }, // Covers 11, 12, 14, 15
    { type: 'corner', value: 17, amount: cornerAmount }, // Covers 17, 18, 20, 21
    { type: 'corner', value: 23, amount: cornerAmount }, // Covers 23, 24, 26, 27

    // 2 Double Street / Six Line Bets (Inside)
    { type: 'line', value: 1, amount: lineAmount },     // Covers 1-6
    { type: 'line', value: 31, amount: lineAmount },   // Covers 31-36

    // 1 Dozen Bet (Outside)
    { type: 'dozen', value: 2, amount: dozenAmount }    // Covers 2nd Dozen (13-24)
  ];
}