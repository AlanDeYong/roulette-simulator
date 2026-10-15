/**
 * SOURCE: The Roulette Master (YouTube) - https://www.youtube.com/watch?v=rJr_fPyxQQE (Timestamp: 22:11)
 * * THE LOGIC: 
 * "Lenny's Second Strategy" (Double Dozen). The strategy identifies the dozen of the last 
 * winning number and places bets on the OTHER two dozens (leaving the last-hitting dozen empty).
 * If a green zero hits, it stays parked on the previously targeted dozens.
 * * THE PROGRESSION:
 * - On a Loss: Increase the bet size by 2 units on EACH of the two dozens.
 * - On a Win: Decrease the bet size by 1 unit on EACH of the two dozens (never dropping below base).
 * * THE GOAL: 
 * To capitalize on the ~64% table coverage of double dozens. The aggressive +2 progression 
 * on a loss is designed to recover losses rapidly when a win hits, steadily working the 
 * unit size back down to the base level to secure profit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (typeof state.currentUnits === 'undefined') {
        state.currentUnits = 1;
        state.targetDozens = [1, 2]; // Default starting dozens if no history exists
    }

    // Helper: Map roulette number to its Dozen (1, 2, or 3). Returns 0 for Green.
    function getDozen(num) {
        if (num >= 1 && num <= 12) return 1;
        if (num >= 13 && num <= 24) return 2;
        if (num >= 25 && num <= 36) return 3;
        return 0; // 0 or 00
    }

    // 2. Evaluate previous spin
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        const lastDozen = getDozen(lastNum);

        // 3. Determine Win/Loss
        let wonLastSpin = false;
        if (state.targetDozens.includes(lastDozen)) {
            wonLastSpin = true;
        }

        // 4. Adjust Progression
        if (wonLastSpin) {
            // Win: Decrease by 1 unit
            state.currentUnits = Math.max(1, state.currentUnits - 1);
        } else {
            // Loss: Increase by 2 units
            state.currentUnits += 2;
        }

        // 5. Update Target Dozens (Exclude the one that just hit)
        // If a 0/00 hit (lastDozen === 0), we do not change the targets
        if (lastDozen !== 0) {
            if (lastDozen === 1) state.targetDozens = [2, 3];
            else if (lastDozen === 2) state.targetDozens = [1, 3];
            else if (lastDozen === 3) state.targetDozens = [1, 2];
        }
    }

    // 6. Calculate Bet Amount
    const baseUnit = config.betLimits.minOutside;
    const increment = config.incrementMode === 'base' ? baseUnit : (config.minIncrementalBet || 1);
    
    // Formula: Base unit + (Current units minus 1) * Increment size
    let amount = baseUnit + ((state.currentUnits - 1) * increment);

    // 7. Clamp to Limits
    amount = Math.max(amount, config.betLimits.minOutside);
    amount = Math.min(amount, config.betLimits.max);

    // 8. Bankroll Check: We are placing TWO bets of 'amount'. 
    if (bankroll < (amount * 2)) {
        return []; 
    }

    // 9. Return Bet Objects
    return [
        { type: 'dozen', value: state.targetDozens[0], amount: amount },
        { type: 'dozen', value: state.targetDozens[1], amount: amount }
    ];
}