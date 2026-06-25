/**
 * Martin's Money Town Roulette System
 * Source: https://youtu.be/gE8gzRC_KlE (The Roulette Master)
 * * The Full Logic in details:
 * - Starts with 9 active Street bets (3 in each dozen, covering 27 numbers).
 * - Tracks a "session bankroll target" to know when a new profit high is reached.
 * - If a win occurs at the base level, the profit is secured, the target updates, and you remain at base level.
 * - If a loss occurs, the system enters a "recovery" phase.
 * * The Full Bet Progression in details:
 * - Base Level: 1 base unit per street.
 * - Recovery Phase (Triggered by a loss):
 * 1. Every spin (win or loss) increases the bet unit by 1 on all active streets.
 * 2. If a win occurs during recovery, the winning street is removed from the active bets to concentrate the bankroll. 
 * (It floors at 4 active streets / 12 numbers minimum).
 * * The Goal:
 * - Continue the recovery progression until the current bankroll surpasses the `sessionBankrollTarget`.
 * - Once session profit is achieved, completely reset back to the base level (9 streets at 1 unit).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Safely extract config limits with fallbacks to prevent NaN errors
    const limits = (config && config.betLimits) ? config.betLimits : { min: 1, max: 500 };
    const minInside = typeof limits.min === 'number' ? limits.min : 1;
    const maxInside = typeof limits.max === 'number' ? limits.max : 500;
    
    // 2. Initialize State
    if (typeof state.activeStreets === 'undefined') {
        state.activeStreets = [1, 4, 7, 13, 16, 19, 25, 28, 31];
        state.currentUnit = 1;
        state.sessionBankrollTarget = bankroll;
        state.inRecovery = false;
    }

    // 3. Process the previous spin
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNumber = lastSpin.winningNumber;
        
        let winningStreet = null;
        let won = false;
        
        // Safely check if the last number hit one of our active streets
        if (lastNumber !== 0 && lastNumber !== '00' && lastNumber !== '0') {
            const num = parseInt(lastNumber, 10);
            for (let i = 0; i < state.activeStreets.length; i++) {
                const street = state.activeStreets[i];
                // A street covers the start number, +1, and +2
                if (num >= street && num <= street + 2) {
                    winningStreet = street;
                    won = true;
                    break;
                }
            }
        }

        if (!state.inRecovery) {
            // At base level
            if (won) {
                // Secure profit, raise the target bar
                state.sessionBankrollTarget = bankroll;
            } else {
                // Lost, trigger recovery progression
                state.inRecovery = true;
                state.currentUnit += 1;
            }
        } else {
            // In recovery progression
            if (bankroll > state.sessionBankrollTarget) {
                // Session Profit Achieved! Reset completely to base level.
                state.activeStreets = [1, 4, 7, 13, 16, 19, 25, 28, 31];
                state.currentUnit = 1;
                state.sessionBankrollTarget = bankroll;
                state.inRecovery = false;
            } else {
                // Still recovering
                if (won) {
                    // Remove the winning street, floor at 4 active streets
                    if (state.activeStreets.length > 4) {
                        state.activeStreets = state.activeStreets.filter(s => s !== winningStreet);
                    }
                }
                // ALWAYS increase the bet unit by 1 after any spin in recovery
                state.currentUnit += 1;
            }
        }
    }

    // 4. Calculate Bet Amount based on Increment Mode safely
    let increment = minInside;
    if (config && config.incrementMode === 'fixed') {
        increment = typeof config.minIncrementalBet === 'number' ? config.minIncrementalBet : minInside;
    }
    
    // Ensure state.currentUnit is properly multiplied (avoid NaN)
    const unitMultiplier = Math.max(0, state.currentUnit - 1);
    let amount = minInside + (unitMultiplier * increment);

    // 5. Clamp to Limits rigidly
    if (Number.isNaN(amount) || amount < minInside) {
        amount = minInside;
    }
    if (amount > maxInside) {
        amount = maxInside;
    }

    // 6. Generate Bets
    const bets = [];
    for (let i = 0; i < state.activeStreets.length; i++) {
        bets.push({ type: 'street', value: state.activeStreets[i], amount: amount });
    }

    return bets;
}