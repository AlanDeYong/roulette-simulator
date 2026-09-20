/*
 * Strategy Name: Centerfold & Butterfly Splits
 * Source: https://youtu.be/I7hT9vUM0s8 (Native Digital Product)
 * 
 * The Full Logic in details:
 * The strategy utilizes two different 10-chip split betting patterns designed to cover roughly half the wheel each.
 * - "Centerfold Splits" covers 20 numbers mostly on one sector of the wheel.
 * - "Butterfly Splits" covers 20 numbers on the opposite sector of the wheel.
 * Trigger/Condition: The author suggests observing where the ball is landing to pick a side. In this script, we programmatically track this by checking if the last winning number falls into the Butterfly numbers. If it does, we bet Butterfly; otherwise, we default to Centerfold.
 * 
 * The Full Bet Progression in details:
 * Flat Betting. The strategy does not employ a negative or positive progression. It relies on the large board coverage to catch winning clusters, profiting off the split payouts (17:1). Each of the 10 split bets is placed using the minimum inside table limit.
 * 
 * The Goal:
 * To hit consistently by targeting the dealer's active sectors. There is no strict stop-loss or profit target explicitly defined in the source material.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // Define the split pairs for both strategies
    const centerfoldSplits = [
        [2, 3], [4, 7], [5, 8], [11, 12], [15, 18], 
        [16, 17], [19, 22], [20, 21], [31, 34], [32, 33]
    ];

    const butterflySplits = [
        [0, 1], [0, 2], [9, 12], [10, 11], [13, 14], 
        [23, 24], [25, 26], [27, 30], [28, 29], [35, 36]
    ];

    // Array of numbers covered by the Butterfly splits to detect dealer sectors
    const butterflyCoverage = [
        0, 1, 2, 9, 10, 11, 12, 13, 14, 23, 24, 25, 26, 27, 28, 29, 30, 35, 36
    ];

    // Determine which pattern to play based on the last spin (Dealer tracking)
    let activeSplits = centerfoldSplits; // Default to Centerfold

    if (spinHistory.length > 0) {
        const lastWin = spinHistory[spinHistory.length - 1].winningNumber;
        if (butterflyCoverage.includes(lastWin)) {
            activeSplits = butterflySplits;
        }
    }

    // Determine the flat bet amount (clamped to limits)
    let amount = config.betLimits.min;
    amount = Math.max(amount, config.betLimits.min); 
    amount = Math.min(amount, config.betLimits.max);

    // Generate the array of bet objects
    const bets = activeSplits.map(splitPair => {
        return {
            type: 'split',
            value: splitPair,
            amount: amount
        };
    });

    return bets;
}