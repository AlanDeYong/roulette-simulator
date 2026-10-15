/**
 * ============================================================================
 * ROULETTE STRATEGY: Power Seven (Weighted Selection Modification)
 * ============================================================================
 * Source:
 *   - Video: "(WOW) BILLY’S NO BUST WORKS! #best #viralvideo #gaming #money #business #trending #1"
 *   - Channel: The Roulette Master
 *   - URL: https://youtu.be/ykp7I2Rb0XE
 *
 * Modified Selection Logic:
 *   1. Observation Period:
 *      - Observes 37 spins without placing any bets (`spinHistory.length < 37`).
 *   2. Multi-Factor Weighting:
 *      - Each number (0-36) is scored based on:
 *          • Frequency: Total number of appearances in the evaluation window.
 *          • Recency: Linear multiplier giving greater weight to recent hits.
 *          • Proximity to Recent Results: Wheel-track closeness to recent outcomes,
 *            giving bonus weight to wheel sectors currently catching the ball.
 *   3. Tie-Breaking:
 *      - In the event of a tie for top score, the 7-number group weight (the number
 *        plus its 3 wheel neighbors on each side) is calculated. The candidate with
 *        the highest aggregate cluster weight is selected.
 *   4. Bet Placements:
 *      - 7 straight-up bets covering the selected center number and its 3 wheel
 *        neighbors on each side (Voisins cluster).
 *
 * Progression (Unchanged Power Seven):
 *   - Multiplier Tiers:
 *       • Tier 1: 1 unit  -> 3 attempts
 *       • Tier 2: 2 units -> 2 attempts
 *       • Tier 3: 3 units -> 2 attempts
 *       • Tier 4: 4 units -> 2 attempts
 *       • Tier 5: 5 units -> 2 attempts
 *       • Tier 6: 7 units -> 2 attempts
 *       • Tier 7: 10 units -> 2 attempts
 *       • Tier 8: 14 units -> 2 attempts
 *       • Tier 9: 19 units -> 2 attempts
 *       • Tier 10: 25 units -> 2 attempts
 *       • Tier 11: 32 units -> 2 attempts
 *   - On Win: Reset tier to 0 and re-calculate the highest-weighted cluster.
 *   - On Loss: Advance attempt counter; step up to the next tier if attempts lapse.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // European wheel sequence in physical wheel order
    const WHEEL = [
        0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
        5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
    ];

    // Progression tiers: [unitsPerNumber, attemptsAllowed]
    const PROGRESSION_TIERS = [
        { units: 1, attempts: 3 },
        { units: 2, attempts: 2 },
        { units: 3, attempts: 2 },
        { units: 4, attempts: 2 },
        { units: 5, attempts: 2 },
        { units: 7, attempts: 2 },
        { units: 10, attempts: 2 },
        { units: 14, attempts: 2 },
        { units: 19, attempts: 2 },
        { units: 25, attempts: 2 },
        { units: 32, attempts: 2 }
    ];

    // 1. Minimum Observation Check (Spin without betting for 37 spins)
    if (!spinHistory || spinHistory.length < 37) {
        return [];
    }

    // Initialize State
    if (!state.initialized) {
        state.tierIndex = 0;
        state.tierAttempt = 0;
        state.activeNumbers = [];
        state.initialized = true;
    }

    // Helper: Wheel-distance between two numbers
    function getWheelDistance(n1, n2) {
        const idx1 = WHEEL.indexOf(n1);
        const idx2 = WHEEL.indexOf(n2);
        const rawDiff = Math.abs(idx1 - idx2);
        return Math.min(rawDiff, 37 - rawDiff);
    }

    // Helper: Return 7 numbers (center + 3 neighbors each side)
    function getPowerSevenNumbers(center) {
        const centerIdx = WHEEL.indexOf(center);
        if (centerIdx === -1) return [center];

        const numbers = [];
        const len = WHEEL.length;
        for (let offset = -3; offset <= 3; offset++) {
            const idx = (centerIdx + offset + len) % len;
            numbers.push(WHEEL[idx]);
        }
        return numbers;
    }

    // Helper: Calculate composite weight for every number
    function calculateBestNumber(history) {
        const windowSize = 37;
        const recentSpins = history.slice(-windowSize);
        const weights = {};

        for (let i = 0; i <= 36; i++) {
            weights[i] = 0;
        }

        // Score frequency, recency, and track proximity
        for (let i = 0; i < recentSpins.length; i++) {
            const hitNum = recentSpins[i].winningNumber;
            const recencyWeight = (i + 1) / windowSize; // 0 to 1

            for (let candidate = 0; candidate <= 36; candidate++) {
                const dist = getWheelDistance(candidate, hitNum);

                // Direct hit: frequency + recency bonus
                if (dist === 0) {
                    weights[candidate] += 10 * recencyWeight;
                }

                // Proximity: inverse distance on the 37-pocket track scaled by recency
                const proximityScore = Math.max(0, 18 - dist) / 18;
                weights[candidate] += proximityScore * 5 * recencyWeight;
            }
        }

        // Find candidate(s) with highest weight
        let maxWeight = -1;
        let candidates = [];

        for (let n = 0; n <= 36; n++) {
            const score = Number(weights[n].toFixed(4));
            if (score > maxWeight) {
                maxWeight = score;
                candidates = [n];
            } else if (score === maxWeight) {
                candidates.push(n);
            }
        }

        // Single winner
        if (candidates.length === 1) {
            return candidates[0];
        }

        // Tie-breaker: Compare total group weightage (candidate + 6 neighbors)
        let bestGroupScore = -1;
        let selectedCandidate = candidates[0];

        for (let i = 0; i < candidates.length; i++) {
            const cand = candidates[i];
            const cluster = getPowerSevenNumbers(cand);
            let groupScore = 0;
            for (let j = 0; j < cluster.length; j++) {
                groupScore += weights[cluster[j]];
            }

            if (groupScore > bestGroupScore) {
                bestGroupScore = groupScore;
                selectedCandidate = cand;
            }
        }

        return selectedCandidate;
    }

    // 2. Evaluate Outcome of Previous Spin (if active bets existed)
    const lastSpin = spinHistory[spinHistory.length - 1];
    const lastWinNum = lastSpin.winningNumber;
    const hadActiveBets = state.activeNumbers && state.activeNumbers.length > 0;
    const wonLastSpin = hadActiveBets && state.activeNumbers.includes(lastWinNum);

    if (wonLastSpin) {
        // Reset progression tier on win & calculate new weighted center
        state.tierIndex = 0;
        state.tierAttempt = 0;
        const newCenter = calculateBestNumber(spinHistory);
        state.activeNumbers = getPowerSevenNumbers(newCenter);
    } else if (hadActiveBets) {
        // Increment attempts on loss
        state.tierAttempt++;
        const currentTier = PROGRESSION_TIERS[state.tierIndex];
        if (state.tierAttempt >= currentTier.attempts) {
            if (state.tierIndex < PROGRESSION_TIERS.length - 1) {
                state.tierIndex++;
            }
            state.tierAttempt = 0;
        }
    }

    // Initial setup right after the 37-spin observation gate
    if (!state.activeNumbers || state.activeNumbers.length === 0) {
        const center = calculateBestNumber(spinHistory);
        state.activeNumbers = getPowerSevenNumbers(center);
    }

    // 3. Determine Bet Amounts
    const baseUnit = config.betLimits.min;
    const currentTier = PROGRESSION_TIERS[state.tierIndex];
    const unitMultiplier = currentTier ? currentTier.units : 1;

    let betPerNumber = baseUnit * unitMultiplier;
    betPerNumber = Math.max(betPerNumber, config.betLimits.min);
    betPerNumber = Math.min(betPerNumber, config.betLimits.max);

    // 4. Verify Bankroll
    const totalRequired = betPerNumber * state.activeNumbers.length;
    if (bankroll < totalRequired) {
        if (bankroll >= config.betLimits.min * state.activeNumbers.length) {
            betPerNumber = config.betLimits.min;
        } else {
            return [];
        }
    }

    // 5. Output Array of Straight-Up Bets
    return state.activeNumbers.map(num => ({
        type: 'number',
        value: num,
        amount: betPerNumber
    }));
}