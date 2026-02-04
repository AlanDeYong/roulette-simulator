/**
 * SOURCE: https://www.youtube.com/watch?v=D5LKvJKVa9w
 * CHANNEL: Bet With Mo
 * * THE LOGIC:
 * This strategy, "Expand the Splits," focuses on the first dozen (1-12). 
 * It starts with a specific set of three split bets. If a loss occurs, it 
 * expands the coverage or increases the units. 
 * * THE PROGRESSION:
 * 1. Level 1: $1 units (clamped to config.min) on 3 splits in the first dozen.
 * 2. Level 2 (After Loss): Re-bet Level 1 and add more split coverage.
 * 3. Level 3+ (After further losses): Double the bet amounts.
 * 4. Recovery: Once reaching higher bet levels (e.g., $2 units), the strategy 
 * requires TWO consecutive wins to "recover" before resetting to Level 1.
 * 5. Reset: Reset to Level 1 after a successful recovery or a win at the base level.
 * * THE GOAL:
 * To grind small, consistent profits from the first dozen using a low-bankroll 
 * friendly progression. 
 */

function bet(spinHistory, bankroll, config, state) {
    // 1. Initialize State
    if (state.level === undefined) {
        state.level = 1;
        state.recoveryWinsNeeded = 0;
        state.currentUnit = config.betLimits.min;
    }

    // 2. Analyze last spin (if exists)
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        
        // Define winning numbers for our specific splits (1-12 area)
        const isWin = (lastNum >= 1 && lastNum <= 12);

        if (isWin) {
            if (state.recoveryWinsNeeded > 0) {
                state.recoveryWinsNeeded--;
                // If we still need more wins to recover, stay at current level
                if (state.recoveryWinsNeeded === 0) {
                    state.level = 1;
                    state.currentUnit = config.betLimits.min;
                }
            } else {
                // Standard win at base level resets everything
                state.level = 1;
                state.currentUnit = config.betLimits.min;
            }
        } else {
            // Loss: Progress to next level
            state.level++;
            
            // Following the video logic:
            // After 2 losses, we move to $2 units and need 2 wins to recover
            if (state.level >= 3) {
                state.currentUnit = config.betLimits.min * 2;
                state.recoveryWinsNeeded = 2;
            }
        }
    }

    // 3. Construct Bets based on Level
    let bets = [];
    const unit = Math.min(state.currentUnit, config.betLimits.max);

    /**
     * The video places splits in the first dozen. 
     * Level 1: 3 splits.
     * Level 2+: Expanded splits or doubled amounts.
     */
    
    // Core splits used in the "Expand the Splits" strategy
    const splitValues = [
        [1, 4], [2, 5], [3, 6],  // Set 1
        [7, 10], [8, 11], [9, 12] // Set 2 (Expanded)
    ];

    if (state.level === 1) {
        // Just the first set of splits
        for (let i = 0; i < 3; i++) {
            bets.push({ type: 'split', value: splitValues[i], amount: unit });
        }
    } else {
        // Level 2 and above: Cover more splits in the dozen
        for (let i = 0; i < splitValues.length; i++) {
            bets.push({ type: 'split', value: splitValues[i], amount: unit });
        }
    }

    // 4. Final Clamp and Validation
    // Ensure total bet doesn't exceed bankroll and individual bets respect max
    let totalBetAmount = bets.reduce((sum, b) => sum + b.amount, 0);
    
    if (totalBetAmount > bankroll) {
        return []; // Practical stop: can't afford the progression
    }

    return bets.map(b => ({
        ...b,
        amount: Math.min(b.amount, config.betLimits.max)
    }));
}