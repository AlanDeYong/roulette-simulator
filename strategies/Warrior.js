/**
 * Warrior Roulette Strategy
 * * Source: http://www.youtube.com/watch?v=rAs-8J8Cgro (THEROULETTEMASTERTV)
 * * The Logic:
 * - The strategy aims to cover 26 numbers by combining an outside color bet and a contrasting column bet.
 * - The bets are placed in a 3:2 ratio (e.g., 3 units on Color, 2 units on Column).
 * - The specific pairings are always: Red + Column 2 OR Black + Column 3. This maximizes coverage because 
 * Column 2 is dominated by black numbers (covering red + 8 extra black numbers), and Column 3 is 
 * dominated by red numbers.
 * - A "Jackpot" triggers when the winning number wins BOTH bets (e.g., landing a Red number in Column 2).
 * - Upon a Jackpot, the strategy counts the red/black occurrences in the last 9 spins. It switches the 
 * pairing to target the color that has appeared the LEAST.
 * * The Progression:
 * - Martingale Style: If the spin is a TOTAL LOSS (neither bet hits), the bet multiplier doubles.
 * - If only ONE bet hits (a partial win), the multiplier remains the SAME for the next spin to recover.
 * - If a Jackpot hits, or if the overall bankroll reaches a new high water mark (session profit), 
 * the multiplier RESETS to the base level (1x).
 * * The Goal:
 * - Generate steady profit through high board coverage, absorbing losses through doubling, and relying 
 * on occasional jackpots to clear deeper deficits and boost session profit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State on first spin
    if (!state.initialized) {
        state.initialized = true;
        state.color = 'red';
        state.column = 2;
        state.multiplier = 1;
        state.highestBankroll = bankroll;
    }

    // 2. Track Session Profit (High Water Mark)
    if (bankroll > state.highestBankroll) {
        state.highestBankroll = bankroll;
        state.multiplier = 1; // Reset progression upon hitting a new high
    }

    // 3. Process the last spin results to adjust targets and progression
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;
        const winningColor = lastSpin.winningColor;

        // Define column number sets to check for overlap
        const col2Numbers = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35];
        const col3Numbers = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36];

        let hitColor = (winningColor === state.color);
        let hitColumn = false;
        
        if (state.column === 2 && col2Numbers.includes(num)) hitColumn = true;
        if (state.column === 3 && col3Numbers.includes(num)) hitColumn = true;

        const isJackpot = hitColor && hitColumn;
        const isTotalLoss = !hitColor && !hitColumn;

        if (isJackpot) {
            // Jackpot resets progression immediately
            state.multiplier = 1; 
            
            // Assess last 9 spins to determine the next pair
            const last9 = spinHistory.slice(-9);
            let redCount = 0, blackCount = 0;
            
            for (let spin of last9) {
                if (spin.winningColor === 'red') redCount++;
                if (spin.winningColor === 'black') blackCount++;
            }
            
            // Switch to the color that appeared LESS frequently (or default to Red if tied/unknown)
            if (redCount > blackCount) {
                state.color = 'black';
                state.column = 3;
            } else {
                state.color = 'red';
                state.column = 2;
            }
        } else if (isTotalLoss) {
            // Total loss forces a Martingale double-up
            state.multiplier *= 2;
        } 
        // Note: If (hitColor || hitColumn) but NOT a jackpot, multiplier stays the same to grind back.
    }

    // 4. Calculate Bet Amounts
    // The strategy uses a 3:2 ratio based on the minimum outside bet limit.
    const unit = config.betLimits.minOutside;
    let colorAmount = unit * 3 * state.multiplier;
    let columnAmount = unit * 2 * state.multiplier;

    // 5. Clamp to Limits
    colorAmount = Math.min(colorAmount, config.betLimits.max);
    columnAmount = Math.min(columnAmount, config.betLimits.max);

    // Safety: Reset multiplier if a doubled bet exceeds current bankroll capacity
    if ((colorAmount + columnAmount) > bankroll) {
        state.multiplier = 1;
        colorAmount = unit * 3;
        columnAmount = unit * 2;
    }

    // 6. Return Bet Payload
    return [
        { type: state.color, amount: colorAmount },
        { type: 'column', value: state.column, amount: columnAmount }
    ];
}