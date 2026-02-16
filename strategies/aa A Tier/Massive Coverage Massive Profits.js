/**
 * STRATEGY: Massive Coverage, Massive Profits
 * * Source: YouTube - Casino Matchmaker (https://www.youtube.com/watch?v=HXlSfWUnDDE)
 * * The Logic: 
 * - The strategy starts by covering "Massive" territory: 10 out of 12 available streets (30/37 numbers).
 * - A street bet covers 3 numbers. By default, we skip the first street (1,2,3) and last street (34,35,36).
 * - Target: Slow, steady bankroll building through high-probability wins.
 * * The Progression:
 * - WIN: Reset to the base bet amount and restore coverage to 10 streets.
 * - LOSS: A modified Martingale. 
 * 1. Double the base bet amount (per street).
 * 2. Reduce coverage by removing the street that contains the most recent "winning" number (if applicable).
 * 3. To prevent total loss, the strategy stops reducing coverage if it hits a floor (e.g., 8 streets).
 * * The Goal:
 * - Accumulate small $5 units (or 2x min bet units) safely.
 * - Exit after reaching a specific profit target (e.g., 5-10% of bankroll).
 */

function bet(spinHistory, bankroll, config, state) {
    // --- 1. Configuration & Initialization ---
    const MIN_STREETS = 8; // Safety floor: don't reduce coverage below 8 streets
    const MAX_STREETS = 10;
    const baseUnit = config.betLimits.min; // Street is an inside bet
    
    // Define the 12 possible streets by their starting numbers
    const allStreets = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];

    // Initialize State
    if (state.activeStreets === undefined) {
        // Start with middle 10 streets (skipping 1 and 34 as per video example)
        state.activeStreets = [4, 7, 10, 13, 16, 19, 22, 25, 28, 31];
        state.multiplier = 1;
        state.initialBankroll = bankroll;
    }

    // --- 2. Analyze Previous Result ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastWinNum = lastSpin.winningNumber;

        // Check if any of our active streets won
        // A street starting at 's' covers [s, s+1, s+2]
        const won = state.activeStreets.some(s => lastWinNum >= s && lastWinNum <= s + 2);

        if (won) {
            // WIN: Reset everything
            state.multiplier = 1;
            state.activeStreets = [4, 7, 10, 13, 16, 19, 22, 25, 28, 31];
        } else {
            // LOSS: Progress
            state.multiplier *= 2;
            
            // Reduce coverage: Remove the street that just "won" (the number that appeared)
            // if it was part of our selection, or just remove the last street in our list
            if (state.activeStreets.length > MIN_STREETS) {
                const streetToRemove = allStreets.find(s => lastWinNum >= s && lastWinNum <= s + 2);
                const index = state.activeStreets.indexOf(streetToRemove);
                
                if (index !== -1) {
                    state.activeStreets.splice(index, 1);
                } else {
                    // If the losing number wasn't in our streets anyway, just drop one to reduce risk/cost
                    state.activeStreets.pop();
                }
            }
        }
    }

    // --- 3. Construct Bets ---
    let currentAmountPerStreet = baseUnit * state.multiplier;
    
    // Clamp to table limits
    currentAmountPerStreet = Math.max(currentAmountPerStreet, config.betLimits.min);
    currentAmountPerStreet = Math.min(currentAmountPerStreet, config.betLimits.max);

    // Stop if bankroll is too low for the full coverage
    const totalBetCost = currentAmountPerStreet * state.activeStreets.length;
    if (bankroll < totalBetCost) {
        return null; // Bust
    }

    // Map active street starts to bet objects
    return state.activeStreets.map(streetStart => ({
        type: 'street',
        value: streetStart,
        amount: currentAmountPerStreet
    }));
}