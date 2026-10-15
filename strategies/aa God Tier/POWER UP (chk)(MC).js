/**
 * POWER UP Strategy
 * Source: https://youtu.be/l_AbLHwBQJU (Bet With Mo)
 * 
 * The Full Logic in details:
 * - This strategy is a 10-level progression that bets on the 1st Dozen and up to three specific corners (14/18, 20/24, 26/30).
 * - A win occurs if the ball lands on the 1st Dozen or any of the currently active corners.
 * - On a win, the current bankroll is checked against the target profit. If the target is met, the progression resets to Level 1. 
 * - If a win occurs but the profit target is NOT met, the strategy rebets at the exact same level.
 * 
 * The Full Bet Progression in details:
 * - Level 1: 4 units on 1st Dozen.
 * - Level 2 (On loss): +2 units on 1st Dozen (6 total), 2 units on corner 14.
 * - Level 3 (On loss): +2 units on 1st Dozen (8 total), 2 units on corner 14, 2 units on corner 20.
 * - Level 4 (On loss): +2 units on 1st Dozen (10 total), 2 units on corner 14, 2 units on corner 20, 2 units on corner 26.
 * - Level 5 (On loss): Double all bets (Dozen: 20, C14: 4, C20: 4, C26: 4).
 * - Level 6 (On loss): +10 Dozen (30), +5 all corners (9, 9, 9).
 * - Level 7 (On loss): +10 Dozen (40), +5 all corners (14, 14, 14).
 * - Level 8 (On loss): +20 Dozen (60), +10 all corners (24, 24, 24).
 * - Level 9 (On loss): +20 Dozen (80), +10 all corners (34, 34, 34).
 * - Level 10 (On loss): +40 Dozen (120), +20 all corners (54, 54, 54).
 * Total bet amounts per level: 4, 8, 12, 16, 32, 57, 82, 132, 182, 282.
 * 
 * The Goal:
 * - Target profiting $20 (or 20 units) from the last session's peak profit. 
 * - If reached, reset the progression and establish a new peak profit target.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit
    const unit = config.incrementMode === 'base' ? config.betLimits.minOutside : config.minIncrementalBet;
    const targetIncrement = 20 * unit; // Target profit represented in units

    const LEVELS = {
        1: { dozen: 4, c14: 0, c20: 0, c26: 0 },
        2: { dozen: 6, c14: 2, c20: 0, c26: 0 },
        3: { dozen: 8, c14: 2, c20: 2, c26: 0 },
        4: { dozen: 10, c14: 2, c20: 2, c26: 2 },
        5: { dozen: 20, c14: 4, c20: 4, c26: 4 },
        6: { dozen: 30, c14: 9, c20: 9, c26: 9 },
        7: { dozen: 40, c14: 14, c20: 14, c26: 14 },
        8: { dozen: 60, c14: 24, c20: 24, c26: 24 },
        9: { dozen: 80, c14: 34, c20: 34, c26: 34 },
        10: { dozen: 120, c14: 54, c20: 54, c26: 54 }
    };

    // 2. Initialize State
    if (!state.initialized) {
        state.level = 1;
        state.targetProfit = bankroll + targetIncrement;
        state.placedBetLastSpin = false;
        state.initialized = true;
    }

    // 3. Process previous spin result
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;

        if (state.placedBetLastSpin) {
            // Check if we won the last spin based on the active level coverage
            let won = false;
            if (num !== 0 && num !== 37) {
                if (num >= 1 && num <= 12) won = true; 
                if (state.level >= 2 && [14, 15, 17, 18].includes(num)) won = true;
                if (state.level >= 3 && [20, 21, 23, 24].includes(num)) won = true;
                if (state.level >= 4 && [26, 27, 29, 30].includes(num)) won = true;
            }

            if (won) {
                // On win, verify if we met the peak profit target
                if (bankroll >= state.targetProfit) {
                    state.level = 1;
                    state.targetProfit = bankroll + targetIncrement; // Establish new peak profit target
                }
                // If not reached, state.level remains the same ("rebet at same bet")
            } else {
                // On loss, strictly move up one level until reaching max level 10
                if (state.level < 10) {
                    state.level++;
                }
            }
        }
    }

    // 4. Construct Bets based on current level
    const currentBets = LEVELS[state.level];
    let bets = [];

    // Utility to ensure bets respect table limits
    const clamp = (amount, min, max) => Math.min(Math.max(amount, min), max);

    // 1st Dozen
    if (currentBets.dozen > 0) {
        let amt = currentBets.dozen * unit;
        amt = clamp(amt, config.betLimits.minOutside, config.betLimits.max);
        bets.push({ type: 'dozen', value: 1, amount: amt });
    }

    // Corner 14/18
    if (currentBets.c14 > 0) {
        let amt = currentBets.c14 * unit;
        amt = clamp(amt, config.betLimits.min, config.betLimits.max);
        bets.push({ type: 'corner', value: 14, amount: amt });
    }

    // Corner 20/24
    if (currentBets.c20 > 0) {
        let amt = currentBets.c20 * unit;
        amt = clamp(amt, config.betLimits.min, config.betLimits.max);
        bets.push({ type: 'corner', value: 20, amount: amt });
    }

    // Corner 26/30
    if (currentBets.c26 > 0) {
        let amt = currentBets.c26 * unit;
        amt = clamp(amt, config.betLimits.min, config.betLimits.max);
        bets.push({ type: 'corner', value: 26, amount: amt });
    }

    state.placedBetLastSpin = true;
    return bets;
}