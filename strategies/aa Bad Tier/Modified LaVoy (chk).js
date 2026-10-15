/**
 * Modified LaVoy Roulette Strategy
 *
 * Source:
 *   - Video: " (NO LOSSES) MILLIONS OF SPINS WILL VERIFY GENIUS NEW ROULETTE SYSTEM!"
 *   - URL: https://youtu.be/qmN3sYfNJQs
 *   - Channel: The Roulette Master
 *
 * The Full Logic in Detail:
 *   1. Dozen & Street Tracking:
 *      - Tracks the appearance of all 3 dozens (1st 12: 1-12, 2nd 12: 13-24, 3rd 12: 25-36).
 *      - Determines which dozen has been sleeping (unhit) the longest.
 *      - Within any target dozen, checks the most recent number that landed in that dozen and identifies
 *        its street.
 *      - Places bets on the OTHER 3 streets within that dozen (leaving out the street of the most recent hit).
 *
 * The Full Bet Progression in Detail:
 *   - Stage 1 (3 Streets / 9 Numbers Covered):
 *     - Bet 1 base unit on 3 streets of the longest sleeping dozen.
 *     - Win: Reset to Stage 1 on the newly calculated longest sleeping dozen.
 *     - Loss: Move to Stage 2.
 *   - Stage 2 (6 Streets / 18 Numbers Covered):
 *     - Retain the active streets and add 3 streets from the next longest sleeping dozen (leaving out its last hit street).
 *     - Bet size: Double the per-street amount (2 units per street across 6 streets).
 *     - Win: In this Modified version, IMMEDIATELY reset to Stage 1 (1 dozen / 3 streets).
 *     - Loss: Move to Stage 3.
 *   - Stage 3 (9 Streets / 27 Numbers Covered):
 *     - Add the remaining 3rd dozen's 3 streets (9 streets total covered).
 *     - Bet size doubles (Martingale on 9 streets) on each subsequent loss.
 *     - Win: In this Modified version, IMMEDIATELY reset to Stage 1 after a single win.
 *
 * The Goal:
 *   - Bank high-probability wins at Stage 1 and Stage 2 while strictly cutting deep progression risk
 *     by resetting after any single win rather than chasing multi-spin recoveries.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit for inside street bets
    const minInside = (config && config.betLimits && config.betLimits.min) ? config.betLimits.min : 2;
    const maxBet = (config && config.betLimits && config.betLimits.max) ? config.betLimits.max : 500;

    // Define dozen ranges and street start numbers
    const DOZENS = {
        1: { name: '1st 12', min: 1, max: 12, streets: [1, 4, 7, 10] },
        2: { name: '2nd 12', min: 13, max: 24, streets: [13, 16, 19, 22] },
        3: { name: '3rd 12', min: 25, max: 36, streets: [25, 28, 31, 34] }
    };

    // Helper: Find which dozen a number belongs to (0 / 00 returns null)
    function getDozen(num) {
        if (num >= 1 && num <= 12) return 1;
        if (num >= 13 && num <= 24) return 2;
        if (num >= 25 && num <= 36) return 3;
        return null;
    }

    // Helper: Find the starting number of the street for a given number
    function getStreetStart(num) {
        if (num < 1 || num > 36) return null;
        return Math.floor((num - 1) / 3) * 3 + 1;
    }

    // Helper: Find the last hit number in a specific dozen from spinHistory
    function getLastHitNumberInDozen(history, dozenId) {
        const { min, max } = DOZENS[dozenId];
        for (let i = history.length - 1; i >= 0; i--) {
            const n = history[i].winningNumber;
            if (n >= min && n <= max) {
                return n;
            }
        }
        return null;
    }

    // Helper: Rank dozens by how long they have been sleeping (longest unhit first)
    function getDozensBySleepTime(history) {
        const lastSeen = { 1: -1, 2: -1, 3: -1 };
        for (let i = history.length - 1; i >= 0; i--) {
            const d = getDozen(history[i].winningNumber);
            if (d && lastSeen[d] === -1) {
                lastSeen[d] = history.length - 1 - i;
            }
        }

        // If a dozen was never seen, set its sleep time higher than history length
        const dozens = [1, 2, 3].map(d => ({
            dozen: d,
            sleep: lastSeen[d] === -1 ? 999999 + (4 - d) : lastSeen[d]
        }));

        // Sort descending by sleep time (longest sleeping first)
        dozens.sort((a, b) => b.sleep - a.sleep);
        return dozens.map(d => d.dozen);
    }

    // Helper: Get 3 streets for a dozen, leaving out the street of the last hit number
    function getThreeStreetsForDozen(history, dozenId) {
        const allStreets = DOZENS[dozenId].streets;
        const lastHit = getLastHitNumberInDozen(history, dozenId);
        if (lastHit !== null) {
            const lastStreet = getStreetStart(lastHit);
            const filtered = allStreets.filter(s => s !== lastStreet);
            if (filtered.length === 3) return filtered;
        }
        // Default: return first 3 streets if none hit yet or fallback
        return allStreets.slice(0, 3);
    }

    // 2. Initialize or Update State
    if (!state.stage) state.stage = 1; // Stage 1 (3 streets), Stage 2 (6 streets), Stage 3 (9 streets)
    if (!state.multiplier) state.multiplier = 1; // Progression multiplier per street
    if (!state.activeStreets) state.activeStreets = [];

    // Check last spin outcome if we previously placed bets
    if (spinHistory && spinHistory.length > 0 && state.activeStreets.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNum = lastSpin.winningNumber;
        const winningStreet = getStreetStart(winningNum);

        const won = state.activeStreets.includes(winningStreet);

        if (won) {
            // Modified LaVoy Rule: Any win immediately resets back to Stage 1
            state.stage = 1;
            state.multiplier = 1;
            state.activeStreets = [];
        } else {
            // Loss progression
            if (state.stage === 1) {
                state.stage = 2;
                state.multiplier = 2; // Double unit per street
            } else if (state.stage === 2) {
                state.stage = 3;
                state.multiplier = 2; // Initial 9 streets bet level
            } else {
                // Stage 3 loss: Double the bet on all 9 streets
                state.stage = 3;
                state.multiplier *= 2;
            }
        }
    }

    // 3. Select Dozens and Streets based on Current Stage
    const sleepingDozens = getDozensBySleepTime(spinHistory || []);
    let targetStreets = [];

    if (state.stage === 1) {
        // Longest sleeping dozen (3 streets)
        const d1 = sleepingDozens[0];
        targetStreets = getThreeStreetsForDozen(spinHistory || [], d1);
    } else if (state.stage === 2) {
        // 2 longest sleeping dozens (6 streets)
        const d1 = sleepingDozens[0];
        const d2 = sleepingDozens[1];
        targetStreets = [
            ...getThreeStreetsForDozen(spinHistory || [], d1),
            ...getThreeStreetsForDozen(spinHistory || [], d2)
        ];
    } else {
        // All 3 dozens (9 streets)
        targetStreets = [
            ...getThreeStreetsForDozen(spinHistory || [], 1),
            ...getThreeStreetsForDozen(spinHistory || [], 2),
            ...getThreeStreetsForDozen(spinHistory || [], 3)
        ];
    }

    // Save active streets in state for result evaluation next spin
    state.activeStreets = targetStreets;

    // 4. Calculate Bet Amount per Street and Clamp to Limits
    let unitAmount = minInside * state.multiplier;
    unitAmount = Math.max(unitAmount, minInside);
    unitAmount = Math.min(unitAmount, maxBet);

    const totalRequired = unitAmount * targetStreets.length;
    if (bankroll < totalRequired) {
        // Bankroll cannot cover full bet - stop or bet what remains clamped
        return [];
    }

    // 5. Construct and Return Street Bets
    const bets = targetStreets.map(streetStart => ({
        type: 'street',
        value: streetStart,
        amount: unitAmount
    }));

    return bets;
}