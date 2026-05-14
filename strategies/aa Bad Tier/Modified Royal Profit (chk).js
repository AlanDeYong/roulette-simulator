/*
 * Strategy Name: The One (Modified Royal Profit)
 * Source: The Roulette Master (https://www.youtube.com/watch?v=_I-sdug1n24)
 * * The Logic:
 * - Observe the last 3 numbers hit. Identify their corresponding streets (rows).
 * - Phase 1 (24 numbers): Place bets on 8 streets, excluding the streets of the last 3 numbers hit.
 * - Phase 2 (21 numbers): If Phase 1 wins, remove the street that just hit, dropping the coverage to 7 streets.
 * - If Phase 2 wins, the cycle completes and resets back to Phase 1.
 * * The Progression:
 * - Uses a Fibonacci sequence for losses: 1, 2, 3, 5, 8, 13, 21... multiplied by the base unit.
 * - If a loss occurs in Phase 1 or Phase 2: Stay in the current phase (keep the same 8 or 7 streets) and move 1 step UP the Fibonacci sequence.
 * - If a win occurs in Phase 1: Move to Phase 2 (drop to 7 streets), but KEEP the current Fibonacci bet level.
 * - If a win occurs in Phase 2: RESET the progression completely back to Phase 1, Fibonacci level 0, and pick 8 new streets based on the latest 3 hits.
 * * The Goal: 
 * - Safe, prolonged bankroll management. The goal is to catch a win on Phase 2 (21 numbers) to reset the progression and lock in profit, absorbing losses through Fibonacci rather than aggressive Martingale doubling.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // The strategy requires observing the last 3 spins to determine excluded streets.
    if (spinHistory.length < 3) {
        return [];
    }

    // 1. Determine Base Unit & Fibonacci Sequence
    const unit = config.betLimits.min; 
    const fibSequence = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597];

    // 2. Initialize State
    if (state.phase === undefined) {
        state.phase = 1; // Phase 1 = 8 streets, Phase 2 = 7 streets
        state.fibIndex = 0;
        state.currentStreets = [];
    }

    const lastSpin = spinHistory[spinHistory.length - 1];
    const lastNum = lastSpin.winningNumber;

    // 3. Evaluate Outcome of Previous Bet
    if (state.currentStreets.length > 0) {
        // Check if the last number hit within any of our covered streets
        // A street starting at X covers X, X+1, X+2
        const hitStreet = state.currentStreets.find(s => lastNum >= s && lastNum <= s + 2);
        const outcome = hitStreet ? 'win' : 'loss';

        if (outcome === 'win') {
            if (state.phase === 1) {
                // Won Phase 1 -> Move to Phase 2, remove the winning street, maintain Fibonacci level
                state.phase = 2;
                state.currentStreets = state.currentStreets.filter(s => s !== hitStreet);
            } else if (state.phase === 2) {
                // Won Phase 2 -> Goal achieved. Reset progression and streets entirely.
                state.phase = 1;
                state.fibIndex = 0;
                state.currentStreets = []; 
            }
        } else if (outcome === 'loss') {
            // Lost -> Increase Fibonacci index, stay in current phase/streets
            state.fibIndex = Math.min(state.fibIndex + 1, fibSequence.length - 1);
        }
    }

    // 4. Populate Streets for Phase 1 (if starting fresh or just reset)
    if (state.phase === 1 && state.currentStreets.length === 0) {
        const allStreets = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];
        
        // Extract the last 3 winning numbers
        const last3Numbers = spinHistory.slice(-3).map(s => s.winningNumber);
        
        // Determine the street starting numbers for those last 3 hits
        const excludedStreets = last3Numbers.map(n => {
            // Treat 0 and 00 as standalone; they don't belong to the 12 standard streets
            if (n === 0 || n === '00') return null; 
            return Math.floor((n - 1) / 3) * 3 + 1;
        }).filter(s => s !== null);

        // Filter out the excluded streets
        let availableStreets = allStreets.filter(s => !excludedStreets.includes(s));

        // Select the first 8 available streets
        state.currentStreets = availableStreets.slice(0, 8);
        
        // Failsafe: Ensure we always have 8 streets to bet on in Phase 1
        if (state.currentStreets.length < 8) {
            for (let i = allStreets.length - 1; i >= 0 && state.currentStreets.length < 8; i--) {
                if (!state.currentStreets.includes(allStreets[i])) {
                    state.currentStreets.push(allStreets[i]);
                }
            }
        }
    }

    // 5. Calculate Bet Amount with Progression
    let fibMultiplier = fibSequence[state.fibIndex];
    let amount = unit * fibMultiplier;

    // 6. Clamp to Limits
    amount = Math.max(amount, config.betLimits.min); 
    amount = Math.min(amount, config.betLimits.max);

    // 7. Construct Bet Array
    const bets = [];
    for (const streetStart of state.currentStreets) {
        bets.push({
            type: 'street',
            value: streetStart,
            amount: amount
        });
    }

    return bets;
}