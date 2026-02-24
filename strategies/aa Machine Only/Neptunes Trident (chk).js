/**
 * Strategy: Neptune's Trident
 * * Source: https://youtu.be/V77CZuJkJlE?si=YPwjO81SOien_NwE (Channel: The Lucky Felt)
 * * The Logic: 
 * This strategy casts a wide, 3-pronged net covering exactly 19 numbers across all three dozens:
 * - 1st Dozen: 2 Corner bets (Heavy weight: 5 units each)
 * - 2nd Dozen: 2 Street bets (Medium weight: 5 units each)
 * - 3rd Dozen: 5 Straight-up number bets (Light weight: 1 unit each)
 * * The Progression: 
 * A D'Alembert-style aggressive progression. 
 * - On a Loss: Increase the wager on every position. By default ('base' mode), it adds the 
 * original base amount to each bet (e.g., a $10 bet becomes $20, then $30).
 * - On a Win (without session profit): The bet amounts remain flat (re-bet).
 * - On a Win (with new session profit): Reset all bets back to their original base units.
 * * The Goal: 
 * To claw out of negative variance using the aggressive progression and achieve a new 
 * session high bankroll (profit target > 0), at which point the sequence resets.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const minInside = config.betLimits.min;
    const maxLimit = config.betLimits.max;

    // Define the base betting structure and ratios
    // Corners and Streets use 5x the base unit. Numbers use 1x the base unit.
    const baseBets = [
        { type: 'corner', value: 1,  amount: 5 * minInside }, // Covers 1, 2, 4, 5
        { type: 'corner', value: 8,  amount: 5 * minInside }, // Covers 8, 9, 11, 12
        { type: 'street', value: 16, amount: 5 * minInside }, // Covers 16, 17, 18
        { type: 'street', value: 19, amount: 5 * minInside }, // Covers 19, 20, 21
        { type: 'number', value: 26, amount: 1 * minInside }, // Straight up
        { type: 'number', value: 28, amount: 1 * minInside }, // Straight up
        { type: 'number', value: 31, amount: 1 * minInside }, // Straight up
        { type: 'number', value: 33, amount: 1 * minInside }, // Straight up
        { type: 'number', value: 35, amount: 1 * minInside }  // Straight up
    ];

    // 1. Initialize State on the first spin
    if (!state.initialized) {
        state.sessionHigh = bankroll;
        state.currentBets = JSON.parse(JSON.stringify(baseBets)); // Deep copy base bets
        state.lastBankroll = bankroll;
        state.initialized = true;
        
        // Clamp initial bets to max limit just in case min * ratio > max
        state.currentBets.forEach(b => b.amount = Math.min(b.amount, maxLimit));
        return state.currentBets;
    }

    // 2. Evaluate Session Profit
    if (bankroll > state.sessionHigh) {
        // We reached a new session high (profit hit)
        state.sessionHigh = bankroll;
        
        // Reset to base bets
        state.currentBets = JSON.parse(JSON.stringify(baseBets));
        state.currentBets.forEach(b => b.amount = Math.min(b.amount, maxLimit));
    } else {
        // 3. Evaluate Win/Loss of the last spin
        // Because any winning hit in this specific layout pays out more than the total 
        // amount wagered across the board, a decrease in bankroll strictly means a loss.
        if (bankroll < state.lastBankroll) {
            // It was a losing spin. Apply progression.
            for (let i = 0; i < state.currentBets.length; i++) {
                let increment = 0;
                
                // Respect the increment mode defined in config
                if (config.incrementMode === 'fixed') {
                    increment = config.minIncrementalBet || 1;
                } else {
                    // Default behavior (base): increase by the position's original base amount
                    increment = baseBets[i].amount; 
                }

                // Increase the bet and clamp to the table maximum
                state.currentBets[i].amount = Math.min(state.currentBets[i].amount + increment, maxLimit);
            }
        }
        // Note: If bankroll >= lastBankroll but NOT > sessionHigh, we won the spin 
        // but haven't recovered all previous losses. We re-bet flat (do nothing).
    }

    // 4. Update tracking state for the next spin
    state.lastBankroll = bankroll;

    // 5. Final Safety Check: Ensure no bet somehow dropped below minimum inside limits
    state.currentBets.forEach(bet => {
        bet.amount = Math.max(bet.amount, minInside);
    });

    return state.currentBets;
}