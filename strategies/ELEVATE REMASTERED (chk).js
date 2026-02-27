/**
 * Strategy: Elevate Remastered (Precise Coordinates)
 * Source: https://www.youtube.com/watch?v=hB3baI4r2fE (Bet With Mo)
 *
 * The Logic:
 * Bets are placed on 3 fixed double streets (lines 4-9, 16-21, 28-33) and 9 inside bets 
 * that shift across the grid depending on the progression level. 
 *
 * The Progression:
 * Advances to the next level strictly on a loss.
 * Level 1: Lines: 3 units each. Splits: 1 unit each on specific column 1 splits.
 * Level 2: Lines: 6 units each. Splits: 1 unit each on specific column 2 splits.
 * Level 3: Lines: 9 units each. Splits: 1 unit each on specific column 3 splits.
 * Level 4: Lines: 12 units each. Corners: 1 unit each on specific lower-row corners.
 * Level 5: Lines: 15 units each. Corners: 1 unit each on specific middle-row corners.
 * Level 6: Doubles Level 5 (Lines: 30 units each. Corners: 2 units each).
 * Level 7: Doubles Level 6 (Lines: 60 units each. Corners: 4 units each).
 *
 * The Goal:
 * Achieve a win to immediately reset the progression to Level 1. 
 * A loss at Level 7 acts as a stop-loss, resetting the cycle.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (state.level === undefined) {
        state.level = 1;
        state.lastBankroll = bankroll;
    }

    // 2. Determine Progression (Reset on Win, Advance on Loss)
    if (spinHistory.length > 0) {
        if (bankroll > state.lastBankroll) {
            // Net profit on the last spin -> Win -> Reset
            state.level = 1;
        } else if (bankroll < state.lastBankroll) {
            // Net loss on the last spin -> Loss -> Advance
            state.level++;
            if (state.level > 7) {
                state.level = 1; // Stop-loss reset
            }
        }
        // If bankroll === state.lastBankroll (Push), level remains unchanged.
    }

    state.lastBankroll = bankroll;

    // 3. Define Bet Multipliers per Level { lineUnit, insideUnit }
    const increments = {
        1: { line: 3, inside: 1 },
        2: { line: 6, inside: 1 },
        3: { line: 9, inside: 1 },
        4: { line: 12, inside: 1 },
        5: { line: 15, inside: 1 },
        6: { line: 30, inside: 2 },
        7: { line: 60, inside: 4 }
    };

    const currentInc = increments[state.level];
    const u = config.betLimits.min;

    // 4. Calculate and Clamp Bet Amounts
    const lineAmount = Math.min(Math.max(u * currentInc.line, config.betLimits.min), config.betLimits.max);
    const insideAmount = Math.min(Math.max(u * currentInc.inside, config.betLimits.min), config.betLimits.max);

    const bets = [];

    // 5. Place Fixed Double Streets (Lines)
    // Value is the starting number of the line
    bets.push({ type: 'line', value: 4, amount: lineAmount });  // Covers 4-9
    bets.push({ type: 'line', value: 16, amount: lineAmount }); // Covers 16-21
    bets.push({ type: 'line', value: 28, amount: lineAmount }); // Covers 28-33

    // 6. Place Shifting Inside Bets
    if (state.level === 1) {
        const splits = [[1,4], [4,7], [7,10], [13,16], [16,19], [19,22], [25,28], [28,31], [31,34]];
        splits.forEach(s => bets.push({ type: 'split', value: s, amount: insideAmount }));
    } 
    else if (state.level === 2) {
        const splits = [[2,5], [5,8], [8,11], [14,17], [17,20], [20,23], [26,29], [29,32], [32,35]];
        splits.forEach(s => bets.push({ type: 'split', value: s, amount: insideAmount }));
    } 
    else if (state.level === 3) {
        const splits = [[3,6], [6,9], [9,12], [15,18], [18,21], [21,24], [27,30], [30,33], [33,36]];
        splits.forEach(s => bets.push({ type: 'split', value: s, amount: insideAmount }));
    } 
    else if (state.level === 4) {
        // Corner value uses the top-left number of the 4-number block
        const corners = [1, 4, 7, 13, 16, 19, 25, 28, 31];
        corners.forEach(c => bets.push({ type: 'corner', value: c, amount: insideAmount }));
    } 
    else if (state.level >= 5 && state.level <= 7) {
        const corners = [2, 5, 8, 14, 17, 20, 26, 29, 32];
        corners.forEach(c => bets.push({ type: 'corner', value: c, amount: insideAmount }));
    }

    return bets;
}