<<<<<<< HEAD
/**
 * STRATEGY: The "Vegas Special" (Recovery & Profit Variant)
 * * SOURCE: 
 * Channel: Stacking Chips
 * Video: "From $0 to Hero: Ultimate Roulette Recovery" (https://www.youtube.com/watch?v=ZWAkJtiUY-I)
 * * LOGIC:
 * This is a 4-Level aggressive recovery strategy that targets specific sectors of the board
 * using a combination of Splits, Streets, and Straight-up bets.
 * * 1.  **Sets**: The strategy alternates between two sets of numbers ("Sides") to chase wheel patterns.
 * - Set A (High/Right bias): Focuses on the 8-11-13-17-20-26-29-31 clusters.
 * - Set B (Low/Left bias): Focuses on the 4-5-8-14-16-23-26-32 clusters.
 * * 2.  **The Progression (4 Levels)**:
 * - **Level 1**: Base bet. 7 specific Splits. (Low risk, checking for streaks).
 * - **Level 2**: Adds coverage. Repeats Level 1 + adds 2 units on relevant Streets.
 * - **Level 3**: "The Juice". Repeats Level 2 + adds 1 unit Straight-up on key numbers.
 * - **Level 4**: "Recovery/Push". Doubles the unit size of Level 3.
 * * 3.  **Insurance**:
 * - A small bet is always placed on '0' (and optionally '00' if US table) to prevent a total wipeout on Green.
 * * 4.  **Triggers & Bankroll Management**:
 * - **Win**: Reset to Level 1 and SWITCH SIDES (Set A <-> Set B).
 * - **Loss**: Move up one level.
 * - **Hard Stop**: If Level 4 loses, the strategy accepts the loss and resets to Level 1 (to prevent total bankruptcy, as seen in the video where he dips to $90).
 * - **Profit Taking**: The strategy aims to double the bankroll.
 * * NOTE: This strategy relies on "hitting a clump". It is high variance.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & CONSTANTS ---
    const MIN_CHIP = config.betLimits.min; // Usually $1 or $5
    const MAX_BET = config.betLimits.max;

    // Define the two "Sides" of board coverage (Splits and associated Streets)
    const STRATEGY_SETS = {
        A: {
            splits: [
                [8, 11], [10, 11], [10, 13], [17, 20], [26, 29], [28, 29], [28, 31]
            ],
            streets: [7, 10, 16, 25, 28], // Start numbers of rows
            straightUps: [8, 11, 13, 17, 20, 26, 29, 31] // Key numbers for Level 3
        },
        B: {
            splits: [
                [5, 8], [4, 5], [11, 14], [16, 19], [23, 26], [25, 26], [32, 35]
            ],
            streets: [4, 13, 22, 25, 34],
            straightUps: [5, 8, 14, 16, 23, 26, 32, 35]
        }
    };

    // --- 2. STATE INITIALIZATION ---
    if (!state.initialized) {
        state.level = 1;           // Start at Level 1
        state.currentSet = 'A';    // Start with Side A
        state.lastBankroll = bankroll;
        state.initialized = true;
    }

    // --- 3. PROGRESSION LOGIC ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastWinAmount = lastSpin.winAmount || 0; // Assuming simulator provides this, otherwise calc from bankroll diff
        const wonLastSpin = bankroll > state.lastBankroll;

        if (wonLastSpin) {
            // WIN: Reset and Switch Sides
            state.level = 1;
            state.currentSet = (state.currentSet === 'A') ? 'B' : 'A';
        } else {
            // LOSS: Progress
            if (state.level < 4) {
                state.level++;
            } else {
                // Hard Stop after Level 4 loss (Video logic: "revert back to level 1 just for bankroll")
                state.level = 1;
            }
        }
    }

    // Update bankroll tracking for next spin
    state.lastBankroll = bankroll;

    // --- 4. BET CONSTRUCTION ---
    const bets = [];
    const activeData = STRATEGY_SETS[state.currentSet];
    
    // Determine Unit Size based on Level (Level 4 doubles the base unit)
    // We stick to MIN_CHIP for levels 1-3 to maximize longevity, double it for 4.
    const baseUnit = (state.level === 4) ? MIN_CHIP * 2 : MIN_CHIP;

    // Helper to safely add bets within limits
    const addBet = (type, value, amount) => {
        // Clamp amount between min and max
        let finalAmount = amount;
        if (finalAmount < config.betLimits.min) finalAmount = config.betLimits.min;
        if (finalAmount > config.betLimits.max) finalAmount = config.betLimits.max;
        
        bets.push({ type, value, amount: finalAmount });
    };

    // LEVEL 1: Splits (The Foundation)
    // 7 Splits @ 1 Unit
    activeData.splits.forEach(splitPair => {
        addBet('split', splitPair, baseUnit);
    });

    // LEVEL 2: Streets (The Coverage)
    // Add Streets @ 2 Units
    if (state.level >= 2) {
        activeData.streets.forEach(streetStart => {
            addBet('street', streetStart, baseUnit * 2);
        });
    }

    // LEVEL 3: Straight Ups (The Juice)
    // Add Straights @ 1 Unit
    if (state.level >= 3) {
        activeData.straightUps.forEach(num => {
            addBet('number', num, baseUnit);
        });
    }

    // INSURANCE (Always active)
    // 1 Unit on Green (0). If specific table has 00, adding a basket or straight up on 00 is wise, 
    // but we stick to 0 for standard compatibility.
    addBet('number', 0, baseUnit);

    return bets;
=======
/**
 * STRATEGY: The "Vegas Special" (Recovery & Profit Variant)
 * * SOURCE: 
 * Channel: Stacking Chips
 * Video: "From $0 to Hero: Ultimate Roulette Recovery" (https://www.youtube.com/watch?v=ZWAkJtiUY-I)
 * * LOGIC:
 * This is a 4-Level aggressive recovery strategy that targets specific sectors of the board
 * using a combination of Splits, Streets, and Straight-up bets.
 * * 1.  **Sets**: The strategy alternates between two sets of numbers ("Sides") to chase wheel patterns.
 * - Set A (High/Right bias): Focuses on the 8-11-13-17-20-26-29-31 clusters.
 * - Set B (Low/Left bias): Focuses on the 4-5-8-14-16-23-26-32 clusters.
 * * 2.  **The Progression (4 Levels)**:
 * - **Level 1**: Base bet. 7 specific Splits. (Low risk, checking for streaks).
 * - **Level 2**: Adds coverage. Repeats Level 1 + adds 2 units on relevant Streets.
 * - **Level 3**: "The Juice". Repeats Level 2 + adds 1 unit Straight-up on key numbers.
 * - **Level 4**: "Recovery/Push". Doubles the unit size of Level 3.
 * * 3.  **Insurance**:
 * - A small bet is always placed on '0' (and optionally '00' if US table) to prevent a total wipeout on Green.
 * * 4.  **Triggers & Bankroll Management**:
 * - **Win**: Reset to Level 1 and SWITCH SIDES (Set A <-> Set B).
 * - **Loss**: Move up one level.
 * - **Hard Stop**: If Level 4 loses, the strategy accepts the loss and resets to Level 1 (to prevent total bankruptcy, as seen in the video where he dips to $90).
 * - **Profit Taking**: The strategy aims to double the bankroll.
 * * NOTE: This strategy relies on "hitting a clump". It is high variance.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & CONSTANTS ---
    const MIN_CHIP = config.betLimits.min; // Usually $1 or $5
    const MAX_BET = config.betLimits.max;

    // Define the two "Sides" of board coverage (Splits and associated Streets)
    const STRATEGY_SETS = {
        A: {
            splits: [
                [8, 11], [10, 11], [10, 13], [17, 20], [26, 29], [28, 29], [28, 31]
            ],
            streets: [7, 10, 16, 25, 28], // Start numbers of rows
            straightUps: [8, 11, 13, 17, 20, 26, 29, 31] // Key numbers for Level 3
        },
        B: {
            splits: [
                [5, 8], [4, 5], [11, 14], [16, 19], [23, 26], [25, 26], [32, 35]
            ],
            streets: [4, 13, 22, 25, 34],
            straightUps: [5, 8, 14, 16, 23, 26, 32, 35]
        }
    };

    // --- 2. STATE INITIALIZATION ---
    if (!state.initialized) {
        state.level = 1;           // Start at Level 1
        state.currentSet = 'A';    // Start with Side A
        state.lastBankroll = bankroll;
        state.initialized = true;
    }

    // --- 3. PROGRESSION LOGIC ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastWinAmount = lastSpin.winAmount || 0; // Assuming simulator provides this, otherwise calc from bankroll diff
        const wonLastSpin = bankroll > state.lastBankroll;

        if (wonLastSpin) {
            // WIN: Reset and Switch Sides
            state.level = 1;
            state.currentSet = (state.currentSet === 'A') ? 'B' : 'A';
        } else {
            // LOSS: Progress
            if (state.level < 4) {
                state.level++;
            } else {
                // Hard Stop after Level 4 loss (Video logic: "revert back to level 1 just for bankroll")
                state.level = 1;
            }
        }
    }

    // Update bankroll tracking for next spin
    state.lastBankroll = bankroll;

    // --- 4. BET CONSTRUCTION ---
    const bets = [];
    const activeData = STRATEGY_SETS[state.currentSet];
    
    // Determine Unit Size based on Level (Level 4 doubles the base unit)
    // We stick to MIN_CHIP for levels 1-3 to maximize longevity, double it for 4.
    const baseUnit = (state.level === 4) ? MIN_CHIP * 2 : MIN_CHIP;

    // Helper to safely add bets within limits
    const addBet = (type, value, amount) => {
        // Clamp amount between min and max
        let finalAmount = amount;
        if (finalAmount < config.betLimits.min) finalAmount = config.betLimits.min;
        if (finalAmount > config.betLimits.max) finalAmount = config.betLimits.max;
        
        bets.push({ type, value, amount: finalAmount });
    };

    // LEVEL 1: Splits (The Foundation)
    // 7 Splits @ 1 Unit
    activeData.splits.forEach(splitPair => {
        addBet('split', splitPair, baseUnit);
    });

    // LEVEL 2: Streets (The Coverage)
    // Add Streets @ 2 Units
    if (state.level >= 2) {
        activeData.streets.forEach(streetStart => {
            addBet('street', streetStart, baseUnit * 2);
        });
    }

    // LEVEL 3: Straight Ups (The Juice)
    // Add Straights @ 1 Unit
    if (state.level >= 3) {
        activeData.straightUps.forEach(num => {
            addBet('number', num, baseUnit);
        });
    }

    // INSURANCE (Always active)
    // 1 Unit on Green (0). If specific table has 00, adding a basket or straight up on 00 is wise, 
    // but we stick to 0 for standard compatibility.
    addBet('number', 0, baseUnit);

    return bets;
>>>>>>> origin/main
}