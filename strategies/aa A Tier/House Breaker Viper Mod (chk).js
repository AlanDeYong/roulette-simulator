/**
 * Source: VIPER STRATEGIES (https://www.youtube.com/watch?v=-iRoVUVfZNo)
 * Strategy: Stan's House Breaker Modification - Positive Progression Streak Version
 *
 * The Logic:
 * - Covers 8 streets (24 numbers, ~66.6% table coverage).
 * - Starts on the "Left" side (Dozens 1 & 2: Streets 1, 4, 7, 10, 13, 16, 19, 22).
 * - Triggers a side switch to the "Right" side (Dozens 2 & 3: Streets 13, 16, 19, 22, 25, 28, 31, 34) 
 *   upon reaching a new session profit.
 *
 * The Progression (Positive Streak):
 * - On a Loss: All bet amounts remain exactly the same.
 * - On a Win: The specific street that hit REMAINS at its current bet amount.
 *   All other 7 active streets INCREASE by the incremental unit.
 * - On Session Profit: Reset all bets to base unit and switch sides.
 *
 * The Goal:
 * - Capitalize on winning streaks without "martingale" doubling on losses, minimizing deep drawdowns. 
 * - Grinds towards a steady session profit target (e.g., $50) before completing a macro-session.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // Helper function to calculate the starting number of a street for a given winning number
    function getStreetStart(num) {
        if (num === 0 || num === '00' || num === '0') return null;
        let n = parseInt(num);
        return Math.ceil(n / 3) * 3 - 2;
    }

    // Helper function to initialize 8 street bets for a given side
    function initializeBets(side, baseUnit) {
        let streets = side === 'left' 
            ? [1, 4, 7, 10, 13, 16, 19, 22]   // Dozens 1 & 2
            : [13, 16, 19, 22, 25, 28, 31, 34]; // Dozens 2 & 3
            
        let initial = {};
        for (let s of streets) {
            initial[s] = baseUnit;
        }
        return initial;
    }

    // 1. Initialize State on first run
    if (!state.initialized) {
        state.sessionStartBankroll = bankroll;
        state.currentSide = 'left';
        state.baseUnit = config.betLimits.min; 
        state.streetBets = initializeBets(state.currentSide, state.baseUnit);
        state.initialized = true;
    }

    // 2. Process previous spin results (if any)
    if (spinHistory.length > 0) {
        // Check if we hit a new session profit
        if (bankroll > state.sessionStartBankroll) {
            // Profit achieved: Switch sides and reset session
            state.currentSide = state.currentSide === 'left' ? 'right' : 'left';
            state.sessionStartBankroll = bankroll;
            state.streetBets = initializeBets(state.currentSide, state.baseUnit);
        } else {
            // No session profit yet: Apply progression rules based on last spin
            let lastSpin = spinHistory[spinHistory.length - 1];
            let winningStreetStart = getStreetStart(lastSpin.winningNumber);
            
            // Did one of our covered streets win?
            if (winningStreetStart && state.streetBets.hasOwnProperty(winningStreetStart)) {
                // Determine increment amount
                let increment = config.incrementMode === 'base' ? state.baseUnit : (config.minIncrementalBet || 1);
                
                // Win Rule: Winning street stays the same, ALL OTHERS increase
                for (let street in state.streetBets) {
                    if (parseInt(street) !== winningStreetStart) {
                        state.streetBets[street] += increment;
                    }
                }
            }
            // Loss Rule: Do nothing. All bets remain exactly the same.
        }
    }

    // 3. Build and format the bet array based on current state
    let betsToPlace = [];
    
    for (let street in state.streetBets) {
        let amount = state.streetBets[street];
        
        // 4. Clamp to limits
        amount = Math.max(amount, config.betLimits.min);
        amount = Math.min(amount, config.betLimits.max);
        
        betsToPlace.push({
            type: 'street',
            value: parseInt(street),
            amount: amount
        });
    }

    // 5. Return Bets
    return betsToPlace;
}