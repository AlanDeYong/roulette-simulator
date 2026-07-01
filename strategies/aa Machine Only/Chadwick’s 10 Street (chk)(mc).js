/**
 * DOCUMENTATION: Chadwick's 10 Street Strategy (Corrected)
 * Source: https://youtu.be/snfu9Fuosxk (Channel: The Roulette Master)
 * 
 * Logic:
 * This strategy starts by covering 30 numbers across 10 specific Streets to secure frequent wins.
 * Initial streets are: 4, 7, 10, 13, 16, 19, 22, 25, 28, 31.
 * 
 * Progression:
 * - Initial Bet: 1 unit on each of the 10 streets.
 * - On Loss: Rebet and double the current bet amount on all active streets.
 * - On Win (If NOT at session peak profit): 
 *    - Rebet the current bet amount (do not double, do not reset).
 *    - Remove the winning street from the active bets.
 *    - Maximum of 4 streets can be removed (leaving a minimum of 6 streets active).
 * 
 * Assumptions Made:
 * - On Win (If AT session peak profit): Since the rule explicitly targets what to do if "not at session's peak profit", I am operating on the standard assumption that reaching peak profit resets the strategy back to the initial 10 streets and base 1 unit bet.
 * 
 * Goal:
 * Generate small profits and manage recovery stages by shrinking coverage and maintaining doubled bets until a new peak bankroll is achieved.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State Variables
    const initialStreets = [4, 7, 10, 13, 16, 19, 22, 25, 28, 31];
    const baseUnit = Math.max(config.betLimits.min, 1);
    
    if (!state.initialized) {
        state.streets = [...initialStreets];
        state.currentBetAmount = baseUnit;
        state.peakBankroll = bankroll;
        state.removedCount = 0;
        state.initialized = true;
    }

    // 2. Process Previous Spin
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        
        // Helper to determine the street start number for a winning number
        const getWinningStreetStart = (num) => {
            if (num === 0) return null;
            return Math.floor((num - 1) / 3) * 3 + 1;
        };

        const winningStreet = getWinningStreetStart(lastSpin.winningNumber);
        const won = state.streets.includes(winningStreet);

        if (won) {
            // Check if we have reached or exceeded our peak session bankroll
            if (bankroll >= state.peakBankroll) {
                // AT peak profit: Reset to base state
                state.streets = [...initialStreets];
                state.currentBetAmount = baseUnit;
                state.removedCount = 0;
                state.peakBankroll = bankroll;
            } else {
                // NOT at peak profit: Remove the winning street (max 4 removals)
                if (state.removedCount < 4) {
                    const streetIndex = state.streets.indexOf(winningStreet);
                    if (streetIndex !== -1) {
                        state.streets.splice(streetIndex, 1);
                        state.removedCount++;
                    }
                }
                // Bet amount remains the same for the remaining streets
            }
        } else {
            // On loss: Double up all bets
            state.currentBetAmount *= 2;
        }
    }
    
    // Ensure peak bankroll always tracks the highest point seen
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    // 3. CLAMP TO LIMITS
    let finalBetAmount = state.currentBetAmount;
    if (finalBetAmount < config.betLimits.min) {
        finalBetAmount = config.betLimits.min;
    }
    if (finalBetAmount > config.betLimits.max) {
        finalBetAmount = config.betLimits.max;
    }

    // 4. Construct Bet Array
    let bets = [];
    for (const streetStart of state.streets) {
        bets.push({ 
            type: 'street', 
            value: streetStart, 
            amount: finalBetAmount 
        });
    }

    return bets;
}