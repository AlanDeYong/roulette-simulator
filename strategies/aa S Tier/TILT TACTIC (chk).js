/**
 * TILT TACTIC - ROULETTE STRATEGY
 *
 * Source: https://youtu.be/KU0PL6ieiw8 (Bet With Mo)
 *
 * The Full Logic in details:
 * - The strategy uses a mix of inside bets (Zero, Corners, Splits) and an outside bet (1st Column).
 * - A "Win" is strictly defined as a spin where the net profit is greater than 0.
 * - A "Total Loss" is when the spin results in a payout of 0.
 * - A "Small Loss" is when a bet hits (e.g., a split or corner) but the total payout is less than the total bet amount.
 * - Triggers:
 * - Total Loss: Progress to the next level in the betting sequence to recover.
 * - Small Loss: Rebet at the exact same level.
 * - Win: If the current bankroll hits a new peak profit for the session, reset to Level 1. 
 * If it's a win but not a new peak profit, drop down 1 level.
 *
 * The Full Bet Progression in details:
 * The progression covers 8 distinct levels based on total unit sizes (5-10-15-40-50-100-200-400):
 * - Level 1 (5 units): 1u on 0, 1u on corner 2, 1u on split 4/5, 2u on 1st column.
 * - Level 2 (10 units): Add 1u to 0, 1u to corner 5, 1u to split 7/8, 2u to 1st column.
 * - Level 3 (15 units): Add 1u to 0, 1u to corner 8, 1u to split 10/11, 2u to 1st column.
 * - Level 4 (40 units): Add 1u to 0, 1u to corner 11, 1u to split 13/14, 2u to 1st col. Then DOUBLE ALL bets.
 * - Level 5 (50 units): Add 2u to 0, 2u to corner 14, 2u to split 16/17, 4u to 1st col.
 * - Level 6 (100 units): Double all bets from Level 5.
 * - Level 7 (200 units): Double all bets from Level 6.
 * - Level 8 (400 units): Double all bets from Level 7.
 *
 * The Goal:
 * Grow the bankroll by achieving peak profits, repeatedly resetting after new peaks are established, 
 * and utilizing the built-in drop-down mechanic to secure partial recoveries.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize state variables on the first run
    if (state.level === undefined) {
        state.level = 0; // 0-based index for Level 1
        state.peakProfit = bankroll;
        state.lastBankroll = bankroll;
        state.lastTotalBet = 0;
    }

    // 2. Update peak profit threshold
    if (bankroll > state.peakProfit) {
        state.peakProfit = bankroll;
    }

    // 3. Process previous spin outcomes
    if (spinHistory.length > 0 && state.lastTotalBet > 0) {
        const netProfit = bankroll - state.lastBankroll;
        const payout = netProfit + state.lastTotalBet;

        if (netProfit > 0) {
            // Win Condition
            if (bankroll >= state.peakProfit) {
                state.level = 0; // Session peak reached, reset
            } else {
                state.level = Math.max(0, state.level - 1); // Not at peak, drop 1 level
            }
        } else if (netProfit < 0) {
            if (payout > 0) {
                // Small Loss Condition (Hit something, but less than total bet)
                // Rebet: Keep the level exactly the same
            } else {
                // Total Loss Condition
                state.level = Math.min(7, state.level + 1); // Progress 1 level (Max Level 8, index 7)
            }
        }
    }

    // Update last bankroll for next spin's calculations
    state.lastBankroll = bankroll;

    // 4. Define the structural bet layouts for the first 5 base levels
    const levels = [
        [ // Level 1 (5 units)
            { type: 'number', value: 0, units: 1 },
            { type: 'corner', value: 2, units: 1 }, // Top-left 2 covers 2,3,5,6
            { type: 'split', value: [4, 5], units: 1 },
            { type: 'column', value: 1, units: 2 }
        ],
        [ // Level 2 (10 units)
            { type: 'number', value: 0, units: 2 },
            { type: 'corner', value: 2, units: 1 },
            { type: 'corner', value: 5, units: 1 }, // Top-left 5 covers 5,6,8,9
            { type: 'split', value: [4, 5], units: 1 },
            { type: 'split', value: [7, 8], units: 1 },
            { type: 'column', value: 1, units: 4 }
        ],
        [ // Level 3 (15 units)
            { type: 'number', value: 0, units: 3 },
            { type: 'corner', value: 2, units: 1 },
            { type: 'corner', value: 5, units: 1 },
            { type: 'corner', value: 8, units: 1 },
            { type: 'split', value: [4, 5], units: 1 },
            { type: 'split', value: [7, 8], units: 1 },
            { type: 'split', value: [10, 11], units: 1 },
            { type: 'column', value: 1, units: 6 }
        ],
        [ // Level 4 (40 units: Pre-double + additions, then multiplied by 2)
            { type: 'number', value: 0, units: 8 },
            { type: 'corner', value: 2, units: 2 },
            { type: 'corner', value: 5, units: 2 },
            { type: 'corner', value: 8, units: 2 },
            { type: 'corner', value: 11, units: 2 },
            { type: 'split', value: [4, 5], units: 2 },
            { type: 'split', value: [7, 8], units: 2 },
            { type: 'split', value: [10, 11], units: 2 },
            { type: 'split', value: [13, 14], units: 2 },
            { type: 'column', value: 1, units: 16 }
        ],
        [ // Level 5 (50 units)
            { type: 'number', value: 0, units: 10 },
            { type: 'corner', value: 2, units: 2 },
            { type: 'corner', value: 5, units: 2 },
            { type: 'corner', value: 8, units: 2 },
            { type: 'corner', value: 11, units: 2 },
            { type: 'corner', value: 14, units: 2 },
            { type: 'split', value: [4, 5], units: 2 },
            { type: 'split', value: [7, 8], units: 2 },
            { type: 'split', value: [10, 11], units: 2 },
            { type: 'split', value: [13, 14], units: 2 },
            { type: 'split', value: [16, 17], units: 2 },
            { type: 'column', value: 1, units: 20 }
        ]
    ];

    // 5. Dynamically Generate Levels 6, 7, and 8
    // Rule: "On next 3 losses, rebet, double up all bets"
    for (let multiplier = 2; multiplier <= 8; multiplier *= 2) {
        const nextLevel = levels[4].map(bet => ({
            type: bet.type,
            value: bet.value,
            units: bet.units * multiplier
        }));
        levels.push(nextLevel);
    }

    // 6. Compile Current Bets and Clamp to Config Limits
    const currentLevelBets = levels[state.level];
    const baseUnit = config.minIncrementalBet || 1;
    let totalBetAmount = 0;

    const betsToPlace = currentLevelBets.map(betDef => {
        let amount = betDef.units * baseUnit;
        
        // Determine the minimum allowed bet depending on if it's Inside or Outside
        let minAllowed = (betDef.type === 'column') ? config.betLimits.minOutside : config.betLimits.min;

        // Clamp to defined limits
        amount = Math.max(amount, minAllowed);
        amount = Math.min(amount, config.betLimits.max);

        totalBetAmount += amount;

        return {
            type: betDef.type,
            value: betDef.value,
            amount: amount
        };
    });

    // 7. Safety check: Stop betting if bankroll is depleted
    if (totalBetAmount > bankroll) {
        return [];
    }

    // 8. Track total bet size for next spin's logic checks
    state.lastTotalBet = totalBetAmount;

    return betsToPlace;
}