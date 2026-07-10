/**
 * Red Ladder Strategy (Corrected Progression)
 * 
 * Source: https://youtu.be/RSV29zi0QOw (The Roulette Master, strategy by Jamie Wellsby)
 * 
 * The Full Logic in details:
 * This system targets 6 specific "Street" rows containing exactly two Red numbers (1, 7, 16, 19, 25, 34).
 * It places 12 inside bets and 1 outside bet:
 * - 6 Street bets: 1, 7, 16, 19, 25, 34.
 * - 6 Split bets: [2, 3], [8, 9], [17, 18], [20, 21], [26, 27], [35, 36].
 * - 1 Outside bet: EVEN.
 * 
 * The Full Bet Progression in details:
 * - The strategy uses a ladder progression starting at level 1.
 * - Initial bets: Base limit for inside bets, Base limit for the outside bet (EVEN).
 * - On ANY NET LOSS for the spin: The ladder increases by 1 level.
 *   This strictly multiplies the bet amount by the progression level, adding the 
 *   exact respective base bet amount to each individual placement.
 * - On a NET WIN but still below session profit: Progression level stays the same (rebet).
 * 
 * The Goal:
 * Ride out losses with steady ladder increments (base bet amounts). 
 * Protect the bankroll by tracking the "Session Start Bankroll" and resetting 
 * the ladder to level 1 the moment the bankroll reaches a new profit high.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const baseInside = config.betLimits.min; 
    const baseOutside = config.betLimits.minOutside; 

    // 1. Initialize state for a new session
    if (state.progression === undefined) {
        state.progression = 1;
        state.sessionStartBankroll = bankroll;
    }

    // 2. Process previous spin
    if (state.lastBankroll !== undefined) {
        const netProfit = bankroll - state.lastBankroll;
        
        if (netProfit < 0) {
            // Net loss (full or partial): strictly increase progression by 1 level
            state.progression += 1;
        } 
        
        // 3. Reset condition: Only reset when we have recovered the ladder 
        // and hit a new session high.
        if (bankroll >= state.sessionStartBankroll) {
            state.progression = 1;
            state.sessionStartBankroll = bankroll; // Establish new target baseline
        }
    }

    // 4. Calculate bet amounts based purely on progression multiplier
    // This guarantees bets always increase by their respective base amounts.
    let currentInsideBet = baseInside * state.progression;
    let currentOutsideBet = baseOutside * state.progression;

    // 5. Clamp to defined limits
    currentInsideBet = Math.max(currentInsideBet, config.betLimits.min);
    currentInsideBet = Math.min(currentInsideBet, config.betLimits.max);

    currentOutsideBet = Math.max(currentOutsideBet, config.betLimits.minOutside);
    currentOutsideBet = Math.min(currentOutsideBet, config.betLimits.max);

    // Update last bankroll tracker
    state.lastBankroll = bankroll;

    // 6. Place bets
    return [
        { type: 'even', amount: currentOutsideBet },
        { type: 'street', value: 1, amount: currentInsideBet },
        { type: 'street', value: 7, amount: currentInsideBet },
        { type: 'street', value: 16, amount: currentInsideBet },
        { type: 'street', value: 19, amount: currentInsideBet },
        { type: 'street', value: 25, amount: currentInsideBet },
        { type: 'street', value: 34, amount: currentInsideBet },
        { type: 'split', value: [2, 3], amount: currentInsideBet },
        { type: 'split', value: [8, 9], amount: currentInsideBet },
        { type: 'split', value: [17, 18], amount: currentInsideBet },
        { type: 'split', value: [20, 21], amount: currentInsideBet },
        { type: 'split', value: [26, 27], amount: currentInsideBet },
        { type: 'split', value: [35, 36], amount: currentInsideBet }
    ];
}