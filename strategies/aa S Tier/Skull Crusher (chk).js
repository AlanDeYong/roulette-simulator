/**
 * Strategy: Skull Crusher
 * Source: The Gambler Strategist (YouTube: https://www.youtube.com/watch?v=OeMQ1E1u-pY)
 * * The Logic: 
 * This strategy aims to cover a large portion of the board (up to 21 numbers) by layering 
 * splits and streets over the same rows. The numbers covered by BOTH the splits and streets 
 * become "Jackpot" zones (high payout), while the numbers covered only by streets act as 
 * hedges (resulting in a small win or minor loss). We will focus our coverage on rows 1 to 7 
 * (numbers 1 through 21).
 * * The Progression:
 * - Level 1: 7 Splits on the first two columns (covers 14 numbers). Cost: 7 units.
 * - Level 2 (After loss): 7 Splits (1 unit) + 7 Streets (2 units) beneath them. 
 * Covers 21 numbers. Cost: 21 units. Creates the first "jackpot" overlap.
 * - Level 3 (After loss): 7 Splits (2 units) + 7 Streets (3 units). Cost: 35 units.
 * - Level 4 (After loss): 7 Splits (3 units) + 7 Streets (4 units). Cost: 49 units.
 * * Win/Loss Handling:
 * - Hit a "Jackpot" number (e.g., 1, 2, 4, 5): Reset progression to Level 1.
 * - Hit a "Hedge" number (e.g., 3, 6, 9) on Level 2+: Stay at the current level.
 * - Complete Miss (e.g., 0, 22-36): Advance to the next level.
 * - Loss at Level 4: Reset to Level 1 (Stop-loss to protect bankroll).
 * * The Goal: 
 * Grind small wins/break-evens with the hedge bets while waiting to hit the overlapping 
 * "jackpot" numbers to quickly recover any accumulated losses.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (state.level === undefined) {
        state.level = 1;
    }

    // 2. Evaluate previous spin to update progression
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;
        
        if (num === 0 || num > 21) {
            // Complete Miss - The ball landed outside our 1-21 coverage zone
            state.level++;
            
            // Stop-loss mechanism to prevent complete bankroll destruction
            if (state.level > 4) {
                state.level = 1; 
            }
        } else {
            // The ball landed inside our 1-21 coverage zone
            if (num % 3 === 0) {
                // It hit the right column (3, 6, 9, 12, 15, 18, 21)
                if (state.level === 1) {
                    // Level 1 only covers splits, so the right column is a complete miss here
                    state.level++;
                } else {
                    // On Level 2+, this is a "Hedge" (street-only coverage). 
                    // We stay at the current level to keep pushing for the jackpot.
                    state.level = state.level; 
                }
            } else {
                // It hit the left or middle column (1, 2, 4, 5, 7, 8...)
                // This is our overlapping "Jackpot" zone!
                state.level = 1;
            }
        }
    }

    // 3. Determine base unit
    const baseUnit = config.betLimits.min;
    
    // 4. Define unit ratios based on current Level
    let splitUnits = 0;
    let streetUnits = 0;

    switch (state.level) {
        case 1:
            splitUnits = 1;
            streetUnits = 0;
            break;
        case 2:
            splitUnits = 1;
            streetUnits = 2;
            break;
        case 3:
            splitUnits = 2;
            streetUnits = 3;
            break;
        case 4:
            splitUnits = 3;
            streetUnits = 4;
            break;
    }

    // 5. Calculate and Clamp Bet Amounts
    let splitAmount = splitUnits * baseUnit;
    splitAmount = Math.max(splitAmount, config.betLimits.min);
    splitAmount = Math.min(splitAmount, config.betLimits.max);

    let streetAmount = 0;
    if (streetUnits > 0) {
        streetAmount = streetUnits * baseUnit;
        streetAmount = Math.max(streetAmount, config.betLimits.min);
        streetAmount = Math.min(streetAmount, config.betLimits.max);
    }

    // 6. Construct the Bets
    let bets = [];

    // We cover 7 rows total (numbers 1 through 21)
    for (let row = 0; row < 7; row++) {
        let startNum = row * 3 + 1; // Yields 1, 4, 7, 10, 13, 16, 19
        
        // Add Splits on the left/middle columns
        if (splitUnits > 0) {
            bets.push({
                type: 'split',
                value: [startNum, startNum + 1],
                amount: splitAmount
            });
        }

        // Add Streets (Rows) underneath the splits
        if (streetUnits > 0) {
            bets.push({
                type: 'street',
                value: startNum,
                amount: streetAmount
            });
        }
    }

    // 7. Return the bets to the simulator
    return bets;
}