/**
 * ============================================================================
 * Strategy: The Aquarius Wave (Zodiac Series)
 * Source: https://youtu.be/h9KCgIeskZw
 * Channel: The Lucky Felt (Todd Hoover)
 * ============================================================================
 * 
 * THE FULL LOGIC IN DETAIL:
 * -------------------------
 * The Aquarius Wave is an inside-grid zigzag coverage system designed to balance 
 * frequent steady hits with explosive "uranian lightning rod" jackpot spikes.
 * 
 * It covers exactly 18 non-overlapping numbers across all 3 columns using:
 * 1. Four Corner Bets (1 unit each):
 *    - Corner [1, 2, 4, 5] (top-left index: 1)
 *    - Corner [11, 12, 14, 15] (top-left index: 11)
 *    - Corner [22, 23, 25, 26] (top-left index: 22)
 *    - Corner [32, 33, 35, 36] (top-left index: 32)
 * 2. Two Straight-Up "Lightning Rod" Bets (1 unit each):
 *    - Straight Up on 9
 *    - Straight Up on 27
 * 
 * Payout mechanics:
 * - Corner Hit (pays 8:1): Yields +3 units net profit per base level.
 * - Straight Up Hit (pays 35:1): Yields +30 units net profit per base level.
 * 
 * THE FULL BET PROGRESSION:
 * -------------------------
 * The strategy tracks consecutive losses across a strict 4-step sequence:
 * - Step 1 (0 consecutive losses): 1 unit per position (6 units total).
 * - Step 2 (1 consecutive loss): 1 unit per position (6 units total) - flat bet pause.
 * - Step 3 (2 consecutive losses): 3 units per position (18 units total) - sudden triple.
 * - Step 4 (3 consecutive losses): 6 units per position (36 units total) - final peak double.
 * 
 * - Any Win: Immediately resets back to Step 1 (1 unit per position).
 * - Loss at Step 4 (4 consecutive losses): Hard stop / Cosmic Reset. The cycle 
 *   accepts the 66-unit sequence drawdown (6 + 6 + 18 + 36 = 66) and resets 
 *   completely back to Step 1.
 * 
 * THE GOAL:
 * ---------
 * - Target Profit: +400 units (or session target relative to bankroll).
 * - Stop-loss: If remaining bankroll is insufficient to place the minimum bet.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Initialize State
  if (state.consecutiveLosses === undefined) {
    state.consecutiveLosses = 0;
  }
  if (state.initialBankroll === undefined) {
    state.initialBankroll = bankroll;
  }

  // 2. Define Covered Numbers
  const coveredNumbers = new Set([
    1, 2, 4, 5,
    11, 12, 14, 15,
    22, 23, 25, 26,
    32, 33, 35, 36,
    9, 27
  ]);

  // 3. Process the last spin result (if history exists)
  if (spinHistory && spinHistory.length > 0) {
    const lastResult = spinHistory[spinHistory.length - 1];
    const lastNumber = lastResult.winningNumber;

    if (coveredNumbers.has(lastNumber)) {
      // Win: Reset progression back to base level
      state.consecutiveLosses = 0;
    } else {
      // Loss: Advance progression
      state.consecutiveLosses += 1;

      // Cosmic Reset: After 4 consecutive losses, hard stop and restart cycle
      if (state.consecutiveLosses >= 4) {
        state.consecutiveLosses = 0;
      }
    }
  }

  // 4. Determine Target Profit / Stop Conditions
  // Target profit is +400 base units (as presented in the video)
  const targetProfit = (config.betLimits ? config.betLimits.min : 2) * 200;
  if (bankroll >= state.initialBankroll + targetProfit) {
    return []; // Target reached, stop betting
  }

  // 5. Determine Unit Bet Multiplier
  // Progression steps: Step 1 = 1x, Step 2 = 1x, Step 3 = 3x, Step 4 = 6x
  const progressionMultipliers = [1, 1, 3, 6];
  const stepIndex = Math.min(state.consecutiveLosses, progressionMultipliers.length - 1);
  const currentMultiplier = progressionMultipliers[stepIndex];

  // 6. Calculate Bet Amount per Spot
  const baseUnit = (config.betLimits && config.betLimits.min) ? config.betLimits.min : 2;
  let betAmount = baseUnit * currentMultiplier;

  // Clamp bet amount to table limits
  if (config.betLimits) {
    betAmount = Math.max(betAmount, config.betLimits.min);
    betAmount = Math.min(betAmount, config.betLimits.max);
  }

  // 7. Check if bankroll can cover all 6 bets
  const totalCost = betAmount * 6;
  if (bankroll < totalCost) {
    // Insufficient funds for full progression, scale down or stop
    const affordableAmount = Math.floor(bankroll / 6);
    if (config.betLimits && affordableAmount < config.betLimits.min) {
      return []; // Cannot meet table minimum
    }
    betAmount = affordableAmount;
  }

  // 8. Place the 6 Aquarius Wave Bets
  return [
    // Four Zigzag Corner Bets
    { type: 'corner', value: 1, amount: betAmount },   // Covers 1, 2, 4, 5
    { type: 'corner', value: 11, amount: betAmount },  // Covers 11, 12, 14, 15
    { type: 'corner', value: 22, amount: betAmount },  // Covers 22, 23, 25, 26
    { type: 'corner', value: 32, amount: betAmount },  // Covers 32, 33, 35, 36

    // Two Straight-Up "Lightning Rod" Bets
    { type: 'number', value: 9, amount: betAmount },
    { type: 'number', value: 27, amount: betAmount }
  ];
}