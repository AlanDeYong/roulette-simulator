/**
 * 6x6 Roulette Strategy (Modified Recovery Floor)
 * * Source: Bet With Mo (https://www.youtube.com/watch?v=qqYjF7DEArQ)
 * * The Logic:
 * - Bets are placed on up to 4 Double Streets (Lines) and their corresponding top-right Corners.
 * - The sequence systematically covers the board either from Left-to-Right (Forward) 
 * or Right-to-Left (Backward) depending on the session cycle.
 * * The Progression (8-Level Sequence):
 * - Level 1: 2 units on DS 1-6, 1 unit on Corner 2-6.
 * - Level 2 (Loss): Rebet + add 2u on DS 7-12, 1u on Corner 8-12.
 * - Level 3 (Loss): Rebet + add 2u on DS 13-18, 1u on Corner 14-18, then double all bets.
 * - Level 4 (Loss): Rebet + add 4u on DS 19-24, 2u on Corner 20-24.
 * - Level 5 (Loss): Rebet and double up all bets.
 * - Level 6 (Loss): Rebet and add 2u to all active DS bets and 1u to all active corner bets.
 * - Level 7 (Loss): Rebet and double up all bets.
 * - Level 8 (Loss): Rebet and double up all bets.
 * - On Push: Rebet current level and spin.
 * - On Win (below goal): Reduce progression by 1 level. *MODIFIED: If at Level 4 or higher, the progression will not drop below Level 4.*
 * - On Win (at goal): Reset progression to Level 1 and start from the opposite side of the table.
 * * The Goal:
 * - Target a strict +20 unit profit per session cycle before resetting and swapping sides.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const unit = config.betLimits.min;
    const targetProfitUnits = 20;

    // Board configurations
    const posForward = [
        { l: 1, c: 2 },   // DS 1/6, Corner 2/6
        { l: 7, c: 8 },   // DS 7/12, Corner 8/12
        { l: 13, c: 14 }, // DS 13/18, Corner 14/18
        { l: 19, c: 20 }  // DS 19/24, Corner 20/24
    ];

    const posBackward = [
        { l: 31, c: 32 }, // DS 31/36, Corner 32/36
        { l: 25, c: 26 }, // DS 25/30, Corner 26/30
        { l: 19, c: 20 }, // DS 19/24, Corner 20/24
        { l: 13, c: 14 }  // DS 13/18, Corner 14/18
    ];

    // Progression Matrix: Defines the exact [lineUnits, cornerUnits] for each active position at every level
    const levelRatios = {
        1: [ [2,1] ],
        2: [ [2,1], [2,1] ],
        3: [ [4,2], [4,2], [4,2] ],
        4: [ [4,2], [4,2], [4,2], [4,2] ],
        5: [ [8,4], [8,4], [8,4], [8,4] ],
        6: [ [10,5], [10,5], [10,5], [10,5] ],
        7: [ [20,10], [20,10], [20,10], [20,10] ],
        8: [ [40,20], [40,20], [40,20], [40,20] ]
    };

    // Initialize State
    if (!state.level) {
        state.level = 1;
        state.direction = 'forward';
        state.profitGoal = bankroll + (targetProfitUnits * unit);
    }

    // Process previous spin results
    if (spinHistory.length > 0 && state.lastBets) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const hitNum = lastSpin.winningNumber;
        
        let totalBet = 0;
        let totalReturn = 0;
        
        // Calculate Payout
        state.lastBets.forEach(b => {
            totalBet += b.amount;
            if (b.type === 'line') {
                if (hitNum >= b.value && hitNum <= b.value + 5) {
                    totalReturn += b.amount * 6; // 5:1 payout returns 6x stake
                }
            } else if (b.type === 'corner') {
                const v = b.value;
                const covered = [v, v + 1, v + 3, v + 4]; // Standard European corner math
                if (covered.includes(hitNum)) {
                    totalReturn += b.amount * 9; // 8:1 payout returns 9x stake
                }
            }
        });
        
        const netProfit = totalReturn - totalBet;

        // Apply rules based on outcome
        if (netProfit > 0) {
            // Win condition
            if (bankroll >= state.profitGoal) {
                // At session profit: Reset and swap side
                state.level = 1;
                state.direction = state.direction === 'forward' ? 'backward' : 'forward';
                state.profitGoal = bankroll + (targetProfitUnits * unit);
            } else {
                // Not at session profit: Reduce by one level, but apply Level 4 floor if deep in progression
                if (state.level >= 4) {
                    state.level = Math.max(4, state.level - 1);
                } else {
                    state.level = Math.max(1, state.level - 1);
                }
            }
        } else if (netProfit < 0) {
            // Loss condition: Advance level (capped at 8)
            state.level = Math.min(8, state.level + 1);
        }
        // If netProfit === 0 (Push): Do nothing to state.level, naturally rebets.
    }

    // Generate New Bets
    const currentBets = [];
    const ratios = levelRatios[state.level];
    const positions = state.direction === 'forward' ? posForward : posBackward;

    for (let i = 0; i < ratios.length; i++) {
        let lineAmount = ratios[i][0] * unit;
        let cornerAmount = ratios[i][1] * unit;
        
        // Clamp to limits
        lineAmount = Math.max(config.betLimits.min, Math.min(lineAmount, config.betLimits.max));
        cornerAmount = Math.max(config.betLimits.min, Math.min(cornerAmount, config.betLimits.max));
        
        currentBets.push({ type: 'line', value: positions[i].l, amount: lineAmount });
        currentBets.push({ type: 'corner', value: positions[i].c, amount: cornerAmount });
    }

    // Save for next evaluation
    state.lastBets = currentBets;

    return currentBets;
}