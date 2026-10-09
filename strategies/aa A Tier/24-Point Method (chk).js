/**
 * ============================================================================
 * Strategy: The 24-Point Method (by Jamie Wellsby)
 * Source  : "G2E INSIDER SECRETS REVEALED!"
 * Channel : The Roulette Master (https://youtu.be/RfGzFE6Sfzw)
 * ============================================================================
 * 
 * 1. THE FULL LOGIC IN DETAIL:
 * ----------------------------
 * The "24-Point Method" is a high-coverage roulette system that covers 27 numbers
 * using 24 betting units:
 *   - Outside Bet: 15 units placed on 'even' (covers 18 even numbers).
 *   - Inside Bets : 1 unit placed straight-up on each odd number from 1 to 17
 *                   (9 numbers: 1, 3, 5, 7, 9, 11, 13, 15, 17).
 * 
 * Coverage & Payout Profile per base cycle:
 *   - Any Even number (18 numbers): The even bet wins (+15), inside bets lose (-9).
 *     Net gain: +6 units.
 *   - Any Low Odd number (9 numbers): Inside bet wins (+35), even bet loses (-15),
 *     remaining 8 inside bets lose (-8). Net gain: +12 units.
 *   - Any High Odd number (19, 21, 23, 25, 27, 29, 31, 33, 35) or 0 / 00 (11 numbers):
 *     All bets lose. Net loss: -24 units.
 * 
 * 2. THE FULL BET PROGRESSION:
 * ----------------------------
 *   - Base Bet: Level 1 (15 units on Even, 1 unit on each of the 9 low odd numbers).
 *   - On Loss: Increase the bet level by adding one base unit (+1x multiplier)
 *     to all positions (Level 1 -> Level 2 -> Level 3...).
 *   - On Win:
 *       - If the bankroll reaches or surpasses the session peak (or session target),
 *         the progression fully resets back to Level 1.
 *       - Otherwise, keep the current bet level and spin again until fully recovered.
 * 
 * 3. THE GOAL:
 * ------------
 *   - Target Profit: Accumulate +200 to +250 base units (or dollar equivalent),
 *     at which point the session is locked in and bets cease.
 *   - Stop-Loss: Cease betting if the bankroll is insufficient to place minimum bets.
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // --------------------------------------------------------------------------
  // 1. Target and Constants Configuration
  // --------------------------------------------------------------------------
  const TARGET_PROFIT = 25000; // Target profit to cash out (recommended $200 - $250)
  const LOW_ODD_NUMBERS = [1, 3, 5, 7, 9, 11, 13, 15, 17];

  // --------------------------------------------------------------------------
  // 2. Initialize Persistent State
  // --------------------------------------------------------------------------
  if (!state.initialized) {
    state.initialized = true;
    state.startBankroll = bankroll;
    state.peakBankroll = bankroll;
    state.lastBankroll = bankroll;
    state.multiplier = 1;
    state.targetReached = false;
  }

  // --------------------------------------------------------------------------
  // 3. Goal & Stop-Condition Checks
  // --------------------------------------------------------------------------
  if (state.targetReached || (bankroll - state.startBankroll) >= TARGET_PROFIT) {
    state.targetReached = true;
    return []; // Stop betting once profit target is achieved
  }

  // --------------------------------------------------------------------------
  // 4. Update Progression Based on Previous Result
  // --------------------------------------------------------------------------
  if (spinHistory && spinHistory.length > 0) {
    const lastProfit = bankroll - state.lastBankroll;

    if (lastProfit < 0) {
      // Loss: Increase progression multiplier by 1 base level
      state.multiplier += 1;
    } else if (lastProfit > 0) {
      // Win: Check if recovered back to or beyond the previous session high
      if (bankroll >= state.peakBankroll) {
        state.multiplier = 1; // Full reset to base level
      }
      // If still below peak, maintain current multiplier to continue recovery
    }

    if (bankroll > state.peakBankroll) {
      state.peakBankroll = bankroll;
    }
  }

  state.lastBankroll = bankroll;

  // --------------------------------------------------------------------------
  // 5. Determine Base Unit Sizing (Strictly Respecting Bet Limits)
  // --------------------------------------------------------------------------
  // Base ratio: 15 on outside ('even') and 1 on each of 9 inside numbers.
  const minInside = config.betLimits.min || 1;
  const minOutside = config.betLimits.minOutside || 5;
  const maxLimit = config.betLimits.max || 500;

  // Find minimum base unit for inside numbers that also satisfies minOutside when multiplied by 15
  const baseInsideUnit = Math.max(minInside, Math.ceil(minOutside / 15));
  const baseOutsideUnit = baseInsideUnit * 15;

  // Calculate scaled amounts according to progression multiplier
  let insideAmount = baseInsideUnit * state.multiplier;
  let outsideAmount = baseOutsideUnit * state.multiplier;

  // Clamp bets to table limits
  insideAmount = Math.max(insideAmount, minInside);
  insideAmount = Math.min(insideAmount, maxLimit);

  outsideAmount = Math.max(outsideAmount, minOutside);
  outsideAmount = Math.min(outsideAmount, maxLimit);

  // Check if bankroll can sustain the complete bet
  const totalBetRequired = outsideAmount + (insideAmount * LOW_ODD_NUMBERS.length);
  if (bankroll < totalBetRequired) {
    return []; // Stop betting if insufficient bankroll remains
  }

  // --------------------------------------------------------------------------
  // 6. Construct Bet Placements
  // --------------------------------------------------------------------------
  const bets = [
    { type: 'even', amount: outsideAmount }
  ];

  for (let i = 0; i < LOW_ODD_NUMBERS.length; i++) {
    bets.push({
      type: 'number',
      value: LOW_ODD_NUMBERS[i],
      amount: insideAmount
    });
  }

  return bets;
}