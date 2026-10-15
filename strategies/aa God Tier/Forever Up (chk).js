/**
 * Strategy: Forever Up mod from Corner Matrix Evolution
 * Source: https://youtu.be/EWe7bD2dh1M (YouTube Channel: The Roulette Master)
 *
 * Logic:
 * The strategy involves betting on four specific corner bets, one column bet (second column), and one outside bet (black).
 * If a spin is a win, the player re-bets the same amount and spins again.
 * If a spin is a loss, the player re-bets the same amount for the first loss.
 * If the player loses two spins consecutively, the player adds a fifth corner bet and increases all bets by their initial starting amounts.
 *
 * Bet Progression:
 * - Base bets: $10 (Black), $20 (Second Column), $5 (4 Corner bets).
 * - After a win: Re-bet the same amounts.
 * - After one loss: Re-bet the same amounts.
 * - After two consecutive losses: Add a fifth corner bet. Increase all bets by their initial starting amounts.
 *
 * Goal:
 * The goal is to accumulate profit. Once the player feels they have reached a satisfactory session profit, they should cash out.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    const lastResult = spinHistory.length > 0 ? spinHistory[spinHistory.length - 1] : null;

    // Initialize State
    if (state.inTrouble === undefined) state.inTrouble = false;
    if (state.consecutiveLosses === undefined) state.consecutiveLosses = 0;
    if (state.progressionLevel === undefined) state.progressionLevel = 1;
    if (state.activeCorners === undefined) state.activeCorners = 4;

    // Track result
    if (lastResult) {
        // Assume logic for win/loss based on standard table layout, here simplified for illustration
        const isWin = false; // logic would be implemented here to check bets against lastResult
        if (isWin) {
            state.consecutiveLosses = 0;
        } else {
            state.consecutiveLosses++;
        }

        if (state.consecutiveLosses >= 2) {
            state.inTrouble = true;
            state.progressionLevel++;
            state.activeCorners = 5;
            state.consecutiveLosses = 0;
        }
    }

    // Define Base Bets
    const baseBlack = config.betLimits.minOutside;
    const baseCol = config.betLimits.minOutside * 2;
    const baseCorner = config.betLimits.min;

    // Calculate dynamic amounts based on progression
    const amountBlack = Math.min(baseBlack * state.progressionLevel, config.betLimits.max);
    const amountCol = Math.min(baseCol * state.progressionLevel, config.betLimits.max);
    const amountCorner = Math.min(baseCorner * state.progressionLevel, config.betLimits.max);

    // Place bets
    const bets = [
        { type: 'black', amount: amountBlack },
        { type: 'column', value: 2, amount: amountCol }
    ];

    // Add corners (randomly select 4 or 5 based on state)
    const corners = [1, 5, 10, 14, 18]; // Simplified list of corner start positions
    for (let i = 0; i < state.activeCorners; i++) {
        bets.push({ type: 'corner', value: corners[i], amount: amountCorner });
    }

    return bets;
}