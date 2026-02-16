/**
 * STRATEGY: Domination 2.0 (8 Levels)
 * * SOURCE:
 * - Video: "DOMINATION 2.0 - ROULETTE STRATEGY | 8 LEVELS EXPLAINED"
 * - Channel: Bet With Mo
 * - URL: https://www.youtube.com/watch?v=yAudJX1xLM0
 * * LOGIC:
 * This is a "Grinder" strategy that focuses on high table coverage to minimize losses
 * and generate frequent small wins or "pushes" (break-even spins).
 * * BET PLACEMENT:
 * - Inside: Specific Corners in the First Dozen (1-12). 
 * - Primarily covers numbers like 1, 2, 4, 5, 8, 9, 11, 12.
 * - Outside: Columns 2 and 3.
 * * PROGRESSION (8 Levels):
 * - The strategy uses a set progression ladder.
 * - WIN (Net Profit): Reset to Level 1.
 * - PUSH (Break Even or No Loss): Repeat the current Level.
 * - LOSS (Net Loss): Move to the next Level.
 * - MAX LEVEL: If Level 8 loses, hard reset to Level 1 (Stop Loss logic).
 * * LEVELS SUMMARY (Approximate based on video):
 * - L1: Corners x1 unit, Cols x2 units
 * - L2: Add 3rd Corner, Cols x4 units
 * - L3: Add 4th Corner, Corners x2 units, Cols x4 units
 * - L4: Corners x3 units, Cols x8 units
 * - ...scaling up to Level 8.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & CONSTANTS ---
    
    // We base "1 unit" on the table minimum.
    const UNIT_INSIDE = config.betLimits.min; 
    const UNIT_OUTSIDE = Math.max(config.betLimits.minOutside, UNIT_INSIDE * 2); // Ensure columns are weighted appropriately

    // Define the 8 Levels of the strategy
    // 'corners': Array of corner starting numbers (e.g., 1 covers 1,2,4,5)
    // 'cornerMult': Multiplier for the inside unit
    // 'colMult': Multiplier for the outside unit
    const STRATEGY_LEVELS = [
        { corners: [1, 8], cornerMult: 1, colMult: 2 },           // Level 1
        { corners: [1, 8, 5], cornerMult: 1, colMult: 4 },        // Level 2 (Adds corner, doubles cols)
        { corners: [1, 8, 5, 2], cornerMult: 2, colMult: 4 },     // Level 3 (Adds corner, doubles inside)
        { corners: [1, 8, 5, 2], cornerMult: 3, colMult: 8 },     // Level 4
        { corners: [1, 8, 5, 2], cornerMult: 6, colMult: 16 },    // Level 5 (Aggressive jump)
        { corners: [1, 8, 5, 2], cornerMult: 12, colMult: 32 },   // Level 6
        { corners: [1, 8, 5, 2], cornerMult: 25, colMult: 60 },   // Level 7 (Video switches to $5 chips)
        { corners: [1, 8, 5, 2], cornerMult: 50, colMult: 120 }   // Level 8 (Max aggression)
    ];

    // --- 2. STATE MANAGEMENT ---

    // Initialize state on first spin
    if (state.currentLevel === undefined) state.currentLevel = 0;
    if (state.lastBankroll === undefined) state.lastBankroll = bankroll;

    // Determine Result of previous spin (if any)
    if (spinHistory.length > 0) {
        const lastProfit = bankroll - state.lastBankroll;

        if (lastProfit > 0) {
            // WIN: Reset to Level 1
            state.currentLevel = 0;
        } else if (lastProfit === 0) {
            // PUSH: Stay on current level
            // No change to state.currentLevel
        } else {
            // LOSS: Increase Level
            state.currentLevel++;
            
            // Safety: If we exceed max level, reset to start to avoid busting entirely
            if (state.currentLevel >= STRATEGY_LEVELS.length) {
                state.currentLevel = 0; 
            }
        }
    }

    // Update bankroll tracking for next spin comparison
    state.lastBankroll = bankroll;

    // --- 3. CONSTRUCT BETS ---

    const currentStrat = STRATEGY_LEVELS[state.currentLevel];
    const bets = [];

    // Helper to safely add bets within limits
    const addBet = (type, value, amount) => {
        // Clamp amount: At least min, at most max
        let finalAmount = amount;
        
        // Specific check for Outside vs Inside minimums
        const limitMin = (['column', 'dozen', 'red', 'black', 'even', 'odd', 'low', 'high'].includes(type)) 
            ? config.betLimits.minOutside 
            : config.betLimits.min;

        finalAmount = Math.max(finalAmount, limitMin);
        finalAmount = Math.min(finalAmount, config.betLimits.max);

        bets.push({ type, value, amount: finalAmount });
    };

    // Place Inside Bets (Corners)
    // The video targets the First Dozen. 
    // Corner 1 covers: 1, 2, 4, 5
    // Corner 8 covers: 8, 9, 11, 12
    // Corner 5 covers: 5, 6, 8, 9
    // Corner 2 covers: 2, 3, 5, 6
    currentStrat.corners.forEach(cornerVal => {
        addBet('corner', cornerVal, UNIT_INSIDE * currentStrat.cornerMult);
    });

    // Place Outside Bets (Columns)
    // Strategy strictly targets Column 2 and Column 3
    addBet('column', 2, UNIT_INSIDE * currentStrat.colMult); // 2nd Column
    addBet('column', 3, UNIT_INSIDE * currentStrat.colMult); // 3rd Column

    return bets;
}