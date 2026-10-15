/**
 * Roulette Strategy: Money Action
 * Source: https://youtu.be/coRfB8WyjTU (Bet With Mo)
 *
 * The Full Logic in details:
 * This is a 9-level strategy. It heavily covers the low numbers (1-18) and overlaps them with specific corner bets to create high-paying hotspots, gradually extending to the second dozen.
 * - On a full loss (none of the covered numbers hit), the progression moves to the next level.
 * - On a small loss (a corner hits but the payout doesn't fully cover the total bet, e.g., hitting 19 on Level 6), the strategy rebets at the current level to avoid ballooning the progression.
 * - On a win, if the session reaches a new peak profit, the strategy resets to Level 1.
 * - If it's a win but the session has NOT reached the peak profit (recovering from a drawdown), it rebets at the current level to quickly climb back to profit.
 * - If level 9 is lost, it resets back to Level 1.
 *
 * The Full Bet Progression in details:
 * Level 1: 4 units on Low, 2 units on Corner 2 (covers 2,3,5,6). Total 6.
 * Level 2: 8 units on Low, 2 on Corner 2, 2 on Corner 4. Total 12.
 * Level 3: 12 units on Low, 2 on Corners 2, 4, 8. Total 18.
 * Level 4: 16 units on Low, 2 on Corners 2, 4, 8, 10. Total 24.
 * Level 5: 20 units on Low, 2 on Corners 2, 4, 8, 10, 14. Total 30.
 * Level 6: 48 units on Low, 4 on Corners 2, 4, 8, 10, 14, 16. Total 72.
 * Level 7: 56 units on Low, 4 on all prev corners, plus 8 on Corner 20. Total 88.
 * Level 8: 64 units on Low, 4 on prev corners, 8 on 20, 8 on Corner 22. Total 104.
 * Level 9: Double all previous bets. 128 on Low, 8 on prev corners, 16 on 20 and 22. Total 208.
 *
 * The Goal:
 * Make steady profit with a high win rate by covering a large section of the board. The system is designed to recover efficiently with overlaps while capping exposure at 9 levels.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    const unit = config.betLimits.min;

    const progression = {
        1: { low: 4, corners: [{v:2, a:2}] },
        2: { low: 8, corners: [{v:2, a:2}, {v:4, a:2}] },
        3: { low: 12, corners: [{v:2, a:2}, {v:4, a:2}, {v:8, a:2}] },
        4: { low: 16, corners: [{v:2, a:2}, {v:4, a:2}, {v:8, a:2}, {v:10, a:2}] },
        5: { low: 20, corners: [{v:2, a:2}, {v:4, a:2}, {v:8, a:2}, {v:10, a:2}, {v:14, a:2}] },
        6: { low: 48, corners: [{v:2, a:4}, {v:4, a:4}, {v:8, a:4}, {v:10, a:4}, {v:14, a:4}, {v:16, a:4}] },
        7: { low: 56, corners: [{v:2, a:4}, {v:4, a:4}, {v:8, a:4}, {v:10, a:4}, {v:14, a:4}, {v:16, a:4}, {v:20, a:8}] },
        8: { low: 64, corners: [{v:2, a:4}, {v:4, a:4}, {v:8, a:4}, {v:10, a:4}, {v:14, a:4}, {v:16, a:4}, {v:20, a:8}, {v:22, a:8}] },
        9: { low: 128, corners: [{v:2, a:8}, {v:4, a:8}, {v:8, a:8}, {v:10, a:8}, {v:14, a:8}, {v:16, a:8}, {v:20, a:16}, {v:22, a:16}] }
    };

    if (typeof state.level === 'undefined') {
        state.level = 1;
        state.peakBankroll = bankroll;
        state.lastBankroll = bankroll;
        state.lastTotalBet = 0;
    } else {
        const profitForSpin = bankroll - state.lastBankroll;

        if (profitForSpin > 0) {
            if (bankroll >= state.peakBankroll) {
                state.level = 1; 
                state.peakBankroll = bankroll;
            } 
            // Else: Win, but haven't reached peak profit yet. Rebet current level.
        } else {
            if (profitForSpin > -state.lastTotalBet) {
                // Small loss (a number hit, but payout was less than the total bet). Rebet current level.
            } else {
                // Full loss. Progress to next level.
                state.level++;
                if (state.level > 9) {
                    state.level = 1; 
                }
            }
        }
    }

    state.lastBankroll = bankroll;
    
    const levelData = progression[state.level];
    let bets = [];

    // Calculate Low Bet
    let lowAmt = levelData.low * unit;
    lowAmt = Math.max(lowAmt, config.betLimits.minOutside);
    lowAmt = Math.min(lowAmt, config.betLimits.max);
    bets.push({ type: 'low', amount: lowAmt });

    // Calculate Corner Bets
    for (let c of levelData.corners) {
        let cAmt = c.a * unit;
        cAmt = Math.max(cAmt, config.betLimits.min);
        cAmt = Math.min(cAmt, config.betLimits.max);
        bets.push({ type: 'corner', value: c.v, amount: cAmt });
    }

    // Store the total size of this placement to accurately judge full vs small losses next spin
    state.lastTotalBet = bets.reduce((sum, b) => sum + b.amount, 0);

    return bets;
}