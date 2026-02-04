/**
 * STRATEGY: The "Sweet Spot" 8-Level System
 * * SOURCE: 
 * Video: "SWEET SPOT - BEST ROULETTE STRATEGY" by Bet With Mo
 * URL: https://www.youtube.com/watch?v=Evzx9D8H0ok
 * * LOGIC:
 * 1. The Strategy aims for session profit by alternating between aggressive Split bets and defensive Street bets.
 * 2. Level 1 (Base): 
 * - Looks at the last winning number.
 * - If Last Number is High (19-36), bet 8 Splits in the Low section (1-18).
 * - If Last Number is Low (1-18) or Zero, bet 8 Splits in the High section (19-36).
 * 3. Levels 2-8 (Recovery):
 * - Triggered by a loss at Level 1.
 * - Switches to "Street" bets (covering 3 numbers each).
 * - The "Fluid" Rule: We bet on 11 out of 12 streets. We ALWAYS skip the street where the ball last landed.
 * * PROGRESSION (Multipliers of Base Unit):
 * - Level 1: 1 unit on 8 Splits.
 * - Level 2: 2 units on 11 Streets.
 * - Level 3: 3 units on 11 Streets.
 * - Level 4: 4 units on 11 Streets.
 * - Level 5: 5 units on 11 Streets.
 * - Level 6: 6 units on 11 Streets.
 * - Level 7: 12 units on 11 Streets (Doubled).
 * - Level 8: 24 units on 11 Streets (High Risk).
 * * GOAL:
 * - Reset to Level 1 immediately upon reaching a new session high in bankroll.
 * - Stop loss logic is implicit in bankroll depletion, but this strategy attempts to recover aggressively.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & CONSTANTS ---
    const MIN_BET = config.betLimits.min || 1;
    const MAX_BET = config.betLimits.max || 500;
    
    // Multipliers for Street bets (Levels 2-8)
    // Index 0 is unused, Index 1 is Level 1 (handled separately)
    const LEVEL_MULTIPLIERS = [0, 0, 2, 3, 4, 5, 6, 12, 24]; 

    // Define Street starting numbers (1, 4, 7... 34)
    const ALL_STREETS = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];

    // Define Split Groups for Level 1
    // Group A (Low side - used when Last Num is High)
    const SPLITS_LOW = [
        [1, 2], [2, 3], [4, 5], [5, 6], 
        [7, 8], [8, 9], [10, 11], [11, 12]
    ];
    // Group B (High side - used when Last Num is Low)
    const SPLITS_HIGH = [
        [19, 20], [20, 21], [22, 23], [23, 24], 
        [25, 26], [26, 27], [28, 29], [29, 30]
    ];

    // --- 2. STATE INITIALIZATION ---
    if (state.level === undefined) state.level = 1;
    if (state.sessionHigh === undefined) state.sessionHigh = bankroll;
    if (state.lastBetAmount === undefined) state.lastBetAmount = 0;

    // --- 3. ANALYZE HISTORY & PROFIT ---
    const lastSpin = spinHistory[spinHistory.length - 1];
    const lastNum = lastSpin ? lastSpin.winningNumber : null;

    // Check for Session Profit to Reset
    // If we are above our highest recorded bankroll, reset to Level 1 (The "Sweet Spot" goal)
    if (bankroll > state.sessionHigh) {
        state.sessionHigh = bankroll;
        state.level = 1;
    } 
    // If we lost the previous round (bankroll went down), progress level
    else if (lastSpin && bankroll < (state.lastBankroll || bankroll)) {
        if (state.level < 8) {
            state.level++;
        } else {
            // Cap at level 8 or reset if busted (Player choice, here we cap to prevent total drain)
            state.level = 8; 
        }
    } 
    // If we won but didn't beat session high (recovering), stay on Level 1 if we were there, 
    // or arguably reset if the recovery was substantial. 
    // The video suggests resetting to L1 as soon as you are "up" or "in profit".
    // For this code: strictly reset only if we beat the session high marker.
    
    // Store current bankroll for next comparison
    state.lastBankroll = bankroll;

    // --- 4. BETTING LOGIC ---
    let bets = [];
    let currentMultiplier = 1;

    // --- LEVEL 1: SPLITS ---
    if (state.level === 1) {
        // Default to Low Splits (betting on 1-12 area) if no history, or if last number was High (19-36)
        let useLowSplits = true; 

        if (lastNum !== null) {
            if (lastNum >= 1 && lastNum <= 18) {
                useLowSplits = false; // Last was Low, so we bet High
            }
        }

        const selectedSplits = useLowSplits ? SPLITS_LOW : SPLITS_HIGH;
        const betAmount = Math.max(MIN_BET, 1); // Level 1 is 1 unit

        // Generate Split Bets
        selectedSplits.forEach(splitPair => {
            bets.push({
                type: 'split',
                value: splitPair,
                amount: betAmount
            });
        });

    } 
    // --- LEVELS 2-8: STREETS ---
    else {
        currentMultiplier = LEVEL_MULTIPLIERS[state.level];
        let betAmount = currentMultiplier * MIN_BET;

        // Clamp to Max Limit
        if (betAmount > MAX_BET) betAmount = MAX_BET;

        // Determine which street to SKIP (The "Fluid" Rule)
        // We skip the street that contains the last winning number.
        let streetToSkip = -1;
        if (lastNum !== null && lastNum !== 0 && lastNum !== '00') {
            // Calculate start of the street for the last number
            // Formula: Math.floor((num - 1) / 3) * 3 + 1
            streetToSkip = Math.floor((lastNum - 1) / 3) * 3 + 1;
        }

        // Place bets on all streets EXCEPT the one to skip
        ALL_STREETS.forEach(streetStart => {
            if (streetStart !== streetToSkip) {
                bets.push({
                    type: 'street',
                    value: streetStart,
                    amount: betAmount
                });
            }
        });
    }

    // --- 5. FINAL CHECKS ---
    // Update state for next turn tracking
    state.lastBetTotal = bets.reduce((sum, b) => sum + b.amount, 0);

    // Stop if bankroll is too low to cover the calculated bets
    if (state.lastBetTotal > bankroll) {
        // Optional: Attempt to place partial bets or just stop
        // Returning empty array stops the simulator usually
        return []; 
    }

    return bets;
}