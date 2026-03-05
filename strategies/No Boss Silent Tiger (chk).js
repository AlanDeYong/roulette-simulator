/**
 * Strategy: Silent Tiger (Modified No Boss Strategy)
 * Source: https://www.youtube.com/watch?v=K3kEjRJyptI (The Roulette Master)
 *
 * The Logic:
 * Bets are placed on the two dozens that did NOT hit on the previous spin.
 * If the previous spin was 0 or 00, it counts as a loss and the algorithm 
 * uses the last known valid dozen to determine placement.
 *
 * The Progression:
 * Unit sequence: 1, 4, 15, 25, 35, 45... (Increases by 10 units after level 4).
 * - Levels 0 to 2 (1, 4, 15 units): A win guarantees full recovery. Reset to Level 0.
 * - Levels 3+ (25+ units): "Safety Mode". A single win does not guarantee full recovery.
 * - If won: Check if the current bankroll has reached or exceeded the session high.
 * - If YES: Reset to Level 0.
 * - If NO: Stay at the current level. Move bets to the two dozens that didn't hit.
 * - Any loss: Move to the next progression level.
 *
 * The Goal: 
 * Accumulate steady session profit while minimizing the steep table-max collisions 
 * seen in traditional double-dozen Martingale systems.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (typeof state.level === 'undefined') state.level = 0;
    if (typeof state.sessionHigh === 'undefined') state.sessionHigh = bankroll;
    if (typeof state.lastValidDozen === 'undefined') state.lastValidDozen = 3; // Default to avoiding Dozen 3
    if (typeof state.previousBankroll === 'undefined') state.previousBankroll = bankroll;

    // 2. Track Session High
    if (bankroll > state.sessionHigh) {
        state.sessionHigh = bankroll;
    }

    // 3. Process Previous Spin (Win/Loss/Zero Logic)
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;
        
        let hitDozen = null;
        if (num >= 1 && num <= 12) hitDozen = 1;
        else if (num >= 13 && num <= 24) hitDozen = 2;
        else if (num >= 25 && num <= 36) hitDozen = 3;

        // Determine if the last bet won or lost
        // We always bet on the two dozens that are NOT state.lastValidDozen
        const didWin = (hitDozen !== null && hitDozen !== state.lastValidDozen);

        if (didWin) {
            // Win Handling
            if (state.level <= 2) {
                // Full recovery levels
                state.level = 0;
            } else {
                // Safety Mode levels (Level 3+)
                // Check if we reached session high
                if (bankroll >= state.sessionHigh) {
                    state.level = 0;
                } else {
                    // Stay at the same level to get the second required win
                    // Level remains unchanged
                }
            }
        } else {
            // Loss Handling (includes 0/00)
            state.level++;
        }

        // Update last valid dozen for the next placement
        if (hitDozen !== null) {
            state.lastValidDozen = hitDozen;
        }
    }

    // Update previous bankroll for next cycle's comparison
    state.previousBankroll = bankroll;

    // 4. Calculate Bet Amount based on Progression
    // Sequence: 1, 4, 15, 25, 35, 45...
    let unitsToBet = 1;
    if (state.level === 0) unitsToBet = 1;
    else if (state.level === 1) unitsToBet = 4;
    else if (state.level === 2) unitsToBet = 15;
    else {
        // From level 3 onwards, it's 25, 35, 45...
        unitsToBet = 25 + ((state.level - 3) * 10);
    }

    const unitSize = config.betLimits.minOutside;
    let targetAmount = unitsToBet * unitSize;

    // 5. Clamp to Limits
    targetAmount = Math.max(targetAmount, config.betLimits.minOutside);
    targetAmount = Math.min(targetAmount, config.betLimits.max);

    // Stop placing bets if we don't have enough bankroll for two bets
    if (bankroll < targetAmount * 2) {
        return []; 
    }

    // 6. Determine Target Dozens (The two that did NOT hit last)
    const dozensToBet = [1, 2, 3].filter(d => d !== state.lastValidDozen);

    // 7. Return Bet Array
    return [
        { type: 'dozen', value: dozensToBet[0], amount: targetAmount },
        { type: 'dozen', value: dozensToBet[1], amount: targetAmount }
    ];
}