/**
 * Roulette Strategy: Alternating dozens & columns
 * Source: User modification based on concepts from https://www.youtube.com/watch?v=3lcuCF0C7yw&list=PLGUAp9smAZCCOtZ0fnP_tFSCw5fPzYNa5&index=41 (Timestamp 1:27)
 * 
 * The Full Logic in details:
 * - At the beginning, the strategy randomly chooses to bet on either 2 Dozens or 2 Columns.
 * - On a win: The strategy switches bet types (e.g., from Dozens to Columns). It then identifies 
 *   which Dozen/Column the winning number belonged to, and places bets on the OTHER 2 that did not win.
 * - On a loss: The strategy stays on the exact same bet placements but advances the progression.
 * 
 * The Full Bet Progression in details:
 * - Uses a steep 5-level multiplier progression to recover losses:
 *   - Level 1: 1 unit on each
 *   - Level 2: 4 units on each
 *   - Level 3: 13 units on each
 *   - Level 4: 40 units on each
 *   - Level 5: 121 units on each
 * - After any win, the progression resets to Level 1.
 * - If Level 5 is lost, the progression resets to Level 1 to prevent runaway bankroll destruction.
 * 
 * The Goal:
 * - Maintain a 64.8% win rate per spin by covering nearly 2/3rds of the board.
 * - Recover from consecutive losses using an aggressive tiered progression, resetting safely upon success.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Progression sequence (Multiplier in units)
    const progression = [1, 4, 13, 40, 121];

    // 2. Initialize State on very first run
    if (!state.initialized) {
        state.progIndex = 0;
        // Randomly pick 'dozen' or 'column'
        state.currentType = Math.random() < 0.5 ? 'dozen' : 'column';
        // Randomly pick 2 out of 3 options
        let options = [1, 2, 3];
        options.sort(() => Math.random() - 0.5);
        state.currentBets = [options[0], options[1]];
        state.initialized = true;
    }

    // 3. Evaluate Previous Spin (if any)
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;

        // Check if we won the last spin
        let won = false;
        if (lastNum !== 0 && lastNum !== 37) { // 37 handles double zero (00) if American
            if (state.currentType === 'dozen') {
                const winningDozen = Math.ceil(lastNum / 12);
                if (state.currentBets.includes(winningDozen)) won = true;
            } else if (state.currentType === 'column') {
                const winningColumn = lastNum % 3 === 0 ? 3 : lastNum % 3;
                if (state.currentBets.includes(winningColumn)) won = true;
            }
        }

        // Apply strategy rules based on Win/Loss
        if (won) {
            // Reset progression
            state.progIndex = 0;
            
            // Switch over type
            state.currentType = state.currentType === 'dozen' ? 'column' : 'dozen';
            
            // Bet on the 2 that did NOT win in the new category
            let winVal;
            if (state.currentType === 'dozen') {
                winVal = Math.ceil(lastNum / 12);
            } else {
                winVal = lastNum % 3 === 0 ? 3 : lastNum % 3;
            }
            // Filter out the winning one to leave the 2 that didn't win
            state.currentBets = [1, 2, 3].filter(val => val !== winVal);
            
        } else {
            // Advance progression on loss
            state.progIndex++;
            
            // If we exceed level 5 (index 4), reset to prevent crashing bankroll limits
            if (state.progIndex >= progression.length) {
                state.progIndex = 0;
            }
            // Note: We intentionally keep the same currentType and currentBets on a loss
        }
    }

    // 4. Calculate Bet Amount
    const baseUnit = config.betLimits.minOutside; 
    let amount = baseUnit * progression[state.progIndex];

    // 5. Clamp to Limits
    amount = Math.max(amount, config.betLimits.minOutside); 
    amount = Math.min(amount, config.betLimits.max);

    // 6. Bankroll Protection
    if (bankroll < (amount * 2)) {
        // Drop down to absolute minimum if we cannot afford the progression step
        amount = config.betLimits.minOutside;
        if (bankroll < (amount * 2)) {
            return []; // Stop betting if completely depleted
        }
        // If we had to reduce due to bankroll, reset progression logic
        state.progIndex = 0; 
    }

    // 7. Return Bets
    return [
        { type: state.currentType, value: state.currentBets[0], amount: amount },
        { type: state.currentType, value: state.currentBets[1], amount: amount }
    ];
}