<<<<<<< HEAD
/**
 * STRATEGY: Eight Street Max
 * * SOURCE:
 * Video: "Build Your Bankroll With This Clever Roulette Strategy"
 * Channel: Casino Matchmaker
 * URL: https://youtu.be/TEXii03iLik?si=JZXxHbb5EKZQq96y
 * * LOGIC:
 * - The strategy bets on "Streets" (rows of 3 numbers).
 * - It starts with 1 Street at 1 Unit.
 * - On LOSS: Add a new unique Street to the bet list.
 * - On WIN: 
 * - If Current Bankroll > All-Time Session High: RESET to 1 Street @ 1 Unit.
 * - If Current Bankroll <= All-Time Session High: REMOVE one street (step down) and adjust bet size.
 * * PROGRESSION (The "Eight Street" Ladder):
 * The bet size per street is determined by the number of streets currently active,
 * roughly following a Fibonacci sequence delayed until the 5th street.
 * * - 1 Street:  1 Unit
 * - 2 Streets: 1 Unit
 * - 3 Streets: 1 Unit
 * - 4 Streets: 1 Unit
 * - 5 Streets: 2 Units
 * - 6 Streets: 3 Units
 * - 7 Streets: 5 Units
 * - 8 Streets: 8 Units (MAX STREETS)
 * * POST-MAX AGGRESSION:
 * If a loss occurs while at 8 Streets, the street count stays at 8, 
 * but the bet per street increases by 10 Units (8 -> 18 -> 28) until a win or bust.
 * * GOAL:
 * Slow, low-volatility bankroll growth. Ideally, stop after a modest 1-5% profit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & CONSTANTS ---
    const MIN_BET = config.betLimits.min; // Unit size for Inside bets
    const MAX_BET = config.betLimits.max;
    
    // Valid street starting numbers (1, 4, 7 ... 34)
    const ALL_STREETS = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];

    // Map: Number of Streets -> Units per Street
    const PROGRESSION_MAP = {
        1: 1, 2: 1, 3: 1, 4: 1,
        5: 2, 6: 3, 7: 5, 8: 8
    };

    // --- 2. STATE INITIALIZATION ---
    if (!state.initialized) {
        state.activeStreets = []; // Array of street start numbers (e.g., [1, 4])
        state.sessionHigh = bankroll; // Track highest bankroll to trigger resets
        state.betPerStreetUnits = 1;  // Current bet size in units
        state.panicMode = 0; // Tracks the +10 increments if we fail at 8 streets
        state.initialized = true;
    }

    // --- 3. HELPER FUNCTIONS ---
    
    // Check if a specific street (startNum) covers the winning number
    const streetWins = (streetStart, winningNumber) => {
        if (winningNumber === 0 || winningNumber === '00') return false;
        return winningNumber >= streetStart && winningNumber < streetStart + 3;
    };

    // Get a random street that isn't currently being bet on
    const getUniqueRandomStreet = (currentStreets) => {
        const available = ALL_STREETS.filter(s => !currentStreets.includes(s));
        if (available.length === 0) return null; // Should not happen with max 8 streets
        const randomIndex = Math.floor(Math.random() * available.length);
        return available[randomIndex];
    };

    // --- 4. PROCESS LAST SPIN (Update Logic) ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastWinNum = lastSpin.winningNumber;

        // Check if we won the last round
        let won = false;
        for (let street of state.activeStreets) {
            if (streetWins(street, lastWinNum)) {
                won = true;
                break;
            }
        }

        if (won) {
            // -- WIN LOGIC --
            
            // Check for Session Profit Reset
            if (bankroll > state.sessionHigh) {
                // RESET
                state.sessionHigh = bankroll;
                state.activeStreets = []; // Will re-pick 1 below
                state.betPerStreetUnits = 1;
                state.panicMode = 0;
            } else {
                // RECOVERY (Step Down)
                // Remove the last added street (LIFO)
                if (state.activeStreets.length > 1) {
                    state.activeStreets.pop();
                }
                
                // If we were in panic mode (post-8 streets), reduce panic
                if (state.panicMode > 0) {
                     // If we win in panic mode, strict rule isn't fully defined, 
                     // but safe play is to drop panic and recalculate based on street count.
                     state.panicMode = 0;
                }

                // Recalculate Unit Size based on new street count
                const count = state.activeStreets.length;
                state.betPerStreetUnits = PROGRESSION_MAP[count] || 1;
            }

        } else {
            // -- LOSS LOGIC --
            
            if (state.activeStreets.length < 8) {
                // Standard Progression: Add a street
                const newStreet = getUniqueRandomStreet(state.activeStreets);
                if (newStreet !== null) {
                    state.activeStreets.push(newStreet);
                }
                
                // Update Unit Size
                const count = state.activeStreets.length;
                state.betPerStreetUnits = PROGRESSION_MAP[count] || 1;
            } else {
                // Maxed out at 8 Streets: "Panic Mode"
                // Video: "If you're on 8, go to 18, then 28..." (+10 units)
                state.panicMode += 10;
                // Base is 8, plus panic increments
                state.betPerStreetUnits = 8 + state.panicMode;
            }
        }
    }

    // --- 5. SETUP NEXT BET ---

    // Initial Start or Post-Reset: Pick 1 random street
    if (state.activeStreets.length === 0) {
        const startStreet = getUniqueRandomStreet([]);
        state.activeStreets.push(startStreet);
        state.betPerStreetUnits = 1;
    }

    // --- 6. CONSTRUCT BET OBJECTS ---
    const bets = [];

    // Calculate actual currency amount
    let amount = state.betPerStreetUnits * MIN_BET;

    // CLAMP LIMITS
    amount = Math.max(amount, MIN_BET);
    amount = Math.min(amount, MAX_BET);

    // Create bet object for each active street
    state.activeStreets.forEach(streetStart => {
        bets.push({
            type: 'street',
            value: streetStart,
            amount: amount
        });
    });

    return bets;
=======
/**
 * STRATEGY: Eight Street Max
 * * SOURCE:
 * Video: "Build Your Bankroll With This Clever Roulette Strategy"
 * Channel: Casino Matchmaker
 * URL: https://youtu.be/TEXii03iLik?si=JZXxHbb5EKZQq96y
 * * LOGIC:
 * - The strategy bets on "Streets" (rows of 3 numbers).
 * - It starts with 1 Street at 1 Unit.
 * - On LOSS: Add a new unique Street to the bet list.
 * - On WIN: 
 * - If Current Bankroll > All-Time Session High: RESET to 1 Street @ 1 Unit.
 * - If Current Bankroll <= All-Time Session High: REMOVE one street (step down) and adjust bet size.
 * * PROGRESSION (The "Eight Street" Ladder):
 * The bet size per street is determined by the number of streets currently active,
 * roughly following a Fibonacci sequence delayed until the 5th street.
 * * - 1 Street:  1 Unit
 * - 2 Streets: 1 Unit
 * - 3 Streets: 1 Unit
 * - 4 Streets: 1 Unit
 * - 5 Streets: 2 Units
 * - 6 Streets: 3 Units
 * - 7 Streets: 5 Units
 * - 8 Streets: 8 Units (MAX STREETS)
 * * POST-MAX AGGRESSION:
 * If a loss occurs while at 8 Streets, the street count stays at 8, 
 * but the bet per street increases by 10 Units (8 -> 18 -> 28) until a win or bust.
 * * GOAL:
 * Slow, low-volatility bankroll growth. Ideally, stop after a modest 1-5% profit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & CONSTANTS ---
    const MIN_BET = config.betLimits.min; // Unit size for Inside bets
    const MAX_BET = config.betLimits.max;
    
    // Valid street starting numbers (1, 4, 7 ... 34)
    const ALL_STREETS = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];

    // Map: Number of Streets -> Units per Street
    const PROGRESSION_MAP = {
        1: 1, 2: 1, 3: 1, 4: 1,
        5: 2, 6: 3, 7: 5, 8: 8
    };

    // --- 2. STATE INITIALIZATION ---
    if (!state.initialized) {
        state.activeStreets = []; // Array of street start numbers (e.g., [1, 4])
        state.sessionHigh = bankroll; // Track highest bankroll to trigger resets
        state.betPerStreetUnits = 1;  // Current bet size in units
        state.panicMode = 0; // Tracks the +10 increments if we fail at 8 streets
        state.initialized = true;
    }

    // --- 3. HELPER FUNCTIONS ---
    
    // Check if a specific street (startNum) covers the winning number
    const streetWins = (streetStart, winningNumber) => {
        if (winningNumber === 0 || winningNumber === '00') return false;
        return winningNumber >= streetStart && winningNumber < streetStart + 3;
    };

    // Get a random street that isn't currently being bet on
    const getUniqueRandomStreet = (currentStreets) => {
        const available = ALL_STREETS.filter(s => !currentStreets.includes(s));
        if (available.length === 0) return null; // Should not happen with max 8 streets
        const randomIndex = Math.floor(Math.random() * available.length);
        return available[randomIndex];
    };

    // --- 4. PROCESS LAST SPIN (Update Logic) ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastWinNum = lastSpin.winningNumber;

        // Check if we won the last round
        let won = false;
        for (let street of state.activeStreets) {
            if (streetWins(street, lastWinNum)) {
                won = true;
                break;
            }
        }

        if (won) {
            // -- WIN LOGIC --
            
            // Check for Session Profit Reset
            if (bankroll > state.sessionHigh) {
                // RESET
                state.sessionHigh = bankroll;
                state.activeStreets = []; // Will re-pick 1 below
                state.betPerStreetUnits = 1;
                state.panicMode = 0;
            } else {
                // RECOVERY (Step Down)
                // Remove the last added street (LIFO)
                if (state.activeStreets.length > 1) {
                    state.activeStreets.pop();
                }
                
                // If we were in panic mode (post-8 streets), reduce panic
                if (state.panicMode > 0) {
                     // If we win in panic mode, strict rule isn't fully defined, 
                     // but safe play is to drop panic and recalculate based on street count.
                     state.panicMode = 0;
                }

                // Recalculate Unit Size based on new street count
                const count = state.activeStreets.length;
                state.betPerStreetUnits = PROGRESSION_MAP[count] || 1;
            }

        } else {
            // -- LOSS LOGIC --
            
            if (state.activeStreets.length < 8) {
                // Standard Progression: Add a street
                const newStreet = getUniqueRandomStreet(state.activeStreets);
                if (newStreet !== null) {
                    state.activeStreets.push(newStreet);
                }
                
                // Update Unit Size
                const count = state.activeStreets.length;
                state.betPerStreetUnits = PROGRESSION_MAP[count] || 1;
            } else {
                // Maxed out at 8 Streets: "Panic Mode"
                // Video: "If you're on 8, go to 18, then 28..." (+10 units)
                state.panicMode += 10;
                // Base is 8, plus panic increments
                state.betPerStreetUnits = 8 + state.panicMode;
            }
        }
    }

    // --- 5. SETUP NEXT BET ---

    // Initial Start or Post-Reset: Pick 1 random street
    if (state.activeStreets.length === 0) {
        const startStreet = getUniqueRandomStreet([]);
        state.activeStreets.push(startStreet);
        state.betPerStreetUnits = 1;
    }

    // --- 6. CONSTRUCT BET OBJECTS ---
    const bets = [];

    // Calculate actual currency amount
    let amount = state.betPerStreetUnits * MIN_BET;

    // CLAMP LIMITS
    amount = Math.max(amount, MIN_BET);
    amount = Math.min(amount, MAX_BET);

    // Create bet object for each active street
    state.activeStreets.forEach(streetStart => {
        bets.push({
            type: 'street',
            value: streetStart,
            amount: amount
        });
    });

    return bets;
>>>>>>> origin/main
}