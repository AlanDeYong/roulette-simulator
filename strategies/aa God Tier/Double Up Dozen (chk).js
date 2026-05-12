/*
 * Double Up Dozen Strategy
 *
 * Source: https://youtu.be/VIXKJCpDxoU?si=Zo8EzMSxY091WNb0
 * 
 * The Logic: 
 * - The strategy waits until two distinct winning dozens have appeared in the recent spin history.
 * - It places an equal bet on each of those two most recently hit distinct dozens.
 * 
 * The Progression:
 * - On a loss (neither dozen hits), the bet multiplier on both dozens is doubled.
 * - On a win (one of the dozens hits), a consecutive win counter increases.
 * - The progression resets to the base unit only after TWO consecutive wins. 
 * - After a single win, the bet size remains at its current progression level.
 * 
 * The Goal:
 * - Recover losses by doubling up, utilizing the ~66% coverage of betting two dozens, and securing a clear profit before resetting after two back-to-back hits.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit and limits
    const minBet = config.betLimits.minOutside;
    const maxBet = config.betLimits.max;

    // 2. Initialize State
    if (state.unitMultiplier === undefined) state.unitMultiplier = 1;
    if (state.consecutiveWins === undefined) state.consecutiveWins = 0;
    if (state.lastBetDozens === undefined) state.lastBetDozens = [];

    // Helper to map a number to its dozen (1, 2, or 3)
    const getDozen = (num) => {
        if (num === 0 || num === 37 /* US 00 */) return null;
        return Math.ceil(num / 12);
    };

    // 3. Resolve Previous Bet (Win/Loss)
    // Only resolve if we actually placed a bet on the last spin
    if (spinHistory.length > 0 && state.lastBetDozens.length === 2) {
        const lastResult = spinHistory[spinHistory.length - 1];
        const winningDozen = getDozen(lastResult.winningNumber);

        if (state.lastBetDozens.includes(winningDozen)) {
            // Win condition: one of our two dozens hit
            state.consecutiveWins += 1;
            
            // Reset progression after two consecutive wins
            if (state.consecutiveWins >= 2) {
                state.unitMultiplier = 1;
                state.consecutiveWins = 0;
            }
        } else {
            // Loss condition: the zero or the third dozen hit
            state.unitMultiplier *= 2;
            state.consecutiveWins = 0;
        }
    }

    // 4. Find the last 2 distinct winning dozens
    const recentDozens = [];
    for (let i = spinHistory.length - 1; i >= 0; i--) {
        const d = getDozen(spinHistory[i].winningNumber);
        if (d !== null && !recentDozens.includes(d)) {
            recentDozens.push(d);
        }
        if (recentDozens.length === 2) break;
    }

    // If we don't have 2 distinct dozens yet, hold and observe
    if (recentDozens.length < 2) {
        state.lastBetDozens = []; // Clear to avoid resolving a non-existent bet on the next spin
        return [];
    }

    // 5. Calculate Bet Amount
    let amount = minBet * state.unitMultiplier;

    // Clamp to Table Limits
    amount = Math.max(amount, minBet);
    amount = Math.min(amount, maxBet);

    // Save the dozens we are betting on so we can check for a win/loss on the next spin
    state.lastBetDozens = recentDozens;

    // 6. Return Bets
    return [
        { type: 'dozen', value: recentDozens[0], amount: amount },
        { type: 'dozen', value: recentDozens[1], amount: amount }
    ];
}