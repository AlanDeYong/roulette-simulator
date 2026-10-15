/**
 * ROULETTE STRATEGY: Lucky 10-Fold 2.0
 * 
 * SOURCE:
 * - Video URL: https://youtu.be/jYHi4p2Ek9Y
 * - Channel: CEG Dealer School
 * - Author: Ben the Busman / Ben the Bus Driver
 * 
 * STRATEGY LOGIC:
 * The "Lucky 10-Fold 2.0" strategy is a multi-phase system designed for low-to-medium
 * bankrolls ($200–$300) aimed at aggressive profit pressing while protecting capital.
 * 
 * 1. PHASE 1 (The Qualifier / Setup Phase):
 *    - Goal: Generate a quick initial win to fund Phase 2.
 *    - Bets: Place unequal bets on 2 Columns (or 2 Dozens).
 *      - Column 1: 2 units (e.g., $20)
 *      - Column 2: 1 unit (e.g., $10)
 *    - Outcomes:
 *      - Win on 2-unit Column: Net profit +$30 (60 total balance returned). Move to PHASE 2.
 *      - Win on 1-unit Column: Net break-even (Push). Stay in PHASE 1.
 *      - Loss (miss both / Zero): Lose $30 total. Re-bet PHASE 1.
 * 
 * 2. PHASE 2 (The Main Board / Press Phase):
 *    - Triggered after a net win in Phase 1.
 *    - Bets: Cover 1 Dozen + 4 Non-overlapping Corners.
 *      - Base Dozen bet: 2 units (e.g., $20 on 2nd Dozen)
 *      - Base Corner bets: 1 unit each on 4 distinct corners (e.g., $10 each on corners 1, 7, 13, 19).
 *    - Outcomes:
 *      - Hit Corner (Win): Net win +$30 to +$60. Press bets to the next tier!
 *      - Hit Dozen only (Push): Break-even. Repeat same bet amounts at current tier.
 *      - Miss all (Loss): Reset back to PHASE 1.
 * 
 * 3. BET PROGRESSION (Gold Tiers / Pressing):
 *    - Level 1: 2 units Dozen ($20) + 4 x 1 unit Corners ($10 each) = $60 total outlay.
 *    - Level 2 (+Win): 3 units Dozen ($30) + 4 x 1.5 unit Corners ($15 each) = $90 total outlay.
 *    - Level 3 (+Win): 4 units Dozen ($40) + 4 x 2 unit Corners ($20 each) = $120 total outlay.
 *    - Reset: After 3 consecutive Phase 2 wins (or hitting profit target), lock up profits and reset to Phase 1.
 * 
 * GOAL & STOP-LOSS:
 * - Target Profit: +$150 to +$200 profit (or 3 successful press wins in Phase 2).
 * - Stop-Loss: Loss of initial $300 bankroll (all bullets spent).
 * 
 * @param {Array} spinHistory - Array of past spin objects.
 * @param {number} bankroll - Current bankroll amount.
 * @param {Object} config - Configuration rules & bet limits.
 * @param {Object} state - Persistent state object across spins.
 * @param {Object} utils - Helper utilities.
 * @returns {Array|null} Array of bet objects or null.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Determine Unit Sizes based on config limits
  const minOutside = config.betLimits.minOutside || 5;
  const minInside = config.betLimits.min || 2;
  const maxBet = config.betLimits.max || 500;

  // Standard unit definitions ($10 unit base matching $5 minimum outside limits)
  const unit = Math.max(minOutside * 2, 10); // Base unit = $10
  const cornerUnit = Math.max(minInside, unit / 2); // Corner unit = $5 or $10

  // 2. Initialize Persistent State
  if (state.phase === undefined) {
    state.phase = 1; // Start in Phase 1
    state.pressLevel = 1; // Press level in Phase 2
    state.initialBankroll = bankroll;
    state.targetProfit = 200000; // Target profit $200
  }

  // Check Stop-Loss / Target Profit condition
  const currentProfit = bankroll - state.initialBankroll;
  if (currentProfit >= state.targetProfit || bankroll < (unit * 3)) {
    // Stop betting if profit goal reached or insufficient bankroll
    return [];
  }

  // 3. Evaluate Previous Spin Outcome (if history exists)
  if (spinHistory && spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const num = lastSpin.winningNumber;

    if (state.phase === 1) {
      // Evaluate Phase 1: 2-unit on Column 1, 1-unit on Column 2
      // Column 1 covers numbers % 3 === 1 (1, 4, 7, 10...)
      // Column 2 covers numbers % 3 === 2 (2, 5, 8, 11...)
      const isCol1 = (num > 0 && num % 3 === 1);
      
      if (isCol1) {
        // Hit the 2-unit column -> Net Win! Move to Phase 2
        state.phase = 2;
        state.pressLevel = 1;
      }
      // If hit Col 2 (push) or miss both (loss), stay in Phase 1
    } else if (state.phase === 2) {
      // Evaluate Phase 2: Dozen 2 (13-24) + Corners (1, 7, 13, 19)
      const corners = [1, 7, 13, 19];
      const isDozen2 = (num >= 13 && num <= 24);

      // Helper to check if number is covered by our 4 corners:
      // Corner 1: 1, 2, 4, 5
      // Corner 7: 7, 8, 10, 11
      // Corner 13: 13, 14, 16, 17
      // Corner 19: 19, 20, 22, 23
      const hitCorner = (
        [1, 2, 4, 5].includes(num) ||
        [7, 8, 10, 11].includes(num) ||
        [13, 14, 16, 17].includes(num) ||
        [19, 20, 22, 23].includes(num)
      );

      if (hitCorner) {
        // Win! Advance Press Level or Reset if reached max level
        if (state.pressLevel < 3) {
          state.pressLevel += 1;
        } else {
          // Reached 3 consecutive wins -> Reset to Phase 1 to lock profit
          state.phase = 1;
          state.pressLevel = 1;
        }
      } else if (isDozen2) {
        // Push -> Maintain current press level in Phase 2
      } else {
        // Loss -> Reset back to Phase 1
        state.phase = 1;
        state.pressLevel = 1;
      }
    }
  }

  // Helper function to clamp bet amounts to configured limits
  function clamp(amount, isOutside) {
    const min = isOutside ? minOutside : minInside;
    return Math.min(Math.max(amount, min), maxBet);
  }

  // 4. Construct Bets Array
  const bets = [];

  if (state.phase === 1) {
    // PHASE 1: $20 on Column 1, $10 on Column 2
    bets.push({
      type: 'column',
      value: 1,
      amount: clamp(unit * 2, true)
    });
    bets.push({
      type: 'column',
      value: 2,
      amount: clamp(unit * 1, true)
    });
  } else if (state.phase === 2) {
    // PHASE 2: 1 Dozen + 4 Non-overlapping Corners with Press Multiplier
    const pressMultiplier = state.pressLevel; // 1x, 2x, or 3x

    // 1 Dozen Bet (e.g., 2nd Dozen)
    bets.push({
      type: 'dozen',
      value: 2,
      amount: clamp(unit * 2 * pressMultiplier, true)
    });

    // 4 Non-overlapping Corner Bets
    const cornerPositions = [1, 7, 13, 19];
    const cornerAmount = clamp(cornerUnit * pressMultiplier, false);

    for (let i = 0; i < cornerPositions.length; i++) {
      bets.push({
        type: 'corner',
        value: cornerPositions[i],
        amount: cornerAmount
      });
    }
  }

  return bets;
}