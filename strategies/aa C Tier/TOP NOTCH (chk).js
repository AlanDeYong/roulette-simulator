/**
 * ROULETTE STRATEGY: Top Notch (Custom Modified)
 * Source: https://youtu.be/BdRv0FIx9uw (Bet With Mo)
 * 
 * The Logic:
 * The strategy places multiple split bets across 30 numbers to maintain high coverage.
 * It tracks an internal progression state. It defines a "Standard" sequence starting from 
 * the 1st dozen moving up, and a "Mirrored" sequence starting from the 3rd dozen moving down.
 * 
 * The Progression:
 * - Level 1: 1 unit on splits 1/4, 5/8, 3/6
 * - Level 2 (Loss): Add 1 unit to new splits 7/10, 11/14, 9/12
 * - Level 3 (Loss): Add 1 unit to splits 13/16, 17/20, 15/18. +1 unit to all existing bets.
 * - Level 4 (Loss): Add 2 units to splits 19/22, 23/26, 21/24. +1 unit to all existing bets.
 * - Level 5 (Loss): Add 3 units to splits 25/28, 29/32, 27/30. Double all existing bets.
 * - Level 6+ (Loss): Double all existing bets.
 * - Win (Profit Not Reached): Rebet identical amounts from the previous spin.
 * 
 * The Goal:
 * Target session profit is 20 units. Once reached, the level resets to 1, and the strategy 
 * mirrors the bet placement to start from the opposite side of the table.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const unit = config.betLimits.min; 
    const profitTargetUnits = 20;

    // Define the 6 blocks of splits covering the board
    const blocks = {
        1: [ [1,4], [5,8], [3,6] ],
        2: [ [7,10], [11,14], [9,12] ],
        3: [ [13,16], [17,20], [15,18] ],
        4: [ [19,22], [23,26], [21,24] ],
        5: [ [25,28], [29,32], [27,30] ],
        6: [ [31,34], [32,35], [33,36] ]
    };

    // Helper to get blocks based on side (Standard: 1->5, Mirrored: 6->2)
    function getBlock(levelIndex, side) {
        return side === 'standard' ? blocks[levelIndex] : blocks[7 - levelIndex];
    }

    // Initialize State
    if (!state.init) {
        state.init = true;
        state.side = 'standard';
        state.level = 1;
        state.profitGoal = bankroll + (profitTargetUnits * unit);
        state.activeBets = []; // stores { splits: [a,b], units: X }
        state.lastPlacedBets = [];
    }

    // Evaluate previous spin outcome
    let won = false;
    if (spinHistory.length > 0 && state.lastPlacedBets.length > 0) {
        const lastNum = spinHistory[spinHistory.length - 1].winningNumber;
        won = state.lastPlacedBets.some(b => b.value.includes(lastNum));
    }

    // Progression Engine
    if (spinHistory.length === 0 || (won && bankroll >= state.profitGoal)) {
        // Initial Spin OR Profit Goal Reached -> Reset and Mirror
        if (spinHistory.length > 0) {
            state.side = state.side === 'standard' ? 'mirrored' : 'standard';
            state.profitGoal = bankroll + (profitTargetUnits * unit);
        }
        state.level = 1;
        state.activeBets = getBlock(1, state.side).map(s => ({ splits: s, units: 1 }));

    } else if (won && bankroll < state.profitGoal) {
        // Win but profit not reached -> Rebet (Do nothing to state.activeBets)
    } else if (!won) {
        // Loss -> Progress level
        if (state.level === 1) {
            state.level = 2;
            state.activeBets.push(...getBlock(2, state.side).map(s => ({ splits: s, units: 1 })));
        } else if (state.level === 2) {
            state.level = 3;
            // Add new splits first, THEN increase all by 1 unit
            state.activeBets.push(...getBlock(3, state.side).map(s => ({ splits: s, units: 1 })));
            state.activeBets.forEach(b => b.units += 1);
        } else if (state.level === 3) {
            state.level = 4;
            // Add new splits first, THEN increase all by 1 unit
            state.activeBets.push(...getBlock(4, state.side).map(s => ({ splits: s, units: 2 })));
            state.activeBets.forEach(b => b.units += 1);
        } else if (state.level === 4) {
            state.level = 5;
            // Add new splits first, THEN double all
            state.activeBets.push(...getBlock(5, state.side).map(s => ({ splits: s, units: 3 })));
            state.activeBets.forEach(b => b.units *= 2);
        } else if (state.level >= 5) {
            state.level++;
            state.activeBets.forEach(b => b.units *= 2);
        }
    }

    // Compile Output Bets
    const bets = [];
    state.activeBets.forEach(b => {
        let amount = b.units * unit;
        amount = Math.max(amount, config.betLimits.min);
        amount = Math.min(amount, config.betLimits.max);
        
        bets.push({
            type: 'split',
            value: b.splits,
            amount: amount
        });
    });

    state.lastPlacedBets = bets;
    return bets;
}