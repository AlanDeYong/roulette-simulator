/**
 * Source: https://youtu.be/nR6d0GSljQQ
 * YouTube Channel: The Roulette Master
 * Strategy Name: Corners of Fire (by Steve Unknown - Alternate Corners Variant)
 * 
 * The Full Logic in Details:
 * - Strategy plays 6 corner bets from one of two designated sets:
 *   - Set A: Corners starting at 1, 8, 13, 20, 25, 32
 *   - Set B: Corners starting at 2, 7, 14, 19, 26, 31
 * - Set Selection: Choose randomly between Set A and Set B initially. The selected set 
 *   remains active until a full strategy reset occurs. 
 * - On a WIN: The specific corner that hit is removed ("peeled off") from the active bet set 
 *   for subsequent spins. The remaining active corners advance to the next level amount.
 * - On a LOSS: Currently active corners remain in play and advance in the progression.
 * - RESET Condition: Achieving session profit (current bankroll > starting bankroll) resets 
 *   progression to level 0, restores all 6 corners, and toggles the active corner set to the alternate option.
 * 
 * The Full Bet Progression in Details:
 * - Progression multipliers: [1, 2, 3, 5, 7, 9, 11, 15, 19, 25, 31, 41]
 * - On loss or win-without-session-profit, move to the next level in the progression sequence.
 * - If 2 consecutive wins occur without reaching session profit, freeze progression increases on wins 
 *   and only advance on losses.
 * 
 * The Goal:
 * - Achieve session profit relative to the starting bankroll and reset for repeated cycles.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Defined Corner Sets
    const setA = [1, 8, 13, 20, 25, 32];
    const setB = [2, 7, 14, 19, 26, 31];
    
    // Base bet reduced to 1 unit
    const unit = 1;
    const progressionMultipliers = [1, 2, 3, 5, 7, 9, 11, 15, 19, 25, 31, 41];

    // Helper to get all 4 numbers covered by a corner (top-left number V)
    const getCornerNumbers = (v) => [v, v + 1, v + 3, v + 4];

    // 2. Initialize State
    if (state.sessionStartBankroll === undefined) {
        state.sessionStartBankroll = bankroll;
        state.progressionIndex = 0;
        state.currentSet = Math.random() < 0.5 ? 'A' : 'B';
        state.activeCorners = state.currentSet === 'A' ? [...setA] : [...setB];
        state.consecutiveWins = 0;
    }

    // 3. Process Spin History
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNum = lastSpin.winningNumber;

        // Determine if last spin hit one of our active corners
        let hitCorner = null;
        for (const cornerVal of state.activeCorners) {
            if (getCornerNumbers(cornerVal).includes(winningNum)) {
                hitCorner = cornerVal;
                break;
            }
        }

        // Check for Session Profit (Reset Trigger)
        if (bankroll > state.sessionStartBankroll) {
            state.sessionStartBankroll = bankroll;
            state.progressionIndex = 0;
            state.consecutiveWins = 0;
            
            // Toggle to the other corner set upon full reset
            state.currentSet = state.currentSet === 'A' ? 'B' : 'A';
            state.activeCorners = state.currentSet === 'A' ? [...setA] : [...setB];
        } else if (hitCorner !== null) {
            // WIN: Increment consecutive wins & peel off hit corner
            state.consecutiveWins += 1;
            state.activeCorners = state.activeCorners.filter(c => c !== hitCorner);

            // Restore set if all corners removed to continue logic
            if (state.activeCorners.length === 0) {
                state.activeCorners = state.currentSet === 'A' ? [...setA] : [...setB];
            }

            // Advance progression on win if under 2 consecutive wins
            if (state.consecutiveWins < 2) {
                if (state.progressionIndex < progressionMultipliers.length - 1) {
                    state.progressionIndex += 1;
                }
            }
        } else {
            // LOSS: Reset consecutive wins counter and advance progression
            state.consecutiveWins = 0;
            if (state.progressionIndex < progressionMultipliers.length - 1) {
                state.progressionIndex += 1;
            }
        }
    }

    // Safety fallback
    if (!state.activeCorners || state.activeCorners.length === 0) {
        state.activeCorners = state.currentSet === 'A' ? [...setA] : [...setB];
    }

    // 4. Calculate Bet Amount
    const mult = progressionMultipliers[state.progressionIndex] || 1;
    let betAmount = unit * mult;

    // Clamp to limits
    betAmount = Math.max(betAmount, config.betLimits.min);
    betAmount = Math.min(betAmount, config.betLimits.max);

    // 5. Return Array of Bet Objects
    return state.activeCorners.map(cornerVal => ({
        type: 'corner',
        value: cornerVal,
        amount: betAmount
    }));
}