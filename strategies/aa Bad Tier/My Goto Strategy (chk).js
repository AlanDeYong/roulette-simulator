/**
 * Source: https://youtu.be/E-3QGOQJtPo (WillVegas)
 *
 * The Full Logic in details:
 * This strategy aims to cover a massive portion of the board (28 to 32 numbers) to secure frequent, 
 * consistent wins while avoiding zeroes and a few specific gaps. 
 * - The base setup places a 3-unit bet on a designated column (Column 1 or Column 3; Column 2 is never bet on).
 * - If Column 1 is chosen, the 4 non-overlapping corners are placed to cover Columns 2 and 3.
 * - If Column 3 is chosen, the 4 non-overlapping corners are placed to cover Columns 1 and 2.
 * - This provides coverage for 28 numbers.
 * - If a loss occurs (hitting an uncovered number or a zero), the strategy expands coverage to 32 numbers 
 * by adding a 5th corner bet specifically targeting the block of numbers where the loss just occurred.
 *
 * The Full Bet Progression in details:
 * - Level 1 (Base): 3 units on the chosen Column, and 1 unit on 4 specific corners (Total 7 units). Covers 28 numbers.
 * - Level 2 (After 1st Loss): Double the base unit sizes and add a 5th corner. 6 units on the Column, 
 * and 2 units on 5 corners (Total 16 units). Covers 32 numbers.
 * - Level 3 (After 2nd Loss): Aggressive recovery. 15 units on the Column, and 5 units on 5 corners (Total 40 units).
 * - Reset Condition: Stay at the current level on a win. Reset to Level 1 once the bankroll reaches or 
 * exceeds the highest recorded peak (meaning all previous losses have been fully recovered).
 *
 * The Goal:
 * - Target Profit: +10 outside units (e.g., $50 profit on a standard $5 table). The function stops betting once this is reached.
 * - Stop-loss: If the bankroll drops below the total required amount for the current progression level, it stops.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State on first spin
    if (state.initialBankroll === undefined) {
        state.initialBankroll = bankroll;
        state.highestBankroll = bankroll;
        state.level = 1;
        state.chosenColumn = 1; // Strategy configuration: Set to 1 or 3 (Column 2 is never bet on)
        state.extraCorner = state.chosenColumn === 1 ? 2 : 1; 
    }

    // 2. Update highest bankroll peak
    if (bankroll > state.highestBankroll) {
        state.highestBankroll = bankroll;
    }

    // 3. Goal Condition: Target Profit Reached
    const targetProfit = 10000 * config.betLimits.minOutside;
    if (bankroll >= state.initialBankroll + targetProfit) {
        return null; 
    }

    // 4. Setup mapping for corners based on chosen column layout
    let baseCorners, extraCornerDefault;
    if (state.chosenColumn === 1) {
        baseCorners = [8, 14, 26, 32]; // Corners covering Columns 2 & 3
        extraCornerDefault = 2;
    } else {
        baseCorners = [7, 13, 25, 31]; // Corners covering Columns 1 & 2
        extraCornerDefault = 1;
    }

    // 5. Evaluate Last Spin & Progression
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const netChange = bankroll - (state.lastBankroll || bankroll);

        if (netChange < 0) {
            // Loss occurred: Progress level up to a max of Level 3
            if (state.level === 1) state.level = 2;
            else if (state.level === 2) state.level = 3;

            // Target the lost block for the 5th corner bet (expanding coverage to 32 numbers)
            const lastNum = lastSpin.winningNumber;
            if (state.chosenColumn === 1) {
                if ([2, 3, 5, 6].includes(lastNum)) state.extraCorner = 2;
                else if ([20, 21, 23, 24].includes(lastNum)) state.extraCorner = 20;
                else state.extraCorner = extraCornerDefault;
            } else {
                if ([1, 2, 4, 5].includes(lastNum)) state.extraCorner = 1;
                else if ([19, 20, 22, 23].includes(lastNum)) state.extraCorner = 19;
                else state.extraCorner = extraCornerDefault;
            }
        } else {
            // Win occurred: Reset to Level 1 if bankroll has recovered to peak
            if (bankroll >= state.highestBankroll) {
                state.level = 1;
            }
        }
    }

    // Save current bankroll for next spin's net change calculation
    state.lastBankroll = bankroll;

    // 6. Determine Base Unit 
    // Ensuring the base unit is large enough so that 3 * baseUnit meets minOutside limits
    const baseUnit = Math.max(config.betLimits.min, Math.ceil(config.betLimits.minOutside / 3));

    // 7. Set Multipliers based on Current Level
    let colUnits, cornerUnits, numCorners;
    if (state.level === 1) {
        colUnits = 3;
        cornerUnits = 1;
        numCorners = 4;
    } else if (state.level === 2) {
        colUnits = 6;
        cornerUnits = 2;
        numCorners = 5;
    } else {
        colUnits = 15;
        cornerUnits = 5;
        numCorners = 5;
    }

    // 8. Calculate Amounts & Clamp to Limits
    let colAmount = colUnits * baseUnit;
    let cornerAmount = cornerUnits * baseUnit;

    colAmount = Math.max(colAmount, config.betLimits.minOutside);
    colAmount = Math.min(colAmount, config.betLimits.max);
    
    cornerAmount = Math.max(cornerAmount, config.betLimits.min);
    cornerAmount = Math.min(cornerAmount, config.betLimits.max);

    // 9. Check Stop-Loss
    let totalRequired = colAmount + (numCorners * cornerAmount);
    if (bankroll < totalRequired) {
        return null; // Insufficient bankroll to continue progression
    }

    // 10. Build Bets Array
    let bets = [];
    
    // Primary Column Bet
    bets.push({ type: 'column', value: state.chosenColumn, amount: colAmount });

    // The 4 Base Corner Bets
    for (let c of baseCorners) {
        bets.push({ type: 'corner', value: c, amount: cornerAmount });
    }

    // 5th Extra Corner Bet for Level 2 and 3
    if (numCorners === 5) {
        bets.push({ type: 'corner', value: state.extraCorner, amount: cornerAmount });
    }

    return bets;
}