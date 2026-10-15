/**
 * Strategy Name: Crimson Code
 * Source: https://youtu.be/bO19Bd5_Rbk (Channel: The Roulette Master)
 * * Full Logic Details:
 * - The strategy covers a broad section of the table by simultaneously betting on 'Red' 
 * and two specific columns: 'Column 1' and 'Column 3'. 
 * - Column 1 and Column 3 contain a higher density of red numbers (6 and 8 respectively),
 * creating overlapping win conditions when a red number hits in these columns.
 * - Landing on a black number within Column 1 or Column 3 results in a net flat break-even 
 * outcome (the column win offsets the red loss).
 * - Landing on any number in Column 2 that is black, or hitting a 0/00, leads to a total loss.
 * - Landing on a red number in Column 2 leads to a partial loss.
 * * Full Bet Progression Details:
 * - The system operates on a linear flat-increase progression rather than aggressive doubling.
 * - Base setup: 1 unit on Red, 1 unit on Column 1, and 1 unit on Column 3.
 * - Win: When a profitable outcome occurs and a session target is met, reset back to base units (1 unit per position).
 * - Loss/Partial Loss: Upon experiencing any absolute loss (e.g., Black in Column 2, Zero) or partial loss 
 * (Red in Column 2), the system increases the bet size for each of the three positions by 1 unit linearly 
 * (e.g., Level 1: 10/10/10 -> Level 2: 20/20/20 -> Level 3: 30/30/30).
 * - A clean return to net profit triggers a full reset to the base unit level.
 * * The Goal:
 * - To systematically exploit high-coverage overlapping profit structures while keeping variance low via linear progression.
 * - Standard profit target is roughly 10% of the starting bankroll or when a clear recovery sequence completes.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize Strategy State parameters
    if (!state.currentLevel) {
        state.currentLevel = 1;
        state.highestBankroll = bankroll;
    }

    // Keep track of the session peak bankroll
    if (bankroll > state.highestBankroll) {
        state.highestBankroll = bankroll;
    }

    // 2. Analyze the last spin history to adjust progression level
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;
        const color = lastSpin.winningColor;

        // Determine column (1, 2, or 3)
        let column = 0;
        if (num > 0) {
            if (num % 3 === 1) column = 1;
            else if (num % 3 === 2) column = 2;
            else column = 3;
        }

        // Win/Loss evaluation based on 1 unit per position (Red, Col 1, Col 3)
        // Cost of spin = 3 units.
        let payout = 0;
        if (color === 'red') payout += 2; // Red paying 1:1 returns 2 units
        if (column === 1) payout += 3;    // Column paying 2:1 returns 3 units
        if (column === 3) payout += 3;    // Column paying 2:1 returns 3 units

        // Check if the overall transaction was a loss or partial loss
        if (payout < 3) {
            // Any outcome returning less than the invested layout increments the level
            state.currentLevel += 1;
        } else if (bankroll >= state.highestBankroll) {
            // If we have fully recovered or entered new profit territory, reset level
            state.currentLevel = 1;
        }
    }

    // 3. Establish base unit allocations adhering to min constraints
    const baseOutsideUnit = config.betLimits.minOutside; 
    
    // Calculate total bet for each target using linear multiplier levels
    let currentBetAmount = baseOutsideUnit * state.currentLevel;

    // 4. Clamp bet boundaries to table rules
    currentBetAmount = Math.max(currentBetAmount, config.betLimits.minOutside);
    currentBetAmount = Math.min(currentBetAmount, config.betLimits.max);

    // 5. Build and return the structured array of bets
    return [
        { type: 'red', amount: currentBetAmount },
        { type: 'column', value: 1, amount: currentBetAmount },
        { type: 'column', value: 3, amount: currentBetAmount }
    ];
}