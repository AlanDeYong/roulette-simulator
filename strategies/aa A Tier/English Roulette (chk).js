/**
 * Corrected English Roulette Strategy
 * 
 * Source:
 * - URL: https://youtu.be/ZCXR1-aK6xQ
 * - Channel: The Roulette Master (featuring Jimmy English)
 * 
 * The Full Logic in Detail:
 * - Initialization: Wait and spin without placing any bets until all 3 unique dozens (1, 2, and 3)
 *   have hit at least once in history.
 * - Selection Criteria:
 *     * Coldest Dozen: The dozen that has not won for the longest time.
 *     * Coldest Streets: Within a target dozen, the 2 streets that have not won for the longest time.
 *       If insufficient history exists to distinguish them, pick 2 streets randomly / fallback.
 * 
 * The Full Bet Progression in Detail:
 * - Stage 1 (Initial Bet):
 *     * Identify the dozen that hasn't won for the longest time.
 *     * Bet 1 base unit on each of its 2 coldest streets (total 2 streets).
 * - Stage 2 (On 1st Loss):
 *     * Rebet active streets, pick the coldest dozen among the unbet dozens.
 *     * Add its 2 coldest streets at 1 base unit each (total 4 streets, 1 unit each).
 * - Stage 3 (On 2nd Consecutive Loss):
 *     * Rebet active streets, identify the last remaining dozen with no bets.
 *     * Add its 2 coldest streets, then double up all bets on the board (total 6 streets, 2 units each).
 * - Stage 4+ (On Subsequent Losses):
 *     * Rebet active streets and increase all bets following a modified Fibonacci progression
 *       (sum of the previous two bet amounts: 1, 2, 3, 5, 8, 13, 21, 34, 55...).
 * - On Win:
 *     * If bankroll reaches or exceeds the session's peak bankroll, reset completely to Stage 1.
 *     * If not at session peak profit: Rebet remaining active streets, remove the street that just won
 *       (capped at removing a maximum of 2 streets total during the cycle).
 * 
 * The Goal:
 * - Accumulate profit targeting session peaks, expanding board coverage during cold runs, and recovering via Fibonacci.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const DOZEN_STREETS = {
        1: [1, 4, 7, 10],
        2: [13, 16, 19, 22],
        3: [25, 28, 31, 34]
    };

    function getDozen(num) {
        if (num >= 1 && num <= 12) return 1;
        if (num >= 13 && num <= 24) return 2;
        if (num >= 25 && num <= 36) return 3;
        return 0; // 0 or 00
    }

    function getStreet(num) {
        if (num <= 0 || num > 36) return null;
        return Math.floor((num - 1) / 3) * 3 + 1;
    }

    // Identify the dozen among candidates that hasn't won for the longest time
    function getColdestDozen(candidateDozens, history) {
        const lastSeen = {};
        candidateDozens.forEach(d => { lastSeen[d] = -1; });

        for (let i = history.length - 1; i >= 0; i--) {
            const doz = getDozen(history[i].winningNumber);
            if (candidateDozens.includes(doz) && lastSeen[doz] === -1) {
                lastSeen[doz] = i;
            }
        }

        // Sort candidates ascending by index (smaller index = hit longer ago; -1 = never hit)
        return [...candidateDozens].sort((a, b) => lastSeen[a] - lastSeen[b])[0];
    }

    // Pick 2 streets in a dozen that have not won for the longest time
    function getColdestTwoStreets(dozenNum, history) {
        const streets = [...DOZEN_STREETS[dozenNum]];
        const lastSeen = {};
        streets.forEach(s => { lastSeen[s] = -1; });

        for (let i = history.length - 1; i >= 0; i--) {
            const st = getStreet(history[i].winningNumber);
            if (st !== null && streets.includes(st) && lastSeen[st] === -1) {
                lastSeen[st] = i;
            }
        }

        // Sort ascending by last seen index
        const sorted = streets.sort((a, b) => lastSeen[a] - lastSeen[b]);
        return sorted.slice(0, 2);
    }

    // Check if 3 unique dozens have won in history
    function hasSeenThreeUniqueDozens(history) {
        const seen = new Set();
        for (let i = 0; i < history.length; i++) {
            const doz = getDozen(history[i].winningNumber);
            if (doz >= 1 && doz <= 3) seen.add(doz);
            if (seen.size === 3) return true;
        }
        return false;
    }

    // Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.peakBankroll = bankroll;
        state.activeStreets = []; // Array of street numbers currently bet on
        state.activeDozens = [];  // Array of dozens currently engaged
        state.fibSequence = [1, 2]; // Current Fibonacci tracking [prev2, prev1]
        state.currentUnit = 1;
        state.stage = 1; // 1: 1 dozen, 2: 2 dozens, 3: 3 dozens (doubled), 4+: Fibonacci
        state.removedCount = 0; // Number of streets removed in current recovery cycle
        state.lastBets = [];
    }

    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    // Wait until 3 unique dozens have won
    if (!hasSeenThreeUniqueDozens(spinHistory)) {
        return [];
    }

    // Reset helper to return to Stage 1
    function resetToStage1() {
        const coldDozen = getColdestDozen([1, 2, 3], spinHistory);
        const coldStreets = getColdestTwoStreets(coldDozen, spinHistory);
        state.stage = 1;
        state.currentUnit = 1;
        state.fibSequence = [1, 2];
        state.activeDozens = [coldDozen];
        state.activeStreets = coldStreets;
        state.removedCount = 0;
    }

    // Process last spin if there were active bets
    if (state.lastBets && state.lastBets.length > 0 && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastHitStreet = getStreet(lastSpin.winningNumber);
        const won = state.lastBets.some(b => b.value === lastHitStreet);

        if (won) {
            // Check if at session's peak profit
            if (bankroll >= state.peakBankroll) {
                resetToStage1();
            } else {
                // Remove winning street if under the limit of 2 removals
                if (state.removedCount < 2 && state.activeStreets.includes(lastHitStreet)) {
                    state.activeStreets = state.activeStreets.filter(s => s !== lastHitStreet);
                    state.removedCount++;
                }
            }
        } else {
            // Loss Progression
            if (state.stage === 1) {
                // Add 2nd coldest dozen
                const remainingDozens = [1, 2, 3].filter(d => !state.activeDozens.includes(d));
                const secondDozen = getColdestDozen(remainingDozens, spinHistory);
                const newStreets = getColdestTwoStreets(secondDozen, spinHistory);

                state.activeDozens.push(secondDozen);
                state.activeStreets.push(...newStreets);
                state.stage = 2;
                state.currentUnit = 1;
            } else if (state.stage === 2) {
                // Add 3rd dozen and double up all bets
                const remainingDozens = [1, 2, 3].filter(d => !state.activeDozens.includes(d));
                const thirdDozen = remainingDozens[0] || 1;
                const newStreets = getColdestTwoStreets(thirdDozen, spinHistory);

                state.activeDozens.push(thirdDozen);
                state.activeStreets.push(...newStreets);
                state.stage = 3;
                state.currentUnit = 2;
                state.fibSequence = [1, 2];
            } else {
                // Stage 4+: Modified Fibonacci progression (sum of previous two bet amounts)
                state.stage++;
                const nextUnit = state.fibSequence[0] + state.fibSequence[1];
                state.fibSequence = [state.fibSequence[1], nextUnit];
                state.currentUnit = nextUnit;
            }
        }
    } else if (state.activeStreets.length === 0) {
        // Initial setup once qualification is met
        resetToStage1();
    }

    // Calculate bet amount clamped to table limits
    const baseUnit = config.betLimits.min;
    let streetBetAmount = baseUnit * state.currentUnit;
    streetBetAmount = Math.max(streetBetAmount, config.betLimits.min);
    streetBetAmount = Math.min(streetBetAmount, config.betLimits.max);

    // Build the street bet objects
    const bets = state.activeStreets.map(streetVal => ({
        type: 'street',
        value: streetVal,
        amount: streetBetAmount
    }));

    state.lastBets = bets;
    return bets;
}