/**
 * ============================================================================
 * STRATEGY: Double Tap Dozens (Session Peak Recovery Rule)
 * ============================================================================
 * Source: https://youtu.be/iF2-TW3qKC0
 * Channel: The Roulette Master (System by Jason)
 *
 * THE FULL LOGIC IN DETAILS:
 * 1. Observation Trigger:
 *    - Spin without betting until a non-zero winning number lands in a dozen (1, 2, or 3).
 *    - Once a dozen hits, begin betting on the other two dozens that did not hit.
 *
 * 2. Bet Rotation:
 *    - Two dozens are covered simultaneously.
 *    - On a WIN:
 *      - Move the bet from the winning dozen to the unbet dozen.
 *      - Check session peak: If the bankroll has reached or exceeded its peak,
 *        reset the bet progression back to the base bet.
 *      - If the win did NOT reach the session's peak bankroll, MAINTAIN the
 *        current bet amount (do not reduce or reset).
 *    - On a LOSS:
 *      - Rebet the exact same two dozens.
 *      - Increase each dozen bet by its base bet amount (+1 base unit).
 *
 * THE FULL BET PROGRESSION IN DETAILS:
 * - Base Bet: Base outside unit (config.betLimits.minOutside) on each dozen.
 * - On Loss: Rebet same dozens; unitMultiplier += 1.
 * - On Win (Below Peak): Rotate bet to unbet dozen; keep unitMultiplier unchanged.
 * - On Win (At/Above Peak): Rotate bet to unbet dozen; reset unitMultiplier = 1.
 *
 * THE GOAL:
 * - Maintain bet sizing during drawdowns until the bankroll fully recovers to
 *   a new session high, avoiding premature bet reductions.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // -------------------------------------------------------------------------
    // 1. Initialize State
    // -------------------------------------------------------------------------
    if (!state.initialized) {
        state.initialized = true;
        state.baseUnit = Math.max(config.betLimits.minOutside, 5);
        state.unitMultiplier = 1;
        state.peakBankroll = bankroll;
        state.activeDozens = [];
        state.unbetDozen = null;
        state.lastBets = null;
        state.targetProfit = 20000;
        state.startBankroll = bankroll;
    }

    const baseUnit = state.baseUnit;
    const maxBet = config.betLimits.max;

    // Helper: Determine dozen (1, 2, 3) or 0 for zero
    function getDozen(num) {
        if (num >= 1 && num <= 12) return 1;
        if (num >= 13 && num <= 24) return 2;
        if (num >= 25 && num <= 36) return 3;
        return 0;
    }

    // -------------------------------------------------------------------------
    // 2. Process Result of Previous Spin
    // -------------------------------------------------------------------------
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNum = lastSpin.winningNumber;
        const winningDozen = getDozen(winningNum);

        // Case A: Initial observation phase
        if (state.activeDozens.length === 0) {
            if (winningDozen > 0) {
                const allDozens = [1, 2, 3];
                state.unbetDozen = winningDozen;
                state.activeDozens = allDozens.filter(d => d !== winningDozen);
                state.unitMultiplier = 1;
                state.peakBankroll = Math.max(state.peakBankroll, bankroll);
            } else {
                return [];
            }
        } 
        // Case B: Evaluated active bets
        else if (state.lastBets && state.lastBets.length > 0) {
            const wonSpin = state.activeDozens.includes(winningDozen);

            if (wonSpin) {
                // Rotate bet: winning dozen moves to unbet dozen
                const previouslyUnbet = state.unbetDozen;
                const otherBetDozen = state.activeDozens.find(d => d !== winningDozen);
                state.unbetDozen = winningDozen;
                state.activeDozens = [otherBetDozen, previouslyUnbet];

                // Check if the win restored the session to its peak profit
                if (bankroll >= state.peakBankroll) {
                    state.peakBankroll = bankroll;
                    state.unitMultiplier = 1; // Reset to base only at/above peak
                }
                // If below peak: do not reduce the bet amount (unitMultiplier remains the same)
            } else {
                // Loss: rebet same dozens and step up by 1 base unit
                state.unitMultiplier += 1;
            }
        }
    } else {
        return [];
    }

    // -------------------------------------------------------------------------
    // 3. Stop-Loss & Target Profit Check
    // -------------------------------------------------------------------------
    if (bankroll <= 0 || bankroll >= state.startBankroll + state.targetProfit) {
        return [];
    }

    if (state.activeDozens.length < 2) {
        return [];
    }

    // -------------------------------------------------------------------------
    // 4. Calculate Bet Amounts
    // -------------------------------------------------------------------------
    let betAmount = baseUnit * state.unitMultiplier;
    betAmount = Math.max(betAmount, config.betLimits.minOutside);
    betAmount = Math.min(betAmount, maxBet);

    if (bankroll < betAmount * 2) {
        betAmount = Math.floor(bankroll / 2);
        if (betAmount < config.betLimits.minOutside) {
            return [];
        }
    }

    // -------------------------------------------------------------------------
    // 5. Construct Bets
    // -------------------------------------------------------------------------
    const bets = [
        {
            type: 'dozen',
            value: state.activeDozens[0],
            amount: betAmount
        },
        {
            type: 'dozen',
            value: state.activeDozens[1],
            amount: betAmount
        }
    ];

    state.lastBets = bets;
    return bets;
}