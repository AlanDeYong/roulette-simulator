/**
 * Strategy: Overlap (9-Level Progression)
 * Source: https://youtu.be/qpG4RrcSh3s?si=hkaPcMsw78oqTWzA (Bet With Mo)
 *
 * The Logic: 
 * The strategy spans the roulette board by pairing Double Street (line) bets with overlapping 
 * Corner bets. It relies on concentrating value on the overlapping numbers. The sequence covers 
 * up to 4 distinct sections of the board sequentially.
 * * The Progression:
 * - Level 1: 1 Line, 1 Corner
 * - Level 2: 2 Lines, 2 Corners
 * - Level 3: 3 Lines, 3 Corners
 * - Level 4: 4 Lines, 4 Corners
 * - Level 5: Add 1 base unit to all existing bets.
 * - Level 6: Add 4 units to lines, 2 units to corners.
 * - Level 7: Double all bets from Level 6.
 * - Level 8: Add 8 units to lines, 4 units to corners.
 * - Level 9: Double all bets from Level 8 (Fail-safe all-in).
 * * The Goal: 
 * To reach a net positive profit compared to the reference bankroll at the start of the sequence.
 * - Win + Profit > Reference Bankroll = Reset to Level 1.
 * - Loss = Increase Level (+1).
 * - Win + Profit < Reference Bankroll = Stay at current level to grind back.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const baseUnit = config.betLimits.min;
    
    // 1. Initialize State
    if (!state.level) {
        state.level = 1;
        state.referenceBankroll = bankroll;
        state.lastBankroll = bankroll;
    }

    // 2. Evaluate previous spin to determine level
    if (spinHistory.length > 0) {
        if (bankroll > state.referenceBankroll) {
            // Overall profit achieved, reset progression
            state.level = 1;
            state.referenceBankroll = bankroll;
        } else if (bankroll < state.lastBankroll) {
            // Loss on the last spin, advance progression
            state.level = Math.min(state.level + 1, 9);
        }
        // If we won the last spin but are still negative overall, we stay at the current level.
    }
    
    // Update tracking bankroll for the next spin's comparison
    state.lastBankroll = bankroll;

    // 3. Determine Multipliers based on Current Level
    let lineMulti = 4;
    let cornerMulti = 2;
    let numPositions = Math.min(state.level, 4); // Caps active board positions at 4

    if (state.level === 5) {
        lineMulti = 5;       // +1 to all
        cornerMulti = 3;
    } else if (state.level === 6) {
        lineMulti = 9;       // Previous + 4
        cornerMulti = 5;     // Previous + 2
    } else if (state.level === 7) {
        lineMulti = 18;      // Double Level 6
        cornerMulti = 10;
    } else if (state.level === 8) {
        lineMulti = 26;      // Previous + 8
        cornerMulti = 14;    // Previous + 4
    } else if (state.level === 9) {
        lineMulti = 52;      // Double Level 8
        cornerMulti = 28;
    }

    // 4. Calculate Limits-Compliant Bet Amounts
    let lineBetAmount = Math.max(lineMulti * baseUnit, config.betLimits.min);
    lineBetAmount = Math.min(lineBetAmount, config.betLimits.max);
    
    let cornerBetAmount = Math.max(cornerMulti * baseUnit, config.betLimits.min);
    cornerBetAmount = Math.min(cornerBetAmount, config.betLimits.max);

    // 5. Define Position Coordinates [Line Start, Corner Start]
    const positions = [
        [4, 1],
        [13, 10],
        [22, 19],
        [31, 28]
    ];

    // 6. Construct Bet Array
    let currentBets = [];
    
    for (let i = 0; i < numPositions; i++) {
        currentBets.push({ type: 'line', value: positions[i][0], amount: lineBetAmount });
        currentBets.push({ type: 'corner', value: positions[i][1], amount: cornerBetAmount });
    }

    return currentBets;
}