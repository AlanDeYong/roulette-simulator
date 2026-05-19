/**
 * SOURCE:
 * Channel: Bet With Mo (Modified)
 * Video: SUPER SAFE - ROULETTE STRATEGY FOR LOW ROLLERS
 *
 * THE LOGIC:
 * A high-coverage strategy utilizing Column and Corner bets across two modes.
 * - Mode "Up": Bets on Columns 2 & 3, and Corners starting at 2.
 * - Mode "Down": Bets on Columns 1 & 2, and Corners starting at 1.
 * * Non-Overlapping Corners:
 * - To prevent overlaps, corners are spaced 2 rows apart (step size of 6). 
 * - Up Mode Corners: 2 (covers 2,3,5,6), 8 (8,9,11,12), 14 (14,15,17,18), 20 (20,21,23,24).
 * - Down Mode Corners: 1 (covers 1,2,4,5), 7 (7,8,10,11), 13 (13,14,16,17), 19 (19,20,22,23).
 * * Triggers & Conditions:
 * - Full Loss (Hit Nothing): Move to the next level in the progression.
 * - Small Loss / Push (Hit Column only, Net Profit = 0): Stay at current level. After 2 consecutive pushes, move to the next level.
 * - Win (Hit Corner): 
 * - If in session profit: Reset to Level 0.
 * - If NOT in session profit: Reduce progression by 1 level down.
 *
 * THE PROGRESSION:
 * - Level 0: Cols (1u each), 1 Corner (1u).
 * - Level 1 (1st Loss): Cols (+1u = 2u each), Add Corner (Total 2 non-overlapping corners at 1u each).
 * - Level 2 (2nd Loss): Add Corner, Cols (+1u), Double All. Cols (6u each), 3 Corners (2u each).
 * - Level 3 (3rd Loss): Add Corner (at 2u), Cols (+2u), Double All. Cols (16u each), 4 Corners (4u each).
 * - Level 4 (4th Loss): Increase all bets by 2 units. Cols (18u each), 4 Corners (6u each).
 * - Level 5 (5th Loss): Double up all bets. Cols (36u each), 4 Corners (12u each).
 * - Level 6 (6th Loss): Double up all bets. Cols (72u each), 4 Corners (24u each).
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State and Progression Matrix
    if (state.level === undefined) {
        state.level = 0;
        state.pushCount = 0;
        state.mode = 'up'; // 'up' or 'down'
        state.baselineBankroll = bankroll; // Tracks high-water mark for session profit
    }

    // Progression Matrix
    const progression = [
        { cols: 1, corners: 1, cornerBet: 1 },   // Level 0
        { cols: 2, corners: 2, cornerBet: 1 },   // Level 1
        { cols: 6, corners: 3, cornerBet: 2 },   // Level 2
        { cols: 16, corners: 4, cornerBet: 4 },  // Level 3
        { cols: 18, corners: 4, cornerBet: 6 },  // Level 4
        { cols: 36, corners: 4, cornerBet: 12 }, // Level 5
        { cols: 72, corners: 4, cornerBet: 24 }  // Level 6
    ];

    const unit = Math.max(config.betLimits.minOutside, config.betLimits.min);

    // 2. Analyze Last Result to Update Progression
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNumber = lastSpin.winningNumber;
        
        const lastCols = state.mode === 'up' ? [2, 3] : [1, 2];
        const hitColumn = (lastNumber !== 0) && (
            (lastNumber % 3 === 0 && lastCols.includes(3)) || 
            (lastNumber % 3 === 2 && lastCols.includes(2)) || 
            (lastNumber % 3 === 1 && lastCols.includes(1))
        );

        const activeProgression = progression[state.level];
        const cornerStart = state.mode === 'up' ? 2 : 1;
        // Step size of 6 guarantees corners are separated by a full row, avoiding all overlap.
        // e.g., 1 (covers 1,2,4,5) and 7 (covers 7,8,10,11).
        const cornerStep = 6; 
        
        let hitCorner = false;
        for (let i = 0; i < activeProgression.corners; i++) {
            let tl = cornerStart + (i * cornerStep); 
            let coveredByCorner = [tl, tl + 1, tl + 3, tl + 4];
            if (coveredByCorner.includes(lastNumber)) {
                hitCorner = true;
                break;
            }
        }

        let result = 'loss';
        if (hitCorner) {
            result = 'win'; 
        } else if (hitColumn) {
            result = 'push'; 
        }

        // Apply State Rules based on Result
        if (result === 'win') {
            if (bankroll > state.baselineBankroll) {
                // In session profit: Reset
                state.level = 0;
                state.pushCount = 0;
                state.baselineBankroll = bankroll; 
                state.mode = state.mode === 'up' ? 'down' : 'up'; 
            } else {
                // Not in session profit: Reduce by 1 level
                state.level = Math.max(0, state.level - 1);
                state.pushCount = 0;
            }
        } else if (result === 'push') {
            // Small Loss (Push)
            state.pushCount++;
            if (state.pushCount >= 2) {
                state.level++;
                state.pushCount = 0;
            }
        } else {
            // Full Loss
            state.level++;
            state.pushCount = 0;
        }

        // Safety cap
        if (state.level >= progression.length) {
            state.level = 0;
            state.pushCount = 0;
            state.baselineBankroll = bankroll;
        }
    } else {
        state.baselineBankroll = bankroll;
    }

    // 3. Generate Bets for Current Level
    const currentProg = progression[state.level];
    let bets = [];

    let colAmount = currentProg.cols * unit;
    colAmount = Math.max(colAmount, config.betLimits.minOutside);
    colAmount = Math.min(colAmount, config.betLimits.max);

    let cornerAmount = currentProg.cornerBet * unit;
    cornerAmount = Math.max(cornerAmount, config.betLimits.min);
    cornerAmount = Math.min(cornerAmount, config.betLimits.max);

    // Place Column Bets
    if (state.mode === 'up') {
        bets.push({ type: 'column', value: 2, amount: colAmount });
        bets.push({ type: 'column', value: 3, amount: colAmount });
    } else {
        bets.push({ type: 'column', value: 1, amount: colAmount });
        bets.push({ type: 'column', value: 2, amount: colAmount });
    }

    // Place Non-Overlapping Corner Bets
    const cornerStart = state.mode === 'up' ? 2 : 1;
    const cornerStep = 6; 
    
    for (let i = 0; i < currentProg.corners; i++) {
        let cornerTopLeft = cornerStart + (i * cornerStep);
        bets.push({ type: 'corner', value: cornerTopLeft, amount: cornerAmount });
    }

    // 4. Final Bankroll Check
    let totalBetCost = (colAmount * 2) + (cornerAmount * currentProg.corners);
    if (totalBetCost > bankroll) {
        return []; 
    }

    return bets;
}