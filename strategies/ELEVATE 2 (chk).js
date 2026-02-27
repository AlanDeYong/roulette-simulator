/**
 * Source: Bet With Mo (https://youtu.be/dSAlu47iH5A) - Elevate 2.0 User Modified (Conditional Progression)
 * The Logic: Layered betting. The footprint covers exactly 24 numbers at all times.
 * - Level 1: STREETS [1,4,7,16,19,28,31,34].
 * - Level 2: Rebet streets + Adds 1 unit STRAIGHT UP on [2,5,8,17,20,29,32,35].
 * - Level 3: Rebet L1 & L2 + Adds 1 unit STRAIGHT UP on [3,6,9,18,21,30,33,36].
 * - Levels 4/5/6: Multiplies all active bets by 2x / 4x / 8x respectively.
 * The Progression:
 * - WIN (Net Profit > 0): Resets to Level 1.
 * - FULL LOSS (None of the 24 numbers hit): Immediately progresses up 1 Level.
 * - PARTIAL LOSS (Hit a covered number, but payout is less than total bet): Accrues a strike.
 * Upon hitting 2 consecutive Partial Losses, progresses up 1 Level.
 * The Goal: aggressive progression on total misses to recover quickly, while allowing a 
 * "grace period" (repeating the current level) if the board yields a partial return.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.initialized) {
        state.level = 1;
        state.partialLosses = 0;
        
        // Define number sets
        state.level1Streets = [1, 4, 7, 16, 19, 28, 31, 34];
        state.level2Numbers = [2, 5, 8, 17, 20, 29, 32, 35];
        state.level3Numbers = [3, 6, 9, 18, 21, 30, 33, 36];
        
        // Pre-calculate all 24 covered numbers for easy "Full Loss" detection
        state.allCoveredNumbers = [];
        state.level1Streets.forEach(street => {
            state.allCoveredNumbers.push(street, street + 1, street + 2);
        });
        
        state.initialized = true;
    }

    // 2. Analyze Spin History and Determine Progression
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winNum = lastSpin.winningNumber;
        
        let isFullLoss = false;
        let isWin = false;
        let isPartialLoss = false;

        // Categorize the spin result
        if (winNum === 0 || winNum === 37 || !state.allCoveredNumbers.includes(winNum)) {
            // 0, 00, or any number outside our 24-number footprint
            isFullLoss = true;
        } else {
            // It hit within the 24 numbers. Determine if it was a Net Win or Partial Loss
            if (state.level === 1) {
                isWin = true; // At Level 1, hitting ANY of the 24 numbers yields a net profit
            } else if (state.level === 2) {
                // At Level 2, only hitting the straight-up numbers yields a profit
                if (state.level2Numbers.includes(winNum)) {
                    isWin = true;
                } else {
                    isPartialLoss = true;
                }
            } else if (state.level >= 3) {
                // At Levels 3-6, hitting L2 or L3 straight-up numbers yields a profit
                if (state.level2Numbers.includes(winNum) || state.level3Numbers.includes(winNum)) {
                    isWin = true;
                } else {
                    isPartialLoss = true; // Hitting the base street number (1, 4, 7...) is a net loss
                }
            }
        }

        // Apply state changes based on categorization
        if (isWin) {
            state.level = 1;
            state.partialLosses = 0;
        } else if (isFullLoss) {
            state.level++;
            state.partialLosses = 0; // Reset partial loss counter when moving up
        } else if (isPartialLoss) {
            state.partialLosses++;
            if (state.partialLosses >= 2) {
                state.level++;
                state.partialLosses = 0; // Reset counter after leveling up
            }
        }

        // Cap maximum level
        if (state.level > 6) state.level = 6;
    }

    // 3. Determine Multiplier based on level
    let multiplier = 1; // Levels 1, 2, 3
    if (state.level === 4) multiplier = 2;
    if (state.level === 5) multiplier = 4;
    if (state.level === 6) multiplier = 8;

    // 4. Calculate Unit Amount and Clamp to Limits
    let unitAmount = config.betLimits.min * multiplier;
    unitAmount = Math.max(unitAmount, config.betLimits.min);
    unitAmount = Math.min(unitAmount, config.betLimits.max);

    // 5. Generate Bets Array dynamically based on the current level
    let bets = [];

    // Level 1+ (Always active)
    if (state.level >= 1) {
        state.level1Streets.forEach(num => {
            bets.push({ type: 'street', value: num, amount: unitAmount });
        });
    }

    // Level 2+ (Active on Level 2, 3, 4, 5, 6)
    if (state.level >= 2) {
        state.level2Numbers.forEach(num => {
            bets.push({ type: 'number', value: num, amount: unitAmount });
        });
    }

    // Level 3+ (Active on Level 3, 4, 5, 6)
    if (state.level >= 3) {
        state.level3Numbers.forEach(num => {
            bets.push({ type: 'number', value: num, amount: unitAmount });
        });
    }

    // 6. Bankroll Safety Check
    const totalRequiredWager = bets.reduce((sum, betObj) => sum + betObj.amount, 0);
    if (bankroll < totalRequiredWager) {
        return []; // Stop betting if insufficient funds
    }

    return bets;
}