/**
 * Barry's Bonanza Strategy
 * 
 * Source: https://youtu.be/6IC9gZOat8k (The Roulette Master)
 * 
 * The Full Logic in details:
 * - This strategy exploits the color distribution in the standard roulette columns.
 * - Column 2 contains predominantly Black numbers (8 Black / 4 Red). 
 * - Column 3 contains predominantly Red numbers (8 Red / 4 Black).
 * - The system bets proportionally on a Color and its dominant Column simultaneously.
 * - Initial Target: 'Black' color and 'Column 2'. 
 * - Bet Ratio: 3 units on the Color, 2 units on the Column (e.g., $15 and $10).
 * - A "Jackpot" occurs when a number hits BOTH the target color and target column.
 * - A "Partial Win" occurs when ONLY the color or ONLY the column hits. Any partial win yields a slight profit.
 * 
 * The Full Bet Progression in details:
 * - On a LOSS (neither hits): Increase the bet progression by 1 level. 
 * - On a PARTIAL WIN: Rebet the exact same amount. Do not increase. The small profit slowly mitigates drawdown while waiting for a Jackpot.
 * - On a JACKPOT WIN: 
 *     1. Switch the target sets (Black & Col 2 becomes Red & Col 3, and vice versa).
 *     2. If the current bankroll is at or above the starting bankroll, fully reset the progression level back to 1.
 *     3. If the bankroll is in a heavy drawdown, perform a partial reset ("bridge the gap") by halving the progression level to gradually recover losses instead of fully dropping back to the bottom.
 * 
 * The Goal:
 * - Sustain long runs of misses with a large bankroll (e.g., 2000 units), farm partial wins to minimize loss velocity, and rely on periodic Jackpots at elevated tiers to create massive profit spikes.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.initialized) {
        state.targetColor = 'black'; 
        state.level = 1;
        state.initialized = true;
    }

    // 2. Process Previous Spin
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        const lastColor = lastSpin.winningColor;
        
        // Determine the column of the last number (1st, 2nd, or 3rd)
        let lastColumn = 0;
        if (lastNum !== 0) {
            lastColumn = lastNum % 3 === 0 ? 3 : lastNum % 3;
        }

        // Map the current active targets
        const targetColNum = state.targetColor === 'black' ? 2 : 3;
        
        // Check win conditions
        const colorWon = lastColor === state.targetColor;
        const columnWon = lastColumn === targetColNum;

        if (colorWon && columnWon) {
            // JACKPOT WIN: Both hit
            // Switch targets
            state.targetColor = state.targetColor === 'black' ? 'red' : 'black';
            
            // Progression Reset Logic
            if (bankroll >= config.startingBankroll) {
                state.level = 1; // Full Reset
            } else {
                // Partial Reset to "bridge the gap" during severe drawdown
                state.level = Math.max(1, Math.ceil(state.level / 2));
            }
        } else if (colorWon || columnWon) {
            // PARTIAL WIN: Only one hit
            // Rebet exactly the same (do nothing to the level)
        } else {
            // LOSS: Neither hit
            // Increase progression
            state.level++;
        }
    }

    // 3. Calculate Base Units (Maintaining 3:2 Ratio)
    // Scale up safely if config.betLimits.minOutside is higher than the standard $10 minimum
    const scale = Math.max(1, Math.ceil(config.betLimits.minOutside / 10));
    const colorBase = 15 * scale;
    const columnBase = 10 * scale;

    // 4. Calculate Final Bet Amounts based on Increment Mode
    let colorAmount, columnAmount;
    if (config.incrementMode === 'fixed') {
        colorAmount = colorBase + ((state.level - 1) * config.minIncrementalBet);
        columnAmount = columnBase + ((state.level - 1) * config.minIncrementalBet);
    } else { 
        // 'base' mode accurately reflects the additive progression in the video
        colorAmount = colorBase * state.level;
        columnAmount = columnBase * state.level;
    }

    // 5. Clamp to Limits
    colorAmount = Math.max(config.betLimits.minOutside, Math.min(colorAmount, config.betLimits.max));
    columnAmount = Math.max(config.betLimits.minOutside, Math.min(columnAmount, config.betLimits.max));

    // 6. Format and Return Bets
    const targetCol = state.targetColor === 'black' ? 2 : 3;

    return [
        { type: state.targetColor, amount: colorAmount },
        { type: 'column', value: targetCol, amount: columnAmount }
    ];
}