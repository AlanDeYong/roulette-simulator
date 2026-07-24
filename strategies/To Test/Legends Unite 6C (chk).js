/**
 * Legends Unite Strategy (6-Corner Perfect Tiling Variant)
 * Source: Derived from Silent Tiger / The Roulette Master (YouTube)
 * * * The Logic: 
 * Combines outside bets (2nd Dozen, 2nd Column) with inside Corner bets. 
 * This variant perfectly tiles the board with 6 non-overlapping corners. 
 * The 6 specific corner positions are pre-calculated to guarantee space, 
 * but their order of placement is randomized.
 * * * The Progression:
 * - Resets: Progressions reset to Level 1 ONLY when a new session peak is reached.
 * - Outside Bets (2nd Dozen & 2nd Col): Increase linearly (+1 base unit) per level.
 * - Corner Bets (Staggered Exponential):
 * - Level 1: 2 random corners at 1x base.
 * - Level 2: 3 random corners at 1x base.
 * - Level 3: 4 random corners at 2x base.
 * - Level 4: 5 random corners at 4x base.
 * - Level 5: 6 random corners (board full) at 8x base.
 * - Level 6+: 6 corners, doubling the multiplier each level (16x, 32x...).
 * * * The Goal:
 * Achieve a session profit of exactly $50. Once reached, betting ceases.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (state.startBankroll === undefined) {
        state.startBankroll = bankroll;
        state.highWaterMark = bankroll;
        state.level = 1;
        
        // Generate the perfect 6-corner alternating layout
        const masterSlots = [];
        let isLower = Math.random() > 0.5;
        
        for (let i = 0; i < 6; i++) {
            // Lower corners start on 1, 7, 13, 19, 25, 31
            // Upper corners start on 2, 8, 14, 20, 26, 32
            masterSlots.push((i * 6) + (isLower ? 1 : 2));
            isLower = !isLower; // Alternate to prevent row clustering
        }
        
        // Randomize the placement order of the generated slots
        state.masterCorners = masterSlots.sort(() => 0.5 - Math.random());
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
            // Loss, or a partial win that didn't break the high-water mark -> Advance
            state.level++;
        }
    }

    // 4. Calculate Multipliers based on Level
    const outMult = state.level; // Linear increase for Dozen/Column (1x, 2x, 3x...)
    
    // Cap active corners at 6 (reached at Level 5)
    const activeCorners = Math.min(state.level + 1, 6);
    
    let cornerMult = 1;
    if (state.level > 2) {
        // Level 3 -> 2x, Level 4 -> 4x, Level 5 -> 8x, Level 6 -> 16x...
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

    // Shuffle current active corners slightly each spin to keep them "moving" 
    // without ever overlapping or adding new arbitrary numbers.
    const currentCorners = state.masterCorners.slice(0, activeCorners).sort(() => 0.5 - Math.random());

    for (let i = 0; i < activeCorners; i++) {
        bets.push({ 
            type: 'corner', 
            value: currentCorners[i], 
            amount: cornerAmount 
        });
    }

    return bets;
}