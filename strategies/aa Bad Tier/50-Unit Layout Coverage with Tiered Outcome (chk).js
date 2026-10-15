/**
 * ROULETTE STRATEGY: 50-Unit Layout Coverage with Tiered Outcome Progression
 *
 * Source:
 *   - Video URL: https://youtu.be/AJLdV_qLu7o
 *   - Channel: ROULETTE STRATEGY
 *
 * Full Logic in Detail:
 *   - The strategy places a 50-unit base bet spread across specific inside positions:
 *       1) Straight Up (1 unit): 0
 *       2) Splits (1 unit each, 12 units total):
 *          [2, 5], [3, 6], [8, 11], [9, 12], [14, 17], [15, 18],
 *          [20, 23], [21, 24], [26, 29], [27, 30], [32, 35], [33, 36]
 *       3) 1-Unit Corners (1 unit each, 12 units total):
 *          Corners starting at top-left: 1, 2, 7, 8, 13, 14, 19, 20, 25, 26, 31, 32
 *       4) 5-Unit Corners (5 units each, 25 units total):
 *          Corners starting at top-left: 4, 10, 16, 22, 28
 *   - Bets are placed on every spin using the active progression multiplier.
 *
 * Outcome Distribution:
 *   - Big Wins (+31 base units): 5, 8, 11, 14, 17, 20, 23, 26, 29, 32
 *   - Small Wins (+4 base units): 4, 7, 10, 13, 16, 19, 22, 25, 28, 31
 *   - Small Losses (-14 to -23 base units): 15 numbers (0, 2, 3, etc.)
 *   - Big Losses (-41 base units): 1, 34 (and any uncovered outcome)
 *
 * Progression Rules:
 *   - Small Loss: Rebet the exact same multiplier level.
 *   - Big Loss: Double the progression multiplier (level *= 2).
 *   - Win:
 *       - If the bankroll reaches or exceeds the session peak bankroll, drop down 1 betting level (level = Math.max(1, level - 1)).
 *       - If winning while still below the peak bankroll, reset entirely to the baseline level (level = 1).
 *
 * The Goal:
 *   - Steadily build session profit via heavy board coverage, recover drawdowns through doubling on severe misses,
 *     and step down or reset immediately upon reclaiming session peaks.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const baseUnit = config.betLimits.min;

    // Initialize persistent state
    if (state.multiplier === undefined) {
        state.multiplier = 1;
        state.peakBankroll = bankroll;
        state.lastBankroll = bankroll;
    }

    // Process outcome of the previous spin
    if (spinHistory && spinHistory.length > 0) {
        const lastProfit = bankroll - state.lastBankroll;

        if (lastProfit > 0) {
            // Outcome was a win
            if (bankroll >= state.peakBankroll) {
                // Reached or surpassed session peak: drop down 1 level
                state.multiplier = Math.max(1, state.multiplier - 1);
            } else {
                // Win below session peak: reset to baseline
                state.multiplier = 1;
            }
        } else if (lastProfit < 0) {
            // Determine if it was a Big Loss or Small Loss based on unit loss
            // A base big loss is ~41 units (or >= 40 units per multiplier level)
            const unitLoss = Math.abs(lastProfit) / (baseUnit * Math.max(1, state.multiplier));

            if (unitLoss >= 35) {
                // Big Loss: double up
                state.multiplier = state.multiplier * 2;
            } else {
                // Small Loss: maintain identical level
                state.multiplier = state.multiplier;
            }
        }

        // Update session peak
        if (bankroll > state.peakBankroll) {
            state.peakBankroll = bankroll;
        }
    }

    // Update bankroll tracker for the current spin
    state.lastBankroll = bankroll;

    // Helper to calculate and clamp bet amounts
    function getBetAmount(units) {
        const rawAmount = units * baseUnit * state.multiplier;
        const clamped = Math.max(config.betLimits.min, Math.min(config.betLimits.max, rawAmount));
        return clamped;
    }

    const bets = [];

    // 1. Straight Up Bet on 0 (1 unit)
    bets.push({
        type: 'number',
        value: 0,
        amount: getBetAmount(1)
    });

    // 2. 12 Split Bets (1 unit each)
    const splits = [
        [2, 5], [3, 6],
        [8, 11], [9, 12],
        [14, 17], [15, 18],
        [20, 23], [21, 24],
        [26, 29], [27, 30],
        [32, 35], [33, 36]
    ];
    for (let i = 0; i < splits.length; i++) {
        bets.push({
            type: 'split',
            value: splits[i],
            amount: getBetAmount(1)
        });
    }

    // 3. 12 1-Unit Corner Bets (1 unit each)
    // Value represents the top-left number of each 4-number square
    const oneUnitCorners = [1, 2, 7, 8, 13, 14, 19, 20, 25, 26, 31, 32];
    for (let i = 0; i < oneUnitCorners.length; i++) {
        bets.push({
            type: 'corner',
            value: oneUnitCorners[i],
            amount: getBetAmount(1)
        });
    }

    // 4. 5 5-Unit Corner Bets (5 units each)
    const fiveUnitCorners = [4, 10, 16, 22, 28];
    for (let i = 0; i < fiveUnitCorners.length; i++) {
        bets.push({
            type: 'corner',
            value: fiveUnitCorners[i],
            amount: getBetAmount(5)
        });
    }

    // Bankroll check before placing bets
    const totalRequired = bets.reduce((sum, b) => sum + b.amount, 0);
    if (bankroll < totalRequired) {
        return [];
    }

    return bets;
}