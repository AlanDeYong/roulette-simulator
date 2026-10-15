/**
 * Roulette Strategy: "7 Up"
 * 
 * Source: https://youtu.be/qHAbbsf7v7M
 * Channel: Gamblers University
 * 
 * FULL LOGIC:
 * The strategy builds up coverage across the three dozens using a 7-bet unit layout per dozen.
 * Each dozen set consists of 3 Street bets and 4 Straight Up bets (overlap numbers create "jackpot" wins):
 * - 1st Dozen: Streets [1, 4, 7] + Straight Up [2, 4, 6, 8]
 * - 2nd Dozen: Streets [13, 16, 19] + Straight Up [14, 16, 18, 20]
 * - 3rd Dozen: Streets [25, 28, 31] + Straight Up [26, 28, 30, 32]
 * 
 * BET PROGRESSION & LEVELS:
 * - Level 1: $7 base (7 bets in 1st Dozen @ 1 unit each).
 * - Level 2: $14 base (14 bets across 1st & 2nd Dozens @ 1 unit each).
 * - Level 3: $21 base (21 bets across all 3 Dozens @ 1 unit each).
 * - Level 4+: Maintains all 21 bets, but increases chip size on every position:
 *            Level L (for L >= 3) uses (L - 2) * unit per position.
 * 
 * PROGRESSION TRIGGERS:
 * - New Session High / Win Goal reached: Reset level back to Level 1.
 * - Profit Recovery (back in overall profit after deep levels): Drop back to Level 3.
 * - Full Loss (0 payout): Increase level immediately by +1.
 * - Partial Loss (Street hit only, partial refund): Stay on current level for 1 repeat spin; 
 *   if a 2nd consecutive partial loss occurs, increase level by +1.
 * 
 * GOAL:
 * - Target Profit: +$100 (or achieving new session high bankroll).
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Determine unit size (respecting minimum inside bet limit)
  const unit = Math.max(config.betLimits.min || 1, 1);
  const maxBet = config.betLimits.max || 500;

  // 2. Initialize State
  if (state.initialBankroll === undefined) {
    state.initialBankroll = bankroll;
    state.sessionHigh = bankroll;
    state.level = 1;
    state.consecutivePartialLosses = 0;
    state.winGoal = 100000; // Target $100 profit as shown in source video
  }

  // Update session high
  if (bankroll > state.sessionHigh) {
    state.sessionHigh = bankroll;
  }

  // Check overall win goal
  if (bankroll - state.initialBankroll >= state.winGoal) {
    return []; // Stop betting once target profit is reached
  }

  // 3. Evaluate previous spin result (if any past history exists)
  if (spinHistory && spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const netWin = lastSpin.netWin !== undefined ? lastSpin.netWin : 0;

    // A. Session High Hit -> Reset to Level 1
    if (bankroll >= state.sessionHigh) {
      state.level = 1;
      state.consecutivePartialLosses = 0;
    }
    // B. Back in profit overall after being down -> Step down to Level 3
    else if (bankroll > state.initialBankroll && state.level > 3) {
      state.level = 3;
      state.consecutivePartialLosses = 0;
    }
    // C. Spin Evaluation
    else if (netWin > 0) {
      // Net profit on spin (Jackpot hit) -> Reset to level 1 if session high reached, or keep level
      state.consecutivePartialLosses = 0;
    } else if (netWin < 0) {
      // Check if partial loss (some payout returned) or full loss (0 returned)
      const lastPayout = lastSpin.payout || (lastSpin.betAmount ? lastSpin.betAmount + netWin : 0);
      
      if (lastPayout > 0) {
        // Partial Loss (e.g. street hit without straight-up overlap)
        state.consecutivePartialLosses++;
        if (state.consecutivePartialLosses >= 2) {
          state.level++;
          state.consecutivePartialLosses = 0;
        }
      } else {
        // Full Loss (complete miss)
        state.level++;
        state.consecutivePartialLosses = 0;
      }
    }
  }

  // 4. Construct Bets based on Level
  const chipMultiplier = state.level <= 3 ? 1 : (state.level - 2);
  let baseAmount = unit * chipMultiplier;

  // Clamp bet amount to limits
  baseAmount = Math.max(baseAmount, config.betLimits.min || 1);
  baseAmount = Math.min(baseAmount, maxBet);

  const bets = [];

  // Dozen 1 Bets (Level 1+)
  if (state.level >= 1) {
    // Streets
    [1, 4, 7].forEach(s => bets.push({ type: 'street', value: s, amount: baseAmount }));
    // Straight Up
    [2, 4, 6, 8].forEach(n => bets.push({ type: 'number', value: n, amount: baseAmount }));
  }

  // Dozen 2 Bets (Level 2+)
  if (state.level >= 2) {
    // Streets
    [13, 16, 19].forEach(s => bets.push({ type: 'street', value: s, amount: baseAmount }));
    // Straight Up
    [14, 16, 18, 20].forEach(n => bets.push({ type: 'number', value: n, amount: baseAmount }));
  }

  // Dozen 3 Bets (Level 3+)
  if (state.level >= 3) {
    // Streets
    [25, 28, 31].forEach(s => bets.push({ type: 'street', value: s, amount: baseAmount }));
    // Straight Up
    [26, 28, 30, 32].forEach(n => bets.push({ type: 'number', value: n, amount: baseAmount }));
  }

  return bets;
}