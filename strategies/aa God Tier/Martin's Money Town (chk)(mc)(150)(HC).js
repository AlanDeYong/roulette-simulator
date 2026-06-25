/**
 * MODIFIED Martin's Money Town Roulette System (Hot Streets Tracker)
 * Source: https://youtu.be/gE8gzRC_KlE (The Roulette Master) - Modified per user request
 * * * The Full Logic in details:
 * - Observation Phase: The strategy waits and observes the first 37 spins without betting.
 * - Hot Street Selection: After 37 spins, it counts the occurrences of numbers within all 12 streets. 
 * It selects the 9 "hottest" streets (the ones that hit the most) to bet on.
 * - A "session bankroll target" tracks the highest profit point.
 * - If a win occurs at the base level, profit is secured, the target updates, and a NEW set of 9 hot 
 * streets is calculated using the most recent 37 spins.
 * - A loss triggers the "recovery" phase.
 * * * The Full Bet Progression in details:
 * - Base Level: 1 base unit per street.
 * - Recovery Phase (Triggered by a loss):
 * 1. Every spin (win or loss) increases the bet unit by 1 on all 9 active streets.
 * 2. MODIFICATION: Bets are locked in. The strategy NO LONGER removes winning streets. It keeps betting 
 * on the exact same 9 hot streets until the entire recovery is complete.
 * * * The Goal:
 * - Continue the +1 unit recovery progression until the current bankroll surpasses the `sessionBankrollTarget`.
 * - Once session profit is achieved (a Reset), completely reset back to base units and recalculate a fresh 
 * set of 9 hottest streets using the last 37 spins.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // Helper function to find the top 'count' hottest streets based on spin history
    function getHottestStreets(spins, count) {
        // Initialize an array to track hit counts for all 12 streets
        const streets = [];
        for (let i = 0; i < 12; i++) {
            streets.push({ start: (i * 3) + 1, count: 0 });
        }
        
        // Count occurrences
        for (let i = 0; i < spins.length; i++) {
            const num = parseInt(spins[i].winningNumber, 10);
            if (!isNaN(num) && num >= 1 && num <= 36) {
                const streetIndex = Math.floor((num - 1) / 3);
                if (streets[streetIndex]) {
                    streets[streetIndex].count++;
                }
            }
        }
        
        // Sort streets by hit count (descending). 
        // Secondary sort by starting number to ensure deterministic behavior on ties.
        streets.sort((a, b) => {
            if (b.count !== a.count) return b.count - a.count;
            return a.start - b.start; 
        });
        
        // Extract the start numbers of the top 'count' streets
        const selected = [];
        for (let i = 0; i < count; i++) {
            selected.push(streets[i].start);
        }
        
        // Sort numerically for neatness
        selected.sort((a, b) => a - b);
        return selected;
    }

    // 1. Safely extract config limits with fallbacks
    const limits = (config && config.betLimits) ? config.betLimits : { min: 1, max: 500 };
    const minInside = typeof limits.min === 'number' ? limits.min : 1;
    const maxInside = typeof limits.max === 'number' ? limits.max : 500;

    // 2. Observation Phase: Wait for 37 spins before placing the first bet
    if (!spinHistory || spinHistory.length < 37) {
        state.placedBetLastSpin = false;
        return []; 
    }

    // 3. Initialization (Triggered exactly after 37 spins are observed)
    if (!state.activeStreets) {
        state.activeStreets = getHottestStreets(spinHistory.slice(0, 37), 9);
        state.currentUnit = 1;
        state.sessionBankrollTarget = bankroll;
        state.inRecovery = false;
        state.placedBetLastSpin = false; // We haven't actually risked money yet
    }

    // 4. Process the previous spin ONLY if we had an active bet on the table
    if (state.placedBetLastSpin && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNumber = parseInt(lastSpin.winningNumber, 10);
        
        let won = false;
        if (!isNaN(lastNumber) && lastNumber > 0 && lastNumber <= 36) {
            for (let i = 0; i < state.activeStreets.length; i++) {
                const street = state.activeStreets[i];
                if (lastNumber >= street && lastNumber <= street + 2) {
                    won = true;
                    break;
                }
            }
        }

        if (!state.inRecovery) {
            // At base level
            if (won) {
                // Secure profit, reset target, and recalculate hot streets based on new high
                state.sessionBankrollTarget = bankroll;
                state.activeStreets = getHottestStreets(spinHistory.slice(-37), 9);
            } else {
                // Lost at base level, trigger recovery progression
                state.inRecovery = true;
                state.currentUnit++;
            }
        } else {
            // In recovery progression
            if (bankroll > state.sessionBankrollTarget) {
                // Session Profit Achieved! Escaped recovery.
                state.sessionBankrollTarget = bankroll;
                state.currentUnit = 1;
                state.inRecovery = false;
                // Recalculate hottest streets using the LAST 37 spins for the next run
                state.activeStreets = getHottestStreets(spinHistory.slice(-37), 9);
            } else {
                // Still recovering. Bets are locked in (no streets removed).
                state.currentUnit++;
            }
        }
    }

    // 5. Calculate Bet Amount based on Increment Mode safely
    let increment = minInside;
    if (config && config.incrementMode === 'fixed') {
        increment = typeof config.minIncrementalBet === 'number' ? config.minIncrementalBet : minInside;
    }
    
    // Calculate total amount based on the current progression unit
    const unitMultiplier = Math.max(0, state.currentUnit - 1);
    let amount = minInside + (unitMultiplier * increment);

    // 6. Clamp to Limits rigidly
    if (Number.isNaN(amount) || amount < minInside) {
        amount = minInside;
    }
    if (amount > maxInside) {
        amount = maxInside;
    }

    // 7. Generate Bets
    const bets = [];
    for (let i = 0; i < state.activeStreets.length; i++) {
        bets.push({ type: 'street', value: state.activeStreets[i], amount: amount });
    }

    // Mark that we placed a bet, so we process it on the next run
    state.placedBetLastSpin = true;
    
    return bets;
}