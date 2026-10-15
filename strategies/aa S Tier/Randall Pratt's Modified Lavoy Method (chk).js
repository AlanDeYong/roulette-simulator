/**
 * ============================================================================
 * ROULETTE STRATEGY: Randall Pratt's Method (Pure Rule Set)
 * ============================================================================
 * 
 * Source:
 * - YouTube Channel: The Roulette Master
 * - Video URL: https://youtu.be/LH9zslrtGMI
 * 
 * ----------------------------------------------------------------------------
 * 1. THE FULL LOGIC IN DETAILS:
 * ----------------------------------------------------------------------------
 * - Spin without betting until all 3 dozens (1-12, 13-24, 25-36) have hit at least once.
 * - Initial Bet:
 *     * Identify the dozen that has not won for the longest time (sleeping dozen).
 *     * Place a 1-unit bet on 3 streets of that dozen, omitting the street that 
 *       most recently won in that dozen (3 streets / 9 numbers covered).
 * 
 * ----------------------------------------------------------------------------
 * 2. THE FULL BET PROGRESSION IN DETAILS:
 * ----------------------------------------------------------------------------
 * - Loss 1 (3 streets active):
 *     * Add 3 streets from the remaining dozen that did NOT just win (omitting its 
 *       most recent winning street) at 1 unit each (total 6 streets active).
 * - Loss 2 (6 streets active):
 *     * Add 3 streets from the dozen that just won (omitting its most recent winning 
 *       street) at 1 unit each (total 9 streets active).
 * - Subsequent Losses (Loss 3+):
 *     * Keep current active streets and increase all bets by 1 unit.
 * - On Win:
 *     * If bankroll >= session's peak profit (or all active streets cleared), RESET.
 *     * Otherwise, rebet and remove (pull off) the street that just won.
 * 
 * ----------------------------------------------------------------------------
 * 3. THE GOAL:
 * ----------------------------------------------------------------------------
 * - Reach a new session peak bankroll and lock in profits before resetting.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // ------------------------------------------------------------------------
    // 1. Board Layout & Helper Utilities
    // ------------------------------------------------------------------------
    const DOZENS = {
        1: [1, 4, 7, 10],
        2: [13, 16, 19, 22],
        3: [25, 28, 31, 34]
    };

    const ALL_STREETS = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];

    function getStreetForNumber(num) {
        if (num <= 0 || num > 36) return null;
        for (let s of ALL_STREETS) {
            if (num >= s && num <= s + 2) return s;
        }
        return null;
    }

    function getDozenForNumber(num) {
        if (num >= 1 && num <= 12) return 1;
        if (num >= 13 && num <= 24) return 2;
        if (num >= 25 && num <= 36) return 3;
        return null;
    }

    function get3StreetsForDozen(dozenNum, history) {
        const dozenStreets = [...DOZENS[dozenNum]];
        let lastHitStreet = null;
        for (let i = history.length - 1; i >= 0; i--) {
            const s = getStreetForNumber(history[i].winningNumber);
            if (s && dozenStreets.includes(s)) {
                lastHitStreet = s;
                break;
            }
        }
        if (!lastHitStreet) {
            lastHitStreet = dozenStreets[dozenStreets.length - 1];
        }
        return dozenStreets.filter(s => s !== lastHitStreet);
    }

    function getDozensAbsenceOrder(history) {
        const lastSeen = { 1: -1, 2: -1, 3: -1 };
        for (let i = history.length - 1; i >= 0; i--) {
            const d = getDozenForNumber(history[i].winningNumber);
            if (d && lastSeen[d] === -1) {
                lastSeen[d] = history.length - 1 - i;
            }
        }
        // Sort dozens by longest time since hit (descending)
        return [1, 2, 3].sort((a, b) => lastSeen[b] - lastSeen[a]);
    }

    // ------------------------------------------------------------------------
    // 2. Base Unit & Increments
    // ------------------------------------------------------------------------
    const baseUnit = Math.max(config.betLimits.min, 1);
    const unitIncrement = (config.incrementMode === 'base') 
        ? baseUnit 
        : (config.minIncrementalBet || 1);

    // ------------------------------------------------------------------------
    // 3. State Tracking
    // ------------------------------------------------------------------------
    if (state.peakBankroll === undefined) {
        state.peakBankroll = bankroll;
        state.activeStreets = [];
        state.activeDozens = [];
        state.units = 1;
    }

    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    // Check Trigger: All 3 dozens must have won at least once
    const dozensSeen = new Set();
    for (let i = 0; i < spinHistory.length; i++) {
        const d = getDozenForNumber(spinHistory[i].winningNumber);
        if (d) dozensSeen.add(d);
    }

    if (dozensSeen.size < 3) {
        return []; // Spin without betting until all 3 dozens have hit
    }

    // ------------------------------------------------------------------------
    // 4. Outcome Evaluation
    // ------------------------------------------------------------------------
    if (spinHistory.length > 0 && state.activeStreets.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNum = lastSpin.winningNumber;
        const hitStreet = getStreetForNumber(winningNum);
        const lastHitDozen = getDozenForNumber(winningNum);
        const won = hitStreet !== null && state.activeStreets.includes(hitStreet);

        if (won) {
            // On Win
            if (bankroll >= state.peakBankroll) {
                // Peak session profit reached -> Reset
                state.activeStreets = [];
                state.activeDozens = [];
                state.units = 1;
            } else {
                // Remove the street which just won and rebet
                state.activeStreets = state.activeStreets.filter(s => s !== hitStreet);
                if (state.activeStreets.length === 0) {
                    state.activeStreets = [];
                    state.activeDozens = [];
                    state.units = 1;
                }
            }
        } else {
            // On Loss
            if (state.activeDozens.length === 1) {
                // Loss 1: Add the remaining dozen that did NOT recently win
                const firstD = state.activeDozens[0];
                const allThree = [1, 2, 3];
                // Find the dozen that is neither the current active dozen nor the one that just won
                let secondD = allThree.find(d => d !== firstD && d !== lastHitDozen);
                if (!secondD) {
                    secondD = allThree.find(d => d !== firstD);
                }

                state.activeDozens.push(secondD);
                const newStreets = get3StreetsForDozen(secondD, spinHistory);
                state.activeStreets = [...new Set([...state.activeStreets, ...newStreets])];
            } else if (state.activeDozens.length === 2) {
                // Loss 2: Add the dozen that just won
                const remainingD = [1, 2, 3].find(d => !state.activeDozens.includes(d));
                if (remainingD) {
                    state.activeDozens.push(remainingD);
                    const newStreets = get3StreetsForDozen(remainingD, spinHistory);
                    state.activeStreets = [...new Set([...state.activeStreets, ...newStreets])];
                }
            } else {
                // Subsequent Losses: Increase all bets by 1 unit
                state.units += 1;
            }
        }
    }

    // ------------------------------------------------------------------------
    // 5. Initial / Reset Placement Setup
    // ------------------------------------------------------------------------
    if (state.activeStreets.length === 0) {
        const absenceOrder = getDozensAbsenceOrder(spinHistory);
        const longestSleepingDozen = absenceOrder[0];

        state.activeDozens = [longestSleepingDozen];
        state.activeStreets = get3StreetsForDozen(longestSleepingDozen, spinHistory);
        state.units = 1;
    }

    // ------------------------------------------------------------------------
    // 6. Build and Clamp Bets
    // ------------------------------------------------------------------------
    let betAmount = baseUnit + (state.units - 1) * unitIncrement;
    betAmount = Math.max(betAmount, config.betLimits.min);
    betAmount = Math.min(betAmount, config.betLimits.max);

    return state.activeStreets.map(streetStart => ({
        type: 'street',
        value: streetStart,
        amount: betAmount
    }));
}