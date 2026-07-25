/**
 * Roulette Strategy: "7 Up"
 * 
 * Source: https://youtu.be/qHAbbsf7v7M
 * Channel: Gamblers University
 * 
 * FULL LOGIC:
 * The strategy builds up coverage across all three dozens using a 7-bet unit layout per dozen.
 * Each dozen set consists of 3 Street bets and 4 Straight Up bets (overlapping numbers create "jackpot" wins):
 * - 1st Dozen: Streets [1, 4, 7] + Straight Up [2, 4, 6, 8]
 * - 2nd Dozen: Streets [13, 16, 19] + Straight Up [14, 16, 18, 20]
 * - 3rd Dozen: Streets [25, 28, 31] + Straight Up [26, 28, 30, 32]
 * 
 * BET PROGRESSION & LEVELS:
 * - Level 1: $7 total (7 bets in 1st Dozen @ 1 unit each).
 * - Level 2: $14 total (14 bets across 1st & 2nd Dozens @ 1 unit each).
 * - Level 3: $21 total (21 bets across all 3 Dozens @ 1 unit each).
 * - Level 4+: Maintains all 21 bets across the board, but increases chip size per position:
 *            Level L (for L >= 3) uses (L - 2) * unit per position (e.g., Level 4 = 2 units, Level 5 = 3 units).
 * 
 * PROGRESSION TRIGGERS:
 * - New Session High / Win Goal reached: Reset level back to Level 1.
 * - Recovery (back in overall profit after deep levels): Step back down to Level 3.
 * - Full Loss (0 payout / completely missed): Increase level immediately by +1.
 * - Partial Loss (Street hit only, partial payout returned): Hold level for 1 repeat spin; 
 *   if a 2nd consecutive partial loss occurs, increase level by +1.
 * 
 * GOAL:
 * - Target Profit: +$100 (or achieving a new session high bankroll).
 */
function bet(spinHistory, bankroll, config, state, utils) {
  const unit = Math.max(config.betLimits.min || 1, 1);
  const maxBet = config.betLimits.max || 500;

  // 1. Initialize State
  if (state.initialBankroll === undefined) {
    state.initialBankroll = bankroll;
    state.sessionHigh = bankroll;
    state.previousBankroll = bankroll;
    state.previousBetAmount = 0;
    state.level = 1;
    state.consecutivePartialLosses = 0;
    state.winGoal = 100000;
  }

  // Check Stop Goal ($100 target profit)
  if (bankroll - state.initialBankroll >= state.winGoal) {
    return [];
  }

  // 2. Evaluate previous spin result using bankroll delta
  if (spinHistory && spinHistory.length > 0 && state.previousBetAmount > 0) {
    const netProfit = bankroll - state.previousBankroll;
    const payout = bankroll - (state.previousBankroll - state.previousBetAmount);

    // A. New Session High -> Reset to Level 1
    if (bankroll > state.sessionHigh) {
      state.sessionHigh = bankroll;
      state.level = 1;
      state.consecutivePartialLosses = 0;
    }
    // B. Recovered into overall profit while at deeper levels -> Step down to Level 3
    else if (bankroll > state.initialBankroll && state.level > 3 && netProfit > 0) {
      state.level = 3;
      state.consecutivePartialLosses = 0;
    }
    // C. Evaluate Spin Result
    else if (netProfit > 0) {
      state.consecutivePartialLosses = 0;
    } else if (netProfit < 0) {
      if (payout > 0) {
        // Partial Loss (e.g., Street hit without Straight-Up overlap)
        state.consecutivePartialLosses++;
        if (state.consecutivePartialLosses >= 2) {
          state.level++;
          state.consecutivePartialLosses = 0;
        }
      } else {
        // Full Loss (Complete miss)
        state.level++;
        state.consecutivePartialLosses = 0;
      }
    }
  }

  // Update tracking bankroll for session high
  if (bankroll > state.sessionHigh) {
    state.sessionHigh = bankroll;
  }

  // 3. Construct Bets based on Current Level
  const chipMultiplier = state.level <= 3 ? 1 : (state.level - 2);
  let baseAmount = unit * chipMultiplier;

  // Clamp bet per position to limits
  baseAmount = Math.max(baseAmount, config.betLimits.min || 1);
  baseAmount = Math.min(baseAmount, maxBet);

  const bets = [];

  // Dozen 1 (Level 1+)
  if (state.level >= 1) {
    [1, 4, 7].forEach(s => bets.push({ type: 'street', value: s, amount: baseAmount }));
    [2, 4, 6, 8].forEach(n => bets.push({ type: 'number', value: n, amount: baseAmount }));
  }

  // Dozen 2 (Level 2+)
  if (state.level >= 2) {
    [13, 16, 19].forEach(s => bets.push({ type: 'street', value: s, amount: baseAmount }));
    [14, 16, 18, 20].forEach(n => bets.push({ type: 'number', value: n, amount: baseAmount }));
  }

  // Dozen 3 (Level 3+)
  if (state.level >= 3) {
    [25, 28, 31].forEach(s => bets.push({ type: 'street', value: s, amount: baseAmount }));
    [26, 28, 30, 32].forEach(n => bets.push({ type: 'number', value: n, amount: baseAmount }));
  }

  // 4. Save state for next spin calculation
  const totalBetAmount = bets.reduce((sum, b) => sum + b.amount, 0);
  state.previousBankroll = bankroll;
  state.previousBetAmount = totalBetAmount;

  return bets;
}