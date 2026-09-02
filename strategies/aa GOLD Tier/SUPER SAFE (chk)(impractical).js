/**
 * ============================================================================
 * ROULETTE STRATEGY: Two Dozens Triggered (Hottest 2 Dozens + 3-Miss Trigger)
 * ============================================================================
 * 
 * Source:
 * - YouTube Video: "I Built a SUPER SAFE Roulette System — 1 in 6,600 Failure Odds!"
 * - Channel: Mastering The Wheel (https://youtu.be/nzbFKkRXR8k)
 * 
 * Logic & Trigger Conditions:
 * 1. Tracking: Evaluates the frequency of Dozens (1st: 1-12, 2nd: 13-24, 3rd: 25-36)
 *    over the last 50 spins to identify the top 2 "hottest" dozens.
 * 2. Trigger: Waits for 3 consecutive spins where neither of the 2 hottest dozens
 *    hit (i.e., 3 consecutive hits on the coldest dozen or zero).
 * 3. Lock-in: Once triggered, the strategy locks onto those specific 2 dozens
 *    throughout the entire progression until a win or full progression loss.
 * 
 * Bet Progression (5-Level Triple Martingale):
 * - Level 1: 1 unit per dozen (2 units total)
 * - Level 2: 3 units per dozen (6 units total)
 * - Level 3: 9 units per dozen (18 units total)
 * - Level 4: 27 units per dozen (54 units total)
 * - Level 5: 81 units per dozen (162 units total)
 * 
 * Win / Loss Handling:
 * - On Win: Resets progression level to 1, exits active betting, resets miss counter,
 *   and re-evaluates the hottest dozens for the next trigger.
 * - On Loss: Advances to the next progression multiplier (x3) on the same 2 dozens.
 * - Stop-Loss: If Level 5 loses (8 total misses including the 3 pre-trigger misses),
 *   the progression halts and resets.
 * - Stop-Win: Target 5% - 10% bankroll gain.
 * ============================================================================
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const SAMPLE_SIZE = 50;
    const TRIGGER_MISSES = 3;
    const MULTIPLIERS = [1, 3, 9, 27, 81];

    // Helper: Determine which dozen a number belongs to (1, 2, 3, or 0)
    function getDozen(num) {
        if (num >= 1 && num <= 12) return 1;
        if (num >= 13 && num <= 24) return 2;
        if (num >= 25 && num <= 36) return 3;
        return 0;
    }

    // Helper: Find the top 2 hottest dozens over the sample window
    function getHottestTwoDozens(history) {
        const counts = { 1: 0, 2: 0, 3: 0 };
        const windowSpins = history.slice(-SAMPLE_SIZE);

        for (let i = 0; i < windowSpins.length; i++) {
            const d = getDozen(windowSpins[i].winningNumber);
            if (d > 0) counts[d]++;
        }

        const dozens = [1, 2, 3];
        dozens.sort((a, b) => counts[b] - counts[a]); // Preserves 1 > 2 > 3 tie-break
        return [dozens[0], dozens[1]];
    }

    // 1. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.isBetting = false;
        state.level = 0;
        state.missCount = 0;
        state.targetDozens = [];
        state.initialBankroll = bankroll;
        state.lastProcessedSpinIndex = -1;
    }

    // 2. Process New Spin Result
    if (spinHistory && spinHistory.length > 0) {
        const lastSpinIndex = spinHistory.length - 1;

        if (lastSpinIndex > state.lastProcessedSpinIndex) {
            state.lastProcessedSpinIndex = lastSpinIndex;
            const lastNumber = spinHistory[lastSpinIndex].winningNumber;
            const lastDozen = getDozen(lastNumber);

            if (state.isBetting) {
                const won = state.targetDozens.includes(lastDozen);
                if (won) {
                    // Win: Reset to waiting mode
                    state.isBetting = false;
                    state.level = 0;
                    state.missCount = 0;
                    state.targetDozens = [];
                } else {
                    // Loss: Step up progression
                    state.level++;
                    if (state.level >= MULTIPLIERS.length) {
                        // Max progression reached: Reset
                        state.isBetting = false;
                        state.level = 0;
                        state.missCount = 0;
                        state.targetDozens = [];
                    }
                }
            } else {
                // In Waiting Mode: Track misses against currently evaluated hottest dozens
                const currentHottest = getHottestTwoDozens(spinHistory);
                if (!currentHottest.includes(lastDozen)) {
                    state.missCount++;
                } else {
                    state.missCount = 0;
                }

                // Check trigger
                if (state.missCount >= TRIGGER_MISSES) {
                    state.isBetting = true;
                    state.level = 0;
                    state.targetDozens = currentHottest;
                }
            }
        }
    }

    // 3. Stop-Win Check (Default: 5% Bankroll Target)
    const targetProfit = state.initialBankroll * 0.05;
    if (bankroll >= state.initialBankroll + targetProfit && !state.isBetting) {
        return [];
    }

    // 4. Return Bets if Active
    if (state.isBetting && state.targetDozens.length === 2) {
        const unit = config.betLimits.minOutside || 5;
        const multiplier = MULTIPLIERS[state.level] || 1;
        let amount = unit * multiplier;

        // Clamp to limits
        amount = Math.max(amount, config.betLimits.minOutside);
        amount = Math.min(amount, config.betLimits.max);

        return [
            { type: 'dozen', value: state.targetDozens[0], amount: amount },
            { type: 'dozen', value: state.targetDozens[1], amount: amount }
        ];
    }

    return [];
}