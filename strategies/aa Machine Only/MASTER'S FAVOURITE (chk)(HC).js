/*
 * Strategy Name: Master's Favourite (Dynamic Hot Corners - Highly Restricted)
 * Source: Modified from https://youtu.be/PvoDxUeRXgA
 * * The Full Logic in details:
 * - Observation Phase: The strategy does not bet for the first 37 spins to collect number frequency data.
 * - Dynamic Selection: Calculates the "hotness" of valid corners over the last 37 spins. It selects the top 6 hottest non-overlapping corners.
 * - Board Restriction: Corners located exactly in the middle of the dozens (4, 5, 16, 17, 28, 29) AND corners that span between dozens (10, 11, 22, 23) are explicitly excluded from selection.
 * - Starting bets: Place 1 unit bet each on the top 5 hottest non-overlapping valid corners. The 6th is reserved.
 * - On a win: 
 * - If peak profit is reached (current bankroll >= highest recorded), reset and recalculate hot corners.
 * - If the win occurs immediately after adding the 6th corner, reset and recalculate.
 * - Else if not at peak profit, rebet. If 6 corners are active, remove the winning corner and increase remaining bets by 2 units.
 * - Otherwise, increase remaining active bets by 2 units.
 * - On a loss: 
 * - First loss: add the reserved 6th hottest corner and increase all bets by 2 units.
 * - Subsequent consecutive losses: keep increasing each active bet by 2 units indefinitely until a win.
 * * The Full Bet Progression in details:
 * - Initial: 5 corners * 1 unit.
 * - 1st Loss: 6 corners * (previous + 2) units.
 * - Nth Loss: 6 corners * (previous + 2) units indefinitely.
 * - Winning Progression: Drops the winning corner, then continues adding +2 units to remaining active corners until peak profit is achieved.
 * * The Goal:
 * - Continuous profit accumulation relying on dynamic heat mapping, specifically isolating the extreme top and bottom blocks of each dozen.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit
    const unit = config.betLimits.min;

    // Wait for the first 37 spins to collect frequency data
    if (spinHistory.length < 37) {
        return [];
    }

    // Helper function to dynamically find the hottest non-overlapping corners
    function getHotCorners() {
        const freqs = {};
        for (let i = 0; i <= 36; i++) freqs[i] = 0;
        
        const recentSpins = spinHistory.slice(-37);
        for (const spin of recentSpins) {
            freqs[spin.winningNumber] = (freqs[spin.winningNumber] || 0) + 1;
        }
        
        // Excluded Middle Dozens: 4, 5, 16, 17, 28, 29
        // Excluded Between Dozens: 10, 11 (D1-D2 boundary), 22, 23 (D2-D3 boundary)
        const validCorners = [
            1, 2, 7, 8, 
            13, 14, 19, 20, 
            25, 26, 31, 32
        ];
        
        let cornerScores = [];
        for (let c of validCorners) {
            const nums = [c, c + 1, c + 3, c + 4];
            const score = nums.reduce((sum, n) => sum + freqs[n], 0);
            cornerScores.push({ corner: c, nums: nums, score: score });
        }
        
        // Sort descending by score
        cornerScores.sort((a, b) => b.score - a.score);
        
        let selected = [];
        let coveredNumbers = new Set();
        
        for (let cs of cornerScores) {
            let overlap = false;
            for (let n of cs.nums) {
                if (coveredNumbers.has(n)) {
                    overlap = true;
                    break;
                }
            }
            if (!overlap) {
                selected.push(cs.corner);
                for (let n of cs.nums) coveredNumbers.add(n);
                if (selected.length === 6) break;
            }
        }
        
        return {
            start: selected.slice(0, 5),
            sixth: selected[5]
        };
    }

    // Helper to completely reset the state and recalculate hot corners
    function resetState() {
        const hot = getHotCorners();
        state.activeCorners = hot.start;
        state.sixthCorner = hot.sixth;
        state.currentUnitsPerCorner = 1;
        state.justAddedSixth = false;
    }

    // 2. Initialize State on the first active betting run
    if (state.peakBankroll === undefined) {
        state.peakBankroll = bankroll;
        resetState();
    } else {
        // 3. Process the last spin's results against active bets
        let reachedPeak = false;
        if (bankroll >= state.peakBankroll) {
            state.peakBankroll = bankroll;
            reachedPeak = true;
        }

        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastWinNumber = lastSpin.winningNumber;
        
        const isCornerWin = (cornerTopLeft, number) => {
            const validNumbers = [
                cornerTopLeft, cornerTopLeft + 1,
                cornerTopLeft + 3, cornerTopLeft + 4
            ];
            return validNumbers.includes(number);
        };

        let wonLastSpin = false;
        let winningCorner = null;
        for (let corner of state.activeCorners) {
            if (isCornerWin(corner, lastWinNumber)) {
                wonLastSpin = true;
                winningCorner = corner;
                break;
            }
        }

        if (wonLastSpin) {
            if (reachedPeak) {
                resetState();
            } else if (state.justAddedSixth) {
                resetState();
            } else {
                if (state.activeCorners.length === 6 && winningCorner !== null) {
                    state.activeCorners = state.activeCorners.filter(c => c !== winningCorner);
                    state.currentUnitsPerCorner += 2;
                } else {
                    state.currentUnitsPerCorner += 2;
                }
                state.justAddedSixth = false;
            }
        } else {
            // Loss
            if (state.activeCorners.length === 5) {
                state.activeCorners.push(state.sixthCorner);
                state.currentUnitsPerCorner += 2;
                state.justAddedSixth = true;
            } else {
                state.currentUnitsPerCorner += 2;
                state.justAddedSixth = false; 
            }
        }
    }

    // 4. Calculate amounts and build bets
    let bets = [];
    let amount = state.currentUnitsPerCorner * unit;
    
    // Clamp to table limits
    amount = Math.max(amount, config.betLimits.min);
    amount = Math.min(amount, config.betLimits.max);

    // 5. Place bets on active corners
    for (let corner of state.activeCorners) {
        bets.push({
            type: 'corner',
            value: corner,
            amount: amount
        });
    }

    return bets;
}