/**
 * ============================================================================
 * Roulette Strategy: 2nd Dozen + 4 Corners ("The Best Tweak Ever")
 * ============================================================================
 * Source:
 *   - Video URL: https://youtu.be/BSnvypO1-IY
 *   - Channel Name: WillVegas
 *
 * Full Logic Details:
 *   1. Bet Placements:
 *      - Places 4 Corner bets covering non-overlapping numbers in the 1st and 3rd Dozens.
 *        Default Corner Positions (top-left number of each corner grid):
 *        - Corner 1: 1  (Covers 1, 2, 4, 5)
 *        - Corner 2: 7  (Covers 7, 8, 10, 11)
 *        - Corner 3: 25 (Covers 25, 26, 28, 29)
 *        - Corner 4: 31 (Covers 31, 32, 34, 35)
 *      - Places 1 Outside bet on the 2nd Dozen (numbers 13-24).
 *      - Total numbers covered: 28 of 37 (European) or 38 (American) numbers (~75.7% coverage).
 *
 *   2. The "Tweak":
 *      - Traditional 4-corner + dozen strategy bets 1 unit per corner and 2 units on dozen
 *        (total 6 units), making the 2nd Dozen a push (+0 profit).
 *      - "The Best Tweak Ever" increases the 2nd Dozen bet to 3 units (total 7 units).
 *      - Now, any hit (Corner or 2nd Dozen) yields a net profit of +2 units per level!
 *
 *   3. Progression System:
 *      - Base Level = 1 (4 x 1 unit on corners, 3 units on 2nd Dozen = 7 units base bet).
 *      - On Loss: Increase progression level by +1 (Level 1 -> 2 -> 3 -> 4).
 *        At Level 5 or higher, the strategy doubles the progression multiplier to accelerate recovery.
 *      - On Win: Check if net profit goal or full loss recovery is achieved.
 *        If session's peak profit is reached, reset to Level 1. Otherwise, step down level or keep current level.
 *
 *   4. Goal / Stop Conditions:
 *      - Target Profit: +30 units / $30 above starting bankroll.
 *      - Stop Loss: Triggered if bankroll is insufficient to place the calculated progression bet.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Initialize State
  if (!state.initialized) {
    state.initialized = true;
    state.level = 1;
    state.startBankroll = bankroll;
    state.peakBankroll = bankroll;
    state.targetProfit = 30000; // Default $30 profit target from video
  }

  // Track highest bankroll achieved
  if (bankroll > state.peakBankroll) {
    state.peakBankroll = bankroll;
  }

  // Stop playing if profit target reached
  if (bankroll >= state.startBankroll + state.targetProfit) {
    return [];
  }

  // 2. Evaluate Last Spin Result to Update Progression
  if (spinHistory && spinHistory.length > 0) {
    const lastResult = spinHistory[spinHistory.length - 1];
    const lastNum = lastResult.winningNumber;

    // Winning numbers covered by default corners
    const cornerNumbers = [
      1, 2, 4, 5,       // Corner 1
      7, 8, 10, 11,     // Corner 2
      25, 26, 28, 29,   // Corner 3
      31, 32, 34, 35    // Corner 4
    ];

    const isCornerWin = cornerNumbers.includes(lastNum);
    const isDozen2Win = (lastNum >= 13 && lastNum <= 24);
    const isWin = isCornerWin || isDozen2Win;

    if (isWin) {
      // If we recovered back to or above peak bankroll, reset to base level
      if (bankroll >= state.peakBankroll) {
        state.level = 1;
      } else {
        // Step down progression on win during recovery
        state.level = Math.max(1, state.level - 1);
      }
    } else {
      // On Loss: Increase level
      if (state.level < 4) {
        state.level += 1;
      } else {
        // Level 5+ trigger: Double up for faster recovery as per strategy
        state.level *= 2;
      }
    }
  }

  // 3. Calculate Bet Amounts
  // Base unit determined by bet limits
  const baseCornerUnit = config.betLimits.min;
  const baseDozenUnit = Math.max(config.betLimits.minOutside, baseCornerUnit * 3);

  // Apply progression level
  let cornerAmount = baseCornerUnit * state.level;
  let dozenAmount = baseDozenUnit * state.level;

  // Clamp amounts to table limits
  cornerAmount = Math.max(config.betLimits.min, Math.min(cornerAmount, config.betLimits.max));
  dozenAmount = Math.max(config.betLimits.minOutside, Math.min(dozenAmount, config.betLimits.max));

  const totalRequiredBet = (cornerAmount * 4) + dozenAmount;

  // Check if bankroll supports the bet
  if (bankroll < totalRequiredBet) {
    // Revert to level 1 if bankroll cannot support higher level
    state.level = 1;
    cornerAmount = config.betLimits.min;
    dozenAmount = Math.max(config.betLimits.minOutside, cornerAmount * 3);
    
    if (bankroll < (cornerAmount * 4) + dozenAmount) {
      return []; // Not enough bankroll to place minimum strategy bet
    }
  }

  // 4. Construct and Return Bet Objects
  return [
    // 4 Corner Bets
    { type: 'corner', value: 1, amount: cornerAmount },  // Covers 1, 2, 4, 5
    { type: 'corner', value: 7, amount: cornerAmount },  // Covers 7, 8, 10, 11
    { type: 'corner', value: 25, amount: cornerAmount }, // Covers 25, 26, 28, 29
    { type: 'corner', value: 31, amount: cornerAmount }, // Covers 31, 32, 34, 35

    // 2nd Dozen Outside Bet
    { type: 'dozen', value: 2, amount: dozenAmount }     // Covers 13-24
  ];
}