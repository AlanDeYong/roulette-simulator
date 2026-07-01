/**
 * Sunflowers Roulette Strategy
 * 
 * Source: Gamblers University (https://www.youtube.com/watch?v=0CNkXiYi8Mk)
 * 
 * The Full Logic in details:
 * This is a coverage-building strategy based on specific 4-number "blocks" on the middle and top rows.
 * Each block targets a 6-number double street, the 4-number corner inside it, and the 4 individual straight-up numbers.
 * The strategy uses 4 distinct blocks spaced across the board:
 * - Block 1: Double Street 1-6, Corner 2-6, Numbers 2,3,5,6
 * - Block 2: Double Street 10-15, Corner 11-15, Numbers 11,12,14,15
 * - Block 3: Double Street 19-24, Corner 20-24, Numbers 20,21,23,24
 * - Block 4: Double Street 28-33, Corner 29-33, Numbers 29,30,32,33
 * 
 * The strategy tracks the "Session High" bankroll.
 * If a spin is a "Total Loss" (the winning number is not covered by any active bet), the progression level increases.
 * If a spin hits ANY covered number (a win, or a "minor loss" where the line hits but straight-ups miss), the level stays the same.
 * If the bankroll reaches or exceeds the Session High, the progression completely resets.
 * 
 * The Full Bet Progression in details:
 * Base units: 1 unit for Straight Up, 1 unit for Corner, 3 units for Double Street (Line).
 * - Level 1: Bet Block 1.
 * - Level 2: Bet Blocks 1, 2.
 * - Level 3: Bet Blocks 1, 2, 3.
 * - Level 4: Bet Blocks 1, 2, 3, 4.
 * - Level 5+: All 4 blocks remain active. For every level beyond 4, add 3 units to ALL Double Streets and 1 unit to ALL Corners. Straight-up bets always remain at 1 unit.
 * 
 * The Goal:
 * Safely build coverage to absorb variance, catch winning clusters, and hit new session bankroll highs (the video targets a $+100 session profit).
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Define the 4 Sunflowers blocks
    // ds = Double Street (Line) starting number
    // c = Corner top-left starting number
    // su = Straight up numbers
    const blocks = [
        { ds: 1,  c: 2,  su: [2, 3, 5, 6] },
        { ds: 10, c: 11, su: [11, 12, 14, 15] },
        { ds: 19, c: 20, su: [20, 21, 23, 24] },
        { ds: 28, c: 29, su: [29, 30, 32, 33] }
    ];

    // 2. Initialize State
    if (state.level === undefined) {
        state.level = 1;
        state.sessionHigh = bankroll;
    }

    // 3. Update Progression Based on History
    if (spinHistory.length > 0) {
        // If we hit a new session high (or broke even), reset progression
        if (bankroll >= state.sessionHigh) {
            state.sessionHigh = bankroll;
            state.level = 1;
        } else {
            // Check if the last spin was a Total Loss
            const lastSpin = spinHistory[spinHistory.length - 1].winningNumber;
            let wasCovered = false;
            
            const activeBlocksCount = Math.min(state.level, 4);
            for (let i = 0; i < activeBlocksCount; i++) {
                const b = blocks[i];
                // A block spans 6 numbers starting from b.ds (e.g., 1 to 6)
                // If the number falls in any active double street, it is covered
                if (lastSpin >= b.ds && lastSpin <= b.ds + 5) {
                    wasCovered = true;
                    break;
                }
            }

            // Only advance the progression level on a Total Loss (no numbers hit)
            if (!wasCovered) {
                state.level++;
            }
        }
    }

    // 4. Calculate Bet Amounts
    const u = config.betLimits.min; 
    let bets = [];
    
    const activeBlocksCount = Math.min(state.level, 4);
    
    // For levels > 4, we increase the corner and double street bets
    const progStep = Math.max(0, state.level - 4);

    for (let i = 0; i < activeBlocksCount; i++) {
        const b = blocks[i];
        
        // Straight Up Bets (Always 1 unit)
        b.su.forEach(num => {
            bets.push({ 
                type: 'number', 
                value: num, 
                amount: u 
            });
        });
        
        // Corner Bet (Starts at 1 unit, adds 1 unit per progression step)
        let cornerAmount = (1 + progStep) * u;
        cornerAmount = Math.min(cornerAmount, config.betLimits.max); // Clamp to max
        
        bets.push({ 
            type: 'corner', 
            value: b.c, 
            amount: cornerAmount 
        });
        
        // Double Street / Line Bet (Starts at 3 units, adds 3 units per progression step)
        let lineAmount = (3 + (progStep * 3)) * u;
        lineAmount = Math.min(lineAmount, config.betLimits.max); // Clamp to max
        
        bets.push({ 
            type: 'line', 
            value: b.ds, 
            amount: lineAmount 
        });
    }

    // 5. Return Bets
    return bets;
}