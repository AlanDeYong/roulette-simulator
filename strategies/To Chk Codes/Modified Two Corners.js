/**
 * STRATEGY: Modified Two Corners (Dylan Clay Version)
 * * SOURCE: 
 * YouTube Channel: Love4Art420
 * Video URL: https://www.youtube.com/watch?v=FffP-Eb23bQ
 * * THE LOGIC:
 * This strategy is a tiered corner-betting system designed for low bankrolls ($100).
 * It attempts to cover a large portion of the board using corners (inside bets) 
 * and introduces a "Hedge Column" in the second tier to mitigate losses during recovery.
 * * CONFIGURATION:
 * - Unit Size: Based on config.betLimits.min (Inside)
 * - Corners Selected: Specifically chosen from Columns 1 & 2 to avoid overlap with the Hedge Column (Column 3).
 * (e.g., Corner 1 covers 1,2,4,5; Corner 7 covers 7,8,10,11).
 * * THE PROGRESSION (6 Levels total, split into 2 Tiers):
 * * TIER 1 (The Accumulator):
 * - Level 0: 3 Corners (1 unit each). Total Risk: 3 units.
 * - Level 1: 4 Corners (1 unit each). Total Risk: 4 units.
 * - Level 2: 5 Corners (1 unit each). Total Risk: 5 units.
 * -> Rule: Any WIN in Tier 1 resets the progression to Level 0.
 * * TIER 2 (The Recovery with Hedge):
 * - Level 3: 3 Corners (4 units each) + Column 3 Hedge (2 units).
 * - Level 4: 3 Corners (6 units each) + Column 3 Hedge (3 units).
 * - Level 5: 3 Corners (8 units each) + Column 3 Hedge (4 units).
 * -> Rule: The strategy aims to return to the "Session High" bankroll.
 * If a win occurs and Bankroll >= Session High, Reset to Level 0.
 * If a loss occurs, move to next level. 
 * If Level 5 loses, Reset to Level 0 (Stop Loss).
 * * THE GOAL:
 * - Steady accumulation of small wins.
 * - Survive variance using the Column hedge in Tier 2.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & CONSTANTS ---
    const INSIDE_MIN = config.betLimits.min;
    const OUTSIDE_MIN = config.betLimits.minOutside;
    const MAX_BET = config.betLimits.max;

    // Use INSIDE_MIN as the base unit for corners ($1 in video, usually $1 or $2 in sims)
    const UNIT = INSIDE_MIN; 

    // Define Corner sets (Chosen to sit in Col 1&2 to compliment Col 3 hedge)
    // Corner Value is the top-left number.
    const CORNERS = [
        1,  // Covers 1, 2, 4, 5
        7,  // Covers 7, 8, 10, 11
        13, // Covers 13, 14, 16, 17
        19, // Covers 19, 20, 22, 23
        25  // Covers 25, 26, 28, 29
    ];

    // --- 2. STATE INITIALIZATION ---
    if (state.level === undefined) state.level = 0;
    if (state.highWaterMark === undefined) state.highWaterMark = bankroll;
    if (state.lastBankroll === undefined) state.lastBankroll = bankroll;

    // --- 3. PROGRESSION LOGIC ---
    // Only process logic if we have history (not the first spin)
    if (spinHistory.length > 0) {
        const lastWinAmount = bankroll - state.lastBankroll;
        const wonLast = lastWinAmount > 0;

        // Update Session High (High Water Mark)
        if (bankroll > state.highWaterMark) {
            state.highWaterMark = bankroll;
        }

        if (wonLast) {
            // WIN LOGIC
            if (state.level <= 2) {
                // Tier 1 Win: Always reset to base
                state.level = 0;
            } else {
                // Tier 2 Win: Check if we recovered to Session High
                if (bankroll >= state.highWaterMark) {
                    state.level = 0;
                } else {
                    // Partial recovery: In the video, he continues or steps down.
                    // To be safe and adhere to "stress test" survival, 
                    // we repeat the level if not fully recovered, or step down if significantly recovered.
                    // Implementation: If we made profit but aren't at high water mark, step down 1 level.
                    state.level = Math.max(3, state.level - 1);
                }
            }
        } else {
            // LOSS LOGIC
            state.level++;
            // Hard Stop / Reset if we bust the 6th level (Level index 5)
            if (state.level > 5) {
                state.level = 0; 
                // Optional: Reset HighWaterMark here if you want to treat it as a new session
                state.highWaterMark = bankroll; 
            }
        }
    }

    // Update last bankroll for next spin comparison
    state.lastBankroll = bankroll;

    // --- 4. BET CONSTRUCTION ---
    const bets = [];

    // Helper to add clamped bet
    const addBet = (type, value, units) => {
        let amount = units * UNIT;
        
        // Enforce Limits
        if (type === 'corner') {
            amount = Math.max(amount, INSIDE_MIN);
        } else if (type === 'column') {
            // Column hedge might need to scale to meet Outside Min table limits
            // If the calculated hedge is less than table min, we must bump it to table min,
            // but this alters ratio. We try to respect the calculated ratio first.
            // If UNIT * multiplier < OUTSIDE_MIN, we must use OUTSIDE_MIN.
            amount = Math.max(amount, OUTSIDE_MIN);
        }
        
        amount = Math.min(amount, MAX_BET);

        bets.push({ type, value, amount });
    };

    // Level Configurations
    switch (state.level) {
        // --- TIER 1 (Base) ---
        case 0: // 3 Corners @ 1 unit
            addBet('corner', CORNERS[0], 1);
            addBet('corner', CORNERS[1], 1);
            addBet('corner', CORNERS[2], 1);
            break;
        case 1: // 4 Corners @ 1 unit
            addBet('corner', CORNERS[0], 1);
            addBet('corner', CORNERS[1], 1);
            addBet('corner', CORNERS[2], 1);
            addBet('corner', CORNERS[3], 1);
            break;
        case 2: // 5 Corners @ 1 unit
            addBet('corner', CORNERS[0], 1);
            addBet('corner', CORNERS[1], 1);
            addBet('corner', CORNERS[2], 1);
            addBet('corner', CORNERS[3], 1);
            addBet('corner', CORNERS[4], 1);
            break;

        // --- TIER 2 (Recovery + Hedge) ---
        // Note: The video uses Column 3 as hedge because our corners are primarily Left/Middle.
        
        case 3: // 3 Corners @ 4 units + Col 3 @ 2 units
            addBet('corner', CORNERS[0], 4);
            addBet('corner', CORNERS[1], 4);
            addBet('corner', CORNERS[2], 4);
            addBet('column', 3, 2); 
            break;
        case 4: // 3 Corners @ 6 units + Col 3 @ 3 units
            addBet('corner', CORNERS[0], 6);
            addBet('corner', CORNERS[1], 6);
            addBet('corner', CORNERS[2], 6);
            addBet('column', 3, 3);
            break;
        case 5: // 3 Corners @ 8 units + Col 3 @ 4 units
            addBet('corner', CORNERS[0], 8);
            addBet('corner', CORNERS[1], 8);
            addBet('corner', CORNERS[2], 8);
            addBet('column', 3, 4);
            break;
            
        default:
            // Should not happen, but reset safely
            state.level = 0;
            return bet(spinHistory, bankroll, config, state, utils);
    }

    return bets;
}