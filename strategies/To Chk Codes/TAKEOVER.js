/**
 * STRATEGY: The Takeover (Bet With Mo)
 * * SOURCE:
 * - Video: "THE TAKEOVER - TOP ROULETTE STRATEGY" (https://www.youtube.com/watch?v=hfFbgt5P1ro)
 * - Channel: Bet With Mo
 * * THE LOGIC:
 * This is a "Board Coverage" strategy that focuses on covering the majority of the table 
 * while heavily weighting specific sectors (The First Dozen and Columns 1 & 2).
 * * 1. Outside Bets:
 * - Column 1
 * - Column 2
 * (This leaves Column 3 as the primary "Gap").
 * * 2. Inside Bets:
 * - Focused on the First Dozen (1-12) to maximize hit frequency or cover gaps.
 * - 1 Corner Bet (e.g., 1, 2, 4, 5)
 * - 1 Split Bet (e.g., 8, 11)
 * * THE PROGRESSION (7 Levels):
 * The strategy uses a 7-step recovery ladder. It is relatively flat for the first 3 levels, 
 * then aggressively doubles to recover losses and generate profit.
 * * - Level 1: 1 Unit Inside, 3 Units Outside.
 * - Level 2: Same as Level 1 (Grind).
 * - Level 3: Same as Level 1 (Grind).
 * - Level 4: Double Bets (The "Money Maker" level).
 * - Level 5: ~4x Base Bets (Video: "Increase inside by $2, Columns by $6").
 * - Level 6: ~8x Base Bets.
 * - Level 7: ~16x Base Bets (The "Hail Mary").
 * * CONDITIONS:
 * - On Win: Reset to Level 1.
 * - On Loss (Miss all bets): Move to next Level.
 * - Stop Loss: If Level 7 loses, reset to 1 (Accept bankroll hit).
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & CONSTANTS ---
    
    // Define the specific bet layout
    // We use a Corner covering 1-2-4-5 and a Split covering 8-11 to focus on First Dozen
    const BET_LAYOUT = {
        columns: [1, 2], // Column 1 and Column 2
        corner: 1,       // Covers 1, 2, 4, 5
        split: [8, 11]   // Covers 8 and 11
    };

    // Define the Progression Multipliers (Approximated from video)
    // Ratios: Inside Unit : Outside Unit
    // L1-L3: 1:3
    // L4:    2:6
    // L5:    4:12
    // L6:    8:24
    // L7:    16:48
    const LEVEL_MULTIPLIERS = [1, 1, 1, 2, 4, 8, 16];

    // --- 2. STATE INITIALIZATION ---
    
    if (state.level === undefined) state.level = 0;
    
    // --- 3. ANALYZE PREVIOUS SPIN (Win/Loss Logic) ---
    
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const number = lastSpin.winningNumber;
        
        // Determine if we won
        let won = false;
        
        // Check Columns (Standard Columns are: 1=[1,4,7...], 2=[2,5,8...], 3=[3,6,9...])
        // Math logic: Col 1 = num % 3 === 1. Col 2 = num % 3 === 2.
        if (number !== 0) { // Zero is always a loss here
            const col = (number - 1) % 3 + 1; // Returns 1, 2, or 3
            if (BET_LAYOUT.columns.includes(col)) won = true;
            
            // Check Corner (1,2,4,5)
            if ([1, 2, 4, 5].includes(number)) won = true;
            
            // Check Split (8, 11)
            if (BET_LAYOUT.split.includes(number)) won = true;
        }

        if (won) {
            // Reset on Win
            state.level = 0;
        } else {
            // Progression on Loss
            state.level++;
            // Cap at Max Level (Reset if we bust the strategy caps)
            if (state.level >= LEVEL_MULTIPLIERS.length) {
                state.level = 0; 
            }
        }
    }

    // --- 4. CALCULATE BET SIZES ---

    const multiplier = LEVEL_MULTIPLIERS[state.level];
    
    // Base Units
    // Inside base unit usually follows table min
    const baseInside = config.betLimits.min; 
    // Outside base unit (Columns) usually higher. In video it's $3 vs $1 inside.
    // We scale this: If min is 1, Outside is 3. If min is 5, Outside is 15.
    const baseOutside = Math.max(config.betLimits.minOutside, config.betLimits.min * 3);

    let amountInside = baseInside * multiplier;
    let amountOutside = baseOutside * multiplier;

    // --- 5. CLAMP TO LIMITS ---
    
    amountInside = Math.min(amountInside, config.betLimits.max);
    amountOutside = Math.min(amountOutside, config.betLimits.max);

    // If bankroll is too low to cover the full spread, we might return null or go all in.
    // For this simulation, we'll try to place bets and let the engine handle insufficiency 
    // or rely on the user to stop.
    
    // --- 6. CONSTRUCT BETS ---
    
    const bets = [];

    // Add Columns
    BET_LAYOUT.columns.forEach(colVal => {
        bets.push({
            type: 'column',
            value: colVal,
            amount: amountOutside
        });
    });

    // Add Inside Bets
    bets.push({
        type: 'corner',
        value: BET_LAYOUT.corner, // Top-left number of the corner
        amount: amountInside
    });

    bets.push({
        type: 'split',
        value: BET_LAYOUT.split, // Array for split
        amount: amountInside
    });

    return bets;
}