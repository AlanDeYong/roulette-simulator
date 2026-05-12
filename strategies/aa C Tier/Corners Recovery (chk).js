/**
 * Strategy: Corners Recovery Strategy (Strict Non-Overlap Removal)
 * Source: Junko Bodie - Corners Recovery Strategy: Master Roulette Losing Streaks & Win Smart (Bankroll Management Guide)
 * URL: https://www.youtube.com/watch?v=zz2uFFyOUwY
 *
 * The Logic:
 * The strategy places 12 corner bets covering the left and right sides of the board.
 * MODIFICATION (STRICT): If a winning number falls into multiple active corners 
 * (an overlapping hit), NO corners are removed. A corner is ONLY removed if the 
 * winning number hits that corner and NO OTHER active corners.
 * * The Progression:
 * Bets increase in "sets" of 5 spins to manage bankroll depletion during losing streaks.
 * - Spins 1-5: 1x base unit
 * - Spins 6-10: 2x base unit
 * - Spins 11-15: 4x base unit
 * - Spins 16-20: 5x base unit
 * - Spins 21-25: 10x base unit
 * - Spins 26-30+: 20x base unit
 * * The Goal:
 * Systematically eliminate all 12 corners by hitting their unique, non-overlapping 
 * numbers, targeting a net profit once the board is fully cleared.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 12 specific corners covering the board vertically
    const ALL_CORNERS = [1, 4, 7, 10, 13, 16, 17, 20, 23, 26, 29, 32];

    // Helper to check if a winning number falls within a specific corner bet
    function isNumberInCorner(num, cornerValue) {
        return num === cornerValue || 
               num === cornerValue + 1 || 
               num === cornerValue + 3 || 
               num === cornerValue + 4;
    }

    // 1. Process previous spin and apply STRICT elimination rule
    if (state.activeCorners && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1].winningNumber;
        
        // Find all active corners that contain the winning number
        const matchingCorners = state.activeCorners.filter(corner => isNumberInCorner(lastSpin, corner));
        
        // ONLY remove the corner if exactly ONE active corner caught the number
        if (matchingCorners.length === 1) {
            const cornerToRemove = matchingCorners[0];
            state.activeCorners = state.activeCorners.filter(corner => corner !== cornerToRemove);
        }
    }

    // 2. Initialize or Reset State
    // If we have cleared all corners, or this is the very first spin, reset the board.
    if (!state.activeCorners || state.activeCorners.length === 0) {
        state.activeCorners = [...ALL_CORNERS];
        state.spinsSinceReset = 0;
    }

    // 3. Increment spin counter for the current cycle
    state.spinsSinceReset++;

    // 4. Calculate Progression Multiplier
    // Sequence based on 5-spin blocks
    const multipliers = [1, 2, 4, 5, 10, 20];
    
    let phaseIndex = Math.floor((state.spinsSinceReset - 1) / 5);
    
    // Clamp to the maximum available multiplier if the sequence goes beyond 30 spins
    if (phaseIndex >= multipliers.length) {
        phaseIndex = multipliers.length - 1;
    }
    
    const currentMultiplier = multipliers[phaseIndex];

    // 5. Calculate Bet Amount & Clamp Limits
    let amount = config.betLimits.min * currentMultiplier;
    
    amount = Math.max(amount, config.betLimits.min);
    amount = Math.min(amount, config.betLimits.max);

    // 6. Generate Bets
    const bets = [];
    for (let corner of state.activeCorners) {
        bets.push({
            type: 'corner',
            value: corner,
            amount: amount
        });
    }

    return bets;
}