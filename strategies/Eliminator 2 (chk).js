/**
 * Source: The Roulette Factory (YouTube) - "One Of The BEST I've seen! Street Bet Strategy..."
 * * The Logic: "The Eliminator" is a low-roller street bet strategy that starts by covering 8 streets 
 * (24 numbers) on the low/mid sections of the board (Streets 1 through 22). It relies on a high 
 * base win rate to sustain the bankroll.
 * * The Progression: This is a Positive Progression strategy with a "Recovery Mode".
 * - Base State (Tier 1): Cover 8 streets with 1 unit each.
 * - Win at Base: Keep betting base.
 * - Loss at Base: Enter "Recovery Mode". Hold the current bet amount and coverage. Do not increase.
 * - In Recovery Mode:
 * - On Loss: Hold bet (Flat bet, do not chase the loss).
 * - On Win:
 * a) If Bankroll >= Session High: Reset to Base State (exit recovery).
 * b) If still down & Coverage > 5 streets: "Peel off" (remove) 1 street and increase the bet on the remaining streets by 1 unit.
 * c) If still down & Coverage <= 5 streets: Reset coverage back to 8 streets and enter the next "Tier" (Base bet becomes 2 units, then 3, etc.).
 * * The Goal: Achieve consistent new session profit highs while minimizing severe drawdowns by 
 * flat-betting through losing streaks and capitalizing on winning streaks.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Define Strategy Constants
    const baseUnit = config.betLimits.min; 
    const baseStreets = [1, 4, 7, 10, 13, 16, 19, 22]; // Covers numbers 1 through 24

    // 2. Initialize State on first run
    if (!state.initialized) {
        state.sessionHigh = bankroll;
        state.tier = 1;
        state.isRecovery = false;
        state.activeStreets = [...baseStreets];
        state.currentBetUnits = state.tier;
        state.initialized = true;
    }

    // 3. Evaluate Previous Spin
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        
        // Check if we hit a new session high (evaluated post-payout)
        if (bankroll > state.sessionHigh) {
            state.sessionHigh = bankroll;
        }

        // Determine if the last bet won
        let wonLast = false;
        let num = lastSpin.winningNumber;
        
        // Check if the winning number falls within any of our previously active streets
        if (num !== 0 && num !== '00') {
            for (let street of (state.lastActiveStreets || [])) {
                if (num >= street && num <= street + 2) {
                    wonLast = true;
                    break;
                }
            }
        }

        // Progression Logic Engine
        if (!state.isRecovery) {
            if (!wonLast) {
                // Start recovery on first loss
                state.isRecovery = true;
            }
        } else {
            // We are currently in Recovery Mode
            if (wonLast) {
                if (bankroll >= state.sessionHigh) {
                    // Fully recovered! Reset to Base State
                    state.isRecovery = false;
                    state.tier = 1;
                    state.activeStreets = [...baseStreets];
                    state.currentBetUnits = state.tier;
                } else {
                    // Won, but still in the hole. Advance positive progression.
                    if (state.activeStreets.length > 5) {
                        // Peel off the highest street and increase bet on the remaining
                        state.activeStreets.pop(); 
                        
                        // Increment bet based on config rules
                        let increment = config.incrementMode === 'base' ? state.tier : (config.minIncrementalBet || 1);
                        state.currentBetUnits += increment;
                    } else {
                        // Hit the minimum coverage floor (5 streets). Reset coverage and Tier Up.
                        state.tier += 1;
                        state.activeStreets = [...baseStreets];
                        state.currentBetUnits = state.tier;
                    }
                }
            }
            // If lost during recovery, we do nothing (hold current bets and coverage)
        }
    }

    // 4. Calculate and Clamp Bets
    let amount = state.currentBetUnits * baseUnit;
    amount = Math.max(amount, config.betLimits.min); // Ensure at least minimum limit
    amount = Math.min(amount, config.betLimits.max); // Ensure it doesn't exceed maximum table limit

    // 5. Construct Bet Array
    let bets = [];
    for (let street of state.activeStreets) {
        bets.push({ type: 'street', value: street, amount: amount });
    }

    // Save state for next spin's win validation
    state.lastActiveStreets = [...state.activeStreets];

    return bets;
}