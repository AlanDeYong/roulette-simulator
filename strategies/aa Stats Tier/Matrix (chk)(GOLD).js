/**
 * Strategy: The Matrix
 * Source: The Roulette Master (https://youtu.be/kDP41X31Gs8)
 * 
 * The Full Logic in details:
 * This strategy strictly bets on the 1st Dozen and 3rd Dozen simultaneously on every spin. 
 * The 2nd Dozen is intentionally left blank. 
 * 
 * The Full Bet Progression in details:
 * 1. Base Bet: 1 unit on the 1st Dozen, 1 unit on the 3rd Dozen.
 * 2. On a Win during base bets: The bets remain at 1 unit, and the "peak bankroll" is updated.
 * 3. On a Loss of both dozens (0, 00, or 2nd Dozen): The system enters "Recovery Mode".
 *    - The bet on BOTH dozens increases by 2 units.
 * 4. On a Win during Recovery Mode (but still below the peak bankroll / session profit):
 *    - The dozen that WON stays at its current bet amount.
 *    - The dozen that LOST increases by 2 units.
 * 5. The Goal: 
 *    - The sequence attempts to recover all losses from a streak. 
 *    - The target is to reach or exceed the highest recorded bankroll prior to the losing streak (Session Profit).
 *    - Once this session profit is achieved, both bets immediately reset to the base unit.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit and increment step 
    // Matrix specifically scales up by TWO base increments on losses
    const baseUnit = config.betLimits.minOutside;
    const increment = config.incrementMode === 'base' ? baseUnit : config.minIncrementalBet;
    const step = 2 * increment; 

    // 2. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.inRecovery = false;
        state.bet1 = baseUnit;
        state.bet3 = baseUnit;
        state.peakBankroll = bankroll;
    }

    // 3. Process the last spin to update progression state
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;
        
        // Check which dozens hit
        const win1 = num >= 1 && num <= 12;
        const win3 = num >= 25 && num <= 36;
        const lossBoth = !win1 && !win3; // Falls in 2nd Dozen (13-24), 0, or 00

        if (!state.inRecovery) {
            if (lossBoth) {
                // Just lost both at base level. Enter recovery mode.
                state.inRecovery = true;
                state.bet1 += step;
                state.bet3 += step;
            } else {
                // Won at base level. Bankroll is already updated by the simulator.
                state.peakBankroll = Math.max(state.peakBankroll, bankroll);
                state.bet1 = baseUnit;
                state.bet3 = baseUnit;
            }
        } else {
            // We are currently in recovery mode.
            // Check if we achieved session profit (bankroll recovered to or exceeded our peak)
            if (bankroll >= state.peakBankroll) {
                state.inRecovery = false;
                state.peakBankroll = bankroll;
                state.bet1 = baseUnit;
                state.bet3 = baseUnit;
            } else {
                // Still in recovery. Adjust bets based on the outcome of the last spin.
                if (lossBoth) {
                    // Both lost, increase both dozens by 2 units
                    state.bet1 += step;
                    state.bet3 += step;
                } else if (win1) {
                    // 1st dozen won, so increase the 3rd dozen (the loser) by 2 units
                    state.bet3 += step;
                    // 1st dozen stays at its current bet amount
                } else if (win3) {
                    // 3rd dozen won, so increase the 1st dozen (the loser) by 2 units
                    state.bet1 += step;
                    // 3rd dozen stays at its current bet amount
                }
            }
        }
    }

    // 4. Clamp Bets to Limits
    // Ensure we never bet below minimum outside limits or above the maximum limit
    state.bet1 = Math.max(state.bet1, config.betLimits.minOutside);
    state.bet1 = Math.min(state.bet1, config.betLimits.max);
    
    state.bet3 = Math.max(state.bet3, config.betLimits.minOutside);
    state.bet3 = Math.min(state.bet3, config.betLimits.max);

    // 5. Return Bets
    return [
        { type: 'dozen', value: 1, amount: state.bet1 },
        { type: 'dozen', value: 3, amount: state.bet3 }
    ];
}