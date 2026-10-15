/**
 * ==============================================================================
 * ROULETTE STRATEGY: THE LAVOIE METHOD
 * ==============================================================================
 * Source: https://youtu.be/68aFrJNBmYo
 * Channel: The Roulette Master
 * Strategy Creator: Richard Lavoie
 *
 * FULL LOGIC DETAILS:
 * 1. Target Selection:
 *    - The strategy targets dozens (1st 12, 2nd 12, 3rd 12) by placing street bets.
 *    - Each dozen consists of 4 streets:
 *        * 1st 12: Streets 1, 4, 7, 10
 *        * 2nd 12: Streets 13, 16, 19, 22
 *        * 3rd 12: Streets 25, 28, 31, 34
 *    - To bet on a dozen, 3 out of its 4 streets are covered, excluding the street
 *      that contained the last winning number for that specific dozen.
 *    - At base level, the strategy bets on the dozen that has gone the longest
 *      without hitting (the coldest dozen).
 *
 * 2. FULL BET PROGRESSION DETAILS:
 *    - Level 1 (Base Level):
 *        * Bet 1 base unit on 3 streets of the target dozen (Total: 3 streets).
 *        * On WIN: Reset to Level 1, pick the next coldest dozen.
 *        * On LOSS: Move to Level 2.
 *    - Level 2:
 *        * Add 3 streets from a second dozen (now 6 streets active total).
 *        * Double the unit bet per street (2 base units per street).
 *        * On WIN: Remove the winning street from active bets and re-spin.
 *        * On LOSS: Move to Level 3.
 *    - Level 3:
 *        * Add 3 streets from the remaining 3rd dozen (now 9 streets active total).
 *        * Double bet size per street (4 base units per street).
 *        * On WIN: Remove the winning street from active bets and re-spin.
 *        * On LOSS: Move to Level 4 (Double bet size per street to 8 base units).
 *    - Recovery / Progression Rules:
 *        * When winning on multi-dozen coverage (Levels 2+), remove the street that hit.
 *        * Re-spin with the remaining streets.
 *        * Achieving back-to-back wins in recovery triggers a full reset to Level 1.
 *
 * 3. GOAL:
 *    - Target Profit: Accumulate steady unit gains with high coverage.
 *    - Stop-Loss / Safety: Bankroll protection via session reset upon consecutive wins.
 * ==============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine Street Base Unit (Inside bet limit)
    const baseUnit = config.betLimits.min;

    // Dozen street map
    const dozenStreets = {
        1: [1, 4, 7, 10],
        2: [13, 16, 19, 22],
        3: [25, 28, 31, 34]
    };

    // Helper: Determine dozen of a winning number (0/00 return 0)
    function getDozen(num) {
        if (num >= 1 && num <= 12) return 1;
        if (num >= 13 && num <= 24) return 2;
        if (num >= 25 && num <= 36) return 3;
        return 0;
    }

    // Helper: Determine street start value for a winning number
    function getStreet(num) {
        if (num <= 0 || num > 36) return null;
        return Math.floor((num - 1) / 3) * 3 + 1;
    }

    // Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.level = 1;
        state.multiplier = 1;
        state.activeStreets = [];
        state.coveredDozens = [];
        state.lastHitStreetPerDozen = { 1: 10, 2: 22, 3: 34 };
        state.consecutiveWinsInRecovery = 0;
    }

    // Process last spin if available
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNum = lastSpin.winningNumber;
        const winningDozen = getDozen(winningNum);
        const winningStreet = getStreet(winningNum);

        // Track last hit street for that dozen
        if (winningDozen > 0 && winningStreet !== null) {
            state.lastHitStreetPerDozen[winningDozen] = winningStreet;
        }

        // Check if previous bet hit
        const hit = state.activeStreets.includes(winningStreet);

        if (hit) {
            if (state.level === 1) {
                // Win at Base Level -> Reset / Stay at Level 1
                state.level = 1;
                state.multiplier = 1;
                state.activeStreets = [];
                state.coveredDozens = [];
                state.consecutiveWinsInRecovery = 0;
            } else {
                // Win in Recovery Level (Levels 2+)
                state.consecutiveWinsInRecovery++;
                
                // Remove winning street
                state.activeStreets = state.activeStreets.filter(s => s !== winningStreet);

                // Two consecutive wins in recovery or all streets cleared -> Reset to Level 1
                if (state.consecutiveWinsInRecovery >= 2 || state.activeStreets.length === 0) {
                    state.level = 1;
                    state.multiplier = 1;
                    state.activeStreets = [];
                    state.coveredDozens = [];
                    state.consecutiveWinsInRecovery = 0;
                }
            }
        } else {
            // Loss -> Advance Progression
            state.consecutiveWinsInRecovery = 0;

            if (state.level === 1) {
                state.level = 2;
                state.multiplier = 2;
            } else if (state.level === 2) {
                state.level = 3;
                state.multiplier = 4;
            } else {
                // Higher levels double multiplier on loss
                state.multiplier *= 2;
            }
        }
    }

    // Helper: Select 3 streets for a dozen (excluding last hit street in that dozen)
    function select3StreetsForDozen(dozenNum) {
        const allStreets = dozenStreets[dozenNum];
        const exclude = state.lastHitStreetPerDozen[dozenNum];
        return allStreets.filter(s => s !== exclude).slice(0, 3);
    }

    // Helper: Find coldest dozens (longest since last hit)
    function getColdestDozens() {
        const lastSeen = { 1: -1, 2: -1, 3: -1 };
        for (let i = spinHistory.length - 1; i >= 0; i--) {
            const doz = getDozen(spinHistory[i].winningNumber);
            if (doz > 0 && lastSeen[doz] === -1) {
                lastSeen[doz] = spinHistory.length - 1 - i;
            }
        }
        // If a dozen was never seen, treat as very cold
        for (let d = 1; d <= 3; d++) {
            if (lastSeen[d] === -1) lastSeen[d] = 999;
        }
        return [1, 2, 3].sort((a, b) => lastSeen[b] - lastSeen[a]);
    }

    // Construct Bets if starting a new level setup
    const coldest = getColdestDozens();

    if (state.level === 1 && state.activeStreets.length === 0) {
        const targetDozen = coldest[0];
        state.coveredDozens = [targetDozen];
        state.activeStreets = select3StreetsForDozen(targetDozen);
    } else if (state.level === 2 && state.coveredDozens.length < 2) {
        const secondDozen = coldest.find(d => !state.coveredDozens.includes(d)) || coldest[1];
        state.coveredDozens.push(secondDozen);
        const newStreets = select3StreetsForDozen(secondDozen);
        state.activeStreets = [...state.activeStreets, ...newStreets];
    } else if (state.level >= 3 && state.coveredDozens.length < 3) {
        const thirdDozen = coldest.find(d => !state.coveredDozens.includes(d)) || coldest[2];
        state.coveredDozens.push(thirdDozen);
        const newStreets = select3StreetsForDozen(thirdDozen);
        state.activeStreets = [...state.activeStreets, ...newStreets];
    }

    // Calculate per-street bet amount with limits clamped
    let rawAmount = baseUnit * state.multiplier;
    let betAmount = Math.max(rawAmount, config.betLimits.min);
    betAmount = Math.min(betAmount, config.betLimits.max);

    // Build return array of bet objects
    if (state.activeStreets.length === 0) return [];

    return state.activeStreets.map(streetVal => ({
        type: 'street',
        value: streetVal,
        amount: betAmount
    }));
}