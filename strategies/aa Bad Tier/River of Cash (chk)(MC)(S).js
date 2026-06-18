/**
 * River of Cash Roulette System
 *
 * Source: https://youtu.be/DZ28ExgrA30 by The Roulette Master
 *
 * The Full Logic in details:
 * - Identify the column that has not won for the longest time ("coldest").
 * - A bet is placed on this target column.
 * - Simultaneously, 6 non-overlapping corner bets are placed:
 * - Target Column 1: Bet on "bottom" corners (1, 7, 13, 19, 25, 31).
 * - Target Column 3: Bet on "top" corners (2, 8, 14, 20, 26, 32).
 * - Target Column 2: Randomly select all "top" or all "bottom" corners.
 * - When a corner wins, that specific corner is removed from the active bets.
 * - The entire system resets IF a corner wins simultaneously with the column bet.
 * - The entire system also resets IF the active corners drop to 2 or fewer.
 * - If the column wins but the overlapping corner was already removed, it is treated as a partial win (no reset unless corners <= 2, no progression advance).
 *
 * The Full Bet Progression in details:
 * - Base unit is the table minimum.
 * - On a "Total Loss" (neither the column nor any corner wins):
 * - Column bet advances on a Fibonacci progression (1, 2, 3, 5, 8, 13...).
 * - Corner bets double (1, 2, 4, 8...) AS LONG AS there are > 3 active corners.
 * - When active corners <= 3, the corner progression switches to Fibonacci (adding the last two bets).
 * - On a "Partial Win" (either a corner wins, OR the column wins, but not both):
 * - The column bet DOES NOT increase.
 * - The remaining corner bets DO NOT increase.
 * - If a corner won, it is removed for the next spin.
 *
 * The Goal:
 * - Accumulate profit via corner wins while using progression safety on the column bet until an overlapping jackpot hit (or corner exhaustion) triggers a reset.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit
    const unit = Math.max(config.betLimits.minOutside, config.betLimits.min);

    // Helper: Find column of a number (1, 2, 3, or 0 for zero)
    function getColumn(number) {
        let n = parseInt(number, 10);
        if (isNaN(n) || n === 0) return 0;
        return (n % 3 === 1) ? 1 : (n % 3 === 2) ? 2 : 3;
    }

    let needReset = false;

    // 2. Evaluate previous spin if a state exists
    if (state.targetColumn && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winNum = parseInt(lastSpin.winningNumber, 10);
        const winCol = getColumn(winNum);

        let wonAnyCorner = false;
        let remainingCorners = [];

        // Check if any active corner won
        for (let c of state.activeCorners) {
            const covered = [c, c + 1, c + 3, c + 4]; // Numbers covered by corner starting at 'c'
            if (covered.includes(winNum)) {
                wonAnyCorner = true;
            } else {
                remainingCorners.push(c);
            }
        }

        let wonCol = (winCol === state.targetColumn);

        // EVALUATE WIN/LOSS CONDITIONS
        if (wonCol && wonAnyCorner) {
            // Reset if both the column and an active corner hit together
            needReset = true;
        } else if (wonCol || wonAnyCorner) {
            // Partial win: Column hit OR Corner hit, but not simultaneously.
            // Remove winning corner if applicable.
            if (wonAnyCorner) {
                state.activeCorners = remainingCorners;
                // RESTORED RULE: Reset if active corners drop to 2 or fewer
                if (state.activeCorners.length <= 2) {
                    needReset = true;
                }
            }
            // Progressions DO NOT advance on any win.
        } else {
            // Total Loss -> Advance Progressions
            state.columnFibIndex++;
            
            let lastCornerBet = state.cornerBetHistory[state.cornerBetHistory.length - 1];
            let nextCornerBet = 0;

            if (state.activeCorners.length > 3) {
                // Double when > 12 numbers (4+ corners)
                nextCornerBet = lastCornerBet * 2;
            } else {
                // Switch to Fibonacci when <= 12 numbers (3 or fewer corners)
                let prev1 = lastCornerBet;
                let prev2 = state.cornerBetHistory.length >= 2 ? state.cornerBetHistory[state.cornerBetHistory.length - 2] : 0;
                nextCornerBet = state.cornerBetHistory.length >= 2 ? (prev1 + prev2) : (prev1 * 2);
            }
            state.cornerBetHistory.push(nextCornerBet);
        }
    }

    // 3. Initialize or Reset System
    if (!state.targetColumn || needReset) {
        
        // Find all unique columns that have hit so far
        let uniqueCols = new Set();
        spinHistory.forEach(s => {
            let c = getColumn(s.winningNumber);
            if (c > 0) uniqueCols.add(c);
        });

        // Wait for data. We must see at least 2 different columns hit before we can definitively know which one is the "coldest".
        if (uniqueCols.size < 2) {
            return []; 
        }

        // Find coldest column
        let lastSeen = { 1: -1, 2: -1, 3: -1 };
        spinHistory.forEach((s, i) => { 
            let c = getColumn(s.winningNumber); 
            if (c > 0) lastSeen[c] = i; 
        });
        
        let coldest = 1;
        let minSeen = Infinity;
        for (let c = 1; c <= 3; c++) {
            if (lastSeen[c] < minSeen) {
                minSeen = lastSeen[c];
                coldest = c;
            }
        }

        state.targetColumn = coldest;
        
        // Setup non-overlapping corner sets as requested
        const bottomCorners = [1, 7, 13, 19, 25, 31]; // e.g., 1 covers 1,2,4,5
        const topCorners = [2, 8, 14, 20, 26, 32];    // e.g., 2 covers 2,3,5,6

        if (state.targetColumn === 1) {
            state.activeCorners = [...bottomCorners];
        } else if (state.targetColumn === 3) {
            state.activeCorners = [...topCorners];
        } else {
            state.activeCorners = (Math.random() > 0.5) ? [...topCorners] : [...bottomCorners];
        }

        // Reset Progression States
        state.columnFibIndex = 0;
        state.cornerBetHistory = [1];
    }

    // 4. Calculate Final Bets & Clamp to Limits
    let bets = [];

    // Column Bet (Fibonacci sequence up to practical limits)
    const colFibSeq = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597];
    let colUnits = colFibSeq[Math.min(state.columnFibIndex, colFibSeq.length - 1)];
    let colAmount = colUnits * unit;
    
    colAmount = Math.max(colAmount, config.betLimits.minOutside);
    colAmount = Math.min(colAmount, config.betLimits.max);
    
    bets.push({ type: 'column', value: state.targetColumn, amount: colAmount });

    // Corner Bets
    let cornerUnits = state.cornerBetHistory[state.cornerBetHistory.length - 1];
    let cornerAmount = cornerUnits * unit;
    
    let clampedCornerAmt = Math.max(cornerAmount, config.betLimits.min);
    clampedCornerAmt = Math.min(clampedCornerAmt, config.betLimits.max);

    for (let c of state.activeCorners) {
        bets.push({ type: 'corner', value: c, amount: clampedCornerAmt });
    }

    return bets;
}