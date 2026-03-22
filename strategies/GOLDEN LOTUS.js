/**
 * Strategy: Golden Lotus
 * Source: https://www.youtube.com/watch?v=T_7Bte4YFqQ (Bet With Mo)
 * 
 * The Logic: 
 * This strategy relies on covering a large section of the board using 3 Line bets (Double Streets)
 * as the core, and progressively adding Splits and Corner bets to cover gaps.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize state variables
    if (state.level === undefined) {
        state.level = 1;
        state.peakBankroll = bankroll;
        state.lastBankroll = bankroll;
    }

    // 2. Determine progression based on previous spin result
    if (spinHistory.length > 0) {
        if (bankroll > state.lastBankroll) {
            // Net Win: Drop down a level
            state.level = Math.max(1, state.level - 1);
            
            // Lock in profits: Reset to Level 1 if we hit a new session high
            if (bankroll > state.peakBankroll) {
                state.peakBankroll = bankroll;
                state.level = 1;
            }
        } else if (bankroll < state.lastBankroll) {
            // Net Loss: Move up a level
            state.level = Math.min(8, state.level + 1);
        }
    }
    
    state.lastBankroll = bankroll;

    // 3. Multiplier table for the 8 levels
    const levelData = {
        1: { lines: 2, innerSplits: 0, outerSplits: 0, corners: 0 },
        2: { lines: 4, innerSplits: 1, outerSplits: 0, corners: 0 },
        3: { lines: 6, innerSplits: 1, outerSplits: 1, corners: 0 },
        4: { lines: 8, innerSplits: 1, outerSplits: 1, corners: 1 },
        5: { lines: 10, innerSplits: 2, outerSplits: 2, corners: 2 },
        6: { lines: 12, innerSplits: 3, outerSplits: 3, corners: 3 },
        7: { lines: 16, innerSplits: 5, outerSplits: 5, corners: 5 },
        8: { lines: 22, innerSplits: 6, outerSplits: 6, corners: 5 } 
    };

    const multipliers = levelData[state.level];
    const u = config.betLimits.min; 
    const bets = [];

    // 4. Construct Bets
    if (multipliers.lines > 0) {
        let lineAmt = multipliers.lines * u;
        lineAmt = Math.min(config.betLimits.max, Math.max(u, lineAmt));
        
        bets.push({ type: 'line', value: 10, amount: lineAmt });
        bets.push({ type: 'line', value: 16, amount: lineAmt });
        bets.push({ type: 'line', value: 22, amount: lineAmt });
    }

    if (multipliers.innerSplits > 0) {
        let innerAmt = multipliers.innerSplits * u;
        [[8, 11], [11, 14], [26, 29], [29, 32]].forEach(split => {
            bets.push({ type: 'split', value: split, amount: innerAmt });
        });
    }

    if (multipliers.outerSplits > 0) {
        let outerAmt = multipliers.outerSplits * u;
        [[5, 8], [14, 17], [23, 26], [32, 35]].forEach(split => {
            bets.push({ type: 'split', value: split, amount: outerAmt });
        });
    }

    if (multipliers.corners > 0) {
        let cornerAmt = multipliers.corners * u;
        bets.push({ type: 'corner', value: 13, amount: cornerAmt });
        bets.push({ type: 'corner', value: 19, amount: cornerAmt });
    }

    return bets;
}