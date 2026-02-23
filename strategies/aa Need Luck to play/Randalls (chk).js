/**
 * Source: https://www.youtube.com/watch?v=ueWHugtfzTo (THEROULETTEMASTERTV)
 * * The Logic: 
 * "Randall's Strategy" blankets the middle of the board by betting on the Second Column, 
 * the Second Dozen, and the 13-18 Double Street (Line). Because the Double Street falls 
 * entirely within the Second Dozen, numbers 13-18 are heavily weighted for maximum payouts.
 * * The Progression:
 * - A base "level" multiplier starts at 1.
 * - On a total loss (no numbers hit), the bet level increases by 1.
 * - On a win where the bankroll does NOT reach a new session high, the level stays the same.
 * - On any win that pushes the bankroll to a new session high, the progression resets to level 1.
 * * The Goal:
 * To survive losing streaks through a steady, linear progression while capitalizing on overlapping 
 * winning numbers to push the overall bankroll to new session highs (Session Profit).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize Base Units (Maintaining the 2:2:1 ratio from the video)
    const baseLine = config.betLimits.min;
    const baseOutside = Math.max(config.betLimits.minOutside, baseLine * 2);

    // 2. Initialize State on first spin
    if (typeof state.sessionHigh === 'undefined') {
        state.sessionHigh = bankroll;
        state.previousBankroll = bankroll;
        state.level = 1;
    }

    // 3. Evaluate Previous Spin Results
    if (spinHistory.length > 0) {
        if (bankroll > state.sessionHigh) {
            // New Session Profit Reached -> Reset Progression
            state.level = 1;
            state.sessionHigh = bankroll;
        } else if (bankroll < state.previousBankroll) {
            // Complete loss on the last spin -> Increase Progression
            state.level++;
        }
        // If bankroll >= state.previousBankroll but <= sessionHigh, 
        // it was a non-record-breaking win. Level remains unchanged.
    }

    // Update previous bankroll for the next spin's comparison
    state.previousBankroll = bankroll;

    // 4. Calculate Current Bet Amounts
    let colAmt = state.level * baseOutside;
    let dozAmt = state.level * baseOutside;
    let lineAmt = state.level * baseLine;

    // 5. Clamp to Config Limits
    colAmt = Math.min(Math.max(colAmt, config.betLimits.minOutside), config.betLimits.max);
    dozAmt = Math.min(Math.max(dozAmt, config.betLimits.minOutside), config.betLimits.max);
    lineAmt = Math.min(Math.max(lineAmt, config.betLimits.min), config.betLimits.max);

    // 6. Return Bets
    return [
        { type: 'column', value: 2, amount: colAmt },
        { type: 'dozen', value: 2, amount: dozAmt },
        { type: 'line', value: 13, amount: lineAmt }
    ];
}