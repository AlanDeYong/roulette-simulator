/**
 * Roulette Strategy: Mirror Section Progression
 * * Source: https://www.youtube.com/watch?v=zoiGrfPGLdY&list=PLGUAp9smAZCCOtZ0fnP_tFSCw5fPzYNa5&index=2&t=272s
 * * The Logic:
 * This is a highly specific sectional strategy that covers distinct straight-up numbers 
 * and splits on one half of the board (top rows), and mirrors to the opposite half 
 * (bottom rows) upon resetting. 
 * - Starts by betting straight numbers (3, 4, 8, 12, 13) and splits (2/5, 6/9, 7/10, 11/14).
 * - It dynamically mirrors positions on reset (e.g., 3 becomes 36, 2/5 becomes 32/35).
 * * The Progression:
 * The bet unit progression follows a rigorous 8-step sequence based on consecutive losses:
 * - Level 0: 1 unit on base straight, 1 unit on base splits.
 * - Level 1 (Loss): Add secondary straight bets (1u), add secondary splits (1u). Increase base splits by 1u.
 * - Level 2 (Loss): Increase ALL bets by 1 unit.
 * - Level 3 (Loss): Increase ALL split bets by 1 unit.
 * - Level 4 (Loss): Increase ALL bets by 1 unit.
 * - Level 5 (Loss): Increase ALL split bets by 1 unit.
 * - Level 6 (Loss): Double all units.
 * - Level 7 (Loss): Double all units again.
 * - Upon a win: If the session high bankroll is NOT reached (still in drawdown), rebet at current level.
 * - Upon a win AND session high is reached (or on loss exceeding level 7): Reset progression and flip to the opposite side of the table.
 * * The Goal:
 * To systematically hit clustered sections of the board using a controlled mixed-progression 
 * approach, capitalizing on winning streaks to reach new session highs.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.initialized) {
        state.side = 'left';
        state.level = 0;
        state.sessionHigh = bankroll;
        state.lastBankroll = bankroll;
        state.initialized = true;

        // Helper to geometrically mirror a number across the middle of the board (Row N -> Row 13-N)
        const mirror = (n) => {
            if (n === 0) return 0;
            const row = Math.ceil(n / 3);
            const col = n % 3 === 0 ? 3 : n % 3;
            const mirroredRow = 13 - row;
            return (mirroredRow - 1) * 3 + col;
        };

        // Base sets (Left side)
        const leftS1 = [3, 4, 8, 12, 13];
        const leftSp1 = [[2, 5], [6, 9], [7, 10], [11, 14]];
        const leftS2 = [17, 21, 22, 26];
        const leftSp2 = [[15, 18], [16, 19], [20, 23], [24, 27], [25, 28]];

        // Precompute layouts to avoid recalculating on every spin
        state.layouts = {
            left: {
                s1: leftS1,
                sp1: leftSp1,
                s2: leftS2,
                sp2: leftSp2
            },
            right: {
                s1: leftS1.map(mirror),
                sp1: leftSp1.map(pair => pair.map(mirror).sort((a, b) => a - b)),
                s2: leftS2.map(mirror),
                sp2: leftSp2.map(pair => pair.map(mirror).sort((a, b) => a - b))
            }
        };

        // Progression lookup table for units: [S1, Sp1, S2, Sp2]
        state.unitsMap = [
            [1, 1, 0, 0],   // L0: Base
            [1, 2, 1, 1],   // L1: Loss 1 (Add S2/Sp2 at 1u, base Sp1 becomes 2u)
            [2, 3, 2, 2],   // L2: Loss 2 (Increase all bets by 1u)
            [2, 4, 2, 3],   // L3: Loss 3 (Increase all split bets by 1u)
            [3, 5, 3, 4],   // L4: Loss 4 (Increase all bets by 1u)
            [3, 6, 3, 5],   // L5: Loss 5 (Increase all split bets by 1u)
            [6, 12, 6, 10], // L6: Loss 6 (Double all units)
            [12, 24, 12, 20]// L7: Loss 7 (Double all units)
        ];
    }

    // 2. Evaluate previous spin outcome
    if (spinHistory.length > 0) {
        const isWin = bankroll > state.lastBankroll;

        if (isWin) {
            if (bankroll >= state.sessionHigh) {
                // Session high reached: Reset level and flip sides
                state.level = 0;
                state.side = state.side === 'left' ? 'right' : 'left';
            } else {
                // In drawdown, rebet: level remains unchanged
            }
        } else {
            // Loss: Progress sequence
            state.level++;
            
            // If we exceed our mapped progression, reset to protect bankroll
            if (state.level >= state.unitsMap.length) {
                state.level = 0;
                state.side = state.side === 'left' ? 'right' : 'left';
            }
        }
    }

    // Update tracking metrics
    if (bankroll > state.sessionHigh) {
        state.sessionHigh = bankroll;
    }
    state.lastBankroll = bankroll;

    // 3. Build Bets for current spin
    const baseUnit = config.betLimits.min; 
    const currentUnits = state.unitsMap[state.level];
    const layout = state.layouts[state.side];
    const bets = [];

    // Helper to format and clamp bets
    const placeBets = (targets, type, units) => {
        if (units === 0) return;

        let amount = units * baseUnit;
        amount = Math.max(amount, config.betLimits.min);
        amount = Math.min(amount, config.betLimits.max);

        targets.forEach(val => {
            bets.push({ type: type, value: val, amount: amount });
        });
    };

    // Construct the active payload
    placeBets(layout.s1, 'number', currentUnits[0]); // Base straight numbers
    placeBets(layout.sp1, 'split', currentUnits[1]); // Base splits
    placeBets(layout.s2, 'number', currentUnits[2]); // Secondary straight numbers
    placeBets(layout.sp2, 'split', currentUnits[3]); // Secondary splits

    return bets;
}