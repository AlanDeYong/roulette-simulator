/**
 * Retirement Roulette Strategy by WY (Modified River of Cash)
 * Source: https://youtu.be/BvY6heLTNyc (The Roulette Master)
 *
 * The Full Logic in details:
 * - Determine the "Coldest Column" (the column that hasn't hit for the most spins).
 * - Place a Column bet on this coldest column.
 * - Place 6 Corner bets on the other two columns (either "Across the Top" covering Cols 2 & 3, or "Across the Bottom" covering Cols 1 & 2).
 * - When a Corner bet wins, that specific corner is REMOVED from the board for subsequent spins.
 * - If both the Column and a Corner win on the same spin, a FULL RESET occurs to initial state.
 * - If the Column wins but the Corner loses, the Column bet is reset to 1 unit and moved to the new coldest column, while the remaining Corner bets DOUBLE. The Corner bets do NOT move.
 * - If both the Column and Corner bets lose, BOTH progressions increase.
 *
 * The Full Bet Progression in details:
 * - Corner bets follow a Martingale progression: 1, 2, 4, 8, 16, 32... after a loss.
 * - Column bet follows a Fibonacci progression: 1, 2, 3, 5, 8, 13, 21, 34... after a loss.
 * - Base units are determined by table minimums.
 * * The Goal:
 * - Unstoppable slow accumulation of profit to replace a 9-5 job ("Retirement"). No hard stop-loss or target is defined.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const fib = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597];
    const mart = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096];

    // Helper to find the column that has been absent the longest
    function getColdestColumn(history) {
        if (!history || history.length === 0) return 1;
        let lastSeen = { 1: -1, 2: -1, 3: -1 };
        for (let i = 0; i < history.length; i++) {
            let num = history[i].winningNumber;
            if (num === 0) continue;
            let col = (num % 3 === 0) ? 3 : (num % 3);
            lastSeen[col] = i;
        }
        let coldest = 1;
        let minSeen = lastSeen[1];
        if (lastSeen[2] < minSeen) { coldest = 2; minSeen = lastSeen[2]; }
        if (lastSeen[3] < minSeen) { coldest = 3; minSeen = lastSeen[3]; }
        return coldest;
    }

    // 1. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.cornerProgression = 0;
        state.columnProgression = 0;
        state.betColumn = getColdestColumn(spinHistory);
        // 'top' corners cover Cols 2&3. 'bottom' corners cover Cols 1&2.
        state.cornerType = (state.betColumn === 1) ? 'top' : (state.betColumn === 3 ? 'bottom' : 'top');
        state.activeCorners = [0, 1, 2, 3, 4, 5]; // Indices for the 6 corners
    } 
    // 2. Process Previous Spin
    else if (spinHistory.length > 0) {
        let lastResult = spinHistory[spinHistory.length - 1].winningNumber;
        
        let columnWon = false;
        let cornerWon = false;
        let wonCornerIndex = -1;

        if (lastResult !== 0) {
            let lastCol = (lastResult % 3 === 0) ? 3 : (lastResult % 3);
            if (lastCol === state.betColumn) columnWon = true;

            let corners = state.cornerType === 'bottom' ? [1, 7, 13, 19, 25, 31] : [2, 8, 14, 20, 26, 32];
            for (let i = 0; i < state.activeCorners.length; i++) {
                let cIndex = state.activeCorners[i];
                let cVal = corners[cIndex];
                // A corner covers the top-left value (cVal), cVal+1, cVal+3, cVal+4
                if (lastResult === cVal || lastResult === cVal + 1 || lastResult === cVal + 3 || lastResult === cVal + 4) {
                    cornerWon = true;
                    wonCornerIndex = i;
                    break;
                }
            }
        }

        if (cornerWon && columnWon) {
            // Full Reset
            state.cornerProgression = 0;
            state.columnProgression = 0;
            state.betColumn = getColdestColumn(spinHistory);
            state.cornerType = (state.betColumn === 1) ? 'top' : (state.betColumn === 3 ? 'bottom' : 'top');
            state.activeCorners = [0, 1, 2, 3, 4, 5];
        } else if (cornerWon && !columnWon) {
            // Remove the winning corner, progressions pause
            state.activeCorners.splice(wonCornerIndex, 1);
        } else if (!cornerWon && columnWon) {
            // Column wins, Corner loses -> Reset column, move it, double remaining corners
            state.columnProgression = 0;
            state.betColumn = getColdestColumn(spinHistory);
            state.cornerProgression++;
        } else {
            // Both lost -> Progress both
            state.cornerProgression++;
            state.columnProgression++;
        }

        // Failsafe: Reset entirely if we run out of corners
        if (state.activeCorners.length === 0) {
            state.cornerProgression = 0;
            state.columnProgression = 0;
            state.betColumn = getColdestColumn(spinHistory);
            state.cornerType = (state.betColumn === 1) ? 'top' : (state.betColumn === 3 ? 'bottom' : 'top');
            state.activeCorners = [0, 1, 2, 3, 4, 5];
        }
    }

    // 3. Calculate Bet Amounts
    let cProg = Math.min(state.cornerProgression, mart.length - 1);
    let colProg = Math.min(state.columnProgression, fib.length - 1);

    let cornerBase = config.incrementMode === 'fixed' ? config.minIncrementalBet : config.betLimits.min;
    let columnBase = config.incrementMode === 'fixed' ? config.minIncrementalBet : config.betLimits.minOutside;

    let cornerAmount = cornerBase * mart[cProg];
    let columnAmount = columnBase * fib[colProg];

    // Clamp to limits
    cornerAmount = Math.max(cornerAmount, config.betLimits.min);
    cornerAmount = Math.min(cornerAmount, config.betLimits.max);

    columnAmount = Math.max(columnAmount, config.betLimits.minOutside);
    columnAmount = Math.min(columnAmount, config.betLimits.max);

    // 4. Return Bets
    let bets = [];
    
    if (state.betColumn >= 1 && state.betColumn <= 3) {
        bets.push({ type: 'column', value: state.betColumn, amount: columnAmount });
    }

    let cornerVals = state.cornerType === 'bottom' ? [1, 7, 13, 19, 25, 31] : [2, 8, 14, 20, 26, 32];
    for (let cIndex of state.activeCorners) {
        bets.push({ type: 'corner', value: cornerVals[cIndex], amount: cornerAmount });
    }

    return bets;
}