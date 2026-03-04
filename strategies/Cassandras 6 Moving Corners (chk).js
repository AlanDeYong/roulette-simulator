/**
 * Cassandra's Moving Corners Strategy (6-Corner Perfect Tiling Variant)
 * Source: Derived from The Roulette Master (YouTube) with advanced geometric tiling.
 * * * The Logic: 
 * A roulette board has 12 columns. A corner covers 2. Therefore, exactly 6 
 * non-overlapping corners perfectly tile the entire board. 
 * This strategy pre-generates the perfect 6-corner alternating layout 
 * (lower/upper/lower...) and randomizes the *order* in which they are placed 
 * to ensure space is always reserved and overlaps are mathematically impossible.
 * * * The Progression:
 * - Level 1 (Initial): 3 random corners from the master pattern (1x). Col (1x).
 * - Level 2 (Loss): Add 4th corner. Double corners (2x), Col (2x).
 * - Level 3 (Loss): Add 5th corner. Double corners (4x), Col (3x).
 * - Level 4 (Loss): Add 6th corner (board full). Double corners (8x), Col (4x).
 * - Level 5+ (Loss): Board remains full (6 corners). Double corners (16x+), Col (5x+).
 * - Win Recovery: If bankroll returns within 2 base outside units of the peak,
 * the progression resets to Level 1 and a new master pattern is generated.
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
        state.pattern = null; 
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
            // Else: Win but not near peak -> Rebet (hold state.level)
        } else {
            // Loss -> Advance progression
            state.level++;
        }
    }
    
    // Update bankroll tracker for next spin's evaluation
    state.lastBankroll = bankroll;

    // 5. Generate 6-Corner Perfect Tiling Pattern (if needed)
    if (!state.pattern) {
        const masterSlots = [];
        // Determine starting vertical position (true = lower, false = upper)
        let isLower = Math.random() > 0.5;
        
        // Generate the 6 perfectly alternating, non-overlapping corners
        for (let i = 0; i < 6; i++) {
            // Lower corners start on numbers 1, 7, 13, 19, 25, 31
            // Upper corners start on numbers 2, 8, 14, 20, 26, 32
            masterSlots.push((i * 6) + (isLower ? 1 : 2));
            isLower = !isLower; // Flip for adjacent column
        }
        
        // Shuffle the master slots to randomize the reveal order.
        // The geometric constraints are maintained, but they appear randomly.
        state.pattern = masterSlots.sort(() => 0.5 - Math.random());
    }

    // 6. Calculate Progression Multipliers and Active Corners
    // Cap active corners at 6 (reached at Level 4)
    const activeCorners = Math.min(state.level + 2, 6); 
    
    // Level 1: 1x, Level 2: 2x, Level 3: 4x, Level 4: 8x, Level 5: 16x
    const cornerMult = Math.pow(2, state.level - 1); 
    
    // Level 1: 1x, Level 2: 2x, Level 3: 3x, Level 4: 4x, Level 5: 5x
    const colMult = state.level; 

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