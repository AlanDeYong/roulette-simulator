
/**
 * Strategy: The "Never Loses" System (CBD's Strategy)
 * Source: THEROULETTEMASTERTV (https://www.youtube.com/watch?v=aygf2FDfSgI)
 *
 * The Logic:
 * 1.  **Bet Coverage**: Aims for high coverage (approx 83% non-losing numbers) to grind small profits.
 * - 1 Unit on Dozen 2 (13-24)
 * - 1 Unit on Dozen 3 (25-36)
 * - 1 Unit on High (19-36)
 *
 * 2.  **Outcomes**:
 * - **19-36 Hits**: WIN (+2 units profit). (Wins on High + one Dozen).
 * - **13-18 Hits**: PUSH (Break Even). (Wins on Dozen 2, Loses High and Dozen 3).
 * - **1-12 or 0 Hits**: LOSS (-3 units). (Loses all bets).
 *
 * 3.  **The Progression (Normal Mode)**:
 * - **After a Loss** (1-12 or 0): Martingale (Double the unit size).
 * - **After a Push** (13-18): Repeat the same bet amount.
 * - **After a Win** (19-36): Reset to the base unit.
 *
 * 4.  **Safety & Recovery Mechanism**:
 * - If the progression reaches the 4th level (8x base unit, e.g., $80 unit/$240 total) and LOSES:
 * - **STOP BETTING** (Sit out).
 * - **Trigger**: Wait for "1-12" to appear twice in close proximity (last 3 spins).
 * - **Action**: Place a large Recovery Bet (10x base unit, e.g., $100 unit/$300 total).
 * - If Recovery Bet wins, reset to Normal Mode (1x unit).
 * - If Recovery Bet loses, double it (Martingale) until win or max limit.
 *
 * 5.  **The Goal**: Target a session profit of roughly 200 units or until bankroll limits are hit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Configuration & Constants
    const baseUnit = config.betLimits.minOutside;
    const maxBet = config.betLimits.max;
    
    // Multipliers relative to baseUnit
    // Levels: 1 ($10), 2 ($20), 4 ($40), 8 ($80) -> STOP -> Wait for Trigger -> 10 ($100)
    const MAX_NORMAL_MULTIPLIER = 8; 
    const RECOVERY_MULTIPLIER = 10;

    // 2. Initialize State
    if (!state.initialized) {
        state.mode = 'NORMAL'; // 'NORMAL', 'WAITING', 'RECOVERY'
        state.multiplier = 1;
        state.initialized = true;
    }

    // 3. Process Last Spin (if exists) to update State
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;

        // Categorize Result
        const isLoss = (num >= 1 && num <= 12) || num === 0;
        const isPush = (num >= 13 && num <= 18);
        const isWin = (num >= 19 && num <= 36);

        // --- STATE MACHINE ---
        
        if (state.mode === 'NORMAL') {
            if (isWin) {
                state.multiplier = 1; // Reset
            } else if (isLoss) {
                // Check if we just lost the Max Threshold bet
                if (state.multiplier >= MAX_NORMAL_MULTIPLIER) {
                    state.mode = 'WAITING';
                    state.multiplier = 0; // No bet
                } else {
                    state.multiplier *= 2; // Double
                }
            }
            // If Push, do nothing (repeat bet)
        } 
        else if (state.mode === 'RECOVERY') {
            // In Recovery, we play until we win
            if (isWin) {
                state.mode = 'NORMAL';
                state.multiplier = 1; // Reset to start
            } else if (isLoss) {
                state.multiplier *= 2; // Double the recovery bet
            }
            // If Push, do nothing (repeat bet)
        }
        
        // Note: If mode is 'WAITING', we process the trigger logic below before placing new bets.
    }

    // 4. Handle "WAITING" Mode Logic
    if (state.mode === 'WAITING') {
        // Look at last 3 spins (or fewer if history is short)
        const recentSpins = spinHistory.slice(-3);
        let countLow = 0;
        
        for (const spin of recentSpins) {
            if (spin.winningNumber >= 1 && spin.winningNumber <= 12) {
                countLow++;
            }
        }

        // Trigger Condition: At least 2 of the last 3 spins were 1-12
        if (countLow >= 2) {
            state.mode = 'RECOVERY';
            state.multiplier = RECOVERY_MULTIPLIER;
        } else {
            // Still waiting
            return []; 
        }
    }

    // 5. Calculate Bet Amounts
    // If multiplier is 0 (or somehow negative), return no bets
    if (state.multiplier <= 0) return [];

    let amount = baseUnit * state.multiplier;

    // 6. Validate Limits (Clamp)
    // We must ensure the bet per spot does not exceed max
    amount = Math.max(amount, config.betLimits.minOutside);
    amount = Math.min(amount, config.betLimits.max);

    // 7. Construct Bets
    // Layout: Dozen 2, Dozen 3, High (19-36)
    return [
        { type: 'dozen', value: 2, amount: amount }, // 13-24
        { type: 'dozen', value: 3, amount: amount }, // 25-36
        { type: 'high', amount: amount }             // 19-36
    ];

}