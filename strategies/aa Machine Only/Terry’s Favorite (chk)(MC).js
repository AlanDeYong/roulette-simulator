/**
 * Strategy: Modified Terry’s Favorite Strategy (Staggered Non-Overlapping)
 * 
 * Logic:
 * 1. Base Setup: 6 non-overlapping corners, alternating bottom/top.
 *    - D1: 1 (Bottom), 8 (Top)
 *    - D2: 13 (Bottom), 20 (Top)
 *    - D3: 25 (Bottom), 32 (Top)
 * 2. Reset (Priority): If bankroll >= session peak profit, immediately reset to base.
 *    - Corners are ONLY removed if this peak profit condition is NOT met.
 * 3. Win Logic (If peak profit NOT reached):
 *    - If 3 dozens contain bets: Remove all bets from the winning dozen.
 *    - If 2 dozens contain bets: Remove only the winning corner bet.
 * 4. Progression (Applies to losses AND remaining bets after a win):
 *    - Level 1: Increase bets by +2 units.
 *    - After 4 accumulations at Level 1: Increase bets by +4 units.
 *    - After 3 accumulations at Level 2: Increase bets by +10 units.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    const baseUnit = config.betLimits.min;

    // Helper: Define the staggered, strictly non-overlapping base corners
    const getBaseCorners = () => [
        { value: 1, dozen: 1, amount: baseUnit },  // Bottom: covers 1, 2, 4, 5
        { value: 8, dozen: 1, amount: baseUnit },  // Top: covers 8, 9, 11, 12
        { value: 13, dozen: 2, amount: baseUnit }, // Bottom: covers 13, 14, 16, 17
        { value: 20, dozen: 2, amount: baseUnit }, // Top: covers 20, 21, 23, 24
        { value: 25, dozen: 3, amount: baseUnit }, // Bottom: covers 25, 26, 28, 29
        { value: 32, dozen: 3, amount: baseUnit }  // Top: covers 32, 33, 35, 36
    ];

    // Initialize State on first run
    if (!state.initialized) {
        state.peakProfit = bankroll;
        state.level = 1; 
        state.levelSteps = 0;
        state.activeCorners = getBaseCorners();
        state.initialized = true;
    }

    // Process Results
    if (spinHistory.length > 0) {
        // RESET GATEKEEPER: Check if session peak profit is reached
        if (bankroll >= state.peakProfit) {
            state.peakProfit = bankroll;
            state.level = 1;
            state.levelSteps = 0;
            state.activeCorners = getBaseCorners();
        } else {
            // PEAK NOT REACHED: Apply Win/Loss, Removal, and Progression logic
            const lastSpin = spinHistory[spinHistory.length - 1];
            const winNum = lastSpin.winningNumber;
            
            // Check if any active corner won
            let hitIndex = state.activeCorners.findIndex(c => {
                const nums = [c.value, c.value + 1, c.value + 3, c.value + 4];
                return nums.includes(winNum);
            });

            if (hitIndex !== -1) {
                // WIN LOGIC (Removal only happens here)
                const winningDozen = state.activeCorners[hitIndex].dozen;
                const uniqueDozens = [...new Set(state.activeCorners.map(c => c.dozen))];

                if (uniqueDozens.length === 3) {
                    state.activeCorners = state.activeCorners.filter(c => c.dozen !== winningDozen);
                } else if (uniqueDozens.length === 2) {
                    state.activeCorners.splice(hitIndex, 1);
                }
            } 
            
            // PROGRESSION LOGIC (Applies to all active bets remaining)
            if (state.activeCorners.length > 0) {
                const inc = state.level === 1 ? 2 : (state.level === 2 ? 4 : 10);
                state.activeCorners.forEach(c => c.amount += (inc * baseUnit));
                state.levelSteps++;

                // Level Transition Logic
                if (state.level === 1 && state.levelSteps >= 4) {
                    state.level = 2;
                    state.levelSteps = 0;
                } else if (state.level === 2 && state.levelSteps >= 3) {
                    state.level = 3;
                    state.levelSteps = 0;
                }
            }
        }
    }

    // Construct Bets and Clamp to Limits
    return state.activeCorners.map(c => ({
        type: 'corner',
        value: c.value,
        amount: Math.min(Math.max(c.amount, config.betLimits.min), config.betLimits.max)
    }));
}