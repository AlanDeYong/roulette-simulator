/**
 * ============================================================================
 * Strategy Name: Sweet 16 Roulette Strategy
 * Channel: Junko Bodie
 * Source Video: https://youtu.be/qE7SONSM5mQ
 * ============================================================================
 * 
 * THE FULL LOGIC IN DETAIL:
 * 1. Overview & Board Coverage:
 *    - The strategy deploys 16 split bets divided into 4 modular groups of 4 splits:
 *      * Group 1 (Dozen 1): [1,4], [2,5], [7,10], [8,11]
 *      * Group 2 (Dozen 2): [13,16], [14,17], [19,22], [20,23]
 *      * Group 3 (Dozen 3 Lower): [25,28], [26,29], [31,34], [32,35]
 *      * Group 4 (Dozen 3 Upper): [26,27], [29,30], [32,33], [35,36]
 *    - This covers exactly 28 numbers across the wheel (10 losing numbers: 0, 00, 3, 6, 9, 12, 15, 18, 21, 24).
 *    - Numbers 26, 29, 32, and 35 are "Jackpot Numbers" covered simultaneously by two splits in Groups 3 & 4.
 * 
 * 2. Betting Progression & Recovery:
 *    - Stage 1: Base bet (1 unit, clamped to inside min, typically $2) on all 16 splits.
 *    - On Loss:
 *      * 1st Miss: Double bet size to 2 units ($4 per split).
 *      * 2nd Miss: Double bet size to 4 units ($8 per split) — maximum 2 doubles.
 *      * 3rd Miss: Enter Recovery mode at $10 (5 units) per active split.
 *      * Subsequent Misses in Recovery: Increase by +$5 (2.5 units) per active split ($15, $20, $25, $30...).
 *    - On Win:
 *      * If bankroll reaches or surpasses `sessionHigh` (new high or break-even), FULL RESET to Stage 1.
 *      * If bankroll is still below `sessionHigh`: DO NOT increase bets. Remove the winning group of 4 splits
 *        and continue betting the remaining active groups to recover back to `sessionHigh`.
 * 
 * 3. The Goal:
 *    - Hit and run profit target (e.g. +$25 to +$200) or continuous session high progression with stop-loss protection.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    const minInside = config.betLimits.min || 2;
    const maxBet = config.betLimits.max || 500;
    const baseUnit = Math.max(minInside, 2);

    // Define the 4 tactical groups of 4 splits each
    const groups = [
        { id: 1, splits: [[1, 4], [2, 5], [7, 10], [8, 11]] },
        { id: 2, splits: [[13, 16], [14, 17], [19, 22], [20, 23]] },
        { id: 3, splits: [[25, 28], [26, 29], [31, 34], [32, 35]] },
        { id: 4, splits: [[26, 27], [29, 30], [32, 33], [35, 36]] }
    ];

    // Helper: Check if a split covers a winning number
    function splitCovers(split, number) {
        return split[0] === number || split[1] === number;
    }

    // Helper: Check if a group won on a given number
    function groupWon(group, number) {
        return group.splits.some(s => splitCovers(s, number));
    }

    // 1. Initialize Persistent State
    if (!state.initialized) {
        state.initialized = true;
        state.sessionHigh = bankroll;
        state.stage = 1; // 1: Base (1x), 2: Double (2x), 3: Double (4x), 4: Recovery (+$5 increments)
        state.recoveryUnit = 5; // In Recovery mode: starts at 5 units ($10 base)
        state.activeGroupIds = [1, 2, 3, 4];
    }

    // Update Session High if bankroll hit a new peak
    if (bankroll > state.sessionHigh) {
        state.sessionHigh = bankroll;
    }

    // 2. Evaluate Last Spin Result
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNumber = lastSpin.winningNumber;

        // Check which active groups won
        const winningGroupIds = state.activeGroupIds.filter(id => {
            const grp = groups.find(g => g.id === id);
            return grp && groupWon(grp, lastNumber);
        });

        const isWin = winningGroupIds.length > 0;

        if (isWin) {
            // If we reached or exceeded the session high (break-even / new high) -> Full Reset
            if (bankroll >= state.sessionHigh) {
                state.sessionHigh = Math.max(state.sessionHigh, bankroll);
                state.stage = 1;
                state.recoveryUnit = 5;
                state.activeGroupIds = [1, 2, 3, 4];
            } else {
                // In recovery / deficit: Remove winning groups, keep remaining active groups
                state.activeGroupIds = state.activeGroupIds.filter(id => !winningGroupIds.includes(id));
                
                // If all groups were removed without reaching high, re-enable all groups
                if (state.activeGroupIds.length === 0) {
                    state.activeGroupIds = [1, 2, 3, 4];
                }
                
                // De-escalate bet size if close to recovery
                if (state.sessionHigh - bankroll <= 50 && state.stage === 4) {
                    state.recoveryUnit = Math.max(2.5, state.recoveryUnit - 2.5);
                }
            }
        } else {
            // Loss progression
            if (state.stage === 1) {
                state.stage = 2; // Double to $4
            } else if (state.stage === 2) {
                state.stage = 3; // Double to $8
            } else if (state.stage === 3) {
                state.stage = 4; // Move to $10 flat recovery
                state.recoveryUnit = 5;
            } else if (state.stage === 4) {
                // In recovery: increase bet size by +$5 (+2.5 base units)
                state.recoveryUnit += 2.5;
            }
        }
    }

    // 3. Calculate Bet Amount per Split
    let amountPerSplit = baseUnit;
    if (state.stage === 1) {
        amountPerSplit = baseUnit;
    } else if (state.stage === 2) {
        amountPerSplit = baseUnit * 2;
    } else if (state.stage === 3) {
        amountPerSplit = baseUnit * 4;
    } else if (state.stage === 4) {
        amountPerSplit = Math.round(baseUnit * state.recoveryUnit);
    }

    // Clamp bet amount per split to table limits
    amountPerSplit = Math.max(amountPerSplit, minInside);
    amountPerSplit = Math.min(amountPerSplit, maxBet);

    // 4. Generate Bets for all currently Active Groups
    const bets = [];
    for (const groupId of state.activeGroupIds) {
        const group = groups.find(g => g.id === groupId);
        if (group) {
            for (const splitPair of group.splits) {
                bets.push({
                    type: 'split',
                    value: splitPair,
                    amount: amountPerSplit
                });
            }
        }
    }

    return bets;
}