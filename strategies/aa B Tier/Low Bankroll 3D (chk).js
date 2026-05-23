/**
 * Roulette Strategy: Trend-following Dozens and Evens Delayed Martingale
 * 
 * Source: https://youtu.be/97Ctaer0duw?si=t-_kiTphanzyhRjd (YouTube)
 * 
 * The Logic: 
 * - Bets are placed on either (Low + 1st Dozen) OR (High + 3rd Dozen).
 * - The strategy "rebets on the winning side" by looking at the last winning number. 
 *   If a low number hits, we bet Low/1st Dozen. If a high number hits, we bet High/3rd Dozen.
 * - The base bet is proportional: 3 units on the even-money bet (Low/High) and 2 units on the Dozen.
 * 
 * The Progression:
 * - Delayed Martingale: On every 2 consecutive losses at a given bet level, double up all bets 
 *   (move up 1 multiplier level).
 * - On win: If the bankroll is NOT at a session high, reduce the bet by 1 level down and reset the loss counter.
 * - Reset: Reset completely to base bets (Level 0) whenever a new session high bankroll is reached.
 * 
 * The Goal: 
 * - Slowly build profit by catching streaks on specific halves of the board. The delayed negative 
 *   progression controls drawdown, while the step-down on wins safely recovers losses until a 
 *   session high is reached.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State Variables on the first spin
    if (state.sessionHigh === undefined) {
        state.sessionHigh = bankroll;
        state.level = 0;           // Multiplier level: 0=1x, 1=2x, 2=4x, etc.
        state.lossCount = 0;       // Tracks losses at the current progression level
        state.currentSide = 'low'; // Start with Low / 1st Dozen by default
        state.lastBankroll = bankroll;
    }

    // 2. Process the previous spin's result
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;
        
        // Rebet on the winning side (trend follow)
        if (num >= 1 && num <= 18) {
            state.currentSide = 'low';
        } else if (num >= 19 && num <= 36) {
            state.currentSide = 'high';
        }
        // If 0 hits, the currentSide remains unchanged.
        
        // Determine Win/Loss based on bankroll change
        if (bankroll > state.lastBankroll) {
            // WIN
            if (bankroll >= state.sessionHigh) {
                // Reset whenever session high is reached
                state.level = 0;
                state.lossCount = 0;
            } else {
                // Reduce bet 1 level down
                state.level = Math.max(0, state.level - 1);
                state.lossCount = 0; // Reset loss count for the new level
            }
        } else if (bankroll < state.lastBankroll) {
            // LOSS
            state.lossCount++;
            if (state.lossCount >= 2) {
                // On every 2 losses, double up all bets
                state.level++;
                state.lossCount = 0; 
            }
        }
    }
    
    // 3. Update trackers for the next spin evaluation
    state.sessionHigh = Math.max(state.sessionHigh, bankroll);
    state.lastBankroll = bankroll;

    // 4. Calculate Bets
    const unit = config.betLimits.minOutside;
    const multiplier = Math.pow(2, state.level);

    let evenBetAmt = 3 * unit * multiplier;
    let dozenBetAmt = 2 * unit * multiplier;

    // 5. Clamp to Table Limits
    evenBetAmt = Math.min(Math.max(evenBetAmt, config.betLimits.minOutside), config.betLimits.max);
    dozenBetAmt = Math.min(Math.max(dozenBetAmt, config.betLimits.minOutside), config.betLimits.max);

    // 6. Construct and Return Bets
    let bets = [];
    if (state.currentSide === 'low') {
        bets.push({ type: 'low', amount: evenBetAmt });
        bets.push({ type: 'dozen', value: 1, amount: dozenBetAmt });
    } else {
        bets.push({ type: 'high', amount: evenBetAmt });
        bets.push({ type: 'dozen', value: 3, amount: dozenBetAmt });
    }

    return bets;
}