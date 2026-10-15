/**
 * ==============================================================================
 * Strategy Name: PERFECT BALANCE
 * Source: YouTube - "PERFECT BALANCE - ROULETTE SYSTEM TUTORIAL"
 * Channel: Bet With Mo (https://youtu.be/OhIvZ39LQ4E)
 *
 * THE FULL LOGIC IN DETAIL:
 * ------------------------------------------------------------------------------
 * The "Perfect Balance" system balances table coverage using two specific double 
 * streets (line bets) and the 3rd Dozen:
 * 
 * 1. Double Street 10–15 (Line at 10):
 *    - Covers numbers: 10, 11, 12, 13, 14, 15 (4 blacks: 10, 11, 13, 15; 2 reds: 12, 14).
 *    - Note: 10, 11, 12 bridge the 1st dozen, while 13, 14, 15 enter the 2nd dozen.
 * 2. Double Street 16–21 (Line at 16):
 *    - Covers numbers: 16, 17, 18, 19, 20, 21 (4 reds: 16, 18, 19, 21; 2 blacks: 17, 20).
 * 3. Third Dozen (Dozen 3):
 *    - Covers numbers: 25–36 (12 numbers).
 * 
 * Total coverage: 24 numbers (approx. 64.86% European, 63.16% American).
 * 
 * BET RATIO & BET SIZES:
 * ------------------------------------------------------------------------------
 * Base unit layout requires 4 units total:
 * - Line (10-15): 1 unit
 * - Line (16-21): 1 unit
 * - Dozen 3: 2 units (the exact sum of both double streets: 1 + 1 = 2)
 * Any hit on a covered number pays net +2 units at base level:
 * - Line hit: 1 unit pays 5:1 (returns 6) - 4 total bet = +2 units.
 * - Dozen hit: 2 units pay 2:1 (returns 6) - 4 total bet = +2 units.
 *
 * PROGRESSION (6-STEP SEQUENCE):
 * ------------------------------------------------------------------------------
 * Total Bankroll Requirement: 636 units (4 + 12 + 32 + 84 + 168 + 336 = 636).
 * Multipliers per double street (the dozen is always 2x the double street):
 * - Step 1: 1 unit on each line, 2 units on 3rd Dozen (Total: 4 units)
 * - Step 2: 3 units on each line, 6 units on 3rd Dozen (Total: 12 units)
 * - Step 3: 8 units on each line, 16 units on 3rd Dozen (Total: 32 units)
 * - Step 4: 21 units on each line, 42 units on 3rd Dozen (Total: 84 units)
 * - Step 5: 42 units on each line, 84 units on 3rd Dozen (Total: 168 units)
 * - Step 6: 84 units on each line, 168 units on 3rd Dozen (Total: 336 units)
 *
 * SESSION HIGH & RESET RULES:
 * ------------------------------------------------------------------------------
 * - Track the peak bankroll (`sessionHigh`).
 * - On a Loss (uncovered numbers: 0, 00, 1–9, 22–24):
 *     Advance to the next progression step.
 * - On a Win:
 *     If the new bankroll >= `sessionHigh`, establish a new `sessionHigh` and
 *     immediately RESET to Step 1.
 *     If still below `sessionHigh`, stay at the current step to recover the deficit.
 * - Stop Loss:
 *     If the 6th step loses or the bankroll cannot support the next bet, reset or stop.
 * ==============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Initialize State
  if (state.sessionHigh === undefined) {
    state.sessionHigh = bankroll;
    state.progressionIndex = 0;
    state.lastBankroll = bankroll;
  }

  // 2. Progression multipliers [line1, line2, dozen3] in base units
  const progressionSteps = [
    { line: 1, dozen: 2 },   // Step 1: 4 units total
    { line: 3, dozen: 6 },   // Step 2: 12 units total
    { line: 8, dozen: 16 },  // Step 3: 32 units total
    { line: 21, dozen: 42 }, // Step 4: 84 units total
    { line: 42, dozen: 84 }, // Step 5: 168 units total (double up)
    { line: 84, dozen: 168 } // Step 6: 336 units total (double up again)
  ];

  // 3. Process previous spin result to adjust progression
  if (spinHistory && spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const winningNum = lastSpin.winningNumber;

    // Check if the winning number is covered by our layout:
    // Line 10 covers 10-15, Line 16 covers 16-21, Dozen 3 covers 25-36
    const isWin = (winningNum >= 10 && winningNum <= 21) || (winningNum >= 25 && winningNum <= 36);

    if (isWin) {
      // If current bankroll matches or exceeds session high, lock in profit & reset
      if (bankroll >= state.sessionHigh) {
        state.sessionHigh = bankroll;
        state.progressionIndex = 0;
      }
      // If bankroll is still below session high, stay on the current recovery tier
    } else {
      // Uncovered number (loss): advance progression
      state.progressionIndex++;
      if (state.progressionIndex >= progressionSteps.length) {
        // Exceeded max progression level, reset back to step 1
        state.progressionIndex = 0;
        state.sessionHigh = bankroll;
      }
    }
  }

  state.lastBankroll = bankroll;

  // 4. Calculate unit size according to limits
  // Inside line bet minimum vs Outside dozen minimum (dozen is 2 * line)
  const minInside = config.betLimits?.min || 1;
  const minOutside = config.betLimits?.minOutside || 2;
  const maxBet = config.betLimits?.max || 500;

  // Unit must satisfy both line min and dozen min (2 * unit >= minOutside)
  const unit = Math.max(minInside, Math.ceil(minOutside / 2));

  // Current multiplier step
  const currentStep = progressionSteps[state.progressionIndex];

  // Calculate raw amounts
  let lineAmount = currentStep.line * unit;
  let dozenAmount = currentStep.dozen * unit;

  // Clamp amounts to table limits
  lineAmount = Math.max(lineAmount, minInside);
  lineAmount = Math.min(lineAmount, maxBet);

  dozenAmount = Math.max(dozenAmount, minOutside);
  dozenAmount = Math.min(dozenAmount, maxBet);

  // 5. Total cost validation against bankroll
  const totalCost = (lineAmount * 2) + dozenAmount;
  if (bankroll < totalCost) {
    // Insufficient funds to place full layout
    return [];
  }

  // 6. Return Bet Placements:
  // - Line 10 (covers 10-15)
  // - Line 16 (covers 16-21)
  // - Dozen 3 (covers 25-36)
  return [
    { type: 'line', value: 10, amount: lineAmount },
    { type: 'line', value: 16, amount: lineAmount },
    { type: 'dozen', value: 3, amount: dozenAmount }
  ];
}