// Assumptions:
// 1. The base modular unit size is mapped to `config.betLimits.minOutside`.
// 2. The strategy bets on "even" (an even-money bet), mirroring the video's gameplay.
// 3. When a winning bet reduces the unit count to 0, the cycle completes and resets back to the initial 10 units.

/**
 * Roulette Strategy: Modular D'Alembert (High Stakes)
 * * Source: https://youtu.be/6tNzB6BDXgI (Ninja Gamblers)
 * * The Full Logic in details:
 * - This strategy uses the D'Alembert progression system, but instead of starting at 1 unit, 
 * it begins with a larger base bet divided into smaller "modular units".
 * - The player places an Even-Money outside bet (the video uses 'Even').
 * - A standard session starts by betting 10 modular units. 
 * * The Full Bet Progression in details:
 * - Initial Bet: 10 units.
 * - On a Win: Decrease the bet by 1 unit.
 * - On a Loss: Increase the bet by 1 unit.
 * - Cycle Reset: If the required bet drops to 0 units (which happens after winning a 1-unit bet), the sequence resets back to the 10-unit base bet.
 * * The Goal:
 * - The video outlines a fixed Take-Profit of +80 units ($400 profit on $5 units) and a Stop-Loss of -100 units ($500 loss).
 * - This function focuses purely on the mathematical progression. Bankroll exhaustion natively handles the stop-loss, while the simulator can be manually stopped at the take-profit target.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine the base modular unit
    const unit = config.betLimits.minOutside;

    // 2. Initialize State
    if (state.units === undefined) {
        state.units = 10; // Start the progression with 10 modular units
    }

    // 3. Adjust progression based on the last spin result
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;
        
        // Determine if the last 'even' bet won
        // Note: 0 and 00 are losses for even-money bets
        const isWin = (num > 0 && num % 2 === 0);

        if (isWin) {
            state.units -= 1; // Decrease by 1 unit on win
        } else {
            state.units += 1; // Increase by 1 unit on loss
        }

        // Reset the cycle back to 10 units if it drops all the way down
        if (state.units <= 0) {
            state.units = 10;
        }
    }

    // 4. Calculate Bet Amount
    let amount = unit * state.units;

    // 5. Clamp to Table Limits
    amount = Math.max(amount, config.betLimits.minOutside);
    amount = Math.min(amount, config.betLimits.max);

    // 6. Return Bet
    return [{ type: 'even', amount: amount }];
}