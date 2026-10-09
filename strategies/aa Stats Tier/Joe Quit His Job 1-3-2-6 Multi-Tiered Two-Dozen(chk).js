/**
 * ============================================================================
 * Strategy Name: "Joe Quit His Job" 1-3-2-6 Multi-Tiered Two-Dozen System
 * Source:
 *   - YouTube Channel: Mastering The Wheel
 *   - Video URL: https://youtu.be/7AAWRWoy0YY
 *   - Video Title: "Joe Said He Quit His Job to Play Roulette… So I Tested His System"
 *
 * The Full Logic in Details:
 *   - Bet Placement: Bets are placed on two dozens: Dozen 1 (1-12) and Dozen 3 (25-36).
 *     These positions remain fixed and cover approximately 64.86% of a European wheel.
 *   - Triggers & Conditions: Bets are placed every spin across both dozens simultaneously
 *     until the session target profit is reached or bankroll is depleted.
 *
 * The Full Bet Progression in Details:
 *   - The strategy utilizes a 1-3-2-6 positive progression system embedded inside
 *     a 5-tier escalation structure (20 discrete levels in total):
 *       * Set 1: Base = 1 unit  -> Bets per dozen: 1, 3, 2, 6 units
 *       * Set 2: Base = 2 units -> Bets per dozen: 2, 6, 4, 12 units
 *       * Set 3: Base = 3 units -> Bets per dozen: 3, 9, 6, 18 units
 *       * Set 4: Base = 4 units -> Bets per dozen: 4, 12, 8, 24 units
 *       * Set 5: Base = 5 units -> Bets per dozen: 5, 15, 10, 30 units
 *   - After a WIN:
 *       * Advance to the next stage within the current 1-3-2-6 sequence (stage 1 -> 2 -> 3 -> 4).
 *       * If stage 4 (the 6x bet) wins, all 4 consecutive wins have been achieved;
 *         the progression cycle resets back to Set 1, Stage 1.
 *   - After a LOSS:
 *       * Failing at ANY stage (1, 2, 3, or 4) breaks the 4-win attempt.
 *       * Escalate immediately to Stage 1 of the NEXT tier set (Set 1 -> Set 2 -> Set 3 -> Set 4 -> Set 5).
 *       * If Set 5 fails, reset back to Set 1, Stage 1.
 *
 * The Goal:
 *   - Target Profit: Typically +10% to +20% of session bankroll (or default $100 stop-win).
 *   - Stop-Loss: Full session loss or bankroll exhaustion.
 * ============================================================================
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Establish the base unit respecting table limits for outside bets
    const minOutside = config.betLimits ? config.betLimits.minOutside : 5;
    const maxBet = config.betLimits ? config.betLimits.max : 500;
    const unit = minOutside;

    // 2. Initialize Persistent State
    if (state.currentSet === undefined) state.currentSet = 1;       // Tier set: 1 to 5
    if (state.currentStage === undefined) state.currentStage = 1;   // Stage within set: 1 to 4
    if (state.initialBankroll === undefined) state.initialBankroll = bankroll;
    if (state.stopWin === undefined) state.stopWin = 100000; // Default session target profit

    // 1-3-2-6 Multiplier sequence
    const STAGE_MULTIPLIERS = [1, 3, 2, 6];

    // 3. Evaluate Previous Spin Result if History Exists
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;

        // Check if winning number landed on Dozen 1 (1-12) or Dozen 3 (25-36)
        const won = (lastNum >= 1 && lastNum <= 12) || (lastNum >= 25 && lastNum <= 36);

        if (won) {
            if (state.currentStage < 4) {
                // Advance to next stage in 1-3-2-6 positive progression
                state.currentStage += 1;
            } else {
                // Completed 4 consecutive wins: reset to Set 1, Stage 1
                state.currentSet = 1;
                state.currentStage = 1;
            }
        } else {
            // Loss on any stage: jump to Stage 1 of next set tier
            state.currentStage = 1;
            state.currentSet += 1;
            if (state.currentSet > 5) {
                // Reached the end of the 5 progression tiers: reset
                state.currentSet = 1;
            }
        }
    }

    // 4. Check Profit Target & Stop-Loss
    const profit = bankroll - state.initialBankroll;
    if (profit >= state.stopWin) {
        return []; // Target achieved, stop betting
    }

    // 5. Calculate Bet Amount
    const setBaseUnits = state.currentSet; // 1, 2, 3, 4, or 5
    const stageMultiplier = STAGE_MULTIPLIERS[state.currentStage - 1]; // 1, 3, 2, or 6
    let betUnits = setBaseUnits * stageMultiplier;
    let betAmount = betUnits * unit;

    // Clamp bet amount to table limits
    betAmount = Math.max(betAmount, minOutside);
    betAmount = Math.min(betAmount, maxBet);

    // Verify sufficient funds for both bets
    if (bankroll < betAmount * 2) {
        return []; // Insufficient funds
    }

    // 6. Return Bet Objects for Dozen 1 and Dozen 3
    return [
        { type: 'dozen', value: 1, amount: betAmount },
        { type: 'dozen', value: 3, amount: betAmount }
    ];
}