/**
 * STRATEGY: "Win 28" (Stress Tested by CEG Dealer School / Will Vegas)
 * * Source: https://www.youtube.com/watch?v=B-RZMpbAu7w (CEG Dealer School)
 * * THE LOGIC:
 * This is a high-coverage strategy covering 28 out of 37 numbers (on a Single Zero wheel).
 * 1. A bet is placed on the entire 2nd Column (Column 2).
 * 2. Individual 'Straight Up' bets are placed on all numbers in Column 1 and Column 3 
 * EXCEPT for four specific "gap" numbers (typically 4, 6, 31, 33 or similar, depending on variation).
 * 3. A bet is placed on 0 to cover the house edge.
 * Total numbers covered: 12 (Column) + 15 (Straight ups) + 1 (Zero) = 28 Numbers.
 * * THE PROGRESSION:
 * The strategy uses a 6-level progression. If a spin results in a loss (one of the 9 uncovered numbers), 
 * the base unit for all bets is increased according to a pre-defined multiplier sequence. 
 * Upon a win that recovers the session loss, the progression resets to Level 1.
 * * THE GOAL:
 * To achieve a target profit (e.g., $50-$100) through high-frequency small wins.
 * * PROFILING FOR "MAN ON THE STREET":
 * This function prioritizes financial stability by clamping all bets to table limits 
 * and stopping once the bankroll cannot support the next progression level.
 */

function bet(spinHistory, bankroll, config, state) {
    // --- 1. Initialize State ---
    if (!state.level) state.level = 0;
    if (!state.initialBankroll) state.initialBankroll = bankroll;
    
    // Progression Multipliers (Levels 1 through 6)
    const multipliers = [1, 2, 4, 8, 16, 32];
    
    // Numbers to cover with Straight Up bets (Column 1, Column 3, and Zero)
    // We exclude 4, 6, 16, 18, 19, 21, 31, 33 (The "Gaps" to keep it to 28 numbers total)
    const straightUpNumbers = [
        0, 
        1, 7, 10, 13, 22, 25, 28, // Col 1 selections
        3, 9, 12, 15, 24, 27, 30, 36  // Col 3 selections
    ];

    // --- 2. Check Previous Result & Update Progression ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNumber = lastSpin.winningNumber;
        
        // Determine if we won
        const wonColumn = (lastNumber % 3 === 2); // Column 2: 2, 5, 8...
        const wonStraightUp = straightUpNumbers.includes(lastNumber);

        if (wonColumn || wonStraightUp) {
            // If we are back in profit or at Level 0, reset
            if (bankroll >= state.initialBankroll) {
                state.level = 0;
            }
        } else {
            // Loss: Move to next progression level
            state.level++;
            // If we exceed our progression steps, reset to base to protect remaining bankroll
            if (state.level >= multipliers.length) {
                state.level = 0;
            }
        }
    }

    // --- 3. Calculate Bet Amounts ---
    // Base unit is the minimum allowed for inside/outside bets
    const insideUnit = config.betLimits.min;
    const outsideUnit = config.betLimits.minOutside;
    const currentMultiplier = multipliers[state.level];

    const bets = [];

    // A. Column 2 Bet (Outside)
    let col2Amount = outsideUnit * currentMultiplier;
    col2Amount = Math.min(Math.max(col2Amount, config.betLimits.minOutside), config.betLimits.max);
    bets.push({ type: 'column', value: 2, amount: col2Amount });

    // B. Straight Up Bets (Inside)
    straightUpNumbers.forEach(num => {
        let numAmount = insideUnit * currentMultiplier;
        numAmount = Math.min(Math.max(numAmount, config.betLimits.min), config.betLimits.max);
        bets.push({ type: 'number', value: num, amount: numAmount });
    });

    // --- 4. Final Bankroll Check ---
    const totalWagered = bets.reduce((sum, b) => sum + b.amount, 0);
    if (totalWagered > bankroll) {
        return []; // Stop betting if we can't afford the full strategy
    }

    return bets;
}