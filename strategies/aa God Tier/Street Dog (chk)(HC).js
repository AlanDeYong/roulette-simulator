/**
 * Street Dog Strategy (Hot Streets Modification)
 * * Source: https://youtu.be/DVeYLhWW6oc (The Roulette Master)
 * * The Full Logic in details:
 * - This strategy places inside bets on "Streets" (rows of 3 numbers).
 * - Wait Period: Observes the first 37 spins without betting to collect data.
 * - Base Mode: Calculates the frequencies of hits for all streets over the last 37 spins. 
 * Places a base unit bet on the 6 hottest streets.
 * - Recovery Mode: If a loss occurs, shifts into recovery mode to safely regain lost bankroll.
 * * The Full Bet Progression in details:
 * - Initial Bet: Bet 1 base unit on each of the 6 hottest streets from the past 37 spins.
 * - After a Loss: Add 1 new unused street (the next hottest based on the last 37 spins) to active bets, 
 * AND increase the bet amount on ALL active streets by 1 increment.
 * - After a Win (while in Recovery Mode): Remove the specific street that just won from the active bets. 
 * Do NOT change the bet amount per street.
 * * The Goal:
 * - Target Profit / Take Profit: Reach a new all-time high session bankroll. Once the current bankroll 
 * exceeds the reference bankroll, lock in the profit and reset completely to Base Mode 
 * (recalculating the 6 hottest streets from the latest 37 spins at 1 base unit).
 * - Stop-Loss: Driven entirely by table max limits and available bankroll.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Wait for 37 spins to establish hot/cold numbers
    if (spinHistory.length < 37) {
        return [];
    }

    // 2. Determine base unit and increment logic
    const baseUnit = config.betLimits.min;
    const increment = config.incrementMode === 'base' ? baseUnit : (config.minIncrementalBet || 1);

    // Helper to calculate hot streets based on the last 37 spins
    function getHotStreets(history) {
        const last37 = history.slice(-37);
        const streetCounts = { 1: 0, 4: 0, 7: 0, 10: 0, 13: 0, 16: 0, 19: 0, 22: 0, 25: 0, 28: 0, 31: 0, 34: 0 };
        
        for (const spin of last37) {
            const num = spin.winningNumber;
            if (num === 0 || num === '00') continue; // 0 doesn't belong to a standard 3-number street
            
            const streetStart = Math.floor((num - 1) / 3) * 3 + 1;
            if (streetCounts[streetStart] !== undefined) {
                streetCounts[streetStart]++;
            }
        }
        
        // Sort by frequency descending.
        return Object.keys(streetCounts)
            .map(Number)
            .sort((a, b) => streetCounts[b] - streetCounts[a]);
    }

    // 3. Initialize State
    if (state.referenceBankroll === undefined) {
        state.referenceBankroll = bankroll;
        state.activeStreets = getHotStreets(spinHistory).slice(0, 6);
        state.betLevel = 1;
        state.historyCount = spinHistory.length; 
    } 
    // 4. Process the last spin if there is a new one in the history
    else if (spinHistory.length > state.historyCount) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winNum = lastSpin.winningNumber;
        
        // Determine if we won, and specifically which street won
        let won = false;
        let winningStreet = null;
        for (const street of state.activeStreets) {
            if (winNum >= street && winNum <= street + 2) {
                won = true;
                winningStreet = street;
                break;
            }
        }

        // Evaluate session profit to see if we reached a new session high
        const sessionProfit = bankroll - state.referenceBankroll;

        if (sessionProfit > 0) {
            // Goal Reached! Reset to Base Mode with the newly calculated hottest streets
            state.referenceBankroll = bankroll;
            state.activeStreets = getHotStreets(spinHistory).slice(0, 6);
            state.betLevel = 1;
        } else {
            // Still in Recovery Mode
            if (won) {
                // Win in recovery mode: Remove the winning street from active coverage
                state.activeStreets = state.activeStreets.filter(s => s !== winningStreet);
            } else {
                // Loss: Add next hottest unused street and increase the bet level for all streets
                const hotStreetsList = getHotStreets(spinHistory);
                const unusedStreets = hotStreetsList.filter(s => !state.activeStreets.includes(s));
                if (unusedStreets.length > 0) {
                    state.activeStreets.push(unusedStreets[0]);
                }
                state.betLevel += 1;
            }
            
            // Safety fallback: if active streets array empties without hitting profit goal, force reset
            if (state.activeStreets.length === 0) {
                state.referenceBankroll = bankroll;
                state.activeStreets = getHotStreets(spinHistory).slice(0, 6);
                state.betLevel = 1;
            }
        }

        state.historyCount = spinHistory.length;
    }

    // 5. Calculate Bet Amount
    let amount = baseUnit + ((state.betLevel - 1) * increment);

    // CLAMP TO LIMITS (Crucial requirement)
    amount = Math.max(amount, config.betLimits.min); 
    amount = Math.min(amount, config.betLimits.max);

    // 6. Build and Return Bets
    const bets = [];
    for (const street of state.activeStreets) {
        bets.push({ type: 'street', value: street, amount: amount });
    }

    return bets;
}