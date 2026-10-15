/**
 * Best Roulette Strategy Ever !!! 100% sure win !!
 * * Source:
 * - URL: https://youtu.be/1--H3doxlZM
 * - Channel Name: mansurians
 * * The Full Logic in Detail:
 * - The strategy operates on a single-zero European Roulette table.
 * - On losses, losing corners stay on the board, and a new corner bet is ADDED based on the latest winning number.
 * - Constraints on Corner Placement: The available corners are locked strictly within the left and right 
 * double streets of every dozen, completely avoiding the middle double streets.
 * - Target Rebet Rule: On a win, if the current bankroll has NOT reached or exceeded the highest session bankroll 
 * peak (session's profit target), the strategy REBETS the exact same active corners at the exact same multiplier level.
 * - Max Corner Cap Rule: Once 6 corners are active on the board, any subsequent loss does NOT add a 7th corner. 
 * Instead, it maintains the 6 active corners, rebets them, and doubles up all bets.
 * * The Full Bet Progression in Detail:
 * - This is a modified flat/martingale safety progression sequence applied across all active corner positions.
 * - Bet Level 1: Initial Base Unit (e.g., 100).
 * - Bet Level 2: If Level 1 loses, repeat the SAME amount (do not double on the 2nd spin).
 * - Bet Level 3: If Level 2 loses, double the base unit (2x Base Unit).
 * - Bet Level 4: If Level 3 loses, double again (4x Base Unit).
 * - Bet Level 5: If Level 4 loses, double again (8x Base Unit).
 * - Bet Level 6: If Level 5 loses, double again (16x Base Unit).
 * - Bet Level 7+: Continued progression loop on extended recovery streaks. If not at session's profit peak, 
 * the strategy preserves active corners and continues to double up all bets on subsequent losses rather than resetting.
 * - Any win that achieves a net session profit resets the level progression back to Level 1 and clears the board back to a single corner.
 * * The Goal:
 * - To secure safe steady growth in bankroll session steps.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initial configuration check and state setup
    if (!spinHistory || spinHistory.length === 0) {
        return []; 
    }

    const baseUnit = config.betLimits.min; 
    
    if (!state.currentLevel) {
        state.currentLevel = 1;
    }
    if (!state.activeCorners) {
        state.activeCorners = []; 
    }
    if (state.lastBankroll === undefined) {
        state.lastBankroll = bankroll;
    }
    if (state.sessionPeakBankroll === undefined) {
        state.sessionPeakBankroll = bankroll; // Track the highest bankroll peak achieved
    }

    // Direct mapping of every roulette number to its unique allowed double-street corner anchor
    const numberToCorner = {
        1: 1,   2: 1,   3: 2,   4: 1,   5: 1,   6: 2,
        7: 7,   8: 7,   9: 8,   10: 10, 11: 10, 12: 11,
        13: 13, 14: 10, 15: 14, 16: 13, 17: 13, 18: 14,
        19: 19, 20: 19, 21: 20, 22: 22, 23: 19, 24: 23,
        25: 25, 26: 22, 27: 26, 28: 25, 29: 25, 30: 26,
        31: 31, 32: 31, 33: 32, 34: 31, 35: 31, 36: 32
    };

    // 2. Determine win/loss status from last spin to advance progression
    const lastResult = spinHistory[spinHistory.length - 1];
    const lastWinningNumber = lastResult.winningNumber;

    if (spinHistory.length > 1) {
        if (bankroll > state.lastBankroll) {
            // A win occurred
            if (bankroll >= state.sessionPeakBankroll) {
                // If we achieved or surpassed the session peak profit, fully reset everything
                state.currentLevel = 1;
                state.activeCorners = [];
                state.sessionPeakBankroll = bankroll;
            } 
            // If win occurred but NOT at peak profit, we do NOTHING.
            // This preserves state.currentLevel allowing the next bet to be an exact REBET of the winning layout.
        } else if (bankroll < state.lastBankroll) {
            // A loss occurred: Advance progression level indefinitely until profit peak is met
            state.currentLevel++;
        }
    }

    // Update historical bankroll step tracking snapshot
    state.lastBankroll = bankroll;

    // 3. Look up and append new corners with capping rules
    if (lastWinningNumber !== 0) {
        const targetCorner = numberToCorner[lastWinningNumber];
        if (targetCorner !== undefined) {
            // Only add a new corner if we have fewer than 6, and it's not a duplicate
            if (state.activeCorners.length < 6) {
                if (!state.activeCorners.includes(targetCorner)) {
                    state.activeCorners.push(targetCorner);
                }
            }
        }
    }

    // If the board is completely empty, skip betting
    if (state.activeCorners.length === 0) {
        return [];
    }

    // 4. Multiplier Progression calculation assignment (unbounded loop above level 7)
    let multiplier = 1;
    if (state.currentLevel === 1 || state.currentLevel === 2) {
        multiplier = 1;
    } else {
        multiplier = Math.pow(2, state.currentLevel - 2);
    }

    let betAmountPerCorner = baseUnit * multiplier;

    // Clamp individual amounts to table safety limits
    betAmountPerCorner = Math.max(betAmountPerCorner, config.betLimits.min);
    betAmountPerCorner = Math.min(betAmountPerCorner, config.betLimits.max);

    // 5. Construct structural output layout stack
    const totalRequiredCapital = betAmountPerCorner * state.activeCorners.length;
    if (bankroll < totalRequiredCapital) {
        return []; 
    }

    return state.activeCorners.map(cornerVal => ({
        type: 'corner',
        value: cornerVal,
        amount: betAmountPerCorner
    }));
}