/**
 * Penny Pincher Roulette Strategy
 * * Source: https://youtu.be/fu5TG9c6QWU (YouTube Channel: The Roulette Master, Strategy by "it's me")
 * * The Full Logic in details:
 * This strategy is designed to cover 25 out of 37 numbers on a European wheel, creating a high hit rate (67.5%).
 * A bet is placed on every single spin using a 13-unit base configuration:
 * - 1 unit Straight Up bet on 0
 * - 1 unit on four specific vertical Splits in the 1st column: 4/7, 13/16, 22/25, and 31/34
 * - 2 units on four specific Corners covering the middle and top rows: 5 (5,6,8,9), 14 (14,15,17,18), 23 (23,24,26,27), and 32 (32,33,35,36)
 * * The Full Bet Progression in details:
 * - Start at base level (Multiplier = 1).
 * - On a loss: Double the bet multiplier (Martingale).
 * - On a win:
 * - If you are at base level, maintain the base level.
 * - If you are in a recovery level (Multiplier > 1), the system requires consecutive wins to recover losses.
 * - Specifically, you must hit at least TWO wins in a row during recovery.
 * - If after 2 wins your bankroll has returned to or exceeded the "high water mark" (the bankroll you had before the losing streak started), reset the multiplier to 1.
 * - If after 2 wins you are still not in overall session profit for that cycle, continue betting at the same multiplier until you cross that threshold (e.g., getting a 3rd win).
 * * The Goal:
 * Accumulate steady, small profits during base-level play while utilizing the high hit rate and aggressive Martingale recovery to quickly climb out of drawdowns. 
 * There is no strict stop-loss defined; the target profit is left to the player's discretion.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (state.multiplier === undefined) {
        state.multiplier = 1;
        state.recoveryWins = 0;
        state.cycleStartBankroll = bankroll;
        state.lastSpinCount = 0;
    }

    // 2. Evaluate previous spin to adjust progression
    if (spinHistory.length > state.lastSpinCount) {
        const lastResult = spinHistory[spinHistory.length - 1].winningNumber;
        
        // All 25 numbers covered by the strategy
        const coveredNumbers = [
            0, 4, 5, 6, 7, 8, 9, 
            13, 14, 15, 16, 17, 18, 
            22, 23, 24, 25, 26, 27, 
            31, 32, 33, 34, 35, 36
        ];
        
        const isWin = coveredNumbers.includes(lastResult);

        if (isWin) {
            if (state.multiplier === 1) {
                // Winning at base level -> Update our high water mark
                state.recoveryWins = 0;
                state.cycleStartBankroll = bankroll; 
            } else {
                // Winning in recovery
                state.recoveryWins++;
                
                // Check if we hit our 2 win requirement AND have recovered our cycle losses
                if (state.recoveryWins >= 2 && bankroll >= state.cycleStartBankroll) {
                    state.multiplier = 1;
                    state.recoveryWins = 0;
                    state.cycleStartBankroll = bankroll; // Set new baseline
                }
                // If bankroll < cycleStartBankroll, we stay at the current multiplier for a 3rd+ win
            }
        } else {
            // Loss -> Double up and reset recovery win count
            state.multiplier *= 2;
            state.recoveryWins = 0;
            // We intentionally do not update cycleStartBankroll here to track the drawdown
        }

        state.lastSpinCount = spinHistory.length;
    }

    // 3. Determine base unit
    const unit = config.betLimits.min; 

    // 4. Calculate Bet Amounts
    let straightAmount = unit * state.multiplier;
    let splitAmount = unit * state.multiplier;
    let cornerAmount = (unit * 2) * state.multiplier;

    // 5. Clamp to Limits (Ensuring respect for table max)
    straightAmount = Math.min(Math.max(straightAmount, config.betLimits.min), config.betLimits.max);
    splitAmount = Math.min(Math.max(splitAmount, config.betLimits.min), config.betLimits.max);
    cornerAmount = Math.min(Math.max(cornerAmount, config.betLimits.min), config.betLimits.max);

    // 6. Construct and Return Bets
    const bets = [];

    // Straight up on 0
    bets.push({ type: 'number', value: 0, amount: straightAmount });

    // Splits (1st column vertical splits)
    const splitPairs = [
        [4, 7],
        [13, 16],
        [22, 25],
        [31, 34]
    ];
    splitPairs.forEach(pair => {
        bets.push({ type: 'split', value: pair, amount: splitAmount });
    });

    // Corners (top-left number defines the corner)
    const cornerStarts = [5, 14, 23, 32];
    cornerStarts.forEach(corner => {
        bets.push({ type: 'corner', value: corner, amount: cornerAmount });
    });

    // 7. Bankroll Check
    const totalBet = straightAmount + (splitPairs.length * splitAmount) + (cornerStarts.length * cornerAmount);
    if (totalBet > bankroll) {
        // If we don't have enough bankroll to cover the full recovery progression,
        // we return an empty array to signal no bets can be safely placed.
        return [];
    }

    return bets;
}