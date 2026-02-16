/**
 * Strategy: Improved Line-Up Roulette Strategy
 * * Source: 
 * YouTube Video: "I Tried to Improve the Line-up Roulette Strategy — Here’s How It Played Out"
 * Channel: Casino Matchmaker
 * URL: https://www.youtube.com/watch?v=P2UbExZjsCU
 * * The Logic:
 * This strategy aims for high coverage (approx 75% of the wheel) by turning standard "push" bets into "wins".
 * 1. Column Bet: Covers Column 3 (3, 6, 9...36).
 * 2. Split Bets: Places 8 specific splits covering numbers in Column 1 and 2.
 * 3. The "Improvement": The ratio of the Column bet to the Split bet is adjusted (5:1) so that
 * winning on the Column is profitable, rather than a break-even "push".
 * - Coverage: 28 Winning numbers (8 Splits x 2 + 12 Column numbers).
 * - Losers: 9 numbers (Zero + 8 uncovered numbers).
 * * The Progression (Recovery Mode):
 * - Type: D'Alembert-style / Unit-Add.
 * - On Loss: Increase the Bet Multiplier by 1 unit.
 * - On Win: Decrease the Bet Multiplier by 1 unit (Semi-reset).
 * * The Goal:
 * - Target Profit: +20 Units per session.
 * - Upon reaching the target, the progression fully resets to the base unit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Configuration & Constants
    // Define the 8 splits to cover Col 1 & 2 (Horizontal splits)
    // We select 8 pairs to reach the 28-number coverage mentioned in the video.
    const splitPairs = [
        [1, 2], [4, 5], [7, 8], [10, 11], 
        [13, 14], [16, 17], [19, 20], [22, 23]
    ];
    
    // Determine the base unit size. 
    // Splits (Inside) usually have lower mins than Columns (Outside).
    // We need 1 unit on Split and 5 units on Column.
    // Ensure 1 unit meets inside min, and 5 units meets outside min.
    const insideMin = config.betLimits.min || 1;
    const outsideMin = config.betLimits.minOutside || 1;
    
    // Calculate smallest viable base unit
    // Unit must be >= insideMin
    // 5 * Unit must be >= outsideMin
    const baseUnit = Math.max(insideMin, Math.ceil(outsideMin / 5));
    
    // 2. Initialize State
    if (state.multiplier === undefined) state.multiplier = 1;
    if (state.sessionStartBankroll === undefined) state.sessionStartBankroll = bankroll;

    // 3. Process History (Progression Logic)
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastWinAmount = lastSpin.totalPayout || 0;
        const lastBetAmount = lastSpin.totalBet || 0;
        const netChange = lastWinAmount - lastBetAmount;

        if (netChange > 0) {
            // WIN: Reduce multiplier (Semi-reset)
            state.multiplier = Math.max(1, state.multiplier - 1);
            
            // Check Session Target (Reset if profit >= 20 units)
            const currentSessionProfit = bankroll - state.sessionStartBankroll;
            if (currentSessionProfit >= (20 * baseUnit)) {
                state.multiplier = 1;
                state.sessionStartBankroll = bankroll; // Re-anchor session
            }
        } else {
            // LOSS: Increase multiplier
            state.multiplier += 1;
        }
    }

    // 4. Calculate Bet Amounts
    // Ratio: 1 Unit per Split, 5 Units on Column
    // This ensures Column win returns 15 units vs 13 cost (+2 profit)
    // Split win returns 18 units vs 13 cost (+5 profit)
    
    let splitBetAmount = baseUnit * state.multiplier;
    let columnBetAmount = (baseUnit * 5) * state.multiplier;

    // 5. Clamp to Limits
    splitBetAmount = Math.max(splitBetAmount, config.betLimits.min);
    splitBetAmount = Math.min(splitBetAmount, config.betLimits.max);

    columnBetAmount = Math.max(columnBetAmount, config.betLimits.minOutside);
    columnBetAmount = Math.min(columnBetAmount, config.betLimits.max);

    // Stop betting if we can't afford the total bet
    const totalRequired = (splitBetAmount * splitPairs.length) + columnBetAmount;
    if (totalRequired > bankroll) {
        // Optional: bet what's left or stop. We'll stop to avoid partial strategy failure.
        return [];
    }

    // 6. Construct Bets
    const bets = [];

    // Add Split Bets
    splitPairs.forEach(pair => {
        bets.push({
            type: 'split',
            value: pair,
            amount: splitBetAmount
        });
    });

    // Add Column Bet (Column 3 / Top Column)
    // value 3 represents the 3rd column (3, 6, 9...)
    bets.push({
        type: 'column',
        value: 3,
        amount: columnBetAmount
    });

    return bets;
}