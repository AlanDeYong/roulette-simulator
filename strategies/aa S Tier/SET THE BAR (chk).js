/**
 * ==============================================================================
 * Strategy Name: SET THE BAR (Corrected Matrix)
 * Source: YouTube - "Bet With Mo"
 * URL: https://youtu.be/Pt-5JZFlsjg
 * 
 * THE FULL LOGIC IN DETAILS:
 * - Covers three 2x2 grid blocks (5-6-8-9, 16-17-19-20, 29-30-32-33).
 * - Total numbers covered: 12 inside numbers across all three dozens.
 * - Positions categorized into:
 *     Group A (9 positions): Corners 5/9, 16/20, 29/33 & Splits 5/6, 8/9, 16/17, 19/20, 29/30, 32/33
 *     Group B (6 positions): Splits 5/8, 6/9, 16/19, 17/20, 29/32, 30/33
 *     Group C (12 positions): Straight Numbers 5, 6, 8, 9, 16, 17, 19, 20, 29, 30, 32, 33
 * 
 * PROGRESSION LADDER & TOTAL UNIT AMOUNTS:
 * - Level 1 (9 units): Group A @ 1 unit each.
 * - Level 2 (15 units): Group A @ 1 unit, Group B @ 1 unit.
 * - Level 3 (27 units): Group A @ 1 unit, Group B @ 1 unit, Group C @ 1 unit.
 * - Level 4 (45 units): Group A @ 3 units (+2), Group B @ 1 unit, Group C @ 1 unit.
 * - Level 5 (57 units): Group A @ 3 units, Group B @ 3 units (+2), Group C @ 1 unit.
 * - Level 6 (81 units): Group A @ 3 units, Group B @ 3 units, Group C @ 3 units (+2).
 * - Level 7 (162 units): Double all bets (Group A @ 6 units, Group B @ 6 units, Group C @ 6 units).
 * - Level 8 (192 units): Level 7 + 10 units on corners 5/9, 16/20, 29/33 (Corners @ 16 units).
 * 
 * WIN/LOSS RULES:
 * - On Loss: Advance to the next level (1 -> 2 -> ... -> 8; repeat Level 8 if loss continues).
 * - On Win: If current bankroll is at/above session peak profit, reset to Level 1.
 *           If below session peak profit, step down to the lowest level that recovers to peak on a win; otherwise reset.
 * 
 * THE GOAL:
 * - Systematically target recovery of session drawdown while capitalizing on dense coverage of key hot blocks.
 * ==============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    const baseUnit = config.betLimits?.min || 1;
    const maxBet = config.betLimits?.max || 500;

    // 1. Initialize State
    if (!state.currentLevel) state.currentLevel = 1;
    if (state.peakBankroll === undefined) state.peakBankroll = bankroll;
    if (state.lastBankroll === undefined) state.lastBankroll = bankroll;

    // Approximate average net payout multiplier per level on a winning hit (assuming single covered number hit)
    // When a winning number hits in this layout, it hits: 1 number, 2 splits, 1 corner.
    // Payout = 36 * (numBet) + 18 * (split1 + split2) + 9 * (corner) - totalBet
    const levelNetWins = {
        1: 9 * 1 + 18 * 1 - 9,                 // +18 units
        2: 9 * 1 + 18 * 2 - 15,                // +30 units
        3: 36 * 1 + 18 * 2 + 9 * 1 - 27,       // +54 units
        4: 36 * 1 + 18 * 4 + 9 * 3 - 45,       // +90 units
        5: 36 * 1 + 18 * 6 + 9 * 3 - 57,       // +114 units
        6: 36 * 3 + 18 * 6 + 9 * 3 - 81,       // +162 units
        7: 36 * 6 + 18 * 12 + 9 * 6 - 162,     // +324 units
        8: 36 * 6 + 18 * 12 + 9 * 16 - 192     // +384 units
    };

    // 2. Process Win / Loss from Previous Spin
    if (spinHistory && spinHistory.length > 0) {
        const netChange = bankroll - state.lastBankroll;

        if (netChange > 0) {
            // Update peak bankroll if new high reached
            if (bankroll > state.peakBankroll) {
                state.peakBankroll = bankroll;
            }

            if (bankroll >= state.peakBankroll) {
                state.currentLevel = 1;
            } else {
                // Find the lowest level that can recover back to peak profit
                const deficit = state.peakBankroll - bankroll;
                let targetLevel = 1;
                for (let lvl = 1; lvl <= 8; lvl++) {
                    const potentialWin = levelNetWins[lvl] * baseUnit;
                    if (potentialWin >= deficit) {
                        targetLevel = lvl;
                        break;
                    }
                    targetLevel = lvl;
                }
                state.currentLevel = targetLevel;
            }
        } else if (netChange < 0) {
            // On loss: move up to next level (max 8, then repeat)
            state.currentLevel = Math.min(state.currentLevel + 1, 8);
        }
    }

    state.lastBankroll = bankroll;

    // Helper to clamp bet amounts to config limits
    function clamp(units) {
        const amt = units * baseUnit;
        return Math.min(Math.max(amt, config.betLimits?.min || 1), maxBet);
    }

    // 3. Determine Unit Quantities per Group based on Level
    let cornerUnits = 0;
    let splitAUnits = 0;
    let splitBUnits = 0;
    let numberUnits = 0;

    switch (state.currentLevel) {
        case 1: // Total 9 units
            cornerUnits = 1;
            splitAUnits = 1;
            splitBUnits = 0;
            numberUnits = 0;
            break;
        case 2: // Total 15 units
            cornerUnits = 1;
            splitAUnits = 1;
            splitBUnits = 1;
            numberUnits = 0;
            break;
        case 3: // Total 27 units
            cornerUnits = 1;
            splitAUnits = 1;
            splitBUnits = 1;
            numberUnits = 1;
            break;
        case 4: // Total 45 units
            cornerUnits = 3;
            splitAUnits = 3;
            splitBUnits = 1;
            numberUnits = 1;
            break;
        case 5: // Total 57 units
            cornerUnits = 3;
            splitAUnits = 3;
            splitBUnits = 3;
            numberUnits = 1;
            break;
        case 6: // Total 81 units
            cornerUnits = 3;
            splitAUnits = 3;
            splitBUnits = 3;
            numberUnits = 3;
            break;
        case 7: // Total 162 units
            cornerUnits = 6;
            splitAUnits = 6;
            splitBUnits = 6;
            numberUnits = 6;
            break;
        case 8: // Total 192 units
            cornerUnits = 16; // 6 + 10 extra
            splitAUnits = 6;
            splitBUnits = 6;
            numberUnits = 6;
            break;
    }

    // 4. Construct Bet Placements
    const bets = [];

    // Group A - Corners (5 covers 5,6,8,9; 16 covers 16,17,19,20; 29 covers 29,30,32,33)
    if (cornerUnits > 0) {
        const amt = clamp(cornerUnits);
        bets.push({ type: 'corner', value: 5, amount: amt });
        bets.push({ type: 'corner', value: 16, amount: amt });
        bets.push({ type: 'corner', value: 29, amount: amt });
    }

    // Group A - Splits (Horizontal row pairs)
    if (splitAUnits > 0) {
        const amt = clamp(splitAUnits);
        const splitsA = [[5, 6], [8, 9], [16, 17], [19, 20], [29, 30], [32, 33]];
        for (const sp of splitsA) {
            bets.push({ type: 'split', value: sp, amount: amt });
        }
    }

    // Group B - Splits (Vertical column pairs)
    if (splitBUnits > 0) {
        const amt = clamp(splitBUnits);
        const splitsB = [[5, 8], [6, 9], [16, 19], [17, 20], [29, 32], [30, 33]];
        for (const sp of splitsB) {
            bets.push({ type: 'split', value: sp, amount: amt });
        }
    }

    // Group C - Straight Up Numbers
    if (numberUnits > 0) {
        const amt = clamp(numberUnits);
        const numbers = [5, 6, 8, 9, 16, 17, 19, 20, 29, 30, 32, 33];
        for (const num of numbers) {
            bets.push({ type: 'number', value: num, amount: amt });
        }
    }

    return bets;
}