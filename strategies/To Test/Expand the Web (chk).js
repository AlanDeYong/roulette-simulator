/**
 * Strategy: Expand the Web (Second Stage Layout)
 * Source: Bet With Mo (https://www.youtube.com/watch?v=2ncrjMnMo74)
 * * The Logic:
 * - Covers numbers 7 through 30 inclusive.
 * - Level 1 (Base): Places 8 street bets (3 units each) on streets starting at 7, 10, 13, 16, 19, 22, 25, 28.
 * - Level 2 (Expanded): Triggers after a Level 1 loss. Maintains the 8 street bets and adds 14 corner bets (1 unit each) overlapping the streets.
 * * The Progression:
 * - On loss at Level 1: Move to Level 2 (add corners, base multiplier 1x).
 * - On loss at Level 2+: Increase level and double the bet size (Martingale multiplier).
 * - On win: Rebet at the current level and multiplier.
 * - After 2 consecutive wins: Reset the progression back to Level 1.
 * * The Goal:
 * - Survive cold streaks by adding density to the winning zone (the "web") and multiplying bets to recover losses, aiming for consistent small profits upon two consecutive hits.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.initialized) {
        state.level = 1; 
        state.multiplier = 1;
        state.consecutiveWins = 0;
        state.initialized = true;
    }

    // 2. Evaluate previous spin
    if (spinHistory.length > 0) {
        const lastNum = spinHistory[spinHistory.length - 1].winningNumber;
        // The strategy covers all numbers continuously from 7 through 30
        const isWin = (lastNum >= 7 && lastNum <= 30);

        if (isWin) {
            state.consecutiveWins += 1;
            // After winning twice in a row, reset
            if (state.consecutiveWins >= 2) {
                state.level = 1;
                state.multiplier = 1;
                state.consecutiveWins = 0;
            }
            // Note: If only 1 win, state.level and state.multiplier remain the same (Rebet)
        } else {
            // Loss logic
            state.consecutiveWins = 0; // Reset win streak
            
            if (state.level === 1) {
                // Loss on Level 1 -> Progression to Level 2 (add corners, no double up yet)
                state.level = 2;
                state.multiplier = 1;
            } else {
                // Loss on Level 2+ -> Rebet and double up
                state.level += 1;
                state.multiplier *= 2;
            }
        }
    }

    const bets = [];
    const baseUnit = config.betLimits.min;

    // 3. Calculate Bet Amounts with Clamping
    let streetAmount = (3 * baseUnit) * state.multiplier;
    streetAmount = Math.min(Math.max(streetAmount, baseUnit), config.betLimits.max);

    let cornerAmount = (1 * baseUnit) * state.multiplier;
    cornerAmount = Math.min(Math.max(cornerAmount, baseUnit), config.betLimits.max);

    // 4. Place Street Bets (Always active)
    const streets = [7, 10, 13, 16, 19, 22, 25, 28];
    for (const st of streets) {
        bets.push({ type: 'street', value: st, amount: streetAmount });
    }

    // 5. Place Corner Bets (Active on Level 2+)
    if (state.level >= 2) {
        // Based on the image, there are 14 corners total (7 bottom row, 7 top row)
        const bottomCorners = [7, 10, 13, 16, 19, 22, 25];
        const topCorners = [8, 11, 14, 17, 20, 23, 26];

        for (const bc of bottomCorners) {
            bets.push({ type: 'corner', value: bc, amount: cornerAmount });
        }
        for (const tc of topCorners) {
            bets.push({ type: 'corner', value: tc, amount: cornerAmount });
        }
    }

    return bets;
}