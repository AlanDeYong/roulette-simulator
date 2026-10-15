/**
 * Strategy: The Banger
 * Source: https://youtu.be/GelGPKX-4Ng (The Roulette Master)
 * * The Full Logic in details:
 * The strategy covers the 2nd Column and 6 adjacent Corners. The corners are 
 * placed in an alternating "zig-zag" pattern between the top (between Col 2 & 3) 
 * and bottom (between Col 1 & 2) along the table.
 * - The first corner randomly starts either at the top or bottom.
 * - Each subsequent corner along the board alternates to the opposite side.
 * * The Full Bet Progression in details:
 * - Base Bet: 1 unit on the 2nd Column, and 1 unit on each of the 6 active corners.
 * - On a Win (if ANY active bet hits): Do NOT increase bet sizes. Instead, remove 
 * the specific component(s) that won (e.g., if a corner hits, remove that corner; 
 * if the column hits, remove the column bet). Continue spinning with the remaining bets.
 * - On a Loss (no active components hit): Increase the bet amount of all remaining 
 * corners by 2 units, and increase the column bet amount by 1 unit.
 * - Reset: Whenever the bankroll reaches a new high (Session Profit), reset all 
 * bets to the base amounts and restore all components. During reset, the starting 
 * corner position (top/bottom) alternates from whatever it was in the previous cycle.
 * * The Goal:
 * Target profit is any new session high (Session Profit). There is no explicit stop-loss 
 * condition; the progression continues until a new high is hit or the bankroll is depleted.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit
    const unit = config.betLimits.minOutside || 5;
    
    // Determine increments based on config mode
    const cornerIncrement = config.incrementMode === 'fixed' ? (2 * config.minIncrementalBet) : (2 * unit);
    const columnIncrement = config.incrementMode === 'fixed' ? (1 * config.minIncrementalBet) : (1 * unit);

    // Helper to get the 6 alternating corners
    // Top corners are between Col 2 & 3 (starting numbers: 2, 5, 8...)
    // Bottom corners are between Col 1 & 2 (starting numbers: 1, 4, 7...)
    const getCorners = (startTop) => {
        // We place corners on rows 1, 3, 5, 7, 9, 11 to avoid overlap.
        // startTop = true: Top, Bottom, Top, Bottom, Top, Bottom
        // startTop = false: Bottom, Top, Bottom, Top, Bottom, Top
        return startTop 
            ? [2, 7, 14, 19, 26, 31] 
            : [1, 8, 13, 20, 25, 32];
    };

    // 2. Initialize State
    if (state.targetProfit === undefined) {
        state.targetProfit = bankroll;
        state.startTop = Math.random() < 0.5; // Randomly choose start position
        state.activeCorners = getCorners(state.startTop);
        state.activeColumn = true;
        state.cornerBetAmount = unit;
        state.columnBetAmount = unit;
    }

    // 3. Process Last Spin
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;

        // Check if we reached a new session high
        if (bankroll >= state.targetProfit) {
            state.targetProfit = bankroll; // Update high watermark
            
            // Reset progression and alternate the starting corner position
            state.startTop = !state.startTop;
            state.activeCorners = getCorners(state.startTop);
            state.activeColumn = true;
            state.cornerBetAmount = unit;
            state.columnBetAmount = unit;
        } else {
            // In recovery. Evaluate if our active bets hit.
            let won = false;
            
            // Check if column 2 hit
            if (state.activeColumn && num !== 0 && num % 3 === 2) {
                won = true;
                state.activeColumn = false; // Remove winning column bet
            }
            
            // Check if any corner hit
            let cornersToRemove = [];
            for (let c of state.activeCorners) {
                // A corner defined by top-left 'c' covers c, c+1, c+3, c+4
                if ([c, c + 1, c + 3, c + 4].includes(num)) {
                    won = true;
                    cornersToRemove.push(c);
                }
            }
            
            // Remove winning corners
            state.activeCorners = state.activeCorners.filter(c => !cornersToRemove.includes(c));
            
            // Progression updates
            if (!won) {
                // Total loss: increase bet sizes
                state.cornerBetAmount += cornerIncrement;
                state.columnBetAmount += columnIncrement;
            }
            
            // Failsafe: if all bets were cleared but session profit isn't reached yet
            // Restart the pattern where we left off to try to hit session profit
            if (state.activeCorners.length === 0 && !state.activeColumn) {
                state.startTop = !state.startTop;
                state.activeCorners = getCorners(state.startTop);
                state.activeColumn = true;
            }
        }
    }

    // 4. Clamp bet amounts to table limits
    const safeCornerBet = Math.min(
        Math.max(state.cornerBetAmount, config.betLimits.min), 
        config.betLimits.max
    );
    const safeColumnBet = Math.min(
        Math.max(state.columnBetAmount, config.betLimits.minOutside), 
        config.betLimits.max
    );

    // 5. Build and return bets
    let bets = [];
    
    if (state.activeColumn) {
        bets.push({ type: 'column', value: 2, amount: safeColumnBet });
    }
    
    for (let c of state.activeCorners) {
        bets.push({ type: 'corner', value: c, amount: safeCornerBet });
    }

    return bets;
}