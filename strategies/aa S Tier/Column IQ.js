/**
 * Strategy: Column IQ (Aggressive / No-Wait Variant)
 * Source: "The Roulette Master" YouTube Channel - Video: https://www.youtube.com/watch?v=wHhD5Jsron0
 *
 * Logic:
 * 1. Triggers:
 * - Wait for 2 consecutive spins of the SAME color.
 * - If Black/Black: Bet on Red-heavy columns (Column 1 & Column 3).
 * - If Red/Red: Bet on Black-heavy columns (Column 1 & Column 2).
 *
 * 2. Progression (Aggressive):
 * - Triple Martingale (1 unit -> 3 units -> 9 units...).
 * - If a LOSS occurs (non-zero): Do NOT wait for a new trigger. Immediately bet the next progression level on the SAME columns.
 * - If a WIN occurs: Reset to base unit and wait for a NEW 2-color trigger.
 * - If ZERO hits: Treat as a push financially (though it's a loss). Repeat the EXACT same bet amount on the same columns for the next spin. Do not increase the multiplier.
 *
 * 3. Goal:
 * - Profit consistently by exploiting column color weights while covering ~64% of the board.
 * - Stop loss is defined by bankroll limits or table limits.
 */

function bet(spinHistory, bankroll, config, state) {
    // --- Helper: Determine Column (1, 2, 3, or 0) ---
    const getColumn = (num) => {
        if (num === 0 || num === '0' || num === '00') return 0;
        const n = parseInt(num, 10);
        if (n % 3 === 1) return 1;
        if (n % 3 === 2) return 2;
        return 3;
    };

    // --- 1. Initialize State ---
    if (!state.initialized) {
        state.multiplier = 1;
        state.activeColumns = []; // Stores the columns currently being bet [e.g., 1, 3]
        state.initialized = true;
    }

    // --- 2. Process Last Spin Result (if exists) ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastCol = getColumn(lastSpin.winningNumber);

        // Did we have an active bet?
        if (state.activeColumns.length > 0) {
            if (state.activeColumns.includes(lastCol)) {
                // WIN: Reset everything
                state.multiplier = 1;
                state.activeColumns = []; // Clear to look for new trigger
            } else {
                // LOSS
                if (lastCol === 0) {
                    // ZERO RULE: Repeat same bet, do not increase multiplier
                    // state.activeColumns remains the same
                    // state.multiplier remains the same
                } else {
                    // NORMAL LOSS (Aggressive): Increase multiplier, keep chasing same columns
                    state.multiplier *= 3;
                    // state.activeColumns remains the same (No-Wait rule)
                }
            }
        }
    }

    // --- 3. Determine Bets for Current Spin ---
    
    // Scenario A: We are in a progression sequence (or repeating zero)
    // state.activeColumns is already set from previous logic
    
    // Scenario B: We are waiting for a new trigger (state.activeColumns is empty)
    if (state.activeColumns.length === 0 && spinHistory.length >= 2) {
        const last1 = spinHistory[spinHistory.length - 1];
        const last2 = spinHistory[spinHistory.length - 2];

        // Trigger Logic
        if (last1.winningColor === 'black' && last2.winningColor === 'black') {
            // Trigger: BB -> Bet Red Cols (1 & 3)
            state.activeColumns = [1, 3];
        } else if (last1.winningColor === 'red' && last2.winningColor === 'red') {
            // Trigger: RR -> Bet Black Cols (1 & 2)
            state.activeColumns = [1, 2];
        }
    }

    // --- 4. Construct Bet Objects ---
    const bets = [];

    // If we have active columns (either from trigger or progression), place bets
    if (state.activeColumns.length > 0) {
        const baseUnit = config.betLimits.minOutside; // Use minOutside for Column bets
        
        // Calculate raw amount
        let betAmount = baseUnit * state.multiplier;

        // CLAMP TO LIMITS
        betAmount = Math.max(betAmount, config.betLimits.minOutside);
        betAmount = Math.min(betAmount, config.betLimits.max);

        // Create the bet objects for the two columns
        state.activeColumns.forEach(col => {
            bets.push({
                type: 'column',
                value: col,
                amount: betAmount
            });
        });
    }

    return bets;
}