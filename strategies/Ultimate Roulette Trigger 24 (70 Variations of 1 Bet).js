/**
 * ============================================================================
 * Roulette Strategy: Ultimate Roulette Trigger 24 (70 Variations of 1 Bet)
 * ============================================================================
 * 
 * @source
 * - YouTube Video: https://youtu.be/iKPqOL3bn0Y
 * - Channel: TeKKa Tools & Tallk
 * 
 * @description
 * This strategy covers 24 pockets on a European Roulette wheel by placing bets
 * on four non-overlapping double streets (six-line bets). With 11 possible six-line
 * positions on a standard layout (1-6, 4-9, 7-12, 10-15, 13-18, 16-21, 19-24,
 * 22-27, 25-30, 28-33, 31-36), there are exactly 70 distinct non-adjacent combinations
 * of 4 six-lines that cover exactly 24 unique numbers (C(8, 4) = 70).
 * 
 * @triggers_and_logic
 * 1. The strategy tracks the consecutive missed spins ("loss level") for all 70
 *    non-overlapping 4-line combinations.
 * 2. A trigger occurs when any 4-line set has reached a missed streak of at least
 *    4 spins (default TRIGGER_LOSS_LEVEL = 4).
 * 3. The set with the highest missed streak is selected. While in an active betting
 *    progression, the strategy remains locked onto that chosen set until a win or bust.
 * 4. If no set meets the trigger condition, no bet is placed (idle waiting).
 * 
 * @progression
 * - Payout for a line bet is 5:1. Covering 4 lines requires 4 units total; a win
 *   returns 6 units (net profit of +2 units at base level).
 * - Progression steps (multiplier per line): [1, 3, 10, 30] units.
 * - On Win: Progression resets to Level 1, and the strategy returns to tracking
 *   until another set qualifies.
 * - On Loss: Advances to the next progression tier to recover in a single win.
 * - Stop-Loss: If Level 4 loses, the cycle resets to protect bankroll.
 * 
 * @goal
 * - Target Profit: Consistent accumulation of 2+ base units per qualified cycle.
 * - Bankroll Management: Strict 4-step progression limit to cap maximum drawdown.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // -------------------------------------------------------------------------
    // 1. Configuration & Constants
    // -------------------------------------------------------------------------
    const TRIGGER_LOSS_LEVEL = 4;
    const PROGRESSION_MULTIPLIERS = [1, 3, 10, 30];

    // Inside bet limit applies to line bets
    const minBet = config.betLimits?.min ?? 2;
    const maxBet = config.betLimits?.max ?? 500;
    const baseUnit = minBet;

    // The 11 standard six-line starting numbers
    const SIX_LINES = [
        { id: 1, start: 1, numbers: [1, 2, 3, 4, 5, 6] },
        { id: 2, start: 4, numbers: [4, 5, 6, 7, 8, 9] },
        { id: 3, start: 7, numbers: [7, 8, 9, 10, 11, 12] },
        { id: 4, start: 10, numbers: [10, 11, 12, 13, 14, 15] },
        { id: 5, start: 13, numbers: [13, 14, 15, 16, 17, 18] },
        { id: 6, start: 16, numbers: [16, 17, 18, 19, 20, 21] },
        { id: 7, start: 19, numbers: [19, 20, 21, 22, 23, 24] },
        { id: 8, start: 22, numbers: [22, 23, 24, 25, 26, 27] },
        { id: 9, start: 25, numbers: [25, 26, 27, 28, 29, 30] },
        { id: 10, start: 28, numbers: [28, 29, 30, 31, 32, 33] },
        { id: 11, start: 31, numbers: [31, 32, 33, 34, 35, 36] }
    ];

    // -------------------------------------------------------------------------
    // 2. Initialize State & Precompute the 70 Non-Overlapping Combinations
    // -------------------------------------------------------------------------
    if (!state.initialized) {
        state.combinations = [];
        const n = SIX_LINES.length;

        // Find all combinations of 4 lines such that no two overlap (|i - j| >= 2)
        for (let i = 0; i < n; i++) {
            for (let j = i + 2; j < n; j++) {
                for (let k = j + 2; k < n; k++) {
                    for (let l = k + 2; l < n; l++) {
                        const lines = [SIX_LINES[i], SIX_LINES[j], SIX_LINES[k], SIX_LINES[l]];
                        const numSet = new Set();
                        lines.forEach(line => line.numbers.forEach(num => numSet.add(num)));

                        // Ensure exactly 24 distinct numbers are covered
                        if (numSet.size === 24) {
                            state.combinations.push({
                                id: state.combinations.length,
                                lines: lines.map(line => line.start),
                                numbers: Array.from(numSet),
                                missedCount: 0
                            });
                        }
                    }
                }
            }
        }

        state.progressionIndex = 0;
        state.activeCombinationId = null;
        state.lastProcessedSpinIndex = -1;
        state.initialized = true;
    }

    // -------------------------------------------------------------------------
    // 3. Process Spin History & Update Loss Counters
    // -------------------------------------------------------------------------
    const historyLength = spinHistory ? spinHistory.length : 0;

    if (historyLength > 0 && state.lastProcessedSpinIndex < historyLength - 1) {
        for (let idx = state.lastProcessedSpinIndex + 1; idx < historyLength; idx++) {
            const spin = spinHistory[idx];
            const winningNumber = spin.winningNumber;

            // Check outcome of current active bet if one was placed
            if (state.activeCombinationId !== null) {
                const activeCombo = state.combinations[state.activeCombinationId];
                const won = activeCombo.numbers.includes(winningNumber);

                if (won) {
                    state.progressionIndex = 0;
                    state.activeCombinationId = null;
                } else {
                    state.progressionIndex++;
                    if (state.progressionIndex >= PROGRESSION_MULTIPLIERS.length) {
                        // Stop-loss reached for this cycle; reset
                        state.progressionIndex = 0;
                        state.activeCombinationId = null;
                    }
                }
            }

            // Update missed spin counters for all 70 combinations
            for (let i = 0; i < state.combinations.length; i++) {
                const combo = state.combinations[i];
                if (combo.numbers.includes(winningNumber)) {
                    combo.missedCount = 0;
                } else {
                    combo.missedCount++;
                }
            }
        }
        state.lastProcessedSpinIndex = historyLength - 1;
    }

    // -------------------------------------------------------------------------
    // 4. Trigger Evaluation & Bet Selection
    // -------------------------------------------------------------------------
    // If not currently in a progression cycle, look for a new trigger
    if (state.activeCombinationId === null) {
        let bestCandidate = null;
        let highestMissed = -1;

        for (let i = 0; i < state.combinations.length; i++) {
            const combo = state.combinations[i];
            if (combo.missedCount >= TRIGGER_LOSS_LEVEL && combo.missedCount > highestMissed) {
                highestMissed = combo.missedCount;
                bestCandidate = combo;
            }
        }

        if (bestCandidate) {
            state.activeCombinationId = bestCandidate.id;
            state.progressionIndex = 0;
        }
    }

    // If no active trigger or candidate found, wait
    if (state.activeCombinationId === null) {
        return [];
    }

    // -------------------------------------------------------------------------
    // 5. Construct Bets with Limit Clamping
    // -------------------------------------------------------------------------
    const activeCombo = state.combinations[state.activeCombinationId];
    const multiplier = PROGRESSION_MULTIPLIERS[state.progressionIndex] || 1;

    let lineBetAmount = baseUnit * multiplier;
    lineBetAmount = Math.max(lineBetAmount, minBet);
    lineBetAmount = Math.min(lineBetAmount, maxBet);

    // Return the four line bets corresponding to the triggered combination
    return activeCombo.lines.map(startNum => ({
        type: 'line',
        value: startNum,
        amount: lineBetAmount
    }));
}