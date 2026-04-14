/**
 * Golden Arrows Strategy (Corrected)
 * * Source: Gamblers University (https://www.youtube.com/watch?v=IL5FiQ8uR6Q)
 *
 * The Logic: 
 * The strategy maps an "arrow" shaped betting pattern onto the dozens.
 * Base pattern (9 units total): 1-4 Split (2u), 4-8 Corner (2u), 5-9 Corner (2u), 3-6 Split (2u), 8-11 Split (1u).
 * * The Progression:
 * - On a loss, the identical pattern is ADDED to the next dozen, while previously placed bets are rebet.
 * (Level 0 = Dozen 1. Level 1 = Dozens 1 & 2. Level 2+ = Dozens 1, 2, & 3).
 * - If losses continue after all 3 dozens are covered, the strategy enters a negative progression 
 * by multiplying the base unit size across all bets to chase the deficit.
 * * The Goal: 
 * "Session High" reset. Any time the bankroll reaches a new absolute high, the entire progression 
 * is wiped clean, and bets immediately return to the base level in the first dozen only.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (state.sessionHigh === undefined) {
        state.sessionHigh = bankroll;
        state.level = 0;
        state.lastBankroll = bankroll;
    }

    // 2. Determine progression based on the previous spin result
    if (spinHistory.length > 0) {
        if (bankroll > state.sessionHigh) {
            // Reached a new session high: Reset everything
            state.sessionHigh = bankroll;
            state.level = 0;
        } else if (bankroll < state.lastBankroll) {
            // Lost the spin: Increase progression level (adds dozens, then adds multipliers)
            state.level++;
        }
    }

    state.lastBankroll = bankroll;

    // 3. Determine Dozens to cover and Multiplier
    let dozensToCover = [];
    let multiplier = 1;

    if (state.level === 0) {
        dozensToCover = [0]; // Cover Dozen 1
    } else if (state.level === 1) {
        dozensToCover = [0, 1]; // Cover Dozens 1 & 2
    } else {
        dozensToCover = [0, 1, 2]; // Cover all 3 Dozens
        
        // Once all 3 dozens are covered, further levels increase the bet multiplier
        // Level 2 -> 1x multiplier, Level 3 -> 2x multiplier, etc.
        multiplier = state.level - 1; 
    }

    // 4. Build the Bets
    const baseUnit = config.betLimits.min; 
    let bets = [];

    dozensToCover.forEach(dozenIndex => {
        const offset = dozenIndex * 12;

        // Define the arrow pattern blueprint for the targeted dozen
        const pattern = [
            { type: 'split', value: [1 + offset, 4 + offset], units: 2 },
            { type: 'corner', value: 4 + offset, units: 2 },  
            { type: 'corner', value: 5 + offset, units: 2 },  
            { type: 'split', value: [3 + offset, 6 + offset], units: 2 },
            { type: 'split', value: [8 + offset, 11 + offset], units: 1 }
        ];

        pattern.forEach(b => {
            // Calculate final bet amount respecting base limits and current multiplier
            let amount = baseUnit * b.units * multiplier;

            // Clamp to maximum limits
            amount = Math.min(amount, config.betLimits.max);

            if (amount >= config.betLimits.min) {
                bets.push({
                    type: b.type,
                    value: b.value,
                    amount: amount
                });
            }
        });
    });

    return bets;
}