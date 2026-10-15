/**
 * ============================================================================
 * ROULETTE STRATEGY: ZACH ATTACK METHOD (7-NUMBER RACETRACK SURROUND)
 * ============================================================================
 * Source:
 * - Channel: ALL in With Zach
 * - Video URL: https://youtu.be/9dq8s5viUOQ
 * - Strategy Name: "Zack Attack Roulette Strategy" / "Zach Attack Method"
 *
 * Full Logic Details:
 * 1. Target Selection:
 *    - The strategy identifies the last number that appeared twice in recent history
 *      (or defaults to the latest winning number if no repeat is found).
 *    - Using the physical wheel order (Racetrack view), it selects a total of 7 
 *      adjacent straight-up numbers: the target center number plus 3 numbers to its 
 *      left and 3 numbers to its right on the wheel.
 *
 * 2. Progression Sequence (10-Spin Cycle):
 *    - Unit multipliers per number across 10 steps:
 *      - Step 1: 1 unit  per number  (Total: 7 units)
 *      - Step 2: 1 unit  per number  (Total: 7 units)
 *      - Step 3: 1 unit  per number  (Total: 7 units)
 *      - Step 4: 2 units per number  (Total: 14 units)
 *      - Step 5: 2 units per number  (Total: 14 units)
 *      - Step 6: 3 units per number  (Total: 21 units)
 *      - Step 7: 3 units per number  (Total: 21 units)
 *      - Step 8: 4 units per number  (Total: 28 units)
 *      - Step 9: 5 units per number  (Total: 35 units)
 *      - Step 10: 7 units per number (Total: 49 units)
 *
 * 3. Win / Loss Rules:
 *    - On Win: Reset progression step back to Step 1. Re-evaluate target number if a 
 *      new repeated number emerges.
 *    - On Loss: Advance to the next progression step. If all 10 steps fail, reset 
 *      to Step 1.
 *
 * 4. Goal & Limits:
 *    - Goal: Target 10% session profit target or continue building bankroll.
 *    - Bet Limits: All single number straight-up bets use `config.betLimits.min` as 
 *      the base unit and are clamped between `config.betLimits.min` and `config.betLimits.max`.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // Define wheel sequences for European and American layouts
  const EuropeanWheel = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 
    24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
  ];

  const AmericanWheel = [
    0, 28, 9, 26, 30, 11, 7, 20, 32, 17, 5, 22, 34, 15, 3, 24, 36, 13, 1, '00', 
    27, 10, 25, 29, 12, 8, 19, 31, 18, 6, 21, 33, 16, 4, 23, 35
  ];

  const wheel = config.tableType === 'american' ? AmericanWheel : EuropeanWheel;

  // Multiplier schedule per number for the 10-step progression
  const progressionMultipliers = [1, 1, 1, 2, 2, 3, 3, 4, 5, 7];

  // Base unit for inside straight-up bets
  const unit = config.betLimits.min;

  // Initialize persistent state
  if (state.spinStep === undefined) state.spinStep = 0;
  if (state.lastBankroll === undefined) state.lastBankroll = bankroll;

  // Check result of the previous spin if available
  if (spinHistory && spinHistory.length > 0) {
    const lastResult = spinHistory[spinHistory.length - 1];
    const lastWinningNum = lastResult.winningNumber;

    // Determine if last bet was a win
    const won = bankroll > state.lastBankroll;

    if (won) {
      state.spinStep = 0; // Reset progression on win
    } else {
      state.spinStep++;
      if (state.spinStep >= progressionMultipliers.length) {
        state.spinStep = 0; // Reset progression after 10 losses
      }
    }
  }

  state.lastBankroll = bankroll;

  // Determine target center number by finding the last repeated number in history
  let targetNumber = null;
  if (spinHistory && spinHistory.length >= 2) {
    const seen = new Set();
    for (let i = spinHistory.length - 1; i >= 0; i--) {
      const num = spinHistory[i].winningNumber;
      if (seen.has(num)) {
        targetNumber = num;
        break;
      }
      seen.add(num);
    }
  }

  // Fallback target if no repeated number is found yet
  if (targetNumber === null) {
    targetNumber = (spinHistory && spinHistory.length > 0) 
      ? spinHistory[spinHistory.length - 1].winningNumber 
      : 18;
  }

  // Locate target index on the wheel racetrack
  let targetIndex = wheel.indexOf(targetNumber);
  if (targetIndex === -1) {
    // Handle double zero edge cases if formatted as string vs number
    targetIndex = wheel.findIndex(val => String(val) === String(targetNumber));
    if (targetIndex === -1) targetIndex = 0;
  }

  // Get the 7 surrounding numbers (3 left, target, 3 right)
  const selectedNumbers = [];
  const len = wheel.length;
  for (let offset = -3; offset <= 3; offset++) {
    const idx = (targetIndex + offset + len) % len;
    selectedNumbers.push(wheel[idx]);
  }

  // Calculate current bet amount per number according to progression
  const currentMultiplier = progressionMultipliers[state.spinStep];
  let betAmountPerNum = unit * currentMultiplier;

  // Clamp bet amount to config limits
  betAmountPerNum = Math.max(betAmountPerNum, config.betLimits.min);
  betAmountPerNum = Math.min(betAmountPerNum, config.betLimits.max);

  // Construct return bet array
  const bets = selectedNumbers.map(num => ({
    type: 'number',
    value: num,
    amount: betAmountPerNum
  }));

  return bets;
}