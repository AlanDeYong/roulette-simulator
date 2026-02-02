/**
 * Tammy's Cornertown Roulette System
 *
 * Source:
 * "INCREDIBLE NEW TAMMY'S CORNER-TOWN ROULETTE SYSTEM!" by The Roulette Master
 * Video URL: https://youtu.be/N4JUBZQFugk
 *
 * The Logic:
 * 1. This strategy focuses on covering the Zeros and a broad spread of the board.
 * 2. It places a Split bet on 0 and 2.
 * 3. It places 6 Corner bets spread across the board.
 * (In this implementation, we use a fixed set of 6 corners to ensure good coverage: 
 * 4-8, 10-14, 16-20, 22-26, 28-32, 32-36).
 *
 * The Progression (Arithmetic Recovery):
 * 1. Base Unit: Starts at 1 unit (e.g., table minimum).
 * 2. On Loss (Net loss on the spin):
 * - Increase the bet size by 1 base unit for ALL bets.
 * - Example: If betting $5, next bet is $10, then $15.
 * 3. On Win (Net profit on the spin):
 * - Check Total Session Profit (Current Bankroll vs Initial Bankroll).
 * - IF (Current Bankroll >= Initial Bankroll): RESET bets to Base Unit (1).
 * - IF (Current Bankroll < Initial Bankroll): HOLD bets at the current level. Do not decrease.
 *
 * The Goal:
 * - Survive losing streaks using the arithmetic progression.
 * - Reach a new session high (profit) to trigger a reset.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State Constants & Variables
    const MIN_BET = config.betLimits.min;
    const MAX_BET = config.betLimits.max;

    if (state.initialBankroll === undefined) {
        state.initialBankroll = bankroll;
    }
    if (state.unitMultiplier === undefined) {
        state.unitMultiplier = 1;
    }
    if (state.lastBankroll === undefined) {
        state.lastBankroll = bankroll;
    }

    // 2. Determine Progression Logic
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        
        // Calculate the outcome of the previous spin
        // If current bankroll is less than what we had before the spin result (minus bets), we lost money?
        // Actually, easiest way is: Did our bankroll go up or down compared to the *start* of the last spin?
        // However, since we don't track the exact 'start of last spin' bankroll easily without extra state,
        // we compare current bankroll to `state.lastBankroll`.
        // Note: `state.lastBankroll` was the bankroll *before* we placed bets last time.
        
        const isWin = bankroll > state.lastBankroll;

        if (isWin) {
            // WIN CONDITION
            if (bankroll >= state.initialBankroll) {
                // If we are in overall profit (or back to start), RESET.
                state.unitMultiplier = 1;
            } else {
                // If we won but are still recovering losses, HOLD.
                // unitMultiplier stays the same.
            }
        } else {
            // LOSS CONDITION
            // Increase by 1 unit
            state.unitMultiplier += 1;
        }
    }

    // 3. Update Bankroll State for next comparison
    state.lastBankroll = bankroll;

    // 4. Calculate Bet Amount based on Multiplier
    let betAmount = MIN_BET * state.unitMultiplier;

    // 5. Clamp to Limits
    // Ensure we don't exceed the table maximum per spot
    betAmount = Math.min(betAmount, MAX_BET);
    betAmount = Math.max(betAmount, MIN_BET); // Should be met by logic, but good safety

    // 6. Define Bets
    const bets = [];

    // Bet 1: Split 0/2
    // Note: In standard roulette representation, a split is often an array [n1, n2]
    bets.push({
        type: 'split',
        value: [0, 2],
        amount: betAmount
    });

    // Bet 2-7: Six Corners
    // We select 6 corners to spread coverage. Corner is defined by Top-Left number.
    // Selected to avoid overlap with 0,2 where possible and cover rows.
    const selectedCorners = [
        4,  // Covers 4, 5, 7, 8
        10, // Covers 10, 11, 13, 14
        16, // Covers 16, 17, 19, 20
        22, // Covers 22, 23, 25, 26
        28, // Covers 28, 29, 31, 32
        32  // Covers 32, 33, 35, 36
    ];

    for (const cornerVal of selectedCorners) {
        bets.push({
            type: 'corner',
            value: cornerVal,
            amount: betAmount
        });
    }

    return bets;
}