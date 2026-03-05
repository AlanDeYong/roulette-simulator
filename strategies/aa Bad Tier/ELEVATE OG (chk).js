/**
 * Strategy: Elevate (Revised Progression)
 * Source: Bet With Mo (https://www.youtube.com/watch?v=JxgrjD2YUL0)
 * * * The Logic:
 * Targets 18 specific numbers across the board using a combination of Streets and Splits. 
 * The coverage zone always remains numbers 4-9, 16-21, and 28-33.
 * * * The Progression:
 * - Level 1 (Base): 1 unit on 6 center streets.
 * - Level 2 (1 Loss): Keep streets, add 1 unit on splits 4/5, 7/8, 16/17, 19/20, 28/29, 31/32.
 * - Level 3 (2 Losses): Keep previous, add 1 unit on splits 5/6, 8/9, 17/18, 20/21, 29/30, 32/33.
 * - Level 4 to 7 (3+ Losses): Double the total bet amount from the previous level.
 * * * The Goal: 
 * Recover losses by increasing chip density on the same target numbers. 
 * A progression reset ONLY occurs if a win results in surpassing the highest recorded bankroll (session profit).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Define Target Placements
    const targetStreets = [4, 7, 16, 19, 28, 31];
    const splitsA = [[4, 5], [7, 8], [16, 17], [19, 20], [28, 29], [31, 32]];
    const splitsB = [[5, 6], [8, 9], [17, 18], [20, 21], [29, 30], [32, 33]];
    
    const baseUnit = config.betLimits.min;

    // 2. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.level = 1;
        state.highWaterMark = bankroll;
    }

    // Update highest bankroll achieved to track "session profit"
    if (bankroll > state.highWaterMark) {
        state.highWaterMark = bankroll;
    }

    // 3. Process Previous Spin
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1].winningNumber;
        
        // Since all splits fall within the target streets, we only need to check street coverage
        let isWin = targetStreets.some(s => lastSpin >= s && lastSpin <= s + 2);

        if (isWin) {
            // Check if session profit is reached
            if (bankroll >= state.highWaterMark) {
                state.level = 1; // Reset progression
            } 
            // If win but still in deficit, we stay at the current level (rebet)
        } else {
            // Loss: Progress to next level
            state.level++;
        }
    }

    // 4. Determine Active Bets & Multiplier based on Level
    let activeBets = [];
    let multiplier = 1;

    // Determine multiplier for Levels 4 and above (doubling up)
    if (state.level >= 4) {
        multiplier = Math.pow(2, state.level - 3); 
    }

    // Calculate clamped bet amount
    let betAmount = baseUnit * multiplier;
    betAmount = Math.max(betAmount, config.betLimits.min);
    betAmount = Math.min(betAmount, config.betLimits.max);

    // Build the bet array based on the current level
    if (state.level >= 1) {
        targetStreets.forEach(val => activeBets.push({ type: 'street', value: val, amount: betAmount }));
    }
    if (state.level >= 2) {
        splitsA.forEach(val => activeBets.push({ type: 'split', value: val, amount: betAmount }));
    }
    if (state.level >= 3) {
        splitsB.forEach(val => activeBets.push({ type: 'split', value: val, amount: betAmount }));
    }

    return activeBets;
}