/**
 * SPLIT BOOSTER ROULETTE STRATEGY
 * 
 * Source: https://youtu.be/504abSENcyo
 * 
 * The Full Logic in Details:
 * This strategy relies on a combination of specific split bets and column bets (1st and 3rd columns).
 * It targets a high coverage of the board while heavily weighting certain numbers. 
 * A win occurs when the spin results in a net profit (which is true if either the column hits 
 * and/or a split hits). We track the peak bankroll to manage session profits.
 * 
 * The Full Bet Progression in Details:
 * The sequence spans 8 levels, with the total bet size progressing as: 8-14-40-54-68-82-96-192.
 * - Level 1: 1 unit on splits 1/4, 3/6. 3 units on 1st & 3rd columns.
 * - Level 2 (Loss 1): Add splits 7/10, 9/12 at 1u. Add 2u to columns (now 5u each).
 * - Level 3 (Loss 2): Add splits 13/16, 15/18 at 1u. Add 2u to columns (now 7u), THEN double everything. (Splits: 2u, Cols: 14u).
 * - Level 4 (Loss 3): Increase splits by 1u (now 3u). Add 4u to columns (now 18u).
 * - Level 5 (Loss 4): Increase splits by 1u (now 4u). Add 4u to columns (now 22u).
 * - Level 6 (Loss 5): Increase splits by 1u (now 5u). Add 4u to columns (now 26u).
 * - Level 7 (Loss 6): Increase splits by 1u (now 6u). Add 4u to columns (now 30u).
 * - Level 8 (Loss 7): Double all previous bets (Splits: 12u, Cols: 60u).
 * 
 * After any win: 
 * - If the bankroll reaches or exceeds the highest point in the session (peak profit), reset to Level 1.
 * - If not at peak profit, go down 1 level in the progression.
 * After a loss at Level 8, the progression resets to Level 1.
 * 
 * The Goal:
 * To chip away at losses by stepping down the progression on wins, returning to the lowest baseline
 * risk whenever a new session peak profit is reached.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (state.level === undefined) {
        state.level = 1;
        state.peakBankroll = bankroll;
        state.lastBankroll = bankroll;
    }

    // 2. Determine Win/Loss from the previous spin
    if (spinHistory.length > 0) {
        const won = bankroll > state.lastBankroll;
        const lost = bankroll < state.lastBankroll;

        if (won) {
            if (bankroll >= state.peakBankroll) {
                // Reached or exceeded session peak profit -> Reset
                state.level = 1;
            } else {
                // Won, but still in drawdown -> Go down 1 level
                state.level = Math.max(1, state.level - 1);
            }
        } else if (lost) {
            // Lost -> Move up progression
            state.level++;
            if (state.level > 8) {
                state.level = 1; // Reset if we pass the defined 8-step progression
            }
        }
        // Pushes (bankroll === state.lastBankroll) maintain the current level
    }

    // 3. Update Bankroll Tracking
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }
    state.lastBankroll = bankroll;

    // 4. Define Progression Levels Data (Matching Strategy Ratios)
    const progressionData = {
        1: { numSplits: 2, splitU: 1, colU: 3 },
        2: { numSplits: 4, splitU: 1, colU: 5 },
        3: { numSplits: 6, splitU: 2, colU: 14 },
        4: { numSplits: 6, splitU: 3, colU: 18 },
        5: { numSplits: 6, splitU: 4, colU: 22 },
        6: { numSplits: 6, splitU: 5, colU: 26 },
        7: { numSplits: 6, splitU: 6, colU: 30 },
        8: { numSplits: 6, splitU: 12, colU: 60 }
    };

    // 5. Pre-defined Bet Positions
    const splitsList = [
        [1, 4], [3, 6], [7, 10], [9, 12], [13, 16], [15, 18]
    ];
    const columnsList = [1, 3];

    // 6. Calculate Base Unit ensuring ratios don't violate casino minimums
    // To maintain a 1:3 ratio safely, the base unit must satisfy both `min` and `minOutside/3`
    const baseUnit = Math.max(
        config.betLimits.min, 
        Math.ceil(config.betLimits.minOutside / 3)
    );

    // 7. Extract current level instructions
    const currentData = progressionData[state.level];
    const bets = [];

    // 8. Place Split Bets
    let splitAmount = currentData.splitU * baseUnit;
    splitAmount = Math.min(splitAmount, config.betLimits.max); // Clamp to max

    for (let i = 0; i < currentData.numSplits; i++) {
        bets.push({
            type: 'split',
            value: splitsList[i],
            amount: splitAmount
        });
    }

    // 9. Place Column Bets
    let colAmount = currentData.colU * baseUnit;
    colAmount = Math.max(colAmount, config.betLimits.minOutside); // Double check outside min
    colAmount = Math.min(colAmount, config.betLimits.max); // Clamp to max

    for (let i = 0; i < columnsList.length; i++) {
        bets.push({
            type: 'column',
            value: columnsList[i],
            amount: colAmount
        });
    }

    return bets;
}