/**
 * Strategy: Dynamic Duos Roulette System
 * Source: https://youtu.be/13bxI5xynzs (The Roulette Master)
 *
 * The Full Logic in details:
 * - The strategy begins by covering 24 numbers using 6 Corner bets (placed to cover the left and middle columns).
 * - When a win occurs, the specific bet that caught the winning number is "downgraded" to reduce coverage but increase payout density.
 * - If a Corner wins, it is replaced by a Split bet formed from its remaining numbers (guaranteeing the last winning number is excluded).
 * - If a Split wins, it is replaced by a new Split, and one of the remaining Corners is also downgraded to a Split.
 * - This creates three distinct phases of play:
 * Phase 1: 6 Corners (24 numbers covered)
 * Phase 2: 5 Corners, 1 Split (22 numbers covered)
 * Phase 3: 4 Corners, 2 Splits (20 numbers covered)
 *
 * The Full Bet Progression in details:
 * - Initial bets: Corners start at 2 base units each; Splits start at 1 base unit each. 
 * - After a loss: The layout of bets (the current mix of corners and splits) remains exactly unchanged. The progression level increases by 1.
 * - After a win: The progression level does NOT change, but the layout advances to the next phase (corners transform into splits).
 * - Sizing strictly respects `config.incrementMode`: 'fixed' adds `config.minIncrementalBet` per level, 'base' multiplies the initial unit by the level.
 *
 * The Goal:
 * - To reach Phase 3 (2 Splits active) and secure a win. This signifies the completion of the cycle.
 * - Upon completing Phase 3 with a win, the progression level resets to 1, and the layout reverts to the initial Phase 1 (6 Corners).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const minInside = config.betLimits.min;
    const baseSplitAmount = minInside;
    const baseCornerAmount = minInside * 2;

    // 1. Initialize State on first run
    if (!state.activeBets) {
        state.level = 1;
        state.activeBets = [
            { type: 'corner', value: 1, origin: 1 },
            { type: 'corner', value: 7, origin: 7 },
            { type: 'corner', value: 13, origin: 13 },
            { type: 'corner', value: 19, origin: 19 },
            { type: 'corner', value: 25, origin: 25 },
            { type: 'corner', value: 31, origin: 31 }
        ];
    }

    // 2. Process the previous spin result
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winNum = lastSpin.winningNumber;

        // Determine if any of our active bets covered the winning number
        let winningBet = null;
        for (let b of state.activeBets) {
            let covered = false;
            if (b.type === 'corner') {
                const c = b.value;
                const nums = [c, c + 1, c + 3, c + 4];
                if (nums.includes(winNum)) covered = true;
            } else if (b.type === 'split') {
                if (b.value.includes(winNum)) covered = true;
            }

            if (covered) {
                winningBet = b;
                break;
            }
        }

        if (winningBet) {
            // WIN Logic
            const splitsCount = state.activeBets.filter(b => b.type === 'split').length;

            if (splitsCount >= 2) {
                // Goal reached! Reset to Phase 1.
                state.level = 1;
                state.activeBets = [
                    { type: 'corner', value: 1, origin: 1 },
                    { type: 'corner', value: 7, origin: 7 },
                    { type: 'corner', value: 13, origin: 13 },
                    { type: 'corner', value: 19, origin: 19 },
                    { type: 'corner', value: 25, origin: 25 },
                    { type: 'corner', value: 31, origin: 31 }
                ];
            } else {
                // Advance Phase by converting to Splits
                const getNextSplit = (origin, wNum) => {
                    const nums = [origin, origin + 1, origin + 3, origin + 4];
                    const avail = nums.filter(n => n !== wNum);
                    const possibleSplits = [
                        [origin, origin + 1],
                        [origin + 3, origin + 4],
                        [origin, origin + 3],
                        [origin + 1, origin + 4]
                    ];
                    // Find a valid adjacent split within the origin corner using only un-hit numbers
                    for (let s of possibleSplits) {
                        if (avail.includes(s[0]) && avail.includes(s[1])) return s;
                    }
                    return possibleSplits[0]; // Fallback
                };

                if (winningBet.type === 'split') {
                    // Replace the hitting split
                    winningBet.value = getNextSplit(winningBet.origin, winNum);
                    // Also convert one remaining corner to advance the phase
                    let corner = state.activeBets.find(b => b.type === 'corner');
                    if (corner) {
                        corner.type = 'split';
                        corner.value = getNextSplit(corner.origin, -1);
                    }
                } else {
                    // Convert the hitting corner to a split
                    winningBet.type = 'split';
                    winningBet.value = getNextSplit(winningBet.origin, winNum);
                }
            }
        } else {
            // LOSS Logic: Maintain layout, increase progression
            state.level += 1;
        }
    }

    // 3. Construct the bet array to return
    let bets = [];
    for (let b of state.activeBets) {
        let amount = 0;
        let baseAmount = b.type === 'corner' ? baseCornerAmount : baseSplitAmount;

        // Apply Increment Mode
        if (state.level === 1) {
            amount = baseAmount;
        } else {
            let increment = config.incrementMode === 'base' ? baseAmount : config.minIncrementalBet;
            amount = baseAmount + (increment * (state.level - 1));
        }

        // Clamp to configured bet limits
        amount = Math.max(amount, config.betLimits.min);
        amount = Math.min(amount, config.betLimits.max);

        bets.push({
            type: b.type,
            value: b.value,
            amount: amount
        });
    }

    return bets;
}