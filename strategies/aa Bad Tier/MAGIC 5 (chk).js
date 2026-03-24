/**
 * Strategy: "Magic Five" (Dual-Dozen Recovery Variant) https://www.youtube.com/watch?v=JmJjoJUK5VM&list=PLGUAp9smAZCCOtZ0fnP_tFSCw5fPzYNa5&index=127&t=115s
 * * The Logic:
 * - Base step: Covers 1 dozen (alternating 1st/3rd).
 * - On Loss: Adds the 2nd dozen pattern (Streets 13/16/19, Corner 20) and follows a custom multiplier progression.
 * - On target win ($20 increment): Resets progression and flips to the opposite dozen.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.currentDozen = 0; // Lock to 0 (1st Doz) to avoid overlap with 2nd Doz addition
        state.progIndex = 0;
        
        state.peakBankroll = bankroll;
        state.baseUnit = Math.max(1, config.betLimits.min);
        state.targetBankroll = state.peakBankroll + (20 * state.baseUnit); 
    }

    // Custom progression: Base(1), Dbl(2), +1(3), +1(4), Dbl(8), Dbl(16), Dbl(32)...
    const progSequence = [1, 2, 3, 4, 8, 16, 32, 64, 128, 256, 512, 1024];

    // 2. Process Previous Spin
    if (spinHistory.length > 0) {
        const lastResult = spinHistory[spinHistory.length - 1].winningNumber;

        let isWin = false;
        if (lastResult !== 0) {
            const hitDozen = Math.floor((lastResult - 1) / 12);
            
            // Check if our anchor dozen hit
            const uncoveredNum1 = (state.currentDozen * 12) + 10; 
            if (hitDozen === state.currentDozen && lastResult !== uncoveredNum1) {
                isWin = true;
            }

            // Check if our added 2nd dozen hit (only applies if we were in a loss state last spin)
            if (state.progIndex > 0) {
                const uncoveredNum2 = (1 * 12) + 10; // Uncovered num for 2nd doz is 22
                if (hitDozen === 1 && lastResult !== uncoveredNum2) {
                    isWin = true;
                }
            }
        }

        if (isWin) {
            // Only trigger full reset if we hit the $20 increment target
            if (bankroll >= state.targetBankroll) {
                state.peakBankroll = bankroll; // Current bankroll is the new peak
                state.targetBankroll = state.peakBankroll + (20 * state.baseUnit);
                state.progIndex = 0;
                // Switch to opposite dozen (1st -> 3rd, or 3rd -> 1st)
                state.currentDozen = state.currentDozen === 0 ? 2 : 0;
            }
        } else {
            // On loss, advance the progression
            state.progIndex = Math.min(state.progIndex + 1, progSequence.length - 1);
        }
    }

    // 3. Calculate Bets
    const multiplier = progSequence[state.progIndex];
    let streetAmt = state.baseUnit * multiplier;
    let cornerAmt = state.baseUnit * 2 * multiplier;

    streetAmt = Math.max(config.betLimits.min, Math.min(streetAmt, config.betLimits.max));
    cornerAmt = Math.max(config.betLimits.min, Math.min(cornerAmt, config.betLimits.max));

    let bets = [];

    // Helper to generate the Magic Five pattern dynamically
    function addDozenPattern(dozIndex) {
        const startNum = (dozIndex * 12) + 1;
        const cornerTopLeft = startNum + 7;
        
        bets.push({ type: 'street', value: startNum, amount: streetAmt });
        bets.push({ type: 'street', value: startNum + 3, amount: streetAmt });
        bets.push({ type: 'street', value: startNum + 6, amount: streetAmt });
        bets.push({ type: 'corner', value: cornerTopLeft, amount: cornerAmt });
    }

    // 4. Place Bets
    // Always place the initial pattern on the current anchor dozen
    addDozenPattern(state.currentDozen);

    // On loss (progIndex > 0), layer on the 2nd Dozen pattern
    if (state.progIndex > 0) {
        addDozenPattern(1); // 1 = 2nd Dozen. Generates streets 13, 16, 19 and corner 20.
    }

    return bets;
}