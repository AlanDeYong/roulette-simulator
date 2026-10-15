/**
 * Strategy: Moving Corners
 * * Source:
 * - URL: https://youtu.be/nVv0dLFnZNQ?si=v3aknp3o7zsJD_QH
 * - Channel: Casino Matchmaker
 * * The Full Logic:
 * - This strategy dynamically covers non-overlapping Corner bets across the roulette layout. 
 * - Each round, new unique corner positions are randomly or systematically chosen to avoid overlap.
 * - The strategy initiates by placing bets on exactly two corners, covering a total of 8 unique numbers.
 * - Upon a win, the system resets entirely back to the original configuration of two corners.
 * - Upon a loss, the layout expands to include more corners up to a peak cap of 5 maximum active corners.
 * * The Full Bet Progression:
 * - Level 1: 2 Corners, Flat base unit per corner (e.g., $5 + $5 = $10 total bet).
 * - Level 2 (After 1 Loss): 3 Corners, Flat base unit per corner (e.g., $5 + $5 + $5 = $15 total bet).
 * - Level 3 (After 2 Losses): 4 Corners, Base unit per corner, and the final sum is Doubled (e.g., ($5 * 4) * 2 = $40 total bet).
 * - Level 4 (After 3 Losses): 5 Corners, each corner receives an equal base amount before the final sum is Doubled (e.g., (($5 * 2) * 4 + ($5 * 2)) * 2 = $100 total bet, meaning $20 per corner).
 * - Subsequent Losses: Rebet the exact 5 corners and double up all bet sizes sequentially.
 * - General Win Rule: Full system reset to Level 1.
 * * The Goal:
 * - A fast-paced "get in, win profit quickly, and get out" strategy intended to hit a short session target profit before encountering vertical step limits.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit using inside bet configuration limits
    const baseUnit = Math.max(config.betLimits.min, 5); 

    // 2. Initialize State Management
    if (!state.initialized) {
        state.level = 1; // Tracks current progression step
        state.initialized = true;
    }

    // 3. Evaluate previous spin performance if history exists
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        
        // Use provided state or fallback to determine what was bet last round
        const lastActiveCorners = state.lastPlacedCorners || [];
        let wonLastRound = false;

        // Check if winning number falls inside any previously covered corner matrices
        for (let corner of lastActiveCorners) {
            if (isNumberInCorner(lastSpin.winningNumber, corner)) {
                wonLastRound = true;
                break;
            }
        }

        if (wonLastRound) {
            state.level = 1; // Reset to entry level on success
        } else {
            state.level++; // Advance loss tier incrementally beyond level 4
        }
    }

    // 4. Generate Strategy Bet Distributions based on tier levels
    let uniqueCorners = getUniqueNonOverlappingCorners(state.level === 1 ? 2 : state.level === 2 ? 3 : state.level === 3 ? 4 : 5);
    let betsArray = [];

    // Calculate progression based on level tiers
    let amountPerCorner = baseUnit;
    if (state.level === 3) {
        amountPerCorner = baseUnit * 2;
    } else if (state.level >= 4) {
        amountPerCorner = baseUnit * Math.pow(2, state.level - 2);
    }

    uniqueCorners.forEach((cornerVal) => {
        let calculatedAmount = amountPerCorner;

        // Rigidly enforce table boundary checks
        calculatedAmount = Math.max(calculatedAmount, config.betLimits.min);
        calculatedAmount = Math.min(calculatedAmount, config.betLimits.max);

        betsArray.push({
            type: 'corner',
            value: cornerVal,
            amount: calculatedAmount
        });
    });

    // Save tracking state seamlessly for execution during upcoming spin
    state.lastPlacedCorners = uniqueCorners;

    return betsArray;
}

/**
 * Helper to select distinct non-overlapping roulette corners
 */
function getUniqueNonOverlappingCorners(count) {
    // Valid non-overlapping top-left layout starting coordinates
    const possibleCorners = [1, 7, 13, 19, 25, 31, 2, 8, 14, 20, 26, 32];
    let shuffled = possibleCorners.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

/**
 * Validates if a winning target number falls inside a specific layout corner
 */
function isNumberInCorner(number, topLeftValue) {
    const rowStart = topLeftValue;
    const adjacentNumbers = [rowStart, rowStart + 1, rowStart + 3, rowStart + 4];
    return adjacentNumbers.includes(number);
}