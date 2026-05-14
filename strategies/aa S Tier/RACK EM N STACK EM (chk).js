/**
 * RACK 'EM & STACK 'EM ROULETTE STRATEGY (CORRECTED)
 * * Source: Gamblers University (YouTube) - https://www.youtube.com/watch?v=Hi4uE7UA1Rk
 * * The Logic:
 * - Observes the last winning number to determine the "core" street.
 * - Places bets on the core street, and flanks it by betting the nearest empty 
 * street to its left and right. 
 * - Wraps around the board if necessary (e.g., left of Street 1 wraps to Street 34. 
 * Note: Street 2 in sequence is the street starting with 4).
 * - On a loss, it ACCUMULATES streets based on the new winning number, skipping 
 * streets already covered, up to a maximum of 9 active streets.
 * - Adds vertical split bets above every active street bet. (Using the internal 
 * splits [s, s+1] and [s+1, s+2] to maintain the 2-splits-per-street ratio).
 * * The Progression:
 * - Base Unit: Streets start at 2x minimum, Splits start at 1x minimum.
 * - ON WIN (Recovery): Maintain current active streets and progression.
 * - ON LOSS: 
 * - If active streets < 9: Add up to 3 new streets based on the hit number.
 * - If active streets == 9: Increase street bets by 1 progression unit.
 * - SPLIT PROGRESSION: When street progression reaches 5x its starting base, 
 * increase the split bets by 1 progression unit.
 * - RESET: When the bankroll reaches a new session high, clear all active 
 * streets and reset to base levels.
 * * The Goal:
 * - Cast a rapidly widening net (up to 27 numbers) on losses to force a win, 
 * then ride the massive table coverage back to a new session high.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State Persistence
    if (state.sessionHigh === undefined) {
        state.sessionHigh = bankroll;
        state.lastBankroll = bankroll;
        state.streetProgression = 1;
        state.splitProgression = 1;
        state.activeStreets = []; // Tracks the starting numbers of covered streets (1, 4, 7... 34)
    }

    // 2. Determine last relevant number
    let lastNum = 16; // Default safe starting point
    for (let i = spinHistory.length - 1; i >= 0; i--) {
        if (spinHistory[i].winningNumber !== 0) {
            lastNum = spinHistory[i].winningNumber;
            break;
        }
    }

    // 3. Evaluate previous spin outcome & handle state
    if (spinHistory.length > 0) {
        if (bankroll > state.sessionHigh) {
            // Target Achieved: New Session High. Reset completely.
            state.sessionHigh = bankroll;
            state.streetProgression = 1;
            state.splitProgression = 1;
            state.activeStreets = []; 
        } else if (bankroll < state.lastBankroll) {
            // Drawdown: Last spin was a loss.
            if (state.activeStreets.length < 9) {
                // Accumulate more streets based on the number that just hit
                let triggerNum = spinHistory[spinHistory.length - 1].winningNumber;
                if (triggerNum === 0) triggerNum = lastNum; // Use last non-zero if 0 hits
                
                let targetStreet = Math.floor((triggerNum - 1) / 3) * 3 + 1;
                
                // Add the winning street if not already covered
                if (!state.activeStreets.includes(targetStreet) && state.activeStreets.length < 9) {
                    state.activeStreets.push(targetStreet);
                }
                
                // Find nearest empty street to the LEFT
                let left = targetStreet;
                while (state.activeStreets.length < 9) {
                    left -= 3;
                    if (left < 1) left = 34; // Wrap to other side of the table
                    if (!state.activeStreets.includes(left)) {
                        state.activeStreets.push(left);
                        break;
                    }
                }
                
                // Find nearest empty street to the RIGHT
                let right = targetStreet;
                while (state.activeStreets.length < 9) {
                    right += 3;
                    if (right > 34) right = 1; // Wrap to other side of the table
                    if (!state.activeStreets.includes(right)) {
                        state.activeStreets.push(right);
                        break;
                    }
                }
            } else {
                // Max coverage reached (9 streets). Now we increase progression size.
                state.streetProgression++;
                
                // Check if we hit the trigger to increment split bets (every 5 street increments)
                if (state.streetProgression >= state.splitProgression * 5) {
                    state.splitProgression++;
                }
            }
        }
        // Note: If bankroll > lastBankroll BUT < sessionHigh, it was a win during recovery.
        // We do not increment, we just hold the current coverage and bet amounts.
    }

    // 4. Populate Initial Coverage (First spin or immediately after a reset)
    if (state.activeStreets.length === 0) {
        let targetStreet = Math.floor((lastNum - 1) / 3) * 3 + 1;
        state.activeStreets.push(targetStreet);
        
        let left = targetStreet - 3;
        if (left < 1) left = 34;
        state.activeStreets.push(left);
        
        let right = targetStreet + 3;
        if (right > 34) right = 1;
        state.activeStreets.push(right);
    }

    // 5. Calculate Bet Amounts
    let baseSplit = config.betLimits.min;
    let baseStreet = config.betLimits.min * 2; 

    let streetAmount = baseStreet * state.streetProgression;
    let splitAmount = baseSplit * state.splitProgression;

    // Clamp strictly to table limits
    streetAmount = Math.max(config.betLimits.min, Math.min(streetAmount, config.betLimits.max));
    splitAmount = Math.max(config.betLimits.min, Math.min(splitAmount, config.betLimits.max));

    // 6. Generate Bets Array
    let bets = [];
    for (let s of state.activeStreets) {
        // Add the street bet
        bets.push({ type: 'street', value: s, amount: streetAmount });
        
        // Add the vertical split bets for the street (e.g., [1,2] and [2,3])
        bets.push({ type: 'split', value: [s, s + 1], amount: splitAmount });
        bets.push({ type: 'split', value: [s + 1, s + 2], amount: splitAmount });
    }

    // 7. Finalize State
    state.lastBankroll = bankroll;

    return bets;
}