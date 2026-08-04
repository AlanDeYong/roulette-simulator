/**
 * ============================================================================
 * STRATEGY DOCUMENTATION
 * ============================================================================
 * Strategy Name: WIN ALL NIGHT LONG Strategy
 * Source: https://youtu.be/DWIPiyY77Zo
 * YouTube Channel: The Roulette Master
 *
 * THE FULL LOGIC IN DETAILS:
 * 1. Base Placement:
 *    - Place 2 units on 1 to 18 (Low).
 *    - Place 1 unit on 3rd 12 (Numbers 25-36).
 *    - This covers 30 numbers (1-18 and 25-36).
 * 
 * 2. Outcomes at Base Level:
 *    - Land on 1-18: Wins 2 units on Low, loses 1 unit on 3rd 12 -> Net +1 unit profit.
 *    - Land on 25-36 (3rd 12): Wins 2 units on 3rd 12, loses 2 units on Low -> Net $0 (Break even).
 *    - Land on 19-24, 0, or 00: Both bets lose (-3 units). Enter Recovery Progression!
 *
 * THE FULL BET PROGRESSION IN DETAILS:
 * 1. Low Bet (1 to 18) Progression:
 *    - Modified Fibonacci sequence in units: [2, 4, 6, 10, 16, 26, 42, 68, ...]
 * 2. Dozen Bet (3rd 12) Progression:
 *    - Standard Fibonacci sequence in units: [1, 1, 2, 3, 5, 8, 13, 21, ...]
 *
 * 3. Recovery Rules:
 *    - Step 1 (1st spin after loss): Bet 4 units on 1-18 and 1 unit on 3rd 12.
 *    - If 1 to 18 hits at any point during recovery: Reset immediately to Base Level.
 *    - If 3rd 12 hits during recovery: Remove 3rd 12 from the table (stop betting on 3rd 12),
 *      and continue advancing 1 to 18 independently along its Modified Fibonacci progression.
 *    - If both lose during recovery: Advance 1 to 18 to the next Modified Fibonacci step.
 *      If 3rd 12 is still active, advance it to its next Fibonacci step.
 *
 * THE GOAL:
 * - Bankroll Preservation & Steady Growth. Target session profit is +$200 (or 20 base units).
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit using outside bet limits
    const unit = config.betLimits.minOutside;

    // Helper function to clamp bet amounts to configured limits
    function clampBet(amount) {
        let clamped = Math.max(amount, config.betLimits.minOutside);
        clamped = Math.min(clamped, config.betLimits.max);
        return Math.round(clamped);
    }

    // 2. Initialize State
    if (state.inRecovery === undefined) {
        state.inRecovery = false;
        state.lowHistory = [];  // Array storing previous unit bets for 1-18
        state.docHistory = [];  // Array storing previous unit bets for 3rd 12
        state.docActive = true;  // Flag indicating if 3rd 12 is active in recovery
    }

    // 3. Process previous spin if history exists
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;

        const isLowWin = (num >= 1 && num <= 18);
        const isDocWin = (num >= 25 && num <= 36);

        if (!state.inRecovery) {
            // Check if both bets lost at base level (landed on 19-24, 0, or 00)
            if (!isLowWin && !isDocWin) {
                state.inRecovery = true;
                state.lowHistory = [2, 4]; // Initial base bet was 2, step 1 of recovery is 4
                state.docHistory = [1, 1]; // Initial base bet was 1, step 1 of recovery is 1
                state.docActive = true;
            }
        } else {
            // Currently in Recovery Phase
            if (isLowWin) {
                // Landing on 1-18 completes recovery -> RESET to base level
                state.inRecovery = false;
                state.lowHistory = [];
                state.docHistory = [];
                state.docActive = true;
            } else {
                // 1-18 missed: Advance 1-18 on Modified Fibonacci
                const lenLow = state.lowHistory.length;
                const nextLow = state.lowHistory[lenLow - 1] + state.lowHistory[lenLow - 2];
                state.lowHistory.push(nextLow);

                if (isDocWin) {
                    // 3rd 12 hit -> Remove 3rd 12 bet from board
                    state.docActive = false;
                } else if (state.docActive) {
                    // 3rd 12 also missed -> Advance 3rd 12 on Standard Fibonacci
                    const lenDoc = state.docHistory.length;
                    const nextDoc = state.docHistory[lenDoc - 1] + state.docHistory[lenDoc - 2];
                    state.docHistory.push(nextDoc);
                }
            }
        }
    }

    // 4. Construct Bet Array
    const bets = [];

    if (!state.inRecovery) {
        // Base Level Bets: 2 units on Low (1-18), 1 unit on 3rd 12
        bets.push({ type: 'low', amount: clampBet(2 * unit) });
        bets.push({ type: 'dozen', value: 3, amount: clampBet(1 * unit) });
    } else {
        // Recovery Phase Bets
        const currentLowUnits = state.lowHistory[state.lowHistory.length - 1];
        bets.push({ type: 'low', amount: clampBet(currentLowUnits * unit) });

        if (state.docActive) {
            const currentDocUnits = state.docHistory[state.docHistory.length - 1];
            bets.push({ type: 'dozen', value: 3, amount: clampBet(currentDocUnits * unit) });
        }
    }

    return bets;
}