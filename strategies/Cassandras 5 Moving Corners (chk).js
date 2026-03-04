/**
 * Cassandra's Moving Corners Strategy (Corrected)
 * Source: https://www.youtube.com/watch?v=k-ifov9Nok4 (The Roulette Master)
 * * * The Logic: 
 * Places random, strictly non-overlapping corner bets that alternate vertically 
 * ("lower" covering rows 1-2, "upper" covering rows 2-3) from left to right. 
 * A complementary bet is placed on the 2nd column. Bets are evaluated and 
 * placed only if the strict $50 profit target has not been reached.
 * * * The Progression:
 * - Level 1 (Initial): 3 alternating corners at 1x base. 2nd Col at 1x base.
 * - Level 2 (Loss): Add 4th corner. Double all bets (Corners 2x, Col 2x).
 * - Level 3 (Loss): Add 5th corner. Double corners (4x), Col + 1 base unit (3x).
 * - Level 4 (Loss): Double corners (8x), Col + 1 base unit (4x).
 * - Level 5+ (Loss): Double corners (16x+), Col + 1 base unit (5x+).
 * - Win Recovery: If a win puts the bankroll "near" the high-water mark 
 * (defined as within 2 base outside units of the peak), reset to Level 1 
 * and randomize a new corner layout. Otherwise, hold current bets (Rebet).
 * * * The Goal:
 * Achieve a session profit of exactly $50. Once reached, betting ceases.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (state.startBankroll === undefined) {
        state.startBankroll = bankroll;
        state.highWaterMark = bankroll;
        state.lastBankroll = bankroll;
        state.level = 1;
        state.pattern = null; // Will hold the array of 5 corner values
    }

    // 2. Global Stop-Win Condition ($50 profit target)
    if (bankroll >= state.startBankroll + 50000) {
        return []; 
    }

    // 3. Track High Water Mark
    if (bankroll > state.highWaterMark) {
        state.highWaterMark = bankroll;
    }

    // 4. Evaluate Previous Spin
    if (spinHistory.length > 0) {
        const won = bankroll > state.lastBankroll;
        
        if (won) {
            // "Near last peak" defined as within 2 base outside units of peak
            const nearPeakThreshold = state.highWaterMark - (config.betLimits.minOutside * 2);
            
            if (bankroll >= nearPeakThreshold) {
                // Recovered: Reset progression and trigger new layout generation
                state.level = 1;
                state.pattern = null; 
            }
            // Else: Win but not near peak -> Rebet (do nothing to state.level)
        } else {
            // Loss -> Advance progression
            state.level++;
        }
    }
    
    // Update bankroll tracker for next spin's evaluation
    state.lastBankroll = bankroll;

    // 5. Generate Non-Overlapping Alternating Corners (if needed)
    if (!state.pattern) {
        // There are 6 valid horizontal "slots" on a roulette board where 
        // corners can be placed without horizontally overlapping adjacent columns.
        const slots = [0, 1, 2, 3, 4, 5];
        
        // Shuffle and pick 5 unique slots
        slots.sort(() => 0.5 - Math.random());
        const selectedSlots = slots.slice(0, 5).sort((a, b) => a - b);
        
        // Determine starting vertical position (true = lower, false = upper)
        let isLower = Math.random() > 0.5;
        
        state.pattern = selectedSlots.map(slot => {
            // Lower corners start on numbers 1, 7, 13... (slot * 6 + 1)
            // Upper corners start on numbers 2, 8, 14... (slot * 6 + 2)
            const cornerValue = (slot * 6) + (isLower ? 1 : 2);
            
            // Flip for the next adjacent corner to guarantee alternation
            isLower = !isLower; 
            return cornerValue;
        });
    }

    // 6. Calculate Progression Multipliers
    let activeCorners = 3;
    let cornerMult = 1;
    let colMult = 1;

    if (state.level === 1) {
        activeCorners = 3; 
        cornerMult = 1; 
        colMult = 1;
    } else if (state.level === 2) {
        activeCorners = 4; 
        cornerMult = 2; 
        colMult = 2;
    } else {
        activeCorners = 5;
        // Level 3: 4x, Level 4: 8x, Level 5: 16x...
        cornerMult = Math.pow(2, state.level - 1); 
        // Level 3: 3x, Level 4: 4x, Level 5: 5x...
        colMult = state.level; 
    }

    // 7. Format and Clamp Bets
    const bets = [];
    const baseInUnit = config.betLimits.min;
    const baseOutUnit = config.betLimits.minOutside;

    // Build Column Bet
    let colAmount = baseOutUnit * colMult;
    colAmount = Math.max(colAmount, config.betLimits.minOutside);
    colAmount = Math.min(colAmount, config.betLimits.max);
    bets.push({ type: 'column', value: 2, amount: colAmount });

    // Build Corner Bets
    let cornerAmount = baseInUnit * cornerMult;
    cornerAmount = Math.max(cornerAmount, config.betLimits.min);
    cornerAmount = Math.min(cornerAmount, config.betLimits.max);

    for (let i = 0; i < activeCorners; i++) {
        bets.push({ 
            type: 'corner', 
            value: state.pattern[i], 
            amount: cornerAmount 
        });
    }

    return bets;
}