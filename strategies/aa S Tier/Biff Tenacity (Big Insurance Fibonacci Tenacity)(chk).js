/**
 * ============================================================================
 * Strategy Name: Biff Tenacity (Big Insurance Fibonacci Tenacity)
 * Source Video : https://youtu.be/kd6v4VFVHtk
 * YouTube Channel: Casino Matchmaker
 *
 * ----------------------------------------------------------------------------
 * 1. THE FULL LOGIC IN DETAIL:
 * ----------------------------------------------------------------------------
 * - Main Bet: Placed consistently on 'high' (numbers 19 to 36).
 * - Insurance Bet ("BIF"): When the progression reaches 5 units or higher
 *   (the $50 level in the video, corresponding to Fibonacci step 5), an
 *   insurance bet is placed on the 'basket' (numbers 0, 1, 2, 3) equal to 10%
 *   of the main bet amount (e.g., $5 on basket when main bet is $50, $8 on
 *   basket when main bet is $80).
 *
 * ----------------------------------------------------------------------------
 * 2. THE FULL BET PROGRESSION IN DETAIL:
 * ----------------------------------------------------------------------------
 * - Progression Sequence: Standard Fibonacci sequence multipliers:
 *     [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, ...]
 * - Win Condition ("Tenacity" Rule):
 *     - You must achieve TWO CONSECUTIVE WINS at the current progression level
 *       to completely reset back to Level 0 (1 unit).
 *     - If you win only 1 spin at the current level (consecutiveWins == 1),
 *       stay at the exact same progression level and repeat the bet to attempt
 *       the second consecutive win.
 * - Loss Condition:
 *     - Full Loss (numbers 4 to 18): Move up 1 step in the Fibonacci ladder,
 *       and reset consecutiveWins to 0.
 *     - Insurance Hit (numbers 0, 1, 2, 3 while insurance is active):
 *       The basket bet pays 8:1 (+ original bet back = 9x return), cushioning
 *       the loss on 'high'. Because this is an insurance soft-landing, DO NOT
 *       increase the progression level; repeat the current level and reset
 *       consecutiveWins to 0.
 *
 * ----------------------------------------------------------------------------
 * 3. THE GOAL:
 * ----------------------------------------------------------------------------
 * - Target Profit: Default target is +15 base units (or $150 with a $10 unit),
 *   stopping within 50 spins as demonstrated in the challenge video.
 * - Stop Loss: When bankroll is depleted or insufficient to place minimum bets.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Fibonacci Sequence Definition
  const FIBONACCI = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377];

  // 2. Base Unit Sizing (aligned to outside bet limits)
  const baseUnit = Math.max(config.betLimits.minOutside, 10);

  // 3. Initialize State
  if (state.level === undefined) {
    state.level = 0;
    state.consecutiveWins = 0;
    state.initialBankroll = bankroll;
    state.targetProfit = baseUnit * 1500; // 15 units target profit ($150 target in video)
    state.isInsuranceActive = false;
    state.spinsPlayed = 0;
  }

  // 4. Check Profit Target & Session Stop Conditions
  const netProfit = bankroll - state.initialBankroll;
  if (netProfit >= state.targetProfit) {
    // Target reached: lock in profit and stop placing bets
    return [];
  }

  // 5. Evaluate Previous Spin Results (if any)
  if (spinHistory && spinHistory.length > state.spinsPlayed) {
    const lastResult = spinHistory[spinHistory.length - 1];
    const winningNum = lastResult.winningNumber;
    state.spinsPlayed = spinHistory.length;

    const isHighWin = winningNum >= 19 && winningNum <= 36;
    const isBasketHit = [0, 1, 2, 3].includes(winningNum);

    if (isHighWin) {
      // Main bet won
      state.consecutiveWins += 1;
      if (state.consecutiveWins >= 2 || state.level === 0) {
        // Reset after 2 consecutive wins or a win at base level
        state.level = 0;
        state.consecutiveWins = 0;
      }
      // If consecutiveWins == 1 and level > 0: hold level, repeat to seek 2nd win
    } else if (state.isInsuranceActive && isBasketHit) {
      // Insurance hit: partial loss cushion. Do NOT advance ladder; hold level
      state.consecutiveWins = 0;
    } else {
      // Full loss: move up one level on the Fibonacci ladder
      state.consecutiveWins = 0;
      if (state.level < FIBONACCI.length - 1) {
        state.level += 1;
      }
    }
  }

  // Optional adjustment: if close to target, avoid unnecessary high progression
  const remainingProfit = state.targetProfit - (bankroll - state.initialBankroll);
  if (remainingProfit <= baseUnit && state.level > 0 && state.consecutiveWins === 1) {
    state.level = 0;
    state.consecutiveWins = 0;
  }

  // 6. Calculate Main Bet Amount
  const multiplier = FIBONACCI[state.level] || FIBONACCI[FIBONACCI.length - 1];
  let highAmount = baseUnit * multiplier;

  // Clamp main bet to table limits
  highAmount = Math.max(highAmount, config.betLimits.minOutside);
  highAmount = Math.min(highAmount, config.betLimits.max);

  // If bankroll cannot cover the main bet, clamp to bankroll
  if (bankroll < highAmount) {
    if (bankroll >= config.betLimits.minOutside) {
      highAmount = bankroll;
    } else {
      return []; // Insolvent
    }
  }

  const bets = [];

  // 7. Calculate Insurance Bet (Level 4+ / 5 units or higher)
  // Basket covers [0, 1, 2, 3] at 10% of main bet
  state.isInsuranceActive = state.level >= 4;
  let insuranceAmount = 0;

  if (state.isInsuranceActive) {
    insuranceAmount = Math.round(highAmount * 0.1);
    insuranceAmount = Math.max(insuranceAmount, config.betLimits.min);
    insuranceAmount = Math.min(insuranceAmount, config.betLimits.max);

    // Verify bankroll covers both bets
    if (highAmount + insuranceAmount > bankroll) {
      insuranceAmount = 0;
      state.isInsuranceActive = false;
    }
  }

  // 8. Construct Bets
  bets.push({
    type: 'high',
    amount: highAmount
  });

  if (state.isInsuranceActive && insuranceAmount > 0) {
    bets.push({
      type: 'basket',
      value: 0, // Covers 0, 1, 2, 3 on European table
      amount: insuranceAmount
    });
  }

  return bets;
}