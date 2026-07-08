/**
 * Roulette Strategy: 212 Progression
 * Source: https://www.youtube.com/watch?v=lz3RO6PE9iM&list=PLGUAp9smAZCCOtZ0fnP_tFSCw5fPzYNa5&index=6
 *
 * The Full Logic in details:
 * - This strategy places combinations of splits (2/5, 8/11, 14/17, 20/23), the 2nd Dozen, and 2nd Column.
 * - It follows a strict 9-level progression on losses, progressively adding splits and increasing outside bets.
 * 
 * The Full Bet Progression in details:
 * - Level 1: 1 unit on split 2/5, 2 units on 2nd dozen, 2 units on 2nd column. (Total: 5 units)
 * - Level 2: Add 1 unit on split 8/11, add 2 units each to dozen/column. (Total: 10 units)
 * - Level 3: Add 1 unit on split 14/17, add 2 units each to dozen/column. (Total: 15 units)
 * - Level 4: Add 1 unit on split 20/23, add 2 units to doz/col, then double everything. (Total: 40 units)
 * - Level 5, 6, 7: Increase splits by 1 unit each, dozen/column by 4 units each. (Totals: 52, 64, 76 units)
 * - Level 8: Double all bets from Level 7. (Total: 152 units)
 * - Level 9: Add 5 units to all splits, add 20 units to dozen/column. (Total: 212 units)
 * - On Win:
 *    - If session peak profit is reached, reset back to Level 1.
 *    - If not at peak profit and at Level 6 or higher, drop down 1 level.
 *    - If not at peak profit and at Level 5 or lower, rebet at the current level.
 * - On Loss: Progress to the next level (capped at Level 9).
 *
 * The Goal: Achieve a new session peak bankroll, then reset to baseline to lock in profits.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (state.level === undefined) {
        state.level = 1;
        state.peakBankroll = bankroll;
        state.lastBankroll = bankroll;
    }

    // 2. Process Win/Loss from Previous Spin
    if (spinHistory.length > 0) {
        const netChange = bankroll - state.lastBankroll;

        // Update peak bankroll before processing rules
        if (bankroll > state.peakBankroll) {
            state.peakBankroll = bankroll;
        }

        if (netChange > 0) { 
            // Win Condition
            if (bankroll >= state.peakBankroll) {
                state.level = 1; // Reset on peak profit
            } else {
                if (state.level >= 6) {
                    state.level--; // Drop a level if >= 6
                }
                // Else: rebet at same level
            }
        } else if (netChange < 0) {
            // Loss Condition
            state.level++;
            if (state.level > 9) {
                state.level = 9; // Cap at max defined progression
            }
        }
    }

    // Store current bankroll for next spin comparison
    state.lastBankroll = bankroll;

    // 3. Define Progression Mapping (Unit Multipliers)
    const progression = {
        1: { s1: 1, s2: 0, s3: 0, s4: 0, d2: 2, c2: 2 },
        2: { s1: 1, s2: 1, s3: 0, s4: 0, d2: 4, c2: 4 },
        3: { s1: 1, s2: 1, s3: 1, s4: 0, d2: 6, c2: 6 },
        4: { s1: 2, s2: 2, s3: 2, s4: 2, d2: 16, c2: 16 },
        5: { s1: 3, s2: 3, s3: 3, s4: 3, d2: 20, c2: 20 },
        6: { s1: 4, s2: 4, s3: 4, s4: 4, d2: 24, c2: 24 },
        7: { s1: 5, s2: 5, s3: 5, s4: 5, d2: 28, c2: 28 },
        8: { s1: 10, s2: 10, s3: 10, s4: 10, d2: 56, c2: 56 },
        9: { s1: 15, s2: 15, s3: 15, s4: 15, d2: 76, c2: 76 }
    };

    const currentUnits = progression[state.level];

    // 4. Calculate Base Unit maintaining limit safety and strategy ratios
    // Since Level 1 outside bets use 2 units, 2 * baseUnit must satisfy minOutside.
    const baseUnit = Math.max(
        config.betLimits.min, 
        Math.ceil(config.betLimits.minOutside / 2)
    );

    let bets = [];

    // Helper function to calculate, clamp, and place bets
    const placeBet = (type, value, unitMultiplier) => {
        if (unitMultiplier === 0) return;

        let amount = unitMultiplier * baseUnit;
        
        // Clamp to min/max limits based on bet type
        const minRequired = (type === 'dozen' || type === 'column') ? config.betLimits.minOutside : config.betLimits.min;
        amount = Math.max(amount, minRequired);
        amount = Math.min(amount, config.betLimits.max);

        bets.push({ type, value, amount });
    };

    // 5. Place Bets
    placeBet('split', [2, 5], currentUnits.s1);
    placeBet('split', [8, 11], currentUnits.s2);
    placeBet('split', [14, 17], currentUnits.s3);
    placeBet('split', [20, 23], currentUnits.s4);
    
    placeBet('dozen', 2, currentUnits.d2);
    placeBet('column', 2, currentUnits.c2);

    return bets;
}