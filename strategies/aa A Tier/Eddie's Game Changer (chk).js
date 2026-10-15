/**
 * Roulette Strategy: Eddie's "Game Changer" (User Modified - Peak Profit Reset)
 * * Source: https://youtu.be/Prn75S9W-sQ (Channel: The Roulette Master)
 * * The Full Logic in details: 
 * - The strategy places simultaneous bets on 'Black' (Outside) and 'Column 3' (Multiplier).
 * - This combination covers 26 numbers: all black numbers plus all the red numbers in the 3rd column.
 * - The base bet maintains a 2:1 ratio: 2 units on Black and 1 unit on the 3rd Column.
 * - A 'Break Even' occurs when a Red number hits in the 3rd column (Black loses, Column 3 wins 2:1, resulting in net 0).
 * * The Full Bet Progression in details:
 * - Start with the base bets (2 units Black, 1 unit Col 3).
 * - On a Win OR a Loss (any outcome where net profit is not exactly 0), increase both bets by their respective initial base amounts.
 * - On a Break Even (net outcome is exactly 0), keep the bets exactly the same.
 * - Continue this progression until the current sequence reaches a new high-water mark (session peak profit).
 * - Once session peak profit is reached (sequence net profit > 0), reset the progression back to the initial base bets.
 * * The Goal:
 * - To consistently secure new high-water marks in session profit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // Safely determine the minimum outside bet limit (fallback to 'min' or 5 if undefined)
    const minOut = config.betLimits.minOutside || config.betLimits.min || 5;
    
    // Define base units (maintaining the 2:1 ratio for the strategy math to work)
    const baseBlack = minOut * 2;
    const baseCol = minOut;

    // Initialize state variables on the first run
    if (state.localProfit === undefined) {
        state.localProfit = 0;
        state.currentBlackBet = baseBlack;
        state.currentColBet = baseCol;
    }

    // Process the previous spin to determine next progression step
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = parseInt(lastSpin.winningNumber, 10);
        const lastColor = lastSpin.winningColor;

        let netOutcome = 0;
        
        // Deduct the stakes of the last placed bets
        netOutcome -= (state.lastBlackBet || 0);
        netOutcome -= (state.lastColBet || 0);

        // Add payouts for winning conditions
        if (lastColor === 'black') {
            netOutcome += (state.lastBlackBet || 0) * 2; // Black pays 1:1
        }
        
        // Check for 3rd Column win (numbers 3, 6, 9... up to 36)
        if (!isNaN(lastNum) && lastNum !== 0 && lastNum % 3 === 0) { 
            netOutcome += (state.lastColBet || 0) * 3; // Column pays 2:1
        }

        // Update the running profit for the current progression cycle
        state.localProfit += netOutcome;

        // Progression Logic
        if (state.localProfit > 0) {
            // Target achieved: We hit session's peak profit. Reset progression.
            state.localProfit = 0;
            state.currentBlackBet = baseBlack;
            state.currentColBet = baseCol;
        } else {
            // Target not achieved (Not in session's peak profit): 
            // Check if we need to progress or hold
            if (netOutcome !== 0) {
                // User Correction: Increase bets by respective base amounts on both WINS and LOSSES
                state.currentBlackBet += baseBlack;
                state.currentColBet += baseCol;
            }
            // If netOutcome === 0 (Break Even), bets stay exactly the same until peak profit is reached.
        }
    }

    // Safely retrieve max limit (fallback to 500 if undefined)
    const maxLimit = config.betLimits.max || 500;

    // Clamp calculated bets strictly to configured table limits
    state.currentBlackBet = Math.max(minOut, Math.min(state.currentBlackBet, maxLimit));
    state.currentColBet = Math.max(minOut, Math.min(state.currentColBet, maxLimit));

    // Store the intended bets so they can be accurately evaluated on the next spin
    state.lastBlackBet = state.currentBlackBet;
    state.lastColBet = state.currentColBet;

    // Return the bet objects
    return [
        { type: 'black', amount: state.currentBlackBet },
        { type: 'column', value: 3, amount: state.currentColBet }
    ];
}