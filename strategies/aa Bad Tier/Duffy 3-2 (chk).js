/**
 * ============================================================================
 * ROULETTE STRATEGY: Duffy 3-2 Dozen Strategy (Continuous Play)
 * ============================================================================
 * 
 * @source
 * - YouTube Video: https://youtu.be/UJwOyJcmsUE
 * - Channel: Casino Matchmaker
 * - Strategy Author: Arno / Duffy 20,000 ("Duffy 3-2")
 * 
 * @logic
 * 1. Analysis Window:
 *    - Tracks the last 50 spins to determine the hit frequency of:
 *      - Dozen 1: Numbers 1 - 12
 *      - Dozen 2: Numbers 13 - 24
 *      - Dozen 3: Numbers 25 - 36
 * 2. Bet Selection:
 *    - Automatically places bets on the TWO LEAST HIT (coldest) dozens.
 * 
 * @progression ("Up 3, Down 2"):
 * - Base Bet: 1 unit on each of the two selected dozens.
 * - On Loss (Uncovered dozen or 0/00 hits):
 *   - Increase bet size by +3 units per dozen (+6 units total).
 * - On Win (One of the covered dozens hits):
 *   - If bankroll reaches a new session high, reset back to 1 unit per dozen.
 *   - Otherwise, step down by -2 units per dozen (minimum 1 unit).
 * 
 * @goal
 * - Continuous grind: resets progression upon reaching session profit peaks
 *   and continues playing.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    const minOutside = (config && config.betLimits && config.betLimits.minOutside) || 1;
    const maxBet = (config && config.betLimits && config.betLimits.max) || 500;
    const unit = minOutside;

    // 1. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.peakBankroll = bankroll;
        state.unitsPerDozen = 1;
        state.selectedDozens = [2, 3];
    }

    // 2. Process Result of Previous Spin & Update Progression
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;
        
        let lastSpinDozen = 0;
        if (num >= 1 && num <= 12) lastSpinDozen = 1;
        else if (num >= 13 && num <= 24) lastSpinDozen = 2;
        else if (num >= 25 && num <= 36) lastSpinDozen = 3;

        const wonLastRound = state.selectedDozens.includes(lastSpinDozen);

        if (bankroll > state.peakBankroll) {
            state.peakBankroll = bankroll;
        }

        if (wonLastRound) {
            // If in net session peak profit, reset to 1 unit; else step down 2 units
            if (bankroll >= state.peakBankroll) {
                state.unitsPerDozen = 1;
            } else {
                state.unitsPerDozen = Math.max(1, state.unitsPerDozen - 2);
            }
        } else {
            // Step up 3 units on loss
            state.unitsPerDozen += 3;
        }

        // 3. Identify the Two Coldest Dozens (Last 50 Spins)
        const lookback = Math.min(spinHistory.length, 50);
        const recentSpins = spinHistory.slice(-lookback);

        const dozenCounts = { 1: 0, 2: 0, 3: 0 };
        for (const spin of recentSpins) {
            const n = spin.winningNumber;
            if (n >= 1 && n <= 12) dozenCounts[1]++;
            else if (n >= 13 && n <= 24) dozenCounts[2]++;
            else if (n >= 25 && n <= 36) dozenCounts[3]++;
        }

        const sortedDozens = [1, 2, 3].sort((a, b) => dozenCounts[a] - dozenCounts[b]);
        state.selectedDozens = [sortedDozens[0], sortedDozens[1]];
    }

    // 4. Calculate Bet Amount per Dozen
    let betAmount = state.unitsPerDozen * unit;
    betAmount = Math.max(betAmount, minOutside);
    betAmount = Math.min(betAmount, maxBet);

    // Ensure total bet does not exceed available bankroll
    if (bankroll < betAmount * 2) {
        betAmount = Math.floor(bankroll / 2);
        if (betAmount < 1) {
            return [];
        }
    }

    // 5. Return Bets
    return [
        { type: 'dozen', value: state.selectedDozens[0], amount: betAmount },
        { type: 'dozen', value: state.selectedDozens[1], amount: betAmount }
    ];
}