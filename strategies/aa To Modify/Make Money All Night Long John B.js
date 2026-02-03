/**
 * Strategy: "Make Money All Night Long" (John B System)
 * * Source: 
 * Video: "#1 MOST POPULAR NEW ROULETTE SYSTEM!"
 * Channel: The Roulette Master TV
 * URL: https://www.youtube.com/watch?v=sAF-CAI9xmA
 * * The Logic:
 * - Places two Outside bets simultaneously: 1-18 (Low) and Even.
 * - These bets interact in three ways:
 * 1. Win Both (e.g., Number 2): Net Profit.
 * 2. Break Even (e.g., Number 3 is Low/Odd, Number 20 is High/Even): No money lost, no money gained.
 * 3. Total Loss (e.g., Number 21 is High/Odd, or Zero): Loss of both bets.
 * * The Progression:
 * - Base Bet: 1 Unit on 'low', 1 Unit on 'even'.
 * - On "Win Both": Reset to Base Bet (1 Unit).
 * - On "Break Even": Repeat the exact same bet size.
 * - On "Total Loss": Aggressive progression -> Double the previous bet + 1 Unit.
 * (Example: 1u -> 3u -> 7u -> 15u -> 31u...)
 * * The Goal:
 * - Survive the "Total Loss" streaks (High/Odd numbers) and "Break Even" streaks until a "Win Both" (Low/Even number) occurs.
 * - The aggressive progression ensures that a single "Win Both" recovers previous losses plus profit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Define Base Unit
    // The video uses $10, but we use the simulator's defined minimum for outside bets.
    const baseUnit = config.betLimits.minOutside;

    // 2. Initialize State
    if (state.currentUnitCount === undefined) {
        state.currentUnitCount = 1;
    }

    // 3. Process Previous Spin (if not the first spin)
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const number = lastSpin.winningNumber;

        // Define Winning Conditions for our specific bets
        const isLow = (number >= 1 && number <= 18);
        const isEven = (number !== 0 && number % 2 === 0);

        // Logic branching based on outcome
        if (isLow && isEven) {
            // SCENARIO 1: WIN BOTH (e.g., 2, 4, 6... 18)
            // We profit on both spots. Reset to base.
            state.currentUnitCount = 1;
        } else if ((isLow && !isEven) || (!isLow && isEven)) {
            // SCENARIO 2: BREAK EVEN (e.g., 3 is Low/Odd, 20 is High/Even)
            // One won, one lost. Net change is 0. 
            // ACTION: Do not change the bet size. Repeat previous bet.
            // (state.currentUnitCount remains unchanged)
        } else {
            // SCENARIO 3: TOTAL LOSS (e.g., 21 is High/Odd, or 0/00)
            // Both bets lost.
            // ACTION: Double the bet and add 1 unit.
            state.currentUnitCount = (state.currentUnitCount * 2) + 1;
        }
    }

    // 4. Calculate Bet Amount
    let betAmount = baseUnit * state.currentUnitCount;

    // 5. Check Bankroll and Limits (Crucial Safety)
    // Clamp to maximum table limit
    betAmount = Math.min(betAmount, config.betLimits.max);
    
    // Ensure we have enough money. We need to place 2 identical bets.
    // If we can't afford both, we stop betting (return null) or bet what we can (not implemented here for safety).
    if (betAmount * 2 > bankroll) {
        // Optional: Reset strategy if bankroll is exceeded, or just stop.
        // For this simulation, we will try to bet whatever remains if logic dictates, 
        // but strictly respecting bankroll prevents negative balance errors.
        // Let's just return empty if we are bust relative to the progression.
        return []; 
    }

    // 6. Construct Bet Objects
    // 'low' covers 1-18
    // 'even' covers Even numbers
    return [
        { type: 'low', amount: betAmount },
        { type: 'even', amount: betAmount }
    ];
}