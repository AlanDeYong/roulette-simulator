/**
 * Street Dog Strategy
 * * Source: https://youtu.be/DVeYLhWW6oc (The Roulette Master)
 * * The Full Logic in details:
 * - This strategy places inside bets on "Streets" (rows of 3 numbers on the roulette layout).
 * - Base Mode: It begins by placing a base unit bet on 6 distinct, randomly selected streets.
 * - Recovery Mode: If a loss occurs, the strategy shifts into recovery mode to safely regain lost bankroll.
 * * The Full Bet Progression in details:
 * - Initial Bet: Bet 1 base unit on each of 6 randomly selected streets.
 * - After a Loss: Add 1 new (randomly selected, unused) street to the active bets, 
 * AND increase the bet amount on ALL active streets by 1 increment.
 * - After a Win (while in Recovery Mode): The layout shrinks. Remove the specific street that 
 * just won from the active bets. Do NOT change the bet amount per street.
 * * The Goal:
 * - Target Profit / Take Profit: Reach a new all-time high session bankroll. Once the current bankroll 
 * exceeds the reference bankroll, lock in the profit and reset completely to Base Mode 
 * (6 new randomly selected streets at 1 base unit).
 * - Stop-Loss: Driven entirely by table max limits and available bankroll.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit and increment logic
    const baseUnit = config.betLimits.min;
    const increment = config.incrementMode === 'base' ? baseUnit : (config.minIncrementalBet || 1);

    // All valid standard streets in roulette (identified by their lowest number)
    const allStreets = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];

    // Helper to randomly pick 'count' distinct streets from a provided array
    function getRandomStreets(count, available) {
        const shuffled = [...available].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    // 2. Initialize State
    if (state.referenceBankroll === undefined) {
        state.referenceBankroll = bankroll;
        state.activeStreets = getRandomStreets(6, allStreets);
        state.betLevel = 1;
        state.historyCount = 0;
    }

    // 3. Process the last spin if there is a new one in the history
    if (spinHistory.length > state.historyCount) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winNum = lastSpin.winningNumber;
        
        // Determine if we won, and specifically which street won
        let won = false;
        let winningStreet = null;
        for (const street of state.activeStreets) {
            // A street covers value, value+1, and value+2
            if (winNum >= street && winNum <= street + 2) {
                won = true;
                winningStreet = street;
                break;
            }
        }

        // Evaluate session profit to see if we reached a new session high
        const sessionProfit = bankroll - state.referenceBankroll;

        if (sessionProfit > 0) {
            // Goal Reached! Lock in new high and reset to Base Mode with new random streets
            state.referenceBankroll = bankroll;
            state.activeStreets = getRandomStreets(6, allStreets);
            state.betLevel = 1;
        } else {
            // Still in Recovery Mode
            if (won) {
                // Win in recovery mode: Remove the winning street from active coverage
                state.activeStreets = state.activeStreets.filter(s => s !== winningStreet);
            } else {
                // Loss: Add 1 new random unused street and increase the bet level for all streets
                const unusedStreets = allStreets.filter(s => !state.activeStreets.includes(s));
                if (unusedStreets.length > 0) {
                    const newRandomStreet = getRandomStreets(1, unusedStreets)[0];
                    state.activeStreets.push(newRandomStreet);
                }
                state.betLevel += 1;
            }
            
            // Safety fallback: if active streets array empties without hitting profit goal, force reset
            if (state.activeStreets.length === 0) {
                state.referenceBankroll = bankroll;
                state.activeStreets = getRandomStreets(6, allStreets);
                state.betLevel = 1;
            }
        }

        state.historyCount = spinHistory.length;
    }

    // 4. Calculate Bet Amount
    let amount = baseUnit + ((state.betLevel - 1) * increment);

    // CLAMP TO LIMITS (Crucial requirement)
    amount = Math.max(amount, config.betLimits.min); 
    amount = Math.min(amount, config.betLimits.max);

    // 5. Build and Return Bets
    const bets = [];
    for (const street of state.activeStreets) {
        bets.push({ type: 'street', value: street, amount: amount });
    }

    return bets;
}