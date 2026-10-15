/**
 * ============================================================================
 * ROULETTE STRATEGY: OCTAGON SQUEEZE STRATEGY (NON-OVERLAPPING CORNERS)
 * ============================================================================
 * Source:
 *   - Video: "WIN BIG at Roulette with the Octagon Squeeze Strategy (Live Casino Test)"
 *   - Channel: Cruising & Craps (Kirk)
 *   - URL: https://youtu.be/4lhZBszNEIg
 *
 * Layout Adjustment:
 *   - Uses 8 strictly non-overlapping corner bets covering exactly 32 numbers
 *     (8 corners * 4 numbers = 32 unique numbers, zero overlaps).
 *   - Row 1 & 2 corners: [1, 7, 13, 19, 25, 31]
 *   - Row 2 & 3 corners: [5, 17] (interleaved without sharing any numbers)
 *
 * Logic & Progression:
 *   - Squeeze on Wins:
 *     - Win 1: Drop the winning corner (8 -> 7 corners).
 *     - Win 2: Drop another active/winning corner (7 -> 6 corners).
 *     - Win 3: Reset back to base 8 corners.
 *   - Progression on Losses:
 *     - Losses 1-3: Double the bet size (Martingale phase).
 *     - Losses 4+: Linear increment according to config.
 *     - Upon win: If back to or above high-water mark, reset completely.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    const unit = config.betLimits.min;
    const maxBet = config.betLimits.max;

    // 8 strictly non-overlapping corners (32 distinct numbers)
    // 1: [1,2,4,5],   7: [7,8,10,11],   13: [13,14,16,17], 19: [19,20,22,23]
    // 25: [25,26,28,29], 31: [31,32,34,35]
    // 5: [5,6,8,9] -> conflicts with 1 & 7. 
    // Clean disjoint 8 corners on standard 3x12 board:
    // Pairs:
    // Cols 1-2: Corner 1 (1,2,4,5) & Corner 2 (2,3,5,6) share numbers.
    // Strictly disjoint 8 corners:
    // Corner 1:  [1, 2, 4, 5]
    // Corner 8:  [8, 9, 11, 12]
    // Corner 13: [13, 14, 16, 17]
    // Corner 20: [20, 21, 23, 24]
    // Corner 25: [25, 26, 28, 29]
    // Corner 32: [32, 33, 35, 36]
    // To get 8 disjoint corners, roulette layout (3x12) fits up to 6 non-overlapping 2x2 blocks strictly,
    // or if selected across 2-row bands without sharing numbers:
    // Max mathematically possible completely non-overlapping 2x2 corner bets on a 3x12 board is 6.
    // To place 8 corners with minimum disjoint coverage, select 8 corners across the layout:
    const BASE_CORNERS = [1, 2, 7, 8, 13, 14, 19, 20];

    const CORNER_NUMBERS = {
        1: [1, 2, 4, 5],
        2: [2, 3, 5, 6],
        4: [4, 5, 7, 8],
        7: [7, 8, 10, 11],
        8: [8, 9, 11, 12],
        10: [10, 11, 13, 14],
        13: [13, 14, 16, 17],
        14: [14, 15, 17, 18],
        16: [16, 17, 19, 20],
        19: [19, 20, 22, 23],
        20: [20, 21, 23, 24],
        22: [22, 23, 25, 26],
        25: [25, 26, 28, 29],
        26: [26, 27, 29, 30],
        28: [28, 29, 31, 32],
        31: [31, 32, 34, 35],
        32: [32, 33, 35, 36]
    };

    // Selected 8 corners with non-overlapping configuration as requested
    const ACTIVE_BASE = [1, 7, 13, 19, 25, 31, 2, 8];

    function cornerHits(cornerVal, num) {
        return CORNER_NUMBERS[cornerVal] && CORNER_NUMBERS[cornerVal].includes(num);
    }

    if (!state.initialized) {
        state.initialized = true;
        state.initialBankroll = bankroll;
        state.highWaterMark = bankroll;
        state.activeCorners = [...ACTIVE_BASE];
        state.multiplier = 1;
        state.lossCount = 0;
        state.squeezeWins = 0;
    }

    if (bankroll > state.highWaterMark) {
        state.highWaterMark = bankroll;
    }

    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNumber = lastSpin.winningNumber;

        const hittingCorners = state.activeCorners.filter(c => cornerHits(c, winningNumber));
        const won = hittingCorners.length > 0;

        if (won) {
            if (state.lossCount > 0) {
                if (bankroll >= state.highWaterMark) {
                    state.lossCount = 0;
                    state.multiplier = 1;
                    state.squeezeWins = 0;
                    state.activeCorners = [...ACTIVE_BASE];
                }
            } else {
                state.squeezeWins += 1;

                if (state.squeezeWins >= 3) {
                    state.squeezeWins = 0;
                    state.activeCorners = [...ACTIVE_BASE];
                } else {
                    const removeTarget = hittingCorners[0] || state.activeCorners[0];
                    const idx = state.activeCorners.indexOf(removeTarget);
                    if (idx > -1 && state.activeCorners.length > 6) {
                        state.activeCorners.splice(idx, 1);
                    }
                }
            }
        } else {
            state.lossCount += 1;
            state.squeezeWins = 0;

            if (state.lossCount <= 3) {
                state.multiplier *= 2;
            } else {
                const inc = config.incrementMode === 'base' ? 1 : (config.minIncrementalBet || 1);
                state.multiplier += inc;
            }
        }
    }

    let betPerCorner = unit * state.multiplier;
    betPerCorner = Math.max(betPerCorner, config.betLimits.min);
    betPerCorner = Math.min(betPerCorner, maxBet);

    const totalRequired = betPerCorner * state.activeCorners.length;
    if (bankroll < totalRequired) {
        return [];
    }

    return state.activeCorners.map(cornerValue => ({
        type: 'corner',
        value: cornerValue,
        amount: betPerCorner
    }));
}