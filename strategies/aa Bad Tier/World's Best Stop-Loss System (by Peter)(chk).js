/**
 * ============================================================================
 * Strategy: World's Best Stop-Loss System (by Peter)
 * Source Video: https://youtu.be/e9A3-wuDjbU
 * Channel: The Roulette Master
 * ============================================================================
 * 
 * 1. The Full Logic in Details:
 *    - The strategy targets 1:1 even-money outside bets: Red, Black, Even, Odd,
 *      Low (1-18), and High (19-36).
 *    - To initiate a bet round, the system scans spin history to find the outside
 *      option that has gone the longest without hitting (sleeper selection).
 *    - During an active progression, the bet remains on the chosen option until a
 *      win occurs or the entire progression is exhausted.
 * 
 * 2. The Full Bet Progression in Details:
 *    - Base Unit: config.betLimits.minOutside (e.g., $10).
 *    - Phase 1 (Standard 4-Step 'Double + 1 Unit' Progression):
 *        * Step 1: 1 unit  ($10)
 *        * Step 2: 3 units ($30)
 *        * Step 3: 7 units ($70)
 *        * Step 4: 15 units ($150)
 *        * Win in Phase 1: Secures profit. Reset progression to Phase 1, Step 1.
 *        * Loss on Step 4 ($150): Stop-loss triggers. Pivot to Phase 2.
 *    - Phase 2 (Recovery 4-Step Progression with 5x Base Unit Scale):
 *        * Step 1: 5 units  ($50)
 *        * Step 2: 15 units ($150)
 *        * Step 3: 35 units ($350)
 *        * Step 4: 75 units ($750)
 *        * Win in Phase 2: Immediately RESET back to Phase 1, Step 1 without chasing
 *          previous peaks. This prevents bankroll exhaustion.
 *        * Loss on Step 4 ($750): Stop-loss limit reached. Reset to Phase 1, Step 1.
 * 
 * 3. The Goal:
 *    - Protect the bankroll against long outlier streaks by avoiding deep Martingale
 *      doubling, utilizing a structured two-tiered stop-loss reset.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Define progression multipliers (in multiples of base outside unit)
    const PHASE_1_STEPS = [1, 3, 7, 15];
    const PHASE_2_STEPS = [5, 15, 35, 75];

    // 2. Determine base unit clamped to table outside minimum
    const baseUnit = Math.max(config.betLimits.minOutside || 5, 5);

    // 3. Initialize persistent state
    if (!state.phase) state.phase = 1;         // 1 or 2
    if (!state.stepIndex) state.stepIndex = 0; // 0 to 3
    if (!state.activeBet) state.activeBet = null;

    const OUTSIDE_OPTIONS = ['red', 'black', 'even', 'odd', 'low', 'high'];

    // Helper: evaluate if a given number hits an outside bet type
    function isWinningOption(option, num) {
        if (num === 0 || num === '0' || num === '00' || num === 37) return false;
        const n = Number(num);
        const RED_NUMS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
        switch (option) {
            case 'red': return RED_NUMS.includes(n);
            case 'black': return !RED_NUMS.includes(n) && n >= 1 && n <= 36;
            case 'even': return n % 2 === 0;
            case 'odd': return n % 2 !== 0;
            case 'low': return n >= 1 && n <= 18;
            case 'high': return n >= 19 && n <= 36;
            default: return false;
        }
    }

    // Helper: find the option with the longest streak since last hit
    function findLongestSleeper(history) {
        const misses = { red: 0, black: 0, even: 0, odd: 0, low: 0, high: 0 };
        for (const opt of OUTSIDE_OPTIONS) {
            let count = 0;
            for (let i = history.length - 1; i >= 0; i--) {
                const num = history[i].winningNumber;
                if (isWinningOption(opt, num)) {
                    break;
                }
                count++;
            }
            misses[opt] = count;
        }

        let longestOption = OUTSIDE_OPTIONS[0];
        let maxMisses = -1;
        for (const opt of OUTSIDE_OPTIONS) {
            if (misses[opt] > maxMisses) {
                maxMisses = misses[opt];
                longestOption = opt;
            }
        }
        return longestOption;
    }

    // 4. Process previous spin result if active
    if (spinHistory && spinHistory.length > 0 && state.activeBet) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        const won = isWinningOption(state.activeBet, lastNum);

        if (won) {
            // A win in either phase triggers a complete reset back to Phase 1, Step 1
            state.phase = 1;
            state.stepIndex = 0;
            state.activeBet = null;
        } else {
            // Loss progression
            state.stepIndex++;
            if (state.phase === 1) {
                if (state.stepIndex >= PHASE_1_STEPS.length) {
                    // Phase 1 stop-loss hit -> Transition to Phase 2
                    state.phase = 2;
                    state.stepIndex = 0;
                }
            } else if (state.phase === 2) {
                if (state.stepIndex >= PHASE_2_STEPS.length) {
                    // Phase 2 stop-loss hit -> Full reset
                    state.phase = 1;
                    state.stepIndex = 0;
                    state.activeBet = null;
                }
            }
        }
    }

    // 5. Select target bet if starting fresh or after a reset
    if (!state.activeBet) {
        state.activeBet = findLongestSleeper(spinHistory || []);
    }

    // 6. Calculate bet amount based on current phase and step
    const currentMultipliers = state.phase === 1 ? PHASE_1_STEPS : PHASE_2_STEPS;
    const multiplier = currentMultipliers[state.stepIndex] || 1;
    let betAmount = baseUnit * multiplier;

    // 7. Clamp bet amount to limits and available bankroll
    betAmount = Math.max(betAmount, config.betLimits.minOutside);
    betAmount = Math.min(betAmount, config.betLimits.max);
    betAmount = Math.min(betAmount, bankroll);

    if (betAmount < config.betLimits.minOutside || bankroll < config.betLimits.minOutside) {
        return [];
    }

    return [
        {
            type: state.activeBet,
            amount: betAmount
        }
    ];
}