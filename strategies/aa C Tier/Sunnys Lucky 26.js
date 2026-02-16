/**
 * Strategy: Sunny's Lucky 26
 * Source: YouTube - The Roulette Master (https://www.youtube.com/watch?v=j4QJ6UZMLXA)
 *
 * THE LOGIC:
 * - This strategy focuses on covering the 2nd and 3rd Columns + Zero.
 * - Coverage: ~64% of the board (on Double Zero wheel).
 * - Base Betting Unit Ratio:
 * - 12 units on Column 2
 * - 12 units on Column 3
 * - 1 unit on Zero (and 1 on 00 if applicable/desired, here we scale '0' slightly higher or keep it proportional)
 * - Total Base Bet: ~25-26 units.
 *
 * THE PROGRESSION (Recovery):
 * - Level 1: Base bets.
 * - On Loss (hitting Column 1):
 * - Double the bet amounts (Level * 2).
 * - Reset "Wins at Level" counter to 0.
 * - On Win (hitting Col 2, Col 3, or Zero):
 * - Increment "Wins at Level" counter.
 * - The Goal is to achieve **2 Wins** at the current level.
 * - If 2 wins are achieved: Reset to Level 1.
 *
 * THE GOAL:
 * - Grind steady small profits while surviving variance via the "2-win" recovery rule.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & CONSTANTS ---
    const COL_RATIO = 12;
    const ZERO_RATIO = 1; // Keeping it 1 for standard 0. If you play US 00, you might want 2.

    // Define minimum unit based on the stricter of the two limits (Inside vs Outside)
    // We need 12 * unit >= minOutside AND 1 * unit >= minInside
    // Usually minOutside is 5 and minInside is 1.
    // If minOutside is 5, unit must be at least 0.42 (5/12).
    // If minInside is 1, unit must be at least 1.
    // We take the max of required base values to ensure valid bets.
    const reqUnitForCol = config.betLimits.minOutside / COL_RATIO;
    const reqUnitForZero = config.betLimits.min / ZERO_RATIO;
    const baseUnit = Math.max(reqUnitForCol, reqUnitForZero, 1); // Default to at least 1 chip

    // --- 2. STATE INITIALIZATION ---
    if (state.level === undefined) state.level = 1;
    if (state.winsAtLevel === undefined) state.winsAtLevel = 0;
    if (state.totalWins === undefined) state.totalWins = 0;
    if (state.totalLosses === undefined) state.totalLosses = 0;

    // --- 3. PROCESS PREVIOUS RESULT ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;

        // Determine if it was a Win or Loss
        // Win: Col 2 (2,5,8..), Col 3 (3,6,9..), or 0
        // Loss: Col 1 (1,4,7..)
        let isWin = false;

        if (num === 0 || num === 37) { // 37 is often mapped to '00' in some sims, or just 0
            isWin = true;
        } else {
            const remainder = num % 3;
            // Col 3: remainder 0
            // Col 2: remainder 2
            // Col 1: remainder 1 (LOSS)
            if (remainder === 0 || remainder === 2) {
                isWin = true;
            }
        }

        if (isWin) {
            state.totalWins++;
            state.winsAtLevel++;

            // CHECK RESET CONDITION: 2 Wins at current level
            if (state.winsAtLevel >= 2) {
                state.level = 1;
                state.winsAtLevel = 0; // Reset counter after clearing the level
            }
        } else {
            // LOSS (Hit Col 1)
            state.totalLosses++;
            state.level = state.level * 2; // Double the bets
            state.winsAtLevel = 0;         // Reset win counter, we need 2 fresh wins at this new level
        }
    }

    // --- 4. CALCULATE BET AMOUNTS ---
    let currentUnit = baseUnit * state.level;
    
    let betColAmount = currentUnit * COL_RATIO;
    let betZeroAmount = currentUnit * ZERO_RATIO;

    // --- 5. CLAMP TO LIMITS ---
    // Ensure we don't exceed max bet per position
    betColAmount = Math.min(betColAmount, config.betLimits.max);
    betZeroAmount = Math.min(betZeroAmount, config.betLimits.max);

    // Ensure we meet minimums (redundant if baseUnit logic is correct, but safe)
    betColAmount = Math.max(betColAmount, config.betLimits.minOutside);
    betZeroAmount = Math.max(betZeroAmount, config.betLimits.min);

    // Safety: If bankroll is too low for full bet, don't bet (or you could bet all-in, but returning empty is safer)
    const totalNeeded = (betColAmount * 2) + betZeroAmount;
    if (bankroll < totalNeeded) {
        // Optional: Log bankruptcy warning
        return []; 
    }

    // --- 6. LOGGING (Periodic) ---
    // Save stats every 50 spins
    if (spinHistory.length > 0 && spinHistory.length % 50 === 0) {
        const logContent = `Spin: ${spinHistory.length} | Level: ${state.level} | Wins: ${state.totalWins} | Losses: ${state.totalLosses} | Bankroll: ${bankroll}\n`;
        // utils.saveFile returns a promise, but we don't await it to block execution
        utils.saveFile("sunny-lucky-26-log.txt", logContent).catch(() => {}); 
    }

    // --- 7. RETURN BETS ---
    return [
        { type: 'column', value: 2, amount: betColAmount }, // 2nd Column
        { type: 'column', value: 3, amount: betColAmount }, // 3rd Column
        { type: 'number', value: 0, amount: betZeroAmount } // Zero coverage
    ];
}