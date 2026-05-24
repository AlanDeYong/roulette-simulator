/**
 * Strategy: Sunny's System (Two Column Martingale)
 * Source: Popularized by casino strategy channels (e.g., CEG Dealer School context)
 *
 * The Logic:
 * - Place equal bets on Column 2 and Column 3.
 * - This covers 24 numbers (approx 64% coverage).
 * - Pays 2:1 on each column. Since we bet 2 units total (1 on each), a win yields 3 units returned.
 * - Net profit on a win = 1 unit (3 returned - 2 staked).
 *
 * The Progression:
 * - Base Level: Start with the minimum outside bet on both columns.
 * - ON LOSS (Col 1 or Zero): Double the bet amount for the next spin (Martingale).
 * - ON WIN (Col 2 or Col 3):
 * - Check 'Consecutive Wins'.
 * - If consecutive wins < 2: Keep the bet size the same (do not reset).
 * - If consecutive wins >= 2: Reset the bet size to the base minimum.
 *
 * The Goal:
 * - To grind out small profits using high table coverage.
 * - The "2 consecutive wins" rule is crucial because a single win at this payout structure
 * only recovers half the previous loss in a deep Martingale. Two wins are needed to clear the hole and profit.
 */
function bet(spinHistory, bankroll, config, state) {
    // 1. Define Helper Constants
    const COL_2 = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35];
    const COL_3 = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36];

    // 2. Initialize State
    // We persist the current betting multiplier and the win streak count
    if (state.multiplier === undefined) state.multiplier = 1;
    if (state.consecutiveWins === undefined) state.consecutiveWins = 0;

    // 3. Process Previous Spin (if history exists)
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        
        let won = false;

        // Determine if we won (Ball landed in Col 2 or Col 3)
        // Note: 0 is always a loss here
        if (COL_2.includes(lastNum) || COL_3.includes(lastNum)) {
            won = true;
        }

        if (won) {
            state.consecutiveWins += 1;
            // The Strategy Rule: Reset only after 2 consecutive wins
            if (state.consecutiveWins >= 2) {
                state.multiplier = 1;
                state.consecutiveWins = 0;
            }
            // If only 1 win, we stay at the current high multiplier to try and recover the rest
        } else {
            // Loss: Reset wins, Double the bet
            state.consecutiveWins = 0;
            state.multiplier *= 2;
        }
    }

    // 4. Calculate Bet Amount
    // Use minOutside because Columns are Outside bets
    const baseUnit = config.betLimits.minOutside; 
    let calculatedAmount = baseUnit * state.multiplier;

    // 5. CLAMP TO LIMITS (Crucial)
    // Ensure we don't go below the table minimum
    calculatedAmount = Math.max(calculatedAmount, config.betLimits.minOutside);
    // Ensure we don't exceed the table maximum
    calculatedAmount = Math.min(calculatedAmount, config.betLimits.max);

    // 6. Safety Check: Bankroll
    // If we can't afford the bet on both columns, stop betting (return empty)
    if (bankroll < calculatedAmount * 2) {
        // Optional: You could bet 'all in' or stop. Usually better to stop.
        // For this implementation, we will stop to prevent errors.
        return []; 
    }

    // 7. Return Bets
    return [
        { type: 'column', value: 2, amount: calculatedAmount },
        { type: 'column', value: 3, amount: calculatedAmount }
    ];
}