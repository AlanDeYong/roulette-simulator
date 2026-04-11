/**
 * Source: "The 'Diamondback' Strategy: Venomous 8:1 Payouts" by The Lucky Felt 
 * URL: https://www.youtube.com/watch?v=ybcOF6BhMhw
 *
 * The Logic:
 * - The strategy mimics a coiled snake by placing 5 Corner bets (covering 20 numbers in total).
 * - Base unit starts at the table minimum for inside bets.
 * * The Progression ("Feeding the Loser"):
 * - On a LOSS (no corners hit): Increase the bet amount by 1 unit on ALL 5 corners.
 * - On a WIN (one corner hits, but the overall session is not yet in profit):
 * - The winning corner's bet size remains the SAME (the struck part of the "coil" relaxes).
 * - The other 4 losing corners' bet sizes INCREASE by 1 unit (they get "angry/fed").
 * - This progression continues until an inflated losing corner finally hits for an 8:1 payout.
 * * The Goal:
 * - Clear the ledger. The strategy continuously checks the current bankroll against the bankroll 
 * recorded at the start of the current progression cycle. 
 * - Once the bankroll is strictly greater than the starting bankroll (Session Profit > 0), the 
 * strategy resets completely. The "high water mark" is updated, and all bets drop back to base units.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Establish initial base limits and progression increments
    const minBet = config.betLimits.min || 2; 
    const increment = config.incrementMode === 'base' ? minBet : (config.minIncrementalBet || 1);

    // 2. Initialize State for the Session
    if (!state.initialized) {
        state.initialized = true;
        state.sessionStartBankroll = bankroll;
        
        // Define 5 distributed corners via their top-left number.
        // Left column (1, 4, 7...) and Middle column (2, 5, 8...) are valid top-left corner origins.
        state.corners = [
            { value: 1, amount: minBet },  // Covers 1, 2, 4, 5
            { value: 8, amount: minBet },  // Covers 8, 9, 11, 12
            { value: 16, amount: minBet }, // Covers 16, 17, 19, 20
            { value: 26, amount: minBet }, // Covers 26, 27, 29, 30
            { value: 32, amount: minBet }  // Covers 32, 33, 35, 36
        ];
    }

    // 3. Process the results of the previous spin (if any)
    if (spinHistory.length > 0) {
        const lastNumber = spinHistory[spinHistory.length - 1].winningNumber;

        // Goal Check: Did the last spin put us into session profit?
        if (bankroll > state.sessionStartBankroll) {
            // RESET CONDITION MET
            state.sessionStartBankroll = bankroll;
            state.corners.forEach(c => c.amount = minBet);
        } else {
            // Helper to check if the winning number belongs to a specific corner block
            const isNumberInCorner = (num, topLeftValue) => {
                return [topLeftValue, topLeftValue + 1, topLeftValue + 3, topLeftValue + 4].includes(num);
            };

            let winningCornerIndex = -1;
            state.corners.forEach((c, index) => {
                if (isNumberInCorner(lastNumber, c.value)) {
                    winningCornerIndex = index;
                }
            });

            // Progression Execution
            if (winningCornerIndex !== -1) {
                // WIN - But still recovering past losses
                // Winning corner stays exactly where it is. All others get fed.
                state.corners.forEach((c, index) => {
                    if (index !== winningCornerIndex) {
                        c.amount += increment;
                    }
                });
            } else {
                // LOSS - Total miss
                // Feed all losers
                state.corners.forEach(c => c.amount += increment);
            }
        }
    }

    // 4. Construct and clamp the bet array
    let betsToPlace = [];

    state.corners.forEach(c => {
        // Enforce table minimums and maximums
        let finalAmount = Math.max(c.amount, config.betLimits.min);
        finalAmount = Math.min(finalAmount, config.betLimits.max);

        betsToPlace.push({
            type: 'corner',
            value: c.value,
            amount: finalAmount
        });
    });

    return betsToPlace;
}