/**
 * ============================================================================
 * Roulette Strategy: "Tetris" by Marlon Espresso
 * Source: Casino Matchmaker (https://youtu.be/1KYLuopijnw)
 * ============================================================================
 * 
 * STRATEGY LOGIC:
 * 1. Base Setup (20 Numbers Covered):
 *    - 1st Dozen (1-12): 15 units
 *    - Corner 13-14-16-17: 5 units
 *    - Corner 19-20-22-23: 5 units
 *    Every winning number on base pays exactly 20 units net profit.
 * 
 * 2. Progression on Loss:
 *    - Level 1 (First Loss):
 *      * Dozen 1: +10 units (Total: 25)
 *      * Corner 13: +3 units (Total: 8)
 *      * Corner 19: +3 units (Total: 8)
 *      * Split 15-18: +3 units (Total: 3 - newly added)
 *      * Split 21-24: +3 units (Total: 3 - newly added)
 *      (Coverage increases from 20 to 24 numbers)
 *    - Level 2+ (Subsequent Losses):
 *      * Dozen 1: +10 units
 *      * Corner 13: +3 units
 *      * Corner 19: +3 units
 *      * Split 15-18: +2 units
 *      * Split 21-24: +2 units
 * 
 * 3. Progression on Win:
 *    - If bankroll >= session start bankroll (reached session profit): Reset to Base Bet (Level 0).
 *    - If bankroll < session start bankroll: Repeat current bet amounts until in profit or a loss occurs.
 * 
 * 4. Goal:
 *    - Secure consistent session profits and recover drawdown through high board coverage (65%).
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.sessionStartBankroll = bankroll;
        state.lastBankroll = bankroll;
        state.level = 0; // 0 = base bet, 1 = first loss, 2+ = subsequent losses
        state.currentBets = null;
    }

    // 2. Determine Unit Sizing based on Table Limits
    const minInside = config.betLimits.min || 1;
    const minOutside = config.betLimits.minOutside || 5;
    const maxBet = config.betLimits.max || 500;

    // Unit multiplier (1 unit corresponds to base proportions: 15 / 5 / 5)
    // Scale so Dozen (15 units) meets minOutside and Inside bets meet minInside
    const unitScale = Math.max(1, Math.ceil(minOutside / 15), Math.ceil(minInside / 5));

    // Base unit amounts
    const baseDozen = 15 * unitScale;
    const baseCorner = 5 * unitScale;

    // Progression increments
    const incDozen = 10 * unitScale;
    const incCorner = 3 * unitScale;
    const incSplitL1 = 3 * unitScale;
    const incSplitL2 = 2 * unitScale;

    // 3. Process Previous Spin Results
    if (spinHistory.length > 0) {
        const lastProfit = bankroll - state.lastBankroll;

        if (bankroll >= state.sessionStartBankroll) {
            // Reached or exceeded session starting point -> Full reset
            state.level = 0;
            state.sessionStartBankroll = bankroll;
            state.currentBets = null;
        } else if (lastProfit > 0) {
            // Won, but not yet back in session profit -> Flat bet (repeat current amounts)
            // state.level remains the same
        } else {
            // Loss -> Step up progression
            state.level += 1;
            state.currentBets = null; // Recompute bet amounts
        }
    }

    state.lastBankroll = bankroll;

    // 4. Calculate Current Bet Amounts
    if (!state.currentBets || state.level === 0) {
        if (state.level === 0) {
            // Base Level (20 numbers)
            state.currentBets = {
                dozen: baseDozen,
                corner13: baseCorner,
                corner19: baseCorner,
                split15_18: 0,
                split21_24: 0
            };
        } else if (state.level === 1) {
            // Level 1: First loss (+10, +3, +3, +3, +3)
            state.currentBets = {
                dozen: baseDozen + incDozen,
                corner13: baseCorner + incCorner,
                corner19: baseCorner + incCorner,
                split15_18: incSplitL1,
                split21_24: incSplitL1
            };
        } else {
            // Level 2+: Subsequent losses (+10, +3, +3, +2, +2 per level above 1)
            const extraLevels = state.level - 1;
            state.currentBets = {
                dozen: baseDozen + incDozen + (extraLevels * incDozen),
                corner13: baseCorner + incCorner + (extraLevels * incCorner),
                corner19: baseCorner + incCorner + (extraLevels * incCorner),
                split15_18: incSplitL1 + (extraLevels * incSplitL2),
                split21_24: incSplitL1 + (extraLevels * incSplitL2)
            };
        }
    }

    // 5. Construct Bets Array and Clamp to Limits
    const bets = [];

    // Helper to clamp bet amounts
    const clampInside = (amount) => Math.min(Math.max(amount, minInside), maxBet);
    const clampOutside = (amount) => Math.min(Math.max(amount, minOutside), maxBet);

    // 1st Dozen
    if (state.currentBets.dozen > 0) {
        bets.push({
            type: 'dozen',
            value: 1,
            amount: clampOutside(state.currentBets.dozen)
        });
    }

    // Corner 13-14-16-17
    if (state.currentBets.corner13 > 0) {
        bets.push({
            type: 'corner',
            value: 13,
            amount: clampInside(state.currentBets.corner13)
        });
    }

    // Corner 19-20-22-23
    if (state.currentBets.corner19 > 0) {
        bets.push({
            type: 'corner',
            value: 19,
            amount: clampInside(state.currentBets.corner19)
        });
    }

    // Split 15-18 (Active on Level 1+)
    if (state.currentBets.split15_18 > 0) {
        bets.push({
            type: 'split',
            value: [15, 18],
            amount: clampInside(state.currentBets.split15_18)
        });
    }

    // Split 21-24 (Active on Level 1+)
    if (state.currentBets.split21_24 > 0) {
        bets.push({
            type: 'split',
            value: [21, 24],
            amount: clampInside(state.currentBets.split21_24)
        });
    }

    return bets;
}