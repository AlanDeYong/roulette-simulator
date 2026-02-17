<<<<<<< HEAD
/**
 * Strategy: Daryl's Street-Based Exclusion Strategy
 * Source: The Roulette Master (YouTube) - https://www.youtube.com/watch?v=TC3gqxo6Au0 (Starts around 22:50)
 * * The Logic:
 * 1. Identify the "Last 3" unique streets that have hit.
 * - A "Street" is a row of 3 numbers (e.g., 1-2-3, 4-5-6).
 * - Look back in history to find 3 DISTINCT streets that recently won.
 * 2. EXCLUDE those 3 streets from your betting.
 * 3. BET on the remaining 9 streets (covering 27 numbers).
 * * The Progression (Recovery):
 * - Triggers on Session Profit (High Water Mark).
 * - BASE UNIT: Typically minOutside (e.g., $5).
 * * - WIN (New High): 
 * - If Bankroll > High Water Mark: RESET. 
 * - Update High Water Mark.
 * - Clear old bets. 
 * - Identify NEW 3 streets to exclude based on most recent history.
 * - Reset bet size to Base Unit.
 * * - WIN (Recovery):
 * - If Bankroll <= High Water Mark: REPEAT.
 * - Keep the SAME excluded streets.
 * - Keep the SAME bet size.
 * - Continue grinding until High Water Mark is breached.
 * * - LOSS:
 * - Stay on the SAME streets.
 * - INCREASE bet size by 1 Unit per street (e.g., $5 -> $10).
 * * The Goal:
 * - Reach a new high in bankroll ("Session Profit"), then reset and pick new numbers.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Helper: Determine Street Start Number (1, 4, 7... 34)
    // Returns null for 0 or 00
    const getStreetStart = (num) => {
        if (num === '0' || num === '00' || num === 0) return null;
        // Formula: floor((n-1)/3) * 3 + 1
        // e.g. 5 -> floor(1.33) -> 1 * 3 + 1 = 4
        return Math.floor((num - 1) / 3) * 3 + 1;
    };

    // 2. Constants & Setup
    const ALL_STREETS = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];
    const BASE_UNIT = config.betLimits.minOutside || 5; 
    
    // Initialize State
    if (!state.initialized) {
        state.highWaterMark = config.startingBankroll; // Track highest bankroll
        state.currentUnit = BASE_UNIT;
        state.targetStreets = []; // The 9 streets we are betting on
        state.active = false;     // Are we currently in a betting sequence?
        state.initialized = true;
    }

    // 3. Logic: Determine if we need to pick new numbers (Reset)
    // We reset if:
    // a. We are not active yet (start of game)
    // b. We just hit a new High Water Mark (Session Profit)
    
    // Check for New High Water Mark
    let hitNewHigh = false;
    if (bankroll > state.highWaterMark) {
        state.highWaterMark = bankroll;
        hitNewHigh = true;
    }

    // Process previous result to handle progression (Loss = Increase Unit)
    if (spinHistory.length > 0 && state.active) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        
        // Did we win? Check if last number is in our target streets
        // A street bet on '4' covers 4, 5, 6.
        const winningStreetStart = getStreetStart(lastNum);
        const won = state.targetStreets.includes(winningStreetStart);

        if (won) {
            if (hitNewHigh) {
                // RESET Condition: Win + New High
                state.currentUnit = BASE_UNIT;
                state.active = false; // Flag to recalculate streets below
            } else {
                // RECOVERY WIN: Win but not new high
                // Keep same unit, same streets. Do nothing here.
            }
        } else {
            // LOSS Condition:
            // Increase unit by 1 base unit
            state.currentUnit += BASE_UNIT;
            // Keep same streets (state.active remains true)
        }
    }

    // 4. Activate / Recalculate Streets if needed
    // If not active (start of game OR just reset), try to find 3 unique streets to exclude
    if (!state.active) {
        const uniqueStreetsFound = new Set();
        
        // Look backwards through history to find 3 DISTINCT streets
        for (let i = spinHistory.length - 1; i >= 0; i--) {
            const num = spinHistory[i].winningNumber;
            const street = getStreetStart(num);
            
            if (street !== null) {
                uniqueStreetsFound.add(street);
            }
            if (uniqueStreetsFound.size >= 3) break;
        }

        // Only start betting if we have identified 3 unique streets to exclude
        if (uniqueStreetsFound.size === 3) {
            const excluded = Array.from(uniqueStreetsFound);
            
            // Target = All Streets minus Excluded
            state.targetStreets = ALL_STREETS.filter(s => !excluded.includes(s));
            state.active = true;
            state.currentUnit = BASE_UNIT; // Ensure we start fresh
        } else {
            // Not enough history to start yet
            return [];
        }
    }

    // 5. Apply Limits
    let finalAmount = state.currentUnit;
    finalAmount = Math.max(finalAmount, config.betLimits.minOutside);
    finalAmount = Math.min(finalAmount, config.betLimits.max);

    // 6. Check Bankroll
    // We need to place 9 bets.
    const totalNeeded = finalAmount * 9;
    if (bankroll < totalNeeded) {
        // Not enough money to place full spread. Return empty to stop or avoid partial bets.
        return [];
    }

    // 7. Generate Bet Objects
    return state.targetStreets.map(streetStart => {
        return {
            type: 'street',
            value: streetStart,
            amount: finalAmount
        };
    });
=======
/**
 * Strategy: Daryl's Street-Based Exclusion Strategy
 * Source: The Roulette Master (YouTube) - https://www.youtube.com/watch?v=TC3gqxo6Au0 (Starts around 22:50)
 * * The Logic:
 * 1. Identify the "Last 3" unique streets that have hit.
 * - A "Street" is a row of 3 numbers (e.g., 1-2-3, 4-5-6).
 * - Look back in history to find 3 DISTINCT streets that recently won.
 * 2. EXCLUDE those 3 streets from your betting.
 * 3. BET on the remaining 9 streets (covering 27 numbers).
 * * The Progression (Recovery):
 * - Triggers on Session Profit (High Water Mark).
 * - BASE UNIT: Typically minOutside (e.g., $5).
 * * - WIN (New High): 
 * - If Bankroll > High Water Mark: RESET. 
 * - Update High Water Mark.
 * - Clear old bets. 
 * - Identify NEW 3 streets to exclude based on most recent history.
 * - Reset bet size to Base Unit.
 * * - WIN (Recovery):
 * - If Bankroll <= High Water Mark: REPEAT.
 * - Keep the SAME excluded streets.
 * - Keep the SAME bet size.
 * - Continue grinding until High Water Mark is breached.
 * * - LOSS:
 * - Stay on the SAME streets.
 * - INCREASE bet size by 1 Unit per street (e.g., $5 -> $10).
 * * The Goal:
 * - Reach a new high in bankroll ("Session Profit"), then reset and pick new numbers.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Helper: Determine Street Start Number (1, 4, 7... 34)
    // Returns null for 0 or 00
    const getStreetStart = (num) => {
        if (num === '0' || num === '00' || num === 0) return null;
        // Formula: floor((n-1)/3) * 3 + 1
        // e.g. 5 -> floor(1.33) -> 1 * 3 + 1 = 4
        return Math.floor((num - 1) / 3) * 3 + 1;
    };

    // 2. Constants & Setup
    const ALL_STREETS = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];
    const BASE_UNIT = config.betLimits.minOutside || 5; 
    
    // Initialize State
    if (!state.initialized) {
        state.highWaterMark = config.startingBankroll; // Track highest bankroll
        state.currentUnit = BASE_UNIT;
        state.targetStreets = []; // The 9 streets we are betting on
        state.active = false;     // Are we currently in a betting sequence?
        state.initialized = true;
    }

    // 3. Logic: Determine if we need to pick new numbers (Reset)
    // We reset if:
    // a. We are not active yet (start of game)
    // b. We just hit a new High Water Mark (Session Profit)
    
    // Check for New High Water Mark
    let hitNewHigh = false;
    if (bankroll > state.highWaterMark) {
        state.highWaterMark = bankroll;
        hitNewHigh = true;
    }

    // Process previous result to handle progression (Loss = Increase Unit)
    if (spinHistory.length > 0 && state.active) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        
        // Did we win? Check if last number is in our target streets
        // A street bet on '4' covers 4, 5, 6.
        const winningStreetStart = getStreetStart(lastNum);
        const won = state.targetStreets.includes(winningStreetStart);

        if (won) {
            if (hitNewHigh) {
                // RESET Condition: Win + New High
                state.currentUnit = BASE_UNIT;
                state.active = false; // Flag to recalculate streets below
            } else {
                // RECOVERY WIN: Win but not new high
                // Keep same unit, same streets. Do nothing here.
            }
        } else {
            // LOSS Condition:
            // Increase unit by 1 base unit
            state.currentUnit += BASE_UNIT;
            // Keep same streets (state.active remains true)
        }
    }

    // 4. Activate / Recalculate Streets if needed
    // If not active (start of game OR just reset), try to find 3 unique streets to exclude
    if (!state.active) {
        const uniqueStreetsFound = new Set();
        
        // Look backwards through history to find 3 DISTINCT streets
        for (let i = spinHistory.length - 1; i >= 0; i--) {
            const num = spinHistory[i].winningNumber;
            const street = getStreetStart(num);
            
            if (street !== null) {
                uniqueStreetsFound.add(street);
            }
            if (uniqueStreetsFound.size >= 3) break;
        }

        // Only start betting if we have identified 3 unique streets to exclude
        if (uniqueStreetsFound.size === 3) {
            const excluded = Array.from(uniqueStreetsFound);
            
            // Target = All Streets minus Excluded
            state.targetStreets = ALL_STREETS.filter(s => !excluded.includes(s));
            state.active = true;
            state.currentUnit = BASE_UNIT; // Ensure we start fresh
        } else {
            // Not enough history to start yet
            return [];
        }
    }

    // 5. Apply Limits
    let finalAmount = state.currentUnit;
    finalAmount = Math.max(finalAmount, config.betLimits.minOutside);
    finalAmount = Math.min(finalAmount, config.betLimits.max);

    // 6. Check Bankroll
    // We need to place 9 bets.
    const totalNeeded = finalAmount * 9;
    if (bankroll < totalNeeded) {
        // Not enough money to place full spread. Return empty to stop or avoid partial bets.
        return [];
    }

    // 7. Generate Bet Objects
    return state.targetStreets.map(streetStart => {
        return {
            type: 'street',
            value: streetStart,
            amount: finalAmount
        };
    });
>>>>>>> origin/main
}