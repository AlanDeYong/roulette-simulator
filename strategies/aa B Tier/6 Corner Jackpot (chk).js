/**
 * Roulette Strategy: Six Corner Jackpot (Non-Overlapping Alternating Layout)
 *
 * Source: Concept adapted from WillVegas, modified for optimal board distribution.
 *
 * The Logic:
 * We place bets on the center column (Column 2) and 6 specific non-overlapping corners.
 * To prevent overlap and alternate "top/left" (Cols 1+2) and "bottom/right" (Cols 2+3) positions, 
 * we divide the board into six horizontal blocks and alternate the corner placement:
 * - Block 1: Corner 1  (Covers 1, 2, 4, 5)       -> Left Side
 * - Block 2: Corner 8  (Covers 8, 9, 11, 12)     -> Right Side
 * - Block 3: Corner 13 (Covers 13, 14, 16, 17)   -> Left Side
 * - Block 4: Corner 20 (Covers 20, 21, 23, 24)   -> Right Side
 * - Block 5: Corner 25 (Covers 25, 26, 28, 29)   -> Left Side
 * - Block 6: Corner 32 (Covers 32, 33, 35, 36)   -> Right Side
 *
 * The Progression:
 * - On a Loss (0, 00, or uncovered outside number): Double the bet level.
 * - On an Outside Win (1, 4, 9, 12, 13, 16, 21, 24, 25, 28, 33, 36): Stay at current bet level.
 * - On a Center Column Win (any number in Col 2): Reset bet level to base.
 *
 * The Goal: Target $100 profit then stop.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Goal: Stop session when $100 profit is reached
    const targetProfit = 100000;
    if (bankroll >= config.startingBankroll + targetProfit) {
        return null; // Halt betting operations
    }

    // 2. Initialize State
    if (!state.level) {
        state.level = 1; 
    }

    // 3. Board Definitions for New Layout
    const centerColumn = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35];
    
    // The specific 12 outside numbers covered by the alternating corners
    const coveredOutside = [1, 4, 9, 12, 13, 16, 21, 24, 25, 28, 33, 36];
    
    // The top-left numbers representing the non-overlapping, alternating corners
    const cornerValues = [1, 8, 13, 20, 25, 32];

    // 4. Evaluate previous spin
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        
        if (centerColumn.includes(lastNum)) {
            // Center column hit triggers a reset
            state.level = 1;
        } else if (coveredOutside.includes(lastNum)) {
            // Covered outside hit triggers a hold (do not increase)
            state.level = state.level; 
        } else {
            // Complete loss triggers a double-up
            state.level *= 2;
        }
    }

    // 5. Calculate Bet Amounts
    const baseCorner = config.betLimits.min; 
    const baseCol = Math.max(config.betLimits.minOutside, baseCorner * 2);

    let cornerAmount = baseCorner * state.level;
    let colAmount = baseCol * state.level;

    // 6. Clamp to Limits
    cornerAmount = Math.min(cornerAmount, config.betLimits.max);
    colAmount = Math.min(colAmount, config.betLimits.max);

    // 7. Build Bet Array
    const bets = [];

    // Center Column bet
    bets.push({ type: 'column', value: 2, amount: colAmount });

    // Alternating Corner bets
    for (let val of cornerValues) {
        bets.push({ type: 'corner', value: val, amount: cornerAmount });
    }

    return bets;
}