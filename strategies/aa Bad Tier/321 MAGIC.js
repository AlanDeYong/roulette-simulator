/**
 * Strategy: 321 Magic (Bet With Mo)
 * * Source: 
 * Video: "321 MAGIC - ROULETTE STRATEGY WINS SPLIT & STREET BETS"
 * Channel: Bet With Mo
 * URL: https://www.youtube.com/watch?v=8rCpPeh6KmQ
 * * The Logic:
 * This is a "Double Street" attack strategy that uses overlapping bets to maximize 
 * returns on specific numbers while covering adjacent ones.
 * * The "3-2-1" Setup (6 Units Total):
 * 1. 3 Units on a specific Street (e.g., Street 1: numbers 1, 2, 3).
 * 2. 2 Units on a vertical Split involving the middle number of that street (e.g., Split 2|5).
 * 3. 1 Unit on a vertical Split involving the last number of that street (e.g., Split 3|6).
 * * Coverage: 
 * It covers 5 numbers total (1, 2, 3, 5, 6). 
 * - Numbers 2 and 3 are heavily weighted (Street + Split).
 * - Number 1 is covered by Street.
 * - Numbers 5 and 6 are covered by Splits.
 * - Number 4 is the "hole" in this specific configuration.
 * * The Progression (Negative Progression):
 * - On Win: Reset to Level 1. Reset position to start (or chosen logic).
 * - On Loss: Move to the "next" street (shift the pattern down the board) and increase bet level.
 * - Levels (Multipliers of base 6-unit bet):
 * L1: 1x  (Total 6 units)
 * L2: 2x  (Total 12 units)
 * L3: 4x  (Total 24 units)
 * L4: 8x  (Total 48 units)
 * L5: 10x (Total 60 units) - Note: Video deviates from pure doubling here.
 * L6-L8: 15x, 25x, 50x (Extrapolated for safety/high roller).
 * * The Goal:
 * Quick profit scalping using high-coverage overlaps. 
 * Video Result: ~$330 profit in 10 minutes.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & HELPERS ---
    
    // The multiplier sequence derived from the video (levels 1-5) and extrapolated (6-8)
    const PROGRESSION_MULTIPLIERS = [1, 2, 4, 8, 10, 15, 25, 50];
    const MAX_LEVEL = PROGRESSION_MULTIPLIERS.length - 1;

    // Helper to calculate bet amount while respecting table limits
    const calculateAmount = (baseUnits, multiplier) => {
        const unitValue = config.betLimits.min; // Usually 1 or similar for Inside bets
        let rawAmount = unitValue * baseUnits * multiplier;
        // Clamp: Ensure it's at least min (redundant if unitValue=min) and at most max
        return Math.min(Math.max(rawAmount, config.betLimits.min), config.betLimits.max);
    };

    // --- 2. STATE INITIALIZATION ---
    if (state.level === undefined) state.level = 0;
    if (state.streetIndex === undefined) state.streetIndex = 0; // 0 = Street 1 (1-3), 1 = Street 2 (4-6), etc.

    // --- 3. PROCESS LAST SPIN (If applicable) ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        
        // Calculate if we won (Any payout > 0 is a win in this coverage strategy)
        // If we hit the "hole" (e.g., 4) or a completely uncovered number, payout is 0.
        const won = lastSpin.totalPayout > 0;

        if (won) {
            // WIN: Reset progression
            state.level = 0;
            // Optional: Reset position to top (0) or keep cycling? 
            // Video isn't strict, but resetting usually locks in discipline.
            state.streetIndex = 0; 
        } else {
            // LOSS: Increase progression and Move
            if (state.level < MAX_LEVEL) {
                state.level++;
            } else {
                // Optional: Reset if max level exceeded (Stop Loss logic)
                // For this simulation, we will stay at max level or reset. Let's reset to save bankroll.
                state.level = 0; 
            }
            
            // "Place the same bet right next to it" -> Move to next street
            state.streetIndex = (state.streetIndex + 1) % 11; // 11 Streets valid for this pattern (see logic below)
        }
    }

    // --- 4. CALCULATE BETS ---
    
    // We need to determine the numbers based on the current street index.
    // Street Index 0 = Rows 1 (1-3) and Split into Row 2 (4-6).
    // Start Number = (streetIndex * 3) + 1.
    // However, we cannot place this pattern on the very last street (34-36) 
    // because the splits need a row below them. Max index is 10 (Street 31-33).
    
    // Safety wrap if index gets too high
    if (state.streetIndex > 10) state.streetIndex = 0;

    const startNum = (state.streetIndex * 3) + 1; // e.g., 1
    const middleNum = startNum + 1;               // e.g., 2
    const endNum = startNum + 2;                  // e.g., 3
    
    // Numbers for splits (the row below)
    const splitLeft = middleNum + 3;              // e.g., 5
    const splitRight = endNum + 3;                // e.g., 6

    const currentMultiplier = PROGRESSION_MULTIPLIERS[state.level];
    const bets = [];

    // Check Bankroll Safety - rough check if we can afford base unit * 6
    const totalEstCost = calculateAmount(6, currentMultiplier);
    if (totalEstCost > bankroll) {
        // Not enough money, return empty or try to reset
        // console.log("Bankroll too low for strategy");
        return []; 
    }

    // Bet 1: 3 Units on the Street (e.g., 1-3)
    bets.push({
        type: 'street',
        value: startNum, // 'street' bet is usually defined by the first number of the row
        amount: calculateAmount(3, currentMultiplier)
    });

    // Bet 2: 2 Units on Split (Middle | Middle+3) -> e.g., 2|5
    bets.push({
        type: 'split',
        value: [middleNum, splitLeft],
        amount: calculateAmount(2, currentMultiplier)
    });

    // Bet 3: 1 Unit on Split (End | End+3) -> e.g., 3|6
    bets.push({
        type: 'split',
        value: [endNum, splitRight],
        amount: calculateAmount(1, currentMultiplier)
    });

    return bets;
}