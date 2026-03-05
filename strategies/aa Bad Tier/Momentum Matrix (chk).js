/**
 * STRATEGY: Momentum Matrix
 * SOURCE: The Roulette Master (YouTube) - https://www.youtube.com/watch?v=ShwaLkddcLY
 * * THE LOGIC: 
 * - Starts by placing equal bets on 6 distinct, non-overlapping corners.
 * - A valid corner bet covers 4 numbers. 
 * * THE PROGRESSION:
 * - WIN: The corner that won is removed from the board. The bet amount on the 
 * remaining active corners is increased by 1 unit (or based on config.incrementMode).
 * - LOSS: All removed corners are immediately added back to the board. The bet amount 
 * for ALL 6 corners is set to the current unit size, and then DOUBLED.
 * - CYCLE COMPLETE: If all corners are successfully removed (6 net wins), the 
 * progression resets to the base unit and all 6 corners.
 * * THE GOAL: 
 * - Capitalize on winning streaks to clear the board ("momentum") while utilizing 
 * an aggressive Martingale-style recovery on losses. Best paired with a strict 
 * stop-win condition (e.g., +200 or +300 units) to prevent catastrophic bankroll depletion.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State on first run or after a cycle reset
    if (!state.initialized) {
        // Top-left numbers of 6 non-overlapping corners
        // Covers: (1,2,4,5), (8,9,11,12), (14,15,17,18), (20,21,23,24), (26,27,29,30), (32,33,35,36)
        state.baseCorners = [1, 8, 14, 20, 26, 32]; 
        state.activeCorners = [...state.baseCorners];
        state.currentUnit = config.betLimits.min;
        state.lastBets = [];
        state.initialized = true;
    }

    // Helper: Get the 4 numbers covered by a corner (given its top-left number)
    const getCornerNumbers = (topLeft) => [topLeft, topLeft + 1, topLeft + 3, topLeft + 4];

    // 2. Evaluate previous spin if history exists
    if (spinHistory.length > 0 && state.lastBets.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        
        let wonLastSpin = false;
        let winningCornerValue = null;

        // Check if the last number hit any of our actively bet corners
        for (let bet of state.lastBets) {
            const coveredNumbers = getCornerNumbers(bet.value);
            if (coveredNumbers.includes(lastNum)) {
                wonLastSpin = true;
                winningCornerValue = bet.value;
                break;
            }
        }

        // 3. Apply Momentum Matrix Progression Logic
        if (wonLastSpin) {
            // Remove the winning corner
            state.activeCorners = state.activeCorners.filter(c => c !== winningCornerValue);

            if (state.activeCorners.length === 0) {
                // Cycle Complete: Reset to base state
                state.activeCorners = [...state.baseCorners];
                state.currentUnit = config.betLimits.min;
            } else {
                // Increase unit for remaining corners
                let increment = config.incrementMode === 'base' ? config.betLimits.min : (config.minIncrementalBet || 1);
                state.currentUnit += increment;
            }
        } else {
            // Loss: Restore all corners and double the bet
            state.activeCorners = [...state.baseCorners];
            state.currentUnit *= 2;
        }
    }

    // 4. Clamp the current unit to table limits
    state.currentUnit = Math.max(state.currentUnit, config.betLimits.min);
    state.currentUnit = Math.min(state.currentUnit, config.betLimits.max);

    // 5. Generate the bet array
    const bets = [];
    for (let cornerVal of state.activeCorners) {
        bets.push({
            type: 'corner',
            value: cornerVal,
            amount: state.currentUnit
        });
    }

    // Save current bets to state so we can evaluate them on the next spin
    state.lastBets = bets;

    return bets;
}