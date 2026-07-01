/**
 * Winner's Circle Roulette Strategy
 * Source: https://youtu.be/AFSOwYCgkiQ (Channel: Gamblers University)
 *
 * The Full Logic in details:
 * This strategy places a targeted pattern of straight up numbers and splits to form the "Winner's Circle".
 * Every time a loss occurs, a specific set of new bets (splits or straight ups) is added to the layout to widen coverage,
 * and certain stages trigger a full double-up of all active bet amounts.
 * * Win / Reset Mechanics:
 * - On a win: If the current bankroll hits or exceeds the session's peak profit (milestone), the strategy fully resets back to Stage 0.
 * - If a win occurs but the bankroll has not yet reached the session's peak profit milestone, it maintains the current active bets/amounts.
 *
 * The Full Bet Progression in details:
 * - Stage 0: 
 * - Straight Up (1 unit): 10, 12, 13, 15, 16, 18, 19, 21, 22, 24, 25, 27
 * - Splits (1 unit): [7, 8], [8, 9], [28, 29], [29, 30]
 * - Stage 1 (Loss): Retain Stage 0 bets. Add 1 unit each to splits: [10, 11], [11, 12], [25, 26], [26, 27].
 * - Stage 2 (Loss): Retain Stage 1 bets. Add 1 unit each to splits: [13, 14], [14, 15], [22, 23], [23, 24]. Then double all bets.
 * - Stage 3 (Loss): Retain Stage 2 bets. Add 2 units each to splits: [16, 17], [17, 18], [19, 20], [20, 21].
 * - Stage 4 (Loss): Retain Stage 3 bets. Add 2 units each to straight up numbers: 8, 29.
 * - Stage 5 (Loss): Retain Stage 4 bets. Add 2 units each to straight up numbers: 11, 26.
 * - Stage 6 (Loss): Retain Stage 5 bets. Add 2 units each to straight up numbers: 14, 23.
 * - Stage 7 (Loss): Retain Stage 6 bets. Add 2 units each to straight up numbers: 17, 20. Then double all bets.
 * - Stage 8+ (Loss): Retain Stage 7 bets. Double all bets.
 *
 * The Goal:
 * To systematically recover losses during drawdowns by widening coverage and scaling unit sizes,
 * resetting completely whenever the session hits its highest recorded profit target.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    const minInside = config.betLimits.min;
    const maxBet = config.betLimits.max;

    // Initialize State
    if (state.stage === undefined) state.stage = 0;
    if (state.peakBankroll === undefined) state.peakBankroll = bankroll;
    if (state.activeBets === undefined) state.activeBets = [];

    // Process last spin if history exists
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        let totalWagered = 0;
        let totalWon = 0;

        // Calculate result of previous bets
        state.activeBets.forEach(b => {
            totalWagered += b.amount;
            if (b.type === 'number' && b.value === lastSpin.winningNumber) {
                totalWon += b.amount * 36;
            } else if (b.type === 'split') {
                if (Array.isArray(b.value) && b.value.includes(lastSpin.winningNumber)) {
                    totalWon += b.amount * 18;
                } else if (typeof b.value === 'number' && (b.value === lastSpin.winningNumber || b.value + 1 === lastSpin.winningNumber)) {
                    totalWon += b.amount * 18;
                }
            }
        });

        const isWin = totalWon > totalWagered;

        if (isWin) {
            if (bankroll >= state.peakBankroll) {
                // At or exceeding session's peak profit -> Full reset
                state.stage = 0;
                state.peakBankroll = bankroll;
                state.activeBets = [];
            } else {
                // Win, but not at peak profit yet -> Rebet same configuration
                return state.activeBets;
            }
        } else {
            // Loss -> Step up progression stage
            state.stage++;
        }
    }

    // Keep track of our current session peak baseline
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    // Build bets mapping based on current stage logic
    let tempBets = [];

    // Stage 0: Base setup
    const baseNumbers = [10, 12, 13, 15, 16, 18, 19, 21, 22, 24, 25, 27];
    const baseSplits = [[7, 8], [8, 9], [28, 29], [29, 30]];

    baseNumbers.forEach(n => tempBets.push({ type: 'number', value: n, amount: minInside }));
    baseSplits.forEach(s => tempBets.push({ type: 'split', value: s, amount: minInside }));

    // Stage 1+ adjustments
    if (state.stage >= 1) {
        [[10, 11], [11, 12], [25, 26], [26, 27]].forEach(s => {
            tempBets.push({ type: 'split', value: s, amount: minInside });
        });
    }

    // Stage 2+ adjustments
    if (state.stage >= 2) {
        [[13, 14], [14, 15], [22, 23], [23, 24]].forEach(s => {
            tempBets.push({ type: 'split', value: s, amount: minInside });
        });
        // First double up execution
        tempBets.forEach(b => b.amount *= 2);
    }

    // Stage 3+ adjustments
    if (state.stage >= 3) {
        [[16, 17], [17, 18], [19, 20], [20, 21]].forEach(s => {
            tempBets.push({ type: 'split', value: s, amount: minInside * 2 });
        });
    }

    // Stage 4+ adjustments
    if (state.stage >= 4) {
        [8, 29].forEach(n => tempBets.push({ type: 'number', value: n, amount: minInside * 2 }));
    }

    // Stage 5+ adjustments
    if (state.stage >= 5) {
        [11, 26].forEach(n => tempBets.push({ type: 'number', value: n, amount: minInside * 2 }));
    }

    // Stage 6+ adjustments
    if (state.stage >= 6) {
        [14, 23].forEach(n => tempBets.push({ type: 'number', value: n, amount: minInside * 2 }));
    }

    // Stage 7+ adjustments
    if (state.stage >= 7) {
        [17, 20].forEach(n => tempBets.push({ type: 'number', value: n, amount: minInside * 2 }));
        // Second double up execution
        tempBets.forEach(b => b.amount *= 2);
    }

    // Stage 8+ extended loss loops (continuous doubling up)
    if (state.stage > 7) {
        const extraDoubles = state.stage - 7;
        for (let i = 0; i < extraDoubles; i++) {
            tempBets.forEach(b => b.amount *= 2);
        }
    }

    // Clamp final amounts to configuration table constraints
    tempBets.forEach(b => {
        b.amount = Math.max(b.amount, minInside);
        b.amount = Math.min(b.amount, maxBet);
    });

    state.activeBets = tempBets;
    return state.activeBets;
}