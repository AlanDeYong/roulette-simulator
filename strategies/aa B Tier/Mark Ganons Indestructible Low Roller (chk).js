/**
 * Strategy: Mark Ganon's Indestructible Low Roller (Corrected 1:1:2 Ratio)
 * Source: THEROULETTEMASTERTV (https://www.youtube.com/watch?v=YMfW2glzmZs)
 * * * The Logic: 
 * Bets are placed to cover overlapping "Jackpot" numbers using a strict 1:1:2 unit ratio:
 * 1. Double Street (Line) 10-15: 1 Unit
 * 2. Double Street (Line) 22-27: 1 Unit
 * 3. Dozen (2nd Dozen 13-24): 2 Units
 * * * The Progression: 
 * A "High-Water Mark" (highest session bankroll) is tracked. 
 * If a spin occurs and the current bankroll is NOT higher than the historical high-water mark,
 * EVERY bet on the table is increased by its base ratio (Lines +1 unit, Dozen +2 units).
 * * * The Goal: 
 * Continue the 1:1:2 progression until the bankroll hits a new all-time session high.
 * Once a new profit high is reached, all bets instantly reset back to their initial base levels.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine Base Units to strictly enforce the 1:1:2 ratio.
    // We use the inside minimum limit as our foundational "1 Unit".
    const unit = config.betLimits.min; 
    const baseLine = unit;          // 1 Unit
    const baseDozen = unit * 2;     // 2 Units

    // 2. Initialize State on first spin
    if (!state.initialized) {
        state.highestBankroll = bankroll;
        
        // Track current bet amounts for each position at the 1:1:2 ratio
        state.bets = {
            line10: baseLine,
            line22: baseLine,
            dozen2: baseDozen
        };
        state.initialized = true;
        
        return buildBetArray(state.bets, config);
    }

    // 3. Evaluate Session Profit against the High-Water Mark
    if (bankroll > state.highestBankroll) {
        // New high reached: Update high-water mark and reset bets to base levels
        state.highestBankroll = bankroll;
        
        state.bets.line10 = baseLine;
        state.bets.line22 = baseLine;
        state.bets.dozen2 = baseDozen;
    } else {
        // No new high: Increment bets while maintaining the exact 1:1:2 scaling
        let lineIncrement = config.incrementMode === 'base' ? baseLine : config.minIncrementalBet;
        // The dozen must always increment at twice the rate of the lines
        let dozenIncrement = config.incrementMode === 'base' ? baseDozen : config.minIncrementalBet * 2;

        state.bets.line10 += lineIncrement;
        state.bets.line22 += lineIncrement;
        state.bets.dozen2 += dozenIncrement;
    }

    // 4. Return the formatted array, clamping to limits
    return buildBetArray(state.bets, config);
}

/**
 * Helper function to format the output and enforce minimum/maximum table limits
 */
function buildBetArray(currentBets, config) {
    const max = config.betLimits.max;
    const minInside = config.betLimits.min;
    const minOutside = config.betLimits.minOutside;
    
    return [
        { 
            type: 'line', 
            value: 10, 
            // Ensure bet is at least the inside minimum, and at most the table maximum
            amount: Math.min(Math.max(currentBets.line10, minInside), max) 
        },
        { 
            type: 'line', 
            value: 22, 
            amount: Math.min(Math.max(currentBets.line22, minInside), max) 
        },
        { 
            type: 'dozen', 
            value: 2, 
            // Ensure bet is at least the outside minimum, and at most the table maximum
            amount: Math.min(Math.max(currentBets.dozen2, minOutside), max) 
        }
    ];
}