/**
 * Strategy Name: Retirement Roulette
 * Source: The Roulette Master (YouTube) https://youtu.be/BvY6heLTNyc?si=22lKFqYYwHJmWko8
 * 
 * The Logic:
 * - Place 1 unit on the 2nd Column.
 * - Place 1 unit on 5 specific corners along the boundary of the 2nd and 3rd columns:
 *   Corner 5 (5,6,8,9), Corner 11 (11,12,14,15), Corner 17 (17,18,20,21), 
 *   Corner 23 (23,24,26,27), and Corner 29 (29,30,32,33).
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit
    const baseUnit = Math.max(config.betLimits.minOutside, config.betLimits.min);

    // 2. Initialize State
    if (state.progression === undefined) {
        state.progression = 1;
        state.lastBankroll = bankroll;
        state.lastBetTotal = 0;
    }

    // 3. Evaluate Previous Spin Outcome
    if (spinHistory.length > 0 && state.lastBetTotal > 0) {
        const netChange = bankroll - state.lastBankroll;
        const payout = netChange + state.lastBetTotal;

        if (payout === 0) {
            state.progression *= 2;
        } else if (payout > 0 && payout <= state.lastBetTotal) {
            // Partial loss -> Maintain current progression
        } else if (payout > state.lastBetTotal) {
            state.progression = 1;
        }
    }

    // 4. Calculate Bet Amount and Clamp to Limits
    let unitAmount = baseUnit * state.progression;
    unitAmount = Math.min(unitAmount, config.betLimits.max);

    // 5. Update State
    state.lastBankroll = bankroll;
    state.lastBetTotal = unitAmount * 6;

    // 6. Return Bets
    return [
        { type: 'column', value: 2, amount: unitAmount },
        { type: 'corner', value: 5, amount: unitAmount },
        { type: 'corner', value: 11, amount: unitAmount },
        { type: 'corner', value: 17, amount: unitAmount },
        { type: 'corner', value: 23, amount: unitAmount },
        { type: 'corner', value: 29, amount: unitAmount }
    ];
}