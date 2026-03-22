/**
 * Strategy: The Profit Craze (Data-Driven Hot Targeting Adaptation)
 * Source: Adapted from The Roulette Master (https://www.youtube.com/watch?v=7-TTZ1Ru9d8)
 * * * The Logic: 
 * 1. Observation Phase: The system strictly observes the first 37 spins without betting.
 * 2. Hot Targeting: It analyzes those 37 spins to find the "hottest" column (most frequent) 
 * and the "hottest" board half (numbers 1-18 for the Top corners, 19-36 for the Bottom corners).
 * 3. Placement: It places a main outside bet on the hottest column, and 6 overlapping 
 * corner bets on the hottest half of that column to create layered "jackpots".
 * 4. Recalculation: Whenever the system reaches a new session profit high (a "reset"), 
 * it recalculates the hottest column and corners using the trailing 37 spins.
 * * * The Progression:
 * - Following a losing spin, all individual wagers are uniformly increased by 1 base unit.
 * - If a spin wins but does not result in a new high watermark, the bet size is maintained.
 * - Upon reaching a new session high bankroll, the multiplier resets to 1.
 * * * The Goal: 
 * Capitalize on recent statistical variance (hot streaks) over a fixed 37-spin window, 
 * using overlapping bets and a steady linear progression to lock in new profit highs.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State Variables
    if (state.needsRecalculation === undefined) {
        state.highestBankroll = bankroll;
        state.lastBankroll = bankroll;
        state.multiplier = 1;
        state.needsRecalculation = true;
        state.targetCol = null;
        state.cornersHalf = null;
    }

    // 2. Observation Phase: Wait for 37 spins before placing any bets
    if (spinHistory.length < 37) {
        state.lastBankroll = bankroll; // Keep tracking bankroll even while observing
        return []; 
    }

    // 3. Evaluate Previous Spin & Progression (Only if we had active bets)
    const netProfit = bankroll - state.lastBankroll;

    if (state.targetCol !== null) {
        // Track session high
        if (bankroll > state.highestBankroll) {
            state.highestBankroll = bankroll;
        }

        // Check for Reset or Loss Progression
        if (bankroll >= state.highestBankroll && netProfit > 0) {
            // Reached a new session profit high: Reset multiplier and trigger hot-target recalculation
            state.multiplier = 1;
            state.needsRecalculation = true;
        } else if (netProfit < 0) {
            // Spin resulted in a loss: Increase bet size linearly
            state.multiplier += 1;
        }
    }

    // 4. Determine Hottest Column and Corners (if triggered by initialization or a reset)
    if (state.needsRecalculation) {
        // Grab exactly the last 37 spins
        const recentSpins = spinHistory.slice(-37);
        
        // Tally columns and board halves
        const colCounts = { 1: 0, 2: 0, 3: 0 };
        let topHalfHits = 0;    // Tracks numbers 1-18
        let bottomHalfHits = 0; // Tracks numbers 19-36

        recentSpins.forEach(spin => {
            const num = spin.winningNumber;
            if (num !== 0) {
                // Tally Columns
                if (num % 3 === 1) colCounts[1]++;
                else if (num % 3 === 2) colCounts[2]++;
                else colCounts[3]++;

                // Tally Halves (to determine Top 6 vs Bottom 6 corners)
                if (num <= 18) topHalfHits++;
                else bottomHalfHits++;
            }
        });

        // Determine the Hottest Column
        let hotCol = 1;
        let maxColHits = colCounts[1];
        if (colCounts[2] > maxColHits) { hotCol = 2; maxColHits = colCounts[2]; }
        if (colCounts[3] > maxColHits) { hotCol = 3; maxColHits = colCounts[3]; }

        // Set the new targets based on the 37-spin data
        state.targetCol = hotCol;
        state.cornersHalf = topHalfHits >= bottomHalfHits ? 'top' : 'bottom';
        state.needsRecalculation = false; 
    }

    // Update lastBankroll for the next spin's calculations
    state.lastBankroll = bankroll;

    // 5. Define the Valid Corner Sets
    // Adjusted to fit the 11 actual vertical intersections on the roulette board.
    const cornersMap = {
        1: {
            top: [1, 4, 7, 10, 13, 16],    
            bottom: [16, 19, 22, 25, 28, 31] 
        },
        2: {
            top: [2, 5, 8, 11, 14, 17],    
            bottom: [17, 20, 23, 26, 29, 32] 
        },
        3: {
            // Overlaps Columns 2 & 3 to cover the 3rd Column
            top: [2, 5, 8, 11, 14, 17],
            bottom: [17, 20, 23, 26, 29, 32]
        }
    };

    const targetCorners = cornersMap[state.targetCol][state.cornersHalf];

    // 6. Calculate and Clamp Bet Amounts
    const baseColumnAmt = config.betLimits.minOutside;
    const baseCornerAmt = config.betLimits.min;

    let columnAmt = baseColumnAmt * state.multiplier;
    let cornerAmt = baseCornerAmt * state.multiplier;

    // Enforce casino limits
    columnAmt = Math.min(Math.max(columnAmt, config.betLimits.minOutside), config.betLimits.max);
    cornerAmt = Math.min(Math.max(cornerAmt, config.betLimits.min), config.betLimits.max);

    // 7. Construct and Return the Bets Array
    const bets = [];

    // Place the Main Column Bet
    bets.push({
        type: 'column',
        value: state.targetCol,
        amount: columnAmt
    });

    // Place the 6 "Jackpot" Corner Bets
    for (let i = 0; i < targetCorners.length; i++) {
        bets.push({
            type: 'corner',
            value: targetCorners[i],
            amount: cornerAmt
        });
    }

    return bets;
}