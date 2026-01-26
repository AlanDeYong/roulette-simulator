/**
 * Strategy: Never Lose Again Mighty Columns
 * Source: Mark Ganon (https://youtu.be/PWI3o74UTUs?si=tXjbJS5UeV4voKcU)
 * * THE LOGIC:
 * 1. Tracks the last 2 numbers that hit.
 * 2. Identifies the Column (1, 2, or 3) for each of those numbers.
 * 3. Bets on those two columns.
 * - Conflict Rule: If the last 2 numbers belong to the SAME column, 
 * the strategy bets on that column AND the "next" column in the sequence (1->2, 2->3, 3->1).
 * * THE PROGRESSION (Recovery Mode):
 * - This is an aggressive recovery system designed to grind back to a target.
 * - Conditions:
 * 1. If (Current Bankroll >= Session High Water Mark): 
 * RESET bet to Base Unit. Update High Water Mark.
 * 2. Else (Regardless of Win or Loss): 
 * INCREASE bet by 1 Unit.
 * * THE GOAL:
 * - Reach a new high water mark in bankroll (Session Profit) and reset.
 * * NOTE on 0/00: 
 * - If a zero appears in the history used for targeting, it defaults to Column 1 or 2 to ensure bets are always placed.
 */

function bet(spinHistory, bankroll, config, state) {
    // --- 1. Configuration & Constants ---
    const MIN_OUTSIDE = config.betLimits.minOutside;
    const MAX_BET = config.betLimits.max;
    
    // Helper to get column (0=None, 1=Col1, 2=Col2, 3=Col3)
    const getColumn = (num) => {
        if (num === null || num === undefined) return 0;
        const n = parseInt(num, 10);
        if (n === 0 || n === 37) return 0; // 0 or 00
        if (n % 3 === 1) return 1;
        if (n % 3 === 2) return 2;
        if (n % 3 === 0) return 3;
        return 0;
    };

    // --- 2. State Initialization ---
    if (state.sessionHigh === undefined) {
        state.sessionHigh = bankroll; // High water mark
    }
    if (state.progressionUnits === undefined) {
        state.progressionUnits = 1; // Start at 1 unit
    }
    if (state.hasBet === undefined) {
        state.hasBet = false;
    }

    // --- 3. Manage Progression ---
    // Only adjust progression if we have actually made a bet previously
    if (state.hasBet) {
        if (bankroll >= state.sessionHigh) {
            // TARGET REACHED: Reset
            state.progressionUnits = 1;
            state.sessionHigh = bankroll;
        } else {
            // TARGET MISSED (Win or Loss): Increase aggression
            state.progressionUnits += 1;
        }
    }

    // Update flag for next spin
    state.hasBet = true;

    // --- 4. Calculate Bet Amount ---
    let rawAmount = state.progressionUnits * MIN_OUTSIDE;
    
    // Clamp to limits
    let betAmount = Math.max(MIN_OUTSIDE, Math.min(MAX_BET, rawAmount));

    // --- 5. Determine Targets (The Logic) ---
    // Need at least 2 numbers to determine the specific columns.
    // If < 2 spins, we can either wait or default to Col 1 & 2. 
    // Ganon usually implies waiting for data, but for a sim, we often default to start action.
    let colA = 1;
    let colB = 2;

    if (spinHistory.length >= 2) {
        const lastNum = spinHistory[spinHistory.length - 1].winningNumber;
        const prevNum = spinHistory[spinHistory.length - 2].winningNumber;

        const c1 = getColumn(lastNum);
        const c2 = getColumn(prevNum);

        // Handle Zeros: If a zero was rolled, treat it as Column 1 (or any default) 
        // to maintain the mechanic, as 0 has no column.
        let target1 = c1 === 0 ? 1 : c1;
        let target2 = c2 === 0 ? 2 : c2;

        if (target1 === target2) {
            // Same column rule: Bet on the hit column, and the next one.
            // 1 -> 1&2
            // 2 -> 2&3
            // 3 -> 3&1
            colA = target1;
            colB = (target1 % 3) + 1; 
        } else {
            // Different columns: Bet on both
            colA = target1;
            colB = target2;
        }
    }

    // --- 6. Construct Bet Objects ---
    return [
        {
            type: 'column',
            value: colA,
            amount: betAmount
        },
        {
            type: 'column',
            value: colB,
            amount: betAmount
        }
    ];
}