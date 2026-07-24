/**
 * Legends Unite Strategy
 * Source: Silent Tiger via https://www.youtube.com/watch?v=k-ifov9Nok4 (The Roulette Master)
 * * * The Logic: 
 * A hybrid system combining coverage on the 2nd Dozen, 2nd Column, and a shifting 
 * array of Corner bets. The strategy demands deep capital reserves to withstand 
 * its aggressive progression. Bets are only placed if the $50 profit target is unmet.
 * * * The Progression:
 * - Resets: The progression resets to Level 1 ONLY when a new session high 
 * (high-water mark) is achieved. Partial wins that do not result in a new peak 
 * still cause the progression to advance.
 * - Dozen & Column: Starts at 1x base unit. Increases linearly by exactly +1 base 
 * unit on every progression step (1x, 2x, 3x, 4x...).
 * - Corners:
 * - Level 1: 2 corners at 1x base.
 * - Level 2: 3 corners at 1x base.
 * - Level 3: 4 corners at 2x base.
 * - Level 4: 5 corners at 4x base.
 * - Level 5+: 5 corners, doubling the multiplier every step (8x, 16x, 32x...).
 * * * The Goal:
 * Achieve a session profit of exactly $50 (based on a $2,000 bankroll). 
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (state.startBankroll === undefined) {
        state.startBankroll = bankroll;
        state.highWaterMark = bankroll;
        state.level = 1;
        
        // Define 5 non-overlapping corners to draw from to ensure spread
        // (1 covers col 1-2, 14 covers col 2-3 of middle doz, etc.)
        state.masterCorners = [1, 14, 25, 8, 31];
    }

    // 2. Global Stop-Win Condition ($50 profit target)
    if (bankroll >= state.startBankroll + 50000) {
        return []; 
    }

    // 3. Evaluate Previous Spin & High Water Mark
    if (spinHistory.length > 0) {
        if (bankroll > state.highWaterMark) {
            // New session profit achieved -> Reset everything
            state.highWaterMark = bankroll;
            state.level = 1;
        } else {
            // Loss, or a win that didn't break the high-water mark -> Advance
            state.level++;
        }
    }

    // 4. Calculate Multipliers based on Level
    const outMult = state.level; // Linear increase for Dozen/Column
    
    let activeCorners = 2;
    let cornerMult = 1;

    // Staggered exponential progression for corners
    if (state.level === 1) {
        activeCorners = 2;
        cornerMult = 1;
    } else if (state.level === 2) {
        activeCorners = 3;
        cornerMult = 1;
    } else if (state.level === 3) {
        activeCorners = 4;
        cornerMult = 2;
    } else {
        activeCorners = 5;
        // Level 4 -> 4x, Level 5 -> 8x, Level 6 -> 16x
        cornerMult = Math.pow(2, state.level - 2); 
    }

    // 5. Format and Clamp Bets
    const bets = [];
    const baseInUnit = config.betLimits.min;
    const baseOutUnit = config.betLimits.minOutside;

    // Build 2nd Dozen Bet
    let dozAmount = baseOutUnit * outMult;
    dozAmount = Math.max(dozAmount, config.betLimits.minOutside);
    dozAmount = Math.min(dozAmount, config.betLimits.max);
    bets.push({ type: 'dozen', value: 2, amount: dozAmount });

    // Build 2nd Column Bet
    let colAmount = baseOutUnit * outMult;
    colAmount = Math.max(colAmount, config.betLimits.minOutside);
    colAmount = Math.min(colAmount, config.betLimits.max);
    bets.push({ type: 'column', value: 2, amount: colAmount });

    // Build Corner Bets
    let cornerAmount = baseInUnit * cornerMult;
    cornerAmount = Math.max(cornerAmount, config.betLimits.min);
    cornerAmount = Math.min(cornerAmount, config.betLimits.max);

    // Shuffle the master array so the corners move around randomly each spin, 
    // as requested by the strategy's "moving" nature, while avoiding overlaps.
    const currentCorners = [...state.masterCorners].sort(() => 0.5 - Math.random());

    for (let i = 0; i < activeCorners; i++) {
        bets.push({ 
            type: 'corner', 
            value: currentCorners[i], 
            amount: cornerAmount 
        });
    }

    return bets;
}