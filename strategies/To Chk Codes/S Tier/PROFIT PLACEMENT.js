/**
 * STRATEGY: PROFIT PLACEMENT (Refined 8-Level System)
 * * * Source: https://www.youtube.com/watch?v=x27A5NY-BrU (Channel: Bet With Mo)
 * * * THE LOGIC:
 * 1. Layouts: Alternates between "Left Side" and "Right Side" split sets. 
 * Always includes a 1-unit bet on Number 0.
 * 2. Side Switching: Switches betting sides (Left vs. Right) every time the 
 * progression resets to Level 1 (after a win or a completed Rebet Phase).
 * 3. The "Rebet" Rule: If a win occurs at Level 3 or higher, the system rebets 
 * one time at the current level but removes the specific split that just won. 
 * After this rebet spin, it resets to Level 1 and switches sides.
 * * * THE PROGRESSION:
 * - Levels 1-6: On loss, increase all split bets by 1 base unit (Arithmetical).
 * - Levels 7-8: Double the previous bet amount (7th loss -> 12u, 8th loss -> 24u).
 * - Win (Level 1-2): Reset to Level 1 and switch sides.
 * - Win (Level 3-8): Trigger the "Rebet Phase" (remove winning split for 1 spin), 
 * then reset/switch.
 * * * THE GOAL:
 * - To exploit wheel variance by switching coverage and using a aggressive 
 * late-stage recovery progression.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. Initialize State (Rule 6) ---
    if (!state.initialized) {
        state.level = 1;
        state.side = 'left'; 
        state.rebetPhase = false;
        state.excludeSplit = null;
        state.lastBets = [];
        state.initialized = true;
    }

    // --- 2. Process History (Rule 7) ---
    if (spinHistory.length > 0) {
        const lastResult = spinHistory[spinHistory.length - 1];
        const lastWinNum = lastResult.winningNumber;

        // Determine if previous bet was a win
        let wonLastSpin = false;
        let winningSplitValue = null;

        for (const b of state.lastBets) {
            // Check Number 0 or the Splits
            if (b.type === 'number' && lastWinNum === b.value) wonLastSpin = true;
            if (b.type === 'split' && Array.isArray(b.value) && b.value.includes(lastWinNum)) {
                wonLastSpin = true;
                winningSplitValue = b.value;
            }
        }

        // Logic Transitions
        if (state.rebetPhase) {
            // One-time rebet spin is over: Reset and Flip side
            state.level = 1;
            state.side = state.side === 'left' ? 'right' : 'left';
            state.rebetPhase = false;
            state.excludeSplit = null;
        } 
        else if (wonLastSpin) {
            if (state.level >= 3) {
                // High-level win: Enter rebet phase (remove winning split)
                state.rebetPhase = true;
                state.excludeSplit = winningSplitValue;
            } else {
                // Low-level win: Reset immediately
                state.level = 1;
                state.side = state.side === 'left' ? 'right' : 'left';
            }
        } 
        else {
            // Loss: Move to next level in the 8-level system
            state.level++;
            if (state.level > 8) state.level = 1; // Safety loop
            state.excludeSplit = null;
        }
    }

    // --- 3. Define Split Layouts ---
    const leftSplits = [
        [2, 5], [3, 6], [7, 10], [8, 11], [14, 17], 
        [15, 18], [19, 22], [20, 23], [26, 29], [27, 30]
    ];
    
    const rightSplits = [
        [9, 12], [8, 11], [13, 16], [14, 17], [20, 23], 
        [21, 24], [25, 28], [26, 29], [32, 35], [33, 36]
    ];

    const activeSplits = state.side === 'left' ? leftSplits : rightSplits;

    // --- 4. Calculate Bet Amounts (Rule 5 - Respect Limits) ---
    const minInside = config.betLimits.min;
    
    // Progression Logic: 1, 2, 3, 4, 5, 6, 12, 24 units
    let multiplier = state.level;
    if (state.level === 7) multiplier = 12;
    if (state.level === 8) multiplier = 24;

    let splitAmount = minInside * multiplier;
    
    // Clamp to table limits (Rule 5)
    splitAmount = Math.max(splitAmount, config.betLimits.min);
    splitAmount = Math.min(splitAmount, config.betLimits.max);

    // --- 5. Construct Bet Array (Rule 3) ---
    const bets = [];

    // Rule: Always 1 unit on the zero
    bets.push({ type: 'number', value: 0, amount: minInside });

    // Add Split Bets
    for (const val of activeSplits) {
        // Rule: Remove winning split during Rebet Phase
        if (state.rebetPhase && state.excludeSplit && 
            state.excludeSplit[0] === val[0] && state.excludeSplit[1] === val[1]) {
            continue;
        }

        if (bankroll >= splitAmount) {
            bets.push({
                type: 'split',
                value: val,
                amount: splitAmount
            });
        }
    }

    state.lastBets = bets;
    return bets;
}