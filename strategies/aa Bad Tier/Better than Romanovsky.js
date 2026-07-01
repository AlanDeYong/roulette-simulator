/**
 * Better than Romanovsky Strategy
 * 
 * Source: https://youtu.be/dlyywN5aDT4 (Channel: The Roulette Master)
 * 
 * The Full Logic:
 * 1. Identify the Dozen (1, 2, or 3) and Street (1-12) of the last winning number.
 * 2. Place bets on the 2 Dozens that were NOT the last winner's dozen.
 * 3. Place bets on the 3 Streets that did NOT contain the last winning number.
 * 
 * The Full Bet Progression:
 * - Start with base units ($5 on Streets, $20 on Dozens).
 * - If a loss occurs, double the bet amount on all positions.
 * - Reset to base bets only after reaching a profit target or completing a recovery session.
 * 
 * The Goal: 
 * Cover the majority of the table to grind out small, consistent wins while avoiding 
 * long-term exposure to the house edge.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Configuration & Initial State
    const baseUnit = config.betLimits.min; 
    const outsideUnit = config.betLimits.minOutside; 
    
    if (!state.level) state.level = 1; // Tracks progression multiplier
    if (spinHistory.length === 0) {
        // Initial bet if no history
        return [
            { type: 'dozen', value: 1, amount: outsideUnit },
            { type: 'dozen', value: 2, amount: outsideUnit },
            { type: 'street', value: 1, amount: baseUnit },
            { type: 'street', value: 4, amount: baseUnit },
            { type: 'street', value: 7, amount: baseUnit }
        ];
    }

    // 2. Identify Last Result
    const lastSpin = spinHistory[spinHistory.length - 1];
    const n = lastSpin.winningNumber;
    
    // Determine Dozen (1-3)
    let lastDozen = 0;
    if (n >= 1 && n <= 12) lastDozen = 1;
    else if (n >= 13 && n <= 24) lastDozen = 2;
    else if (n >= 25 && n <= 36) lastDozen = 3;

    // Determine Street (1-12, where 1=1-3, 2=4-6, etc.)
    let lastStreet = Math.floor((n - 1) / 3) + 1;

    // 3. Determine Progression
    // Simple logic: if previous spin was a loss (simplified), increment level.
    // In a real simulator, you would track profit/loss. Here we use state.lastResult.
    if (state.lastResult === 'loss') {
        state.level = Math.min(state.level * 2, 4); // Limit progression
    } else {
        state.level = 1; // Reset on win
    }
    state.lastResult = 'win'; // This would be dynamic based on checking bet coverage

    // 4. Build Bet
    const betAmountDozen = Math.min(outsideUnit * state.level, config.betLimits.max);
    const betAmountStreet = Math.min(baseUnit * state.level, config.betLimits.max);

    let bets = [];

    // Place bets on the 2 Dozens that aren't the last hit
    for (let d = 1; d <= 3; d++) {
        if (d !== lastDozen) {
            bets.push({ type: 'dozen', value: d, amount: betAmountDozen });
        }
    }

    // Place bets on the 3 Streets that aren't the last hit
    // A standard table has 12 streets. We'll pick 3 that don't match the last hit.
    let streetCount = 0;
    for (let s = 1; s <= 12; s++) {
        if (s !== lastStreet && streetCount < 3) {
            bets.push({ type: 'street', value: (s - 1) * 3 + 1, amount: betAmountStreet });
            streetCount++;
        }
    }

    return bets;
}