/**
 * ============================================================================
 * STRATEGY DOCUMENTATION
 * ============================================================================
 * Source:
 * - YouTube Channel: Mastering The Wheel
 * - Video URL: https://youtu.be/sSb-aMPUSNU
 * - Strategy Name: "Play All Day - All Even Bets" (3 Independent Outside Pairs)
 *
 * Full Logic in Detail:
 * - Tracks 3 even-money outside bet markets completely independently:
 *     1. Colors: Red / Black
 *     2. Parity: Even / Odd
 *     3. Range: Low (1-18) / High (19-36)
 * - For each of the 6 individual targets (Red, Black, Even, Odd, Low, High),
 *   track the consecutive absence count (number of consecutive spins where that
 *   target did not hit, including 0/Green).
 * - Trigger: When any target reaches an absence of 7 consecutive spins, an active
 *   betting cycle is triggered on that target.
 *
 * Full Bet Progression in Detail:
 * - Uses an aggressive profit-scaling 7-level progression:
 *     Level 1: 1 unit
 *     Level 2: 6 units
 *     Level 3: 17 units
 *     Level 4: 39 units
 *     Level 5: 83 units
 *     Level 6: 171 units
 *     Level 7: 347 units
 * - On Win: The progression for that target resets to Level 0 (inactive), and the
 *   system resumes waiting for a new 7-spin absence trigger.
 * - On Loss: The target progression steps up to the next level (Level 1 -> 2 -> ... -> 7).
 * - After Level 7 Loss: The progression resets to inactive (total 14-run wipeout protection).
 *
 * The Goal & Targets:
 * - Target Profit (Stop Win): +5% of starting bankroll.
 * - Stop Loss: Default bankroll exhaustion or fixed stop-loss threshold.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    const unit = config.betLimits.minOutside;
    const progressionMultipliers = [1, 6, 17, 39, 83, 171, 347];

    // Initialize state
    if (!state.initialized) {
        state.startingBankroll = bankroll;
        state.targetProfit = (config.startingBankroll || bankroll) * 0.05;
        state.activeProgressions = {
            red: 0,
            black: 0,
            even: 0,
            odd: 0,
            low: 0,
            high: 0
        };
        state.initialized = true;
    }

    // Stop-Win Condition (+5% target profit)
    if (bankroll >= state.startingBankroll + state.targetProfit) {
        return [];
    }

    // Helper to evaluate winning conditions for each outside bet
    function checkTargetHit(number, color, target) {
        if (number === 0) return false;
        switch (target) {
            case 'red':
                return color === 'red';
            case 'black':
                return color === 'black';
            case 'even':
                return number % 2 === 0;
            case 'odd':
                return number % 2 !== 0;
            case 'low':
                return number >= 1 && number <= 18;
            case 'high':
                return number >= 19 && number <= 36;
            default:
                return false;
        }
    }

    // Update active progression states based on the last spin result
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNumber = lastSpin.winningNumber;
        const lastColor = lastSpin.winningColor;

        const targets = ['red', 'black', 'even', 'odd', 'low', 'high'];
        for (const target of targets) {
            if (state.activeProgressions[target] > 0) {
                const won = checkTargetHit(lastNumber, lastColor, target);
                if (won) {
                    // Win: Reset progression
                    state.activeProgressions[target] = 0;
                } else {
                    // Loss: Advance progression level
                    state.activeProgressions[target]++;
                    if (state.activeProgressions[target] > progressionMultipliers.length) {
                        // Exhausted level 7, reset
                        state.activeProgressions[target] = 0;
                    }
                }
            }
        }
    }

    // Calculate current absence streaks from spin history
    function getAbsenceStreak(target) {
        let count = 0;
        for (let i = spinHistory.length - 1; i >= 0; i--) {
            const spin = spinHistory[i];
            const hit = checkTargetHit(spin.winningNumber, spin.winningColor, target);
            if (!hit) {
                count++;
            } else {
                break;
            }
        }
        return count;
    }

    // Check triggers for any inactive market
    const pairs = [
        ['red', 'black'],
        ['even', 'odd'],
        ['low', 'high']
    ];

    for (const [t1, t2] of pairs) {
        // If neither is currently betting, evaluate absence trigger of 7
        if (state.activeProgressions[t1] === 0 && state.activeProgressions[t2] === 0) {
            if (getAbsenceStreak(t1) >= 7) {
                state.activeProgressions[t1] = 1;
            } else if (getAbsenceStreak(t2) >= 7) {
                state.activeProgressions[t2] = 1;
            }
        }
    }

    // Build the array of bets
    const bets = [];
    const targets = ['red', 'black', 'even', 'odd', 'low', 'high'];

    for (const target of targets) {
        const level = state.activeProgressions[target];
        if (level >= 1 && level <= progressionMultipliers.length) {
            const multiplier = progressionMultipliers[level - 1];
            let betAmount = unit * multiplier;

            // Clamp bet amounts to table limits
            betAmount = Math.max(betAmount, config.betLimits.minOutside);
            betAmount = Math.min(betAmount, config.betLimits.max);

            bets.push({
                type: target,
                amount: betAmount
            });
        }
    }

    return bets;
}