/**
 * ============================================================================
 * Strategy: The Irish Cash Machine
 * Source:   The Roulette Master (YouTube: https://youtu.be/wTKCr44i5VU)
 * ============================================================================
 * 
 * --- FULL LOGIC IN DETAIL ---
 * The "Irish Cash Machine" is a multi-corner coverage and elimination system sent
 * in by Peter from Ireland. It plays 5 non-overlapping corner bets across the layout,
 * covering 20 out of 37 numbers (~54.05% table coverage on European roulette):
 *   - Corner 2  (covers 2, 3, 5, 6)
 *   - Corner 8  (covers 8, 9, 11, 12)
 *   - Corner 14 (covers 14, 15, 17, 18)
 *   - Corner 20 (covers 20, 21, 23, 24)
 *   - Corner 26 (covers 26, 27, 29, 30)
 * 
 * Elimination Mechanic:
 * - During a session, when any active corner hits and wins:
 *   1. If total session profit reaches or exceeds the target ($250 / 50 units),
 *      the system fully RESETS: restores all 5 corners and resets progression to 1 unit.
 *   2. If session profit is below the target, the winning corner is REMOVED from the layout
 *      ("taken out"), leaving fewer corners on subsequent spins.
 *   3. If all active corners have won and been removed, the session automatically resets.
 * 
 * --- FULL BET PROGRESSION IN DETAIL ---
 * The progression uses a multi-tier unit escalation designed to endure extended drawdowns:
 *   Unit Multipliers: [1, 2, 3, 4, 6, 8, 10, 15, 20, 25]
 *   At a $5 base unit, the amounts per corner are:
 *   $5 -> $10 -> $15 -> $20 -> $30 -> $40 -> $50 -> $75 -> $100 -> $125
 * 
 * - On Loss: Advance to the next index in the progression array. The bet size per corner
 *   increases according to the progression sequence across all currently active corners.
 * - On Win (without hitting target): Remove the winning corner and maintain the current
 *   progression level on the remaining corners for the next spin.
 * - On Reset (target profit reached): Restore all 5 corners and reset progression index to 0.
 * 
 * --- THE GOAL ---
 * - Target Session Profit: $200 - $250 profit per session (default: 50 base units / $250).
 * - Bankroll: $2,000 recommended.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Establish base unit (Inside bet minimum clamped to at least 5 if possible)
    const minInside = config.betLimits.min || 1;
    const maxBet = config.betLimits.max || 500;
    const baseUnit = Math.max(minInside, 5);

    // 2. Multiplier Progression Array (Units)
    const progressionUnits = [1, 2, 3, 4, 6, 8, 10, 15, 20, 25];

    // Standard 5 non-overlapping corners (top-left values)
    const defaultCorners = [2, 8, 14, 20, 26];

    // Helper: Returns array of 4 numbers covered by a corner (top-left number v)
    function getCornerNumbers(cornerValue) {
        return [cornerValue, cornerValue + 1, cornerValue + 3, cornerValue + 4];
    }

    // 3. Initialize State
    if (state.initialBankroll === undefined) {
        state.initialBankroll = bankroll;
        state.progressionIndex = 0;
        state.activeCorners = [...defaultCorners];
        state.targetProfit = 50 * baseUnit; // $250 at $5 base unit
        state.sessionComplete = false;
    }

    // 4. Evaluate Previous Spin Result
    if (spinHistory && spinHistory.length > 0 && state.lastBetPlaced) {
        const lastResult = spinHistory[spinHistory.length - 1];
        const winningNumber = lastResult.winningNumber;
        const currentProfit = bankroll - state.initialBankroll;

        // Check if the winning number was covered by any corner we bet on
        let winningCorner = null;
        for (const cornerVal of state.activeCorners) {
            const numbersCovered = getCornerNumbers(cornerVal);
            if (numbersCovered.includes(winningNumber)) {
                winningCorner = cornerVal;
                break;
            }
        }

        if (winningCorner !== null) {
            // WIN DETECTED
            if (currentProfit >= state.targetProfit) {
                // Session target reached: Reset entire system
                state.progressionIndex = 0;
                state.activeCorners = [...defaultCorners];
                state.initialBankroll = bankroll; // Reset baseline for next session run
            } else {
                // Remove the winning corner from active list ("take that one out")
                state.activeCorners = state.activeCorners.filter(c => c !== winningCorner);

                // If all corners are eliminated or none left, reset
                if (state.activeCorners.length === 0) {
                    state.progressionIndex = 0;
                    state.activeCorners = [...defaultCorners];
                }
                // Keep the progression level unchanged on win without reset
            }
        } else {
            // LOSS DETECTED
            // Step up the progression sequence
            if (state.progressionIndex < progressionUnits.length - 1) {
                state.progressionIndex++;
            }
        }
    }

    // 5. Calculate Bet Amount for each Active Corner
    const unitMultiplier = progressionUnits[state.progressionIndex];
    let cornerBetAmount = baseUnit * unitMultiplier;

    // Respect table limits
    cornerBetAmount = Math.max(cornerBetAmount, minInside);
    cornerBetAmount = Math.min(cornerBetAmount, maxBet);

    // Calculate total bet required
    const totalRequired = cornerBetAmount * state.activeCorners.length;
    if (bankroll < totalRequired) {
        // Insufficient bankroll to place all active corner bets
        return [];
    }

    // 6. Build and Return Corner Bets
    const bets = state.activeCorners.map(cornerVal => ({
        type: 'corner',
        value: cornerVal,
        amount: cornerBetAmount
    }));

    state.lastBetPlaced = true;
    return bets;
}