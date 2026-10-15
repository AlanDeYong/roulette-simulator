/**
 * ============================================================================
 * ROULETTE STRATEGY: Power Seven (by Billy Williams)
 * ============================================================================
 * Source:
 *   - Video: "(WOW) BILLY’S NO BUST WORKS! #best #viralvideo #gaming #money #business #trending #1"
 *   - URL: https://youtu.be/ykp7I2Rb0XE
 *   - Channel: The Roulette Master
 *
 * The Full Logic in Detail:
 *   1. Selection of Center Number ("Hot Number"):
 *      - Searches spin history for a repeating number (hit 2+ times recently).
 *      - If no repeating number is found, selects the most frequent / recent winning number.
 *      - If no history exists, defaults to 0.
 *   2. Board Placement:
 *      - Places straight-up inside bets on the chosen center number and its 3 wheel
 *        neighbors on each side (7 numbers total in wheel sequence, with 0 gaps).
 *      - European Wheel Sequence:
 *        [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
 *         5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26]
 *
 * The Full Bet Progression in Detail:
 *   - Goal is to avoid busting by stretching out multi-spin attempts at each multiplier tier:
 *       • Tier 1: 1 unit per number  -> 3 spin attempts
 *       • Tier 2: 2 units per number -> 2 spin attempts
 *       • Tier 3: 3 units per number -> 2 spin attempts
 *       • Tier 4: 4 units per number -> 2 spin attempts
 *       • Tier 5: 5 units per number -> 2 spin attempts
 *       • Tier 6: 7 units per number -> 2 spin attempts
 *       • Tier 7: 10 units per number -> 2 spin attempts
 *       • Tier 8: 14 units per number -> 2 spin attempts
 *       • Tier 9: 19 units per number -> 2 spin attempts
 *   - After any WIN:
 *       • Reset progression tier back to 0 (base level).
 *       • Re-evaluate spin history to find the new hot anchor number.
 *   - After a LOSS:
 *       • Consume one attempt in the current tier.
 *       • If attempts in current tier are exhausted, advance to the next tier.
 *
 * The Goal:
 *   - Recover losses and lock in profit upon hitting any of the 7 straight-up numbers
 *     (35:1 payout), while keeping drawdowns slow and controlled.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // European wheel sequence in physical wheel order
    const WHEEL = [
        0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
        5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
    ];

    // Progression schedule: [unitsPerNumber, attemptsAllowed]
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

    // 1. Initialize Persistent State
    if (!state.initialized) {
        state.tierIndex = 0;
        state.tierAttempt = 0;
        state.activeNumbers = [];
        state.initialized = true;
    }

    // Helper: Select the hot anchor number based on history
    function pickHotNumber(history) {
        if (!history || history.length === 0) return 0;

        const lookback = Math.min(history.length, 30);
        const recentSpins = history.slice(-lookback);
        const counts = {};

        // Track frequency and look for repeaters
        for (let i = recentSpins.length - 1; i >= 0; i--) {
            const num = recentSpins[i].winningNumber;
            counts[num] = (counts[num] || 0) + 1;
        }

        // 1st priority: find repeater (most frequent with count >= 2)
        let bestNumber = null;
        let maxCount = 1;
        for (let i = recentSpins.length - 1; i >= 0; i--) {
            const num = recentSpins[i].winningNumber;
            if (counts[num] > maxCount) {
                maxCount = counts[num];
                bestNumber = num;
            }
        }

        if (bestNumber !== null) return bestNumber;

        // 2nd priority: most recent winning number
        return history[history.length - 1].winningNumber;
    }

    // Helper: Get center number plus 3 neighbors on each side
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

    // 2. Evaluate Outcome of Previous Spin (if any)
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastWinNum = lastSpin.winningNumber;
        const wonLastSpin = state.activeNumbers && state.activeNumbers.includes(lastWinNum);

        if (wonLastSpin) {
            // Reset progression on win and pick new hot numbers
            state.tierIndex = 0;
            state.tierAttempt = 0;
            const newCenter = pickHotNumber(spinHistory);
            state.activeNumbers = getPowerSevenNumbers(newCenter);
        } else if (state.activeNumbers && state.activeNumbers.length > 0) {
            // Loss: advance attempts in current tier
            state.tierAttempt++;
            const currentTier = PROGRESSION_TIERS[state.tierIndex];
            if (state.tierAttempt >= currentTier.attempts) {
                if (state.tierIndex < PROGRESSION_TIERS.length - 1) {
                    state.tierIndex++;
                }
                state.tierAttempt = 0;
            }
        }
    }

    // If active numbers have not been selected yet, pick now
    if (!state.activeNumbers || state.activeNumbers.length === 0) {
        const center = pickHotNumber(spinHistory);
        state.activeNumbers = getPowerSevenNumbers(center);
    }

    // 3. Calculate Bet Amounts
    const baseUnit = config.betLimits.min;
    const currentTier = PROGRESSION_TIERS[state.tierIndex];
    let unitMultiplier = currentTier ? currentTier.units : 1;

    let betPerNumber = baseUnit * unitMultiplier;

    // Clamp inside bet amounts to table limits
    betPerNumber = Math.max(betPerNumber, config.betLimits.min);
    betPerNumber = Math.min(betPerNumber, config.betLimits.max);

    // 4. Check Bankroll Sufficiency
    const totalRequired = betPerNumber * state.activeNumbers.length;
    if (bankroll < totalRequired) {
        // Fall back to minimum inside bet if bankroll allows
        if (bankroll >= config.betLimits.min * state.activeNumbers.length) {
            betPerNumber = config.betLimits.min;
        } else {
            return []; // Cannot cover minimum bets
        }
    }

    // 5. Construct and Return Bets Array
    return state.activeNumbers.map(num => ({
        type: 'number',
        value: num,
        amount: betPerNumber
    }));
}