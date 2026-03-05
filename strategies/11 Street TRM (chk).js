/**
 * STRATEGY: 11 Street Roulette (First Spin Trigger)
 * * Source: https://www.youtube.com/watch?v=I9EGlIPj2GQ
 * Channel: The Roulette Master
 * * THE LOGIC:
 * 1. TRIGGER: This strategy remains IDLE for the very first spin. The result of that 
 * first spin determines the first street to exclude.
 * 2. SELECTION: Bet on 11 out of 12 streets. Always exclude the street that 
 * contains the most recent winning number.
 * 3. PROGRESSION: 
 * - On Loss: Go up by 1 unit (minInside).
 * - On Win (if not in session profit): Decrease the number of streets (10, 9, 8...) 
 * and increase unit size to accelerate recovery.
 * 4. RESET: Once bankroll >= target profit, reset to 11 streets at the base unit.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    const minInside = config.betLimits.min;
    const maxBet = config.betLimits.max;
    const increment = config.minIncrementalBet || 1;

    // 1. Mandatory First Spin Check
    // We wait for the first spin to complete before initializing or betting.
    if (spinHistory.length === 0) {
        return []; 
    }

    // 2. Initialize State
    if (state.targetProfit === undefined) {
        state.targetProfit = bankroll + (minInside * 10); 
        state.currentUnit = minInside;
        state.activeStreetsCount = 11;
        state.lastAvoidedStreet = null;
    }

    // 3. Process Last Result
    const lastSpin = spinHistory[spinHistory.length - 1];
    const lastNum = lastSpin.winningNumber;
    
    // Calculate the street starting number (1, 4, 7... up to 34). 0 is treated as its own entity.
    const lastStreet = lastNum === 0 ? 0 : Math.floor((lastNum - 1) / 3) * 3 + 1;

    // Check if we were active and if we won
    if (state.activeStreets) {
        const wonLastSpin = state.activeStreets.includes(lastStreet);

        if (bankroll >= state.targetProfit) {
            // Success: Reset progression
            state.currentUnit = minInside;
            state.activeStreetsCount = 11;
            state.targetProfit = bankroll + (minInside * 10);
        } else if (!wonLastSpin) {
            // Loss: Increase unit, return to high coverage (11 streets) for safety
            state.currentUnit += increment;
            state.activeStreetsCount = 11; 
        } else {
            // Win (Recovery): Aggressively reduce streets to increase payout multiplier
            state.activeStreetsCount = Math.max(state.activeStreetsCount - 1, 6);
            state.currentUnit += increment;
        }
    }
    
    state.lastAvoidedStreet = lastStreet;

    // 4. Determine Streets to Bet On
    const allStreets = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];
    let streetsToBet = [];
    
    // Find index of the street to avoid based on the last result
    const avoidedIndex = allStreets.indexOf(state.lastAvoidedStreet);
    
    // If last result was 0, it's not in our 'allStreets' array, so we just pick the first 11
    const startIndex = (avoidedIndex === -1) ? 0 : (avoidedIndex + 1) % allStreets.length;

    for (let i = 0; i < state.activeStreetsCount; i++) {
        streetsToBet.push(allStreets[(startIndex + i) % allStreets.length]);
    }

    state.activeStreets = streetsToBet;

    // 5. Build Final Bets
    const finalBets = streetsToBet.map(streetStart => ({
        type: 'street',
        value: streetStart,
        amount: Math.min(Math.max(state.currentUnit, minInside), maxBet)
    }));

    // 6. Bankroll Safeguard
    const totalWager = finalBets.reduce((sum, b) => sum + b.amount, 0);
    return (totalWager > bankroll) ? [] : finalBets;
}