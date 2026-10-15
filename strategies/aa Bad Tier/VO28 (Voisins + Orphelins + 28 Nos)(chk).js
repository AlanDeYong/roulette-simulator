/**
 * Strategy: VO28 (Voisins + Orphelins + 28 Numbers Covered)
 * Source: Casino Matchmaker - https://youtu.be/vg1jcmVsGvc
 * * The Full Logic in details:
 * This strategy covers 28 numbers on the wheel, primarily focusing on the Voisins 
 * and Orphelins sections, plus a couple of extra splits ("Jackpot numbers"). 
 * It triggers a consistent layout of bets on every spin:
 * - 1 Basket bet (0, 1, 2, 3) [Yields a "Big Win"]
 * - 4 Corner bets (11, 17, 25, 31 as top-left values) [Yields a "Big Win"]
 * - 4 Split bets (4/7, 6/9, 19/22, 33/36) [Yields a "Small Win"]
 * * The Full Bet Progression in details:
 * - Initial base bets are 5 units for Corners/Basket and 2 units for Splits (33 units total).
 * - On a Loss (The ball lands on any of the 9 uncovered numbers): 
 * The progression is aggressive Martingale—double the bet level immediately and reset the win sequence counter.
 * - On a Win (The ball lands on a covered number): 
 * The bet size stays the same, but you track consecutive wins to trigger a "comeback" step (rollback).
 * - Level Drop / Comeback Step Rules: 
 * 1. If you hit 2 wins in a row and AT LEAST ONE of them is a "Big Win" (Corner/Basket), 
 * you drop back down one level (halving the bet size) and reset the sequence counter.
 * 2. If you hit 3 "Small Wins" in a row (Splits), you drop back down one level 
 * (halving the bet size) and reset the sequence counter.
 * * The Goal:
 * A fast-paced hit-and-run strategy to secure a quick profit (e.g., $100 in 10-20 spins) and exit 
 * before encountering a heavy losing streak (4-5+ consecutive misses) that exponentially scales the Martingale bets.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State Persistence
    if (!state.level) {
        state.level = 1;
        state.winSequence = [];
    }

    // 2. Process History & Progression Logic
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;

        // Categorize the winning numbers according to the bet coverage
        const bigWinNumbers = [
            0, 1, 2, 3,                         // Basket
            11, 12, 14, 15,                     // Corner 11
            17, 18, 20, 21,                     // Corner 17
            25, 26, 28, 29,                     // Corner 25
            31, 32, 34, 35                      // Corner 31
        ];
        const smallWinNumbers = [4, 7, 6, 9, 19, 22, 33, 36]; // Splits

        // Check outcome and update sequence
        if (bigWinNumbers.includes(num)) {
            state.winSequence.push('big');
        } else if (smallWinNumbers.includes(num)) {
            state.winSequence.push('small');
        } else {
            // Loss: Double the bet level (Martingale) and wipe sequence
            state.level *= 2;
            state.winSequence = [];
        }

        // Evaluate 'Comeback Step' (Rolling back a level)
        const hasBigWin = state.winSequence.includes('big');
        const seqLength = state.winSequence.length;

        if ((hasBigWin && seqLength >= 2) || (seqLength >= 3)) {
            // Drop back one level (halve the multiplier), floor it at level 1
            state.level = Math.max(1, state.level / 2);
            state.winSequence = []; // Reset sequence tracking after a rollback
        }
    }

    // 3. Calculate Base Bet Amounts based on current level
    let cornerAmount = 5 * state.level;
    let splitAmount = 2 * state.level;

    // 4. Clamp to Limits (Crucial)
    // Ensures our calculated bets never fall below table minimums or exceed maximums
    const minInside = config.betLimits.min;
    const maxLimit = config.betLimits.max;

    cornerAmount = Math.min(Math.max(cornerAmount, minInside), maxLimit);
    splitAmount = Math.min(Math.max(splitAmount, minInside), maxLimit);

    // 5. Construct and Return the Bets
    return [
        { type: 'basket', value: 0, amount: cornerAmount }, // Covers 0, 1, 2, 3 (EU)
        { type: 'corner', value: 11, amount: cornerAmount }, // Covers 11, 12, 14, 15
        { type: 'corner', value: 17, amount: cornerAmount }, // Covers 17, 18, 20, 21
        { type: 'corner', value: 25, amount: cornerAmount }, // Covers 25, 26, 28, 29
        { type: 'corner', value: 31, amount: cornerAmount }, // Covers 31, 32, 34, 35
        { type: 'split', value: [4, 7], amount: splitAmount },
        { type: 'split', value: [6, 9], amount: splitAmount },
        { type: 'split', value: [19, 22], amount: splitAmount },
        { type: 'split', value: [33, 36], amount: splitAmount }
    ];
}