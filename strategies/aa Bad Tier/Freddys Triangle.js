/**
 * Strategy: Freddy's Triangle (Base Version - 12 Rows)
 * * Source: 
 * Video: "Freddy’s Triangle: A Mathematical System That Claims To Beat Roulette"
 * Channel: Ninja Gamblers
 * URL: https://www.youtube.com/watch?v=JHK_hOvOtlg
 * * The Logic:
 * - The strategy uses a pre-calculated "Triangle" of bet amounts.
 * - You stick to one Even Money bet (e.g., Red) throughout the cycle.
 * - Movement Rules:
 * 1. WIN: Move one cell to the LEFT.
 * - If you Win at the far left, "Drop Down" to the next row, starting at the FAR RIGHT.
 * 2. LOSE: Move one cell to the RIGHT.
 * - If you Lose at the far right, "Drop Down" to the next row, starting at the FAR LEFT.
 * * The Progression (The Triangle):
 * - The chart is built using a specific sequence: 1, 2, 3, 5, 8, 12, 17, 23, 30, 38, 47, 57.
 * - Rows 1-3 have 1 number each: [1], [2], [3].
 * - Rows 4+ expand in width, containing the sequence values in descending order down to 3.
 * (e.g., Row 4: [5, 3], Row 5: [8, 5, 3], Row 6: [12, 8, 5, 3]).
 * * The Goal:
 * - Complete Row 12.
 * - Target Profit: ~243 units (if finishing on a win).
 * - Stop Loss: ~189 units (if finishing on a loss / hitting max exposure).
 * - Cycles reset after completing Row 12.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Configuration & Constants
    const TARGET_BET = 'red'; // Can be changed to 'black', 'even', 'odd', etc.
    const MAX_ROWS = 12;      // Base version stops at Row 12
    const UNIT = config.betLimits.minOutside;

    // 2. Define the "Freddy's Triangle" Data Structure
    // Sequence derived from video: 1, 2, 3, 5, 8, 12, 17, 23, 30, 38, 47, 57...
    // Logic: S[0]=1, S[1]=2, S[2]=3, S[i] = S[i-1] + (i-1) for i >= 3
    // Row Construction:
    //   Rows 0-2 (1-3): Single element [Sequence[i]]
    //   Rows 3+ (4+):   Elements from Sequence[i] down to Sequence[2] (3)
    const getTriangle = () => {
        const seq = [1, 2, 3];
        for (let i = 3; i < MAX_ROWS; i++) {
            seq.push(seq[i - 1] + (i - 1));
        }

        const rows = [];
        for (let i = 0; i < MAX_ROWS; i++) {
            if (i < 3) {
                rows.push([seq[i]]);
            } else {
                const rowData = [];
                // Fill from current sequence max down to the value 3 (index 2)
                for (let k = i; k >= 2; k--) {
                    rowData.push(seq[k]);
                }
                rows.push(rowData);
            }
        }
        return rows;
    };

    // 3. Initialize State
    if (state.currentRow === undefined) {
        state.triangle = getTriangle();
        state.currentRow = 0;
        state.currentCol = 0;
        state.totalProfit = 0;
        state.active = true;
    }

    // 4. Process Last Result (if any)
    if (spinHistory.length > 0 && state.active) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastBet = lastSpin.bets.find(b => b.type === TARGET_BET); // Assuming we only place this bet
        
        // Only process if we actually bet last time
        if (lastBet) {
            const won = lastSpin.winningColor === TARGET_BET || 
                        (TARGET_BET === 'even' && lastSpin.winningNumber !== 0 && lastSpin.winningNumber % 2 === 0) ||
                        (TARGET_BET === 'odd' && lastSpin.winningNumber % 2 !== 0); 
            // Note: Simplification for Red/Black. Add logic for other types if needed.

            const currentRowData = state.triangle[state.currentRow];

            if (won) {
                // WIN LOGIC: Move Left
                state.currentCol--;

                // If we go past the left edge (Index < 0)
                if (state.currentCol < 0) {
                    // Drop down to next row, start at FAR RIGHT
                    state.currentRow++;
                    if (state.currentRow < MAX_ROWS) {
                        state.currentCol = state.triangle[state.currentRow].length - 1;
                    }
                }
            } else {
                // LOSS LOGIC: Move Right
                state.currentCol++;

                // If we go past the right edge (Index >= length)
                if (state.currentCol >= currentRowData.length) {
                    // Drop down to next row, start at FAR LEFT
                    state.currentRow++;
                    if (state.currentRow < MAX_ROWS) {
                        state.currentCol = 0;
                    }
                }
            }
        }
    }

    // 5. Check Cycle End Conditions
    if (state.currentRow >= MAX_ROWS) {
        // Cycle Complete (Win or Loss) - Reset to start
        state.currentRow = 0;
        state.currentCol = 0;
        // console.log("Freddy's Triangle: Cycle Complete. Resetting.");
    }

    // 6. Calculate Next Bet
    const rowData = state.triangle[state.currentRow];
    let unitsToBet = rowData[state.currentCol];
    let betAmount = unitsToBet * UNIT;

    // 7. Clamp to Limits
    betAmount = Math.max(betAmount, config.betLimits.minOutside);
    betAmount = Math.min(betAmount, config.betLimits.max);

    // 8. Return Bet
    return [{
        type: TARGET_BET,
        amount: betAmount
    }];
}