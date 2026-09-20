/**
 * ROULETTE STRATEGY: Double D'Alembert Dozens
 * 
 * Source:
 * - Channel: Cruising & Craps
 * - Video: "$500 ROULETTE STRATEGY SHOWDOWN: COLUMS VS DOZENS"
 * - URL: https://youtu.be/fRs40CZptZQ
 * 
 * Strategy Overview & Details:
 * 1. Target & Stop Conditions:
 *    - Starting Bankroll: Typically $500.
 *    - Profit Target: +10% of starting bankroll (e.g., +$50 to reach $550), at which point
 *      play stops and profits are locked in.
 *    - Stop-Loss: If bankroll falls below the required bet amount.
 * 
 * 2. Board Coverage & Bet Selection:
 *    - Covers 2 out of the 3 Dozens (24 numbers, ~63.16% on American / ~64.86% on European).
 *    - Bet Selection: Tracks spin history to always bet on the last two distinct dozens that hit.
 *      * If 0 or 00 hits, the previous dozens are maintained.
 *      * When a non-covered dozen hits, it replaces the oldest active dozen in the bet selection.
 * 
 * 3. Double D'Alembert Progression:
 *    - Base Unit: 1 unit per dozen (defaults to `config.betLimits.minOutside * 2` or $10).
 *    - On Loss (the unbet dozen or green hits):
 *      * Increase bet by 2 units on each dozen (+2 units per side).
 *      * Progression ladder per dozen: 1 unit -> 3 units -> 5 units -> 7 units -> 9 units.
 *    - On Win (one of the 2 bet dozens hits, paying 2:1):
 *      * Check if bankroll has achieved a new session profit peak (or reached target).
 *      * If in new overall profit: RESET bet back to 1 base unit per dozen.
 *      * If still in recovery mode (below starting/peak bankroll): DECREASE bet by 1 unit per dozen.
 * 
 * 4. Bet Limits:
 *    - Every bet is clamped between `config.betLimits.minOutside` and `config.betLimits.max`.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // ----------------------------------------------------
    // 1. Helpers
    // ----------------------------------------------------
    function getDozen(num) {
        if (num === null || num === undefined || num === 0 || num === '00' || num === 37) {
            return null; // Zero / Double Zero has no dozen
        }
        const n = Number(num);
        if (n >= 1 && n <= 12) return 1;
        if (n >= 13 && n <= 24) return 2;
        if (n >= 25 && n <= 36) return 3;
        return null;
    }

    // ----------------------------------------------------
    // 2. State Initialization
    // ----------------------------------------------------
    if (state.initialBankroll === undefined) {
        state.initialBankroll = bankroll;
        state.targetBankroll = bankroll + bankroll * 10.10; // +10% target goal
        state.peakBankroll = bankroll;
        state.currentUnits = 1; // 1 unit per dozen
        state.activeDozens = [1, 2]; // Default starting dozens
        state.lastBetDozens = null;
        state.lastUnitBet = 1;
    }

    // Check if target profit has been reached
    if (bankroll >= state.targetBankroll) {
        return []; // Target reached, stop betting
    }

    // Base unit size (respecting config outside min)
    const minOutside = config.betLimits.minOutside || 5;
    const baseUnit = Math.max(minOutside * 2, 10); // $10 standard base unit from video

    // ----------------------------------------------------
    // 3. Evaluate Previous Spin & Update Progression
    // ----------------------------------------------------
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastWinningNumber = lastSpin.winningNumber;
        const hitDozen = getDozen(lastWinningNumber);

        // Update active dozens tracking (last 2 unique dozens that hit)
        if (hitDozen !== null) {
            if (!state.activeDozens.includes(hitDozen)) {
                // Replace the oldest dozen with the newest
                state.activeDozens = [state.activeDozens[1], hitDozen];
            }
        }

        // If we placed a bet on the prior spin, assess win/loss
        if (state.lastBetDozens) {
            const won = hitDozen !== null && state.lastBetDozens.includes(hitDozen);

            if (won) {
                // Check if bankroll has surpassed previous peak / starting bankroll
                if (bankroll > state.peakBankroll) {
                    state.peakBankroll = bankroll;
                    state.currentUnits = 1; // Reset to base level on new profit
                } else {
                    // Still recovering: decrease by 1 unit per dozen
                    state.currentUnits = Math.max(1, state.currentUnits - 1);
                }
            } else {
                // Loss: increase by 2 units per dozen (Double D'Alembert)
                state.currentUnits += 2;
            }
        }
    } else {
        // Pre-scan history if available to determine last 2 distinct dozens
        const recentDozens = [];
        for (let i = spinHistory.length - 1; i >= 0; i--) {
            const d = getDozen(spinHistory[i].winningNumber);
            if (d !== null && !recentDozens.includes(d)) {
                recentDozens.unshift(d);
                if (recentDozens.length === 2) break;
            }
        }
        if (recentDozens.length === 2) {
            state.activeDozens = recentDozens;
        }
    }

    // ----------------------------------------------------
    // 4. Calculate & Clamp Bet Amounts
    // ----------------------------------------------------
    let betAmount = baseUnit * state.currentUnits;

    // Clamp to table limits
    betAmount = Math.max(betAmount, config.betLimits.minOutside);
    betAmount = Math.min(betAmount, config.betLimits.max);

    // Total required bankroll for 2 dozens
    const totalRequired = betAmount * 2;
    if (bankroll < totalRequired) {
        // If insufficient bankroll, bet what's affordable or stop
        const affordable = Math.floor(bankroll / 2);
        if (affordable >= config.betLimits.minOutside) {
            betAmount = affordable;
        } else {
            return []; // Stop betting if unable to cover minimums
        }
    }

    // Save state for next evaluation
    state.lastBetDozens = [...state.activeDozens];
    state.lastUnitBet = state.currentUnits;

    // ----------------------------------------------------
    // 5. Return Bets
    // ----------------------------------------------------
    return [
        { type: 'dozen', value: state.activeDozens[0], amount: betAmount },
        { type: 'dozen', value: state.activeDozens[1], amount: betAmount }
    ];
}