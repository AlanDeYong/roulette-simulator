/**
 * Strategy: Golden Lotus
 * Source: YouTube Channel "Bet with Mo" (https://www.youtube.com/watch?v=F2Yt_y-hZRE)
 * 
 * Description:
 * This is a low-roller strategy with high coverage that utilizes double streets (six-lines),
 * splits, and corner bets across 8 progressive levels. 
 * 
 * Progression Logic:
 * - Level 1: Bet 2 units on each of 3 double streets (10-15, 16-21, 22-27). Total = 6 units.
 * - Level 2: Rebet streets with 4 units each. Add 1 unit each on 4 splits (10/11, 11/12, 25/26, 26/27). Total = 16 units.
 * - Level 3: Rebet streets with 6 units each. Keep Group A splits (1 unit). Add 1 unit each on 4 splits (13/14, 14/15, 22/23, 23/24). Total = 26 units.
 * - Level 4: Rebet streets with 8 units each. Keep all 8 splits (1 unit). Add 1 unit each on 2 corners (16/20, 17/21). Total = 34 units.
 * - Level 5: Rebet streets with 10 units each. Increase all splits and corners to 2 units each. Total = 50 units.
 * - Level 6: Rebet streets with 12 units each. Increase all splits and corners to 3 units each. Total = 66 units.
 * - Level 7: Rebet streets with 16 units each. Increase all splits and corners to 5 units each. Total = 98 units.
 * - Level 8: Rebet streets with 22 units each. Increase all splits and corners to 8 units each. Total = 146 units.
 * 
 * Win/Loss Rules:
 * - On a loss: Advance 1 level up (capped at Level 8).
 * - On a win: 
 *   - If the new bankroll exceeds the peak session bankroll, update the peak bankroll and reset to Level 1.
 *   - If the bankroll is below the peak session bankroll, decrease by 1 level (capped at Level 1).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (state.level === undefined) {
        state.level = 1;
        state.peakBankroll = bankroll;
        state.lastBankroll = bankroll;
    }

    // 2. Determine Win/Loss from the last round
    if (spinHistory.length > 0 && state.lastBankroll !== undefined) {
        const won = bankroll > state.lastBankroll;
        const lost = bankroll < state.lastBankroll;

        if (won) {
            if (bankroll > state.peakBankroll) {
                state.peakBankroll = bankroll;
                state.level = 1; // Reset to level 1 on new session peak
            } else {
                state.level = Math.max(1, state.level - 1); // Decrease level on smaller win
            }
        } else if (lost) {
            state.level = Math.min(8, state.level + 1); // Increase level on loss
        }
    }

    // Update bankroll tracker for the next round comparison
    state.lastBankroll = bankroll;

    // 3. Define the unit sizing and Level Bet Matrix
    const baseUnit = Math.max(1, config.betLimits.min || 1);

    const levels = {
        1: { street: 2, splitsA: 0, splitsB: 0, corners: 0 },
        2: { street: 4, splitsA: 1, splitsB: 0, corners: 0 },
        3: { street: 6, splitsA: 1, splitsB: 1, corners: 0 },
        4: { street: 8, splitsA: 1, splitsB: 1, corners: 1 },
        5: { street: 10, splitsA: 2, splitsB: 2, corners: 2 },
        6: { street: 12, splitsA: 3, splitsB: 3, corners: 3 },
        7: { street: 16, splitsA: 5, splitsB: 5, corners: 5 },
        8: { street: 22, splitsA: 8, splitsB: 8, corners: 8 }
    };

    const currentLevel = levels[state.level] || levels[1];
    const bets = [];

    // Helper to push configured inside bets while adhering to table limits
    function addBet(type, value, units) {
        if (units <= 0) return;
        let amount = units * baseUnit;
        amount = Math.max(amount, config.betLimits.min);
        amount = Math.min(amount, config.betLimits.max);
        bets.push({ type: type, value: value, amount: amount });
    }

    // Double Streets (Six-Lines)
    addBet('line', 10, currentLevel.street);
    addBet('line', 16, currentLevel.street);
    addBet('line', 22, currentLevel.street);

    // Splits Group A (10/11, 11/12, 25/26, 26/27)
    const splitsA = [[10, 11], [11, 12], [25, 26], [26, 27]];
    splitsA.forEach(val => {
        addBet('split', val, currentLevel.splitsA);
    });

    // Splits Group B (13/14, 14/15, 22/23, 23/24)
    const splitsB = [[13, 14], [14, 15], [22, 23], [23, 24]];
    splitsB.forEach(val => {
        addBet('split', val, currentLevel.splitsB);
    });

    // Corners (16/20, 17/21)
    addBet('corner', 16, currentLevel.corners);
    addBet('corner', 17, currentLevel.corners);

    return bets;
}